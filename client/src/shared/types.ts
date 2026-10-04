export type SongStatus = 'queued' | 'playing' | 'played';

export interface QueueSong {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  status: SongStatus;
  sortOrder: number;
  requestedBy: string;
  createdAt: number;
}

export interface LyricWord {
  text: string;
  startMs: number;
}

export interface LyricLine {
  startMs: number;
  endMs: number;
  text: string;
  words: LyricWord[] | null;
}

export interface PlaybackState {
  playing: boolean;
  currentId: string | null;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  updatedAt: number;
}

export interface LyricsState {
  enabled: boolean;
  offsetMs: number;
  trackKey: string | null;
  lines: LyricLine[];
  source: {
    id?: number;
    trackName?: string;
    artistName?: string;
    hasWordSync?: boolean;
    instrumental?: boolean;
  } | null;
}

export type VocalMode = 'classic' | 'adaptive' | 'hq';

export interface VocalRemoveState {
  enabled: boolean;
  mode: VocalMode;
  strength: number;
}

export interface RoomState {
  code: string;
  queue: QueueSong[];
  playback: PlaybackState;
  lyrics: LyricsState;
  vocalRemove: VocalRemoveState;
  remoteCount: number;
  hasPlayer: boolean;
}

export interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string | number | null;
}
