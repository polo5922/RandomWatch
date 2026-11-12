import type { ShowId } from './shows';

export interface Episode {
  id: string;
  url: string;
  season: number;
  number: number;
  title: string;
}

/** Une série, ou le mode « Surprise » qui mélange les séries cochées. */
export type PickKey = ShowId | 'surprise';

export interface SyncStatus {
  running: boolean;
  /** Saisons traitées / total connu. */
  done: number;
  total: number;
  error?: string;
  finishedAt?: number;
}

export type Message =
  | { type: 'play'; key: PickKey }
  | { type: 'sync'; showId: ShowId }
  | { type: 'stop' }
  | { type: 'ended' }
  | { type: 'artwork' };

export interface PlayResult {
  ok: boolean;
  error?: string;
  episode?: Episode & { showId: ShowId };
}
