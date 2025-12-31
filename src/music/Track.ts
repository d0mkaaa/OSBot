export interface Track {
  title: string;
  url: string;
  duration: number;
  thumbnail: string;
  requestedBy: {
    id: string;
    tag: string;
  } | string;
  type: 'youtube' | 'soundcloud' | 'spotify' | 'url';
  artist?: string;
  live?: boolean;
  filePath?: string;
}

export type LoopMode = 'off' | 'track' | 'queue';

export interface QueueOptions {
  guildId: string;
  textChannelId: string;
  voiceChannelId: string;
}
