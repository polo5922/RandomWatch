import { storage } from '#imports';
import type { BagState } from './picker';
import { SHOW_IDS, type ShowId } from './shows';
import type { Episode, PickKey, SyncStatus } from './types';

export interface Settings {
  /** Séries incluses dans le mode Surprise. */
  surprise: ShowId[];
  /** Enchaîne un nouvel épisode aléatoire à la fin de chaque épisode. */
  autoplay: boolean;
  /** Pages série personnalisées (sinon celle par défaut). */
  urls: Partial<Record<ShowId, string>>;
  /** Images de fond personnalisées (sinon le visuel récupéré à la synchro). Absent des anciens réglages. */
  backgrounds?: Partial<Record<ShowId, string>>;
}

/** Onglet en lecture aléatoire : quel mode, et quel épisode est censé y passer. */
export interface PlaySession {
  key: PickKey;
  /** Id lu dans l'URL du lecteur ; absent tant que l'épisode lancé n'a pas encore chargé. */
  currentId?: string;
}

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: { surprise: [...SHOW_IDS], autoplay: true, urls: {}, backgrounds: {} },
});

/** Visuel de chaque série, récupéré sur sa page à la synchro. */
export const artworkItem = storage.defineItem<Partial<Record<ShowId, string>>>('local:artwork', {
  fallback: {},
});

export const catalogItem = storage.defineItem<Partial<Record<ShowId, Episode[]>>>('local:catalog', {
  fallback: {},
});

export const bagsItem = storage.defineItem<Partial<Record<PickKey, BagState>>>('local:bags', {
  fallback: {},
});

export const syncStatusItem = storage.defineItem<Partial<Record<ShowId, SyncStatus>>>('local:syncStatus', {
  fallback: {},
});

export const sessionsItem = storage.defineItem<Record<string, PlaySession>>('local:sessions', {
  fallback: {},
});
