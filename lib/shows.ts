import { t } from './i18n';

export type Platform = 'disney' | 'paramount';
export type ShowId = 'simpsons' | 'americandad' | 'familyguy' | 'southpark';

export interface Show {
  id: ShowId;
  name: string;
  platform: Platform;
  /** Page série par défaut (modifiable dans les options, ex. pour changer de région). */
  defaultUrl: string;
  /** Visuel de secours quand la page de la plateforme n'en fournit pas. */
  defaultImage?: string;
  color: string;
}

export const SHOWS: Show[] = [
  {
    id: 'simpsons',
    name: t('show_simpsons'),
    platform: 'disney',
    defaultUrl: 'https://www.disneyplus.com/fr-fr/browse/entity-cac75c8f-a9e2-4d95-ac73-1cf1cc7b9568',
    color: '#facc15',
  },
  {
    id: 'americandad',
    name: t('show_americandad'),
    platform: 'disney',
    defaultUrl: 'https://www.disneyplus.com/fr-fr/browse/entity-5b4ab988-e3a7-4750-a11a-9aa3d65f8cfe',
    color: '#ef4444',
  },
  {
    id: 'familyguy',
    name: t('show_familyguy'),
    platform: 'disney',
    defaultUrl: 'https://www.disneyplus.com/fr-fr/browse/entity-3c3c0f8b-7366-4d15-88ab-18050285978e',
    color: '#22c55e',
  },
  {
    id: 'southpark',
    name: t('show_southpark'),
    platform: 'paramount',
    defaultUrl: 'https://www.paramountplus.com/shows/south-park/',
    // Paramount+ n'expose pas d'image de partage : visuel officiel de southparkstudios.com
    defaultImage:
      'https://images.paramount.tech/uri/mgid:arc:imageassetref:shared.southpark.us.en:88778738-b9f9-42b7-8fcb-f2066aeb940f?format=jpg&width=1200&height=630&crop=true',
    color: '#3b82f6',
  },
];

export const SHOW_IDS = SHOWS.map((s) => s.id);
export const getShow = (id: ShowId) => SHOWS.find((s) => s.id === id)!;

export const PLATFORM_LABEL: Record<Platform, string> = {
  disney: 'Disney+',
  paramount: 'Paramount+',
};

export const PLATFORM_HOST: Record<Platform, RegExp> = {
  disney: /(^|\.)disneyplus\.com$/,
  paramount: /(^|\.)paramountplus\.com$/,
};

/** Id de l'épisode en cours de lecture d'après l'URL du lecteur, ou null hors lecteur. */
export function playingEpisodeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (PLATFORM_HOST.disney.test(u.hostname)) {
    return u.pathname.match(/\/play\/([\w-]+)/)?.[1] ?? null;
  }
  if (PLATFORM_HOST.paramount.test(u.hostname)) {
    return u.pathname.match(/\/(?:shows\/)?video\/([\w-]+)/)?.[1] ?? null;
  }
  return null;
}
