import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  VoiceConnectionStatus,
  entersState,
  AudioResource
} from '@discordjs/voice';
import { VoiceChannel } from 'discord.js';
import play from 'play-dl';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DatabaseManager } from '../database/Database.js';
import { Track, LoopMode } from './Track.js';
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ytdlpPath = join(__dirname, '..', '..', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const tempDir = join(__dirname, '..', '..', 'temp', 'music');

if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

interface QueueData {
  tracks: Track[];
  currentTrack: Track | null;
  currentResource: AudioResource<null> | null;
  volume: number;
  loopMode: 'off' | 'track' | 'queue';
  voiceConnection: VoiceConnection | null;
  audioPlayer: AudioPlayer | null;
  isPlaying: boolean;
  isPaused: boolean;
  retryCount: number;
  voteSkips: Set<string>;
  playbackStartTime: number;
  pausedAt: number;
  totalPausedTime: number;
}

export class MusicManager {
  private static instance: MusicManager | null = null;
  private queues: Map<string, QueueData> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 2000;
  private readonly STREAM_EXPIRY_BUFFER = 300000;
  private readonly DISCONNECT_TIMEOUT = 30000;
  private fileInUse: Set<string> = new Set();
  private fileDeletionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.restoreQueuesFromDatabase();
    logger.info('Music system initialized');
  }

  private async restoreQueuesFromDatabase(): Promise<void> {
    try {
      const db = DatabaseManager.getInstance();
      const savedQueues = db.getAllMusicQueues();
      let restoredCount = 0;

      for (const saved of savedQueues) {
        const guildConfig = db.getGuild(saved.guild_id) as any;

        if (!guildConfig?.music_enabled) {
          logger.info(`Skipping queue restoration for guild ${saved.guild_id} - music disabled`);
          continue;
        }

        this.queues.set(saved.guild_id, {
          tracks: JSON.parse(saved.tracks),
          currentTrack: saved.current_track ? JSON.parse(saved.current_track) : null,
          currentResource: null,
          volume: saved.volume,
          loopMode: saved.loop_mode as 'off' | 'track' | 'queue',
          voiceConnection: null,
          audioPlayer: null,
          isPlaying: false,
          isPaused: false,
          retryCount: 0,
          voteSkips: new Set(),
          playbackStartTime: 0,
          pausedAt: 0,
          totalPausedTime: 0
        });
        restoredCount++;
      }

      logger.info(`Restored ${restoredCount} music queues from database`);
    } catch (error) {
      logger.error('Failed to restore queues from database:', error);
    }
  }

  private async saveQueueToDatabase(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    try {
      const db = DatabaseManager.getInstance();
      db.saveMusicQueue({
        guild_id: guildId,
        tracks: JSON.stringify(queue.tracks),
        current_track: queue.currentTrack ? JSON.stringify(queue.currentTrack) : null,
        volume: queue.volume,
        loop_mode: queue.loopMode,
        is_playing: queue.isPlaying ? 1 : 0,
        updated_at: Date.now()
      });
    } catch (error) {
      logger.error(`Failed to save queue for guild ${guildId}:`, error);
    }
  }

  private getOrCreateQueue(guildId: string): QueueData {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        tracks: [],
        currentTrack: null,
        currentResource: null,
        volume: 100,
        loopMode: 'off',
        voiceConnection: null,
        audioPlayer: null,
        isPlaying: false,
        isPaused: false,
        retryCount: 0,
        voteSkips: new Set(),
        playbackStartTime: 0,
        pausedAt: 0,
        totalPausedTime: 0
      });
    }
    return this.queues.get(guildId)!;
  }

  public async play(voiceChannel: VoiceChannel, query: string, requestedBy: string): Promise<Track> {
    const db = DatabaseManager.getInstance();
    const guildConfig = db.getGuild(voiceChannel.guild.id) as any;

    if (!guildConfig?.music_enabled) {
      throw new Error('Music system is disabled on this server');
    }

    const queue = this.getOrCreateQueue(voiceChannel.guild.id);
    const musicSettings = db.getOrCreateMusicSettings(voiceChannel.guild.id);

    let video: any;
    let url: string;

    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      url = query.split('&list=')[0].split('?list=')[0];
      logger.info(`Direct URL provided: ${url}`);

      const videoInfo = await play.video_info(url);
      video = videoInfo.video_details;
    } else {
      logger.info(`Searching for: ${query}`);
      const searchResults = await play.search(query, { limit: 1 });

      if (!searchResults || searchResults.length === 0) {
        throw new Error('No results found');
      }

      video = searchResults[0];
      url = video.url;
      logger.info(`Search result: ${video.title}`);
    }

    if (musicSettings.max_track_duration && video.durationInSec > musicSettings.max_track_duration) {
      throw new Error(`Track duration exceeds maximum allowed (${musicSettings.max_track_duration}s)`);
    }

    if (musicSettings.max_queue_size && queue.tracks.length >= musicSettings.max_queue_size) {
      throw new Error(`Queue is full (max: ${musicSettings.max_queue_size})`);
    }

    const track: Track = {
      title: video.title || 'Unknown',
      url,
      duration: video.durationInSec,
      requestedBy,
      thumbnail: video.thumbnails?.[0]?.url || '',
      type: 'youtube'
    };

    logger.info(`Added to queue: ${track.title}`);
    queue.tracks.push(track);
    await this.saveQueueToDatabase(voiceChannel.guild.id);

    if (!queue.isPlaying) {
      logger.info('Starting playback');
      await this.connectToChannel(voiceChannel);
      this.playNext(voiceChannel.guild.id).catch(err => {
        logger.error('Error in playNext:', err);
      });
    }

    return track;
  }

  private async connectToChannel(voiceChannel: VoiceChannel): Promise<void> {
    const queue = this.getOrCreateQueue(voiceChannel.guild.id);

    if (queue.voiceConnection) {
      return;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator as any
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        logger.warn(`Voice connection disconnected for guild ${voiceChannel.guild.id}, attempting reconnect`);

        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, this.DISCONNECT_TIMEOUT),
          entersState(connection, VoiceConnectionStatus.Connecting, this.DISCONNECT_TIMEOUT)
        ]);

        logger.info(`Successfully reconnected for guild ${voiceChannel.guild.id}`);
      } catch (error) {
        logger.error(`Failed to reconnect for guild ${voiceChannel.guild.id}, destroying connection`);
        connection.destroy();

        await this.saveQueueToDatabase(voiceChannel.guild.id);

        if (queue.voiceConnection === connection) {
          queue.voiceConnection = null;
          queue.audioPlayer = null;
          queue.isPlaying = false;
          queue.isPaused = false;
        }
      }
    });

    queue.voiceConnection = connection;
    queue.audioPlayer = createAudioPlayer();

    connection.subscribe(queue.audioPlayer);

    queue.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      const queue = this.queues.get(voiceChannel.guild.id);
      if (!queue) return;

      if (queue.currentTrack?.filePath) {
        this.fileInUse.delete(queue.currentTrack.filePath);
        this.scheduleFileDeletion(queue.currentTrack.filePath, voiceChannel.guild.id);
      }

      queue.retryCount = 0;
      this.playNext(voiceChannel.guild.id).catch(err => {
        logger.error('Error in playNext from Idle event', err);
      });
    });

    queue.audioPlayer.on('error', (error) => {
      logger.error('Audio player error:', error);
      const queue = this.queues.get(voiceChannel.guild.id);
      if (!queue) return;

      logger.error(`Audio player error for guild ${voiceChannel.guild.id}, skipping to next track`);
      queue.retryCount = 0;
      this.playNext(voiceChannel.guild.id).catch(err => {
        logger.error('Error in playNext from error event', err);
      });
    });

    logger.info(`Connected to voice channel ${voiceChannel.id} in guild ${voiceChannel.guild.id}`);
  }

  private async downloadTrack(track: Track, guildId: string): Promise<string> {
    if (track.filePath && existsSync(track.filePath)) {
      logger.info(`Using cached file for: ${track.title}`);
      return track.filePath;
    }

    const videoId = this.extractVideoId(track.url);
    const filePath = join(tempDir, `${guildId}_${videoId}.mp3`);

    if (existsSync(filePath)) {
      logger.info(`File already exists for: ${track.title}`);
      track.filePath = filePath;
      return filePath;
    }

    logger.info(`Downloading: ${track.title} to ${filePath}`);

    await new Promise<void>((resolve, reject) => {
      const args = [
        track.url,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--output', filePath,
        '--no-playlist',
        '--no-check-certificates',
        '--no-warnings',
        '--quiet',
        '--progress'
      ];

      const process = spawn(ytdlpPath, args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.includes('[download]')) {
          const match = stderr.match(/(\d+\.\d+)%/);
          if (match) {
            logger.info(`Download progress: ${match[1]}%`);
          }
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          logger.info(`Download complete: ${track.title}`);
          resolve();
        } else {
          reject(new Error(`yt-dlp download failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });

    track.filePath = filePath;
    return filePath;
  }

  private extractVideoId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : Date.now().toString();
  }

  private scheduleFileDeletion(filePath: string, guildId: string): void {
    const db = DatabaseManager.getInstance();
    const musicSettings = db.getOrCreateMusicSettings(guildId);

    if (!musicSettings.auto_delete_files) {
      return;
    }

    const delay = Math.max(0, (musicSettings.auto_delete_delay || 30) * 1000);

    const existingTimeout = this.fileDeletionTimeouts.get(filePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      if (!this.fileInUse.has(filePath) && existsSync(filePath)) {
        try {
          unlinkSync(filePath);
          logger.info(`Auto-deleted file: ${filePath.split(/[\\\/]/).pop()}`);
        } catch (error) {
          logger.error(`Failed to delete file ${filePath}:`, error);
        }
      }
      this.fileDeletionTimeouts.delete(filePath);
    }, delay);

    this.fileDeletionTimeouts.set(filePath, timeout);
    logger.info(`Scheduled deletion of ${filePath.split(/[\\\/]/).pop()} in ${delay / 1000}s`);
  }

  private async playNext(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.audioPlayer) return;

    if (queue.loopMode === 'track' && queue.currentTrack) {
      queue.tracks.unshift(queue.currentTrack);
    }

    if (queue.tracks.length === 0) {
      queue.isPlaying = false;
      queue.currentTrack = null;
      queue.currentResource = null;
      queue.retryCount = 0;
      await this.saveQueueToDatabase(guildId);
      logger.info(`Queue finished for guild ${guildId}`);
      return;
    }

    const track = queue.tracks.shift()!;
    queue.currentTrack = track;
    queue.isPlaying = true;
    queue.isPaused = false;
    queue.voteSkips.clear();
    queue.playbackStartTime = Date.now();
    queue.pausedAt = 0;
    queue.totalPausedTime = 0;

    try {
      const filePath = await this.downloadTrack(track, guildId);
      this.fileInUse.add(filePath);

      logger.info(`Creating audio resource from file for guild ${guildId}`);
      const resource = createAudioResource(filePath, {
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(queue.volume / 100);
      }

      queue.currentResource = resource;
      queue.retryCount = 0;

      logger.info(`Playing: ${track.title} in guild ${guildId}`);
      queue.audioPlayer.play(resource);

      if (queue.loopMode === 'queue') {
        queue.tracks.push(track);
      }

      await this.saveQueueToDatabase(guildId);
    } catch (error) {
      logger.error(`Error playing track ${track.title}:`, error);

      if (queue.retryCount < this.MAX_RETRIES) {
        queue.retryCount++;
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, queue.retryCount - 1);
        logger.info(`Retrying track (attempt ${queue.retryCount}/${this.MAX_RETRIES}) in ${delay}ms`);

        queue.tracks.unshift(track);

        setTimeout(() => {
          this.playNext(guildId);
        }, delay);
      } else {
        logger.error(`Max retries reached for track ${track.title}, skipping`);
        queue.retryCount = 0;
        await this.playNext(guildId);
      }
    }
  }

  public pause(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue?.audioPlayer) return false;

    const result = queue.audioPlayer.pause();
    if (result) {
      queue.isPaused = true;
      queue.pausedAt = Date.now();
      this.saveQueueToDatabase(guildId);
    }
    return result;
  }

  public resume(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue?.audioPlayer) return false;

    const result = queue.audioPlayer.unpause();
    if (result) {
      queue.isPaused = false;
      if (queue.pausedAt > 0) {
        queue.totalPausedTime += Date.now() - queue.pausedAt;
        queue.pausedAt = 0;
      }
      this.saveQueueToDatabase(guildId);
    }
    return result;
  }

  public skip(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (!queue?.audioPlayer) return;

    queue.retryCount = 0;
    queue.audioPlayer.stop();
  }

  public stop(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    queue.tracks = [];
    queue.currentTrack = null;
    queue.currentResource = null;
    queue.retryCount = 0;
    queue.audioPlayer?.stop();
    queue.voiceConnection?.destroy();

    const db = DatabaseManager.getInstance();
    db.deleteMusicQueue(guildId);

    this.queues.delete(guildId);
    logger.info(`Stopped music and cleared queue for guild ${guildId}`);
  }

  public getQueue(guildId: string): QueueData | null {
    return this.queues.get(guildId) || null;
  }

  public getCurrentPosition(guildId: string): number {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.isPlaying || queue.playbackStartTime === 0) {
      return 0;
    }

    if (queue.isPaused && queue.pausedAt > 0) {
      return Math.floor((queue.pausedAt - queue.playbackStartTime - queue.totalPausedTime) / 1000);
    }

    return Math.floor((Date.now() - queue.playbackStartTime - queue.totalPausedTime) / 1000);
  }

  public setLoop(guildId: string, mode: 'off' | 'track' | 'queue'): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.loopMode = mode;
      this.saveQueueToDatabase(guildId);
    }
  }

  public setVolume(guildId: string, volume: number): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.volume = Math.max(0, Math.min(100, volume));

      if (queue.currentResource?.volume) {
        queue.currentResource.volume.setVolume(queue.volume / 100);
        logger.info(`Updated current track volume to ${queue.volume}% for guild ${guildId}`);
      }

      this.saveQueueToDatabase(guildId);
    }
  }

  public removeTrack(guildId: string, index: number): Track | null {
    const queue = this.queues.get(guildId);
    if (!queue || index < 0 || index >= queue.tracks.length) return null;

    const removed = queue.tracks.splice(index, 1)[0];
    this.saveQueueToDatabase(guildId);
    return removed;
  }

  public shuffle(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    this.saveQueueToDatabase(guildId);
  }

  public addVoteSkip(guildId: string, userId: string, memberCount: number): { voted: boolean; votes: number; required: number } {
    const queue = this.queues.get(guildId);
    if (!queue) return { voted: false, votes: 0, required: 0 };

    const db = DatabaseManager.getInstance();
    const settings = db.getOrCreateMusicSettings(guildId);

    if (!settings.vote_skip_enabled) {
      return { voted: false, votes: 0, required: 0 };
    }

    queue.voteSkips.add(userId);

    const required = Math.ceil(memberCount * (settings.vote_skip_threshold / 100));
    const votes = queue.voteSkips.size;

    if (votes >= required) {
      this.skip(guildId);
    }

    return { voted: true, votes, required };
  }

  public deleteQueue(guildId: string): void {
    this.stop(guildId);
  }
}
