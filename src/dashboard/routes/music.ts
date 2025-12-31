import express, { Request, Response } from 'express';
import { MusicManager } from '../../music/MusicManager.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { requireMusicEnabled } from '../middleware/module-check.js';

const router = express.Router();

router.use('/music/:guildId', requireMusicEnabled);

router.get('/music/:guildId/queue', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.json({
        success: true,
        data: {
          tracks: [],
          currentTrack: null,
          volume: 100,
          loopMode: 'off',
          isPlaying: false,
          isPaused: false
        }
      });
    }

    const currentPosition = musicManager.getCurrentPosition(guildId);

    return res.json({
      success: true,
      data: {
        tracks: queue.tracks.map(track => ({
          title: track.title,
          url: track.url,
          duration: track.duration,
          requestedBy: track.requestedBy,
          thumbnail: track.thumbnail
        })),
        currentTrack: queue.currentTrack ? {
          title: queue.currentTrack.title,
          url: queue.currentTrack.url,
          duration: queue.currentTrack.duration,
          requestedBy: queue.currentTrack.requestedBy,
          thumbnail: queue.currentTrack.thumbnail,
          currentPosition: currentPosition
        } : null,
        volume: queue.volume,
        loopMode: queue.loopMode,
        isPlaying: queue.isPlaying,
        isPaused: queue.isPaused
      }
    });
  } catch (error) {
    logger.error('Error fetching music queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch music queue'
    });
  }
});

router.post('/music/:guildId/play', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { query, userId } = req.body;

    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: query, userId'
      });
    }

    return res.status(501).json({
      success: false,
      error: 'Play functionality must be done through Discord bot commands'
    });
  } catch (error) {
    logger.error('Error playing music:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to play music'
    });
  }
});

router.post('/music/:guildId/pause', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    if (queue.isPaused) {
      return res.status(400).json({
        success: false,
        error: 'Music is already paused'
      });
    }

    const result = musicManager.pause(guildId);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to pause music'
      });
    }

    return res.json({
      success: true,
      message: 'Music paused successfully'
    });
  } catch (error) {
    logger.error('Error pausing music:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to pause music'
    });
  }
});

router.post('/music/:guildId/resume', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    if (!queue.isPaused) {
      return res.status(400).json({
        success: false,
        error: 'Music is not paused'
      });
    }

    const result = musicManager.resume(guildId);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to resume music'
      });
    }

    return res.json({
      success: true,
      message: 'Music resumed successfully'
    });
  } catch (error) {
    logger.error('Error resuming music:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resume music'
    });
  }
});

router.post('/music/:guildId/skip', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    musicManager.skip(guildId);

    return res.json({
      success: true,
      message: 'Track skipped successfully'
    });
  } catch (error) {
    logger.error('Error skipping track:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to skip track'
    });
  }
});

router.post('/music/:guildId/volume', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { volume } = req.body;

    if (volume === undefined || volume < 0 || volume > 100) {
      return res.status(400).json({
        success: false,
        error: 'Volume must be between 0 and 100'
      });
    }

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    musicManager.setVolume(guildId, volume);

    return res.json({
      success: true,
      message: `Volume set to ${volume}%`
    });
  } catch (error) {
    logger.error('Error setting volume:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set volume'
    });
  }
});

router.post('/music/:guildId/loop', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { mode } = req.body;

    if (!mode || !['off', 'track', 'queue'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid loop mode. Must be: off, track, or queue'
      });
    }

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    musicManager.setLoop(guildId, mode as 'off' | 'track' | 'queue');

    return res.json({
      success: true,
      message: `Loop mode set to ${mode}`
    });
  } catch (error) {
    logger.error('Error setting loop mode:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set loop mode'
    });
  }
});

router.delete('/music/:guildId/stop', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    musicManager.stop(guildId);

    return res.json({
      success: true,
      message: 'Music stopped and queue cleared'
    });
  } catch (error) {
    logger.error('Error stopping music:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to stop music'
    });
  }
});

router.delete('/music/:guildId/queue/:index', async (req: Request, res: Response) => {
  try {
    const { guildId, index } = req.params;
    const trackIndex = parseInt(index, 10);

    if (isNaN(trackIndex) || trackIndex < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid track index'
      });
    }

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    const removed = musicManager.removeTrack(guildId, trackIndex);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Track not found at specified index'
      });
    }

    return res.json({
      success: true,
      message: 'Track removed from queue',
      data: {
        title: removed.title,
        url: removed.url
      }
    });
  } catch (error) {
    logger.error('Error removing track:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove track'
    });
  }
});

router.post('/music/:guildId/shuffle', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(guildId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'No active music queue'
      });
    }

    if (queue.tracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queue is empty'
      });
    }

    musicManager.shuffle(guildId);

    return res.json({
      success: true,
      message: 'Queue shuffled successfully'
    });
  } catch (error) {
    logger.error('Error shuffling queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to shuffle queue'
    });
  }
});

router.get('/music/:guildId/settings', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const db = DatabaseManager.getInstance();
    const settings = db.getOrCreateMusicSettings(guildId);

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching music settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch music settings'
    });
  }
});

router.patch('/music/:guildId/settings', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const {
      enabled,
      dj_role_id,
      volume,
      auto_leave,
      auto_leave_timeout,
      twentyfour_seven,
      vote_skip_enabled,
      vote_skip_threshold,
      max_queue_size,
      max_track_duration
    } = req.body;

    const updates: any = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (dj_role_id !== undefined) updates.dj_role_id = dj_role_id;
    if (volume !== undefined) {
      if (volume < 0 || volume > 100) {
        return res.status(400).json({
          success: false,
          error: 'Volume must be between 0 and 100'
        });
      }
      updates.volume = volume;
    }
    if (auto_leave !== undefined) updates.auto_leave = auto_leave;
    if (auto_leave_timeout !== undefined) updates.auto_leave_timeout = auto_leave_timeout;
    if (twentyfour_seven !== undefined) updates.twentyfour_seven = twentyfour_seven;
    if (vote_skip_enabled !== undefined) updates.vote_skip_enabled = vote_skip_enabled;
    if (vote_skip_threshold !== undefined) {
      if (vote_skip_threshold < 0 || vote_skip_threshold > 100) {
        return res.status(400).json({
          success: false,
          error: 'Vote skip threshold must be between 0 and 100'
        });
      }
      updates.vote_skip_threshold = vote_skip_threshold;
    }
    if (max_queue_size !== undefined) updates.max_queue_size = max_queue_size;
    if (max_track_duration !== undefined) updates.max_track_duration = max_track_duration;

    const db = DatabaseManager.getInstance();
    db.updateMusicSettings(guildId, updates);

    const updatedSettings = db.getOrCreateMusicSettings(guildId);

    return res.json({
      success: true,
      message: 'Music settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    logger.error('Error updating music settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update music settings'
    });
  }
});

export default router;
