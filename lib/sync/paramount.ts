import type { Episode } from '../types';
import { t } from '../i18n';

/**
 * Paramount+ expose un endpoint JSON par saison :
 * /shows/<slug>/xhr/episodes/page/<page>/size/<size>/xs/0/season/<n>/
 */

interface ApiEpisode {
  content_id: string;
  url: string;
  season_number: string;
  episode_number: string;
  label?: string;
  episode_title?: string;
  media_content_type?: string;
}

const PAGE_SIZE = 100;
const MAX_SEASONS = 80;
/** Nombre de saisons vides d'affilée avant de considérer qu'on a tout vu. */
const MAX_EMPTY_IN_A_ROW = 3;

export function showSlug(seriesUrl: string): string {
  const slug = new URL(seriesUrl).pathname.match(/\/shows\/([^/]+)/)?.[1];
  if (!slug) throw new Error(t('paramountBadUrl'));
  return slug;
}

export function toEpisode(origin: string, e: ApiEpisode): Episode {
  return {
    id: e.content_id,
    url: new URL(e.url, origin).href,
    season: Number(e.season_number),
    number: Number(e.episode_number),
    title: e.episode_title || e.label || '',
  };
}

async function fetchSeason(origin: string, slug: string, season: number): Promise<ApiEpisode[]> {
  const out: ApiEpisode[] = [];
  for (let page = 0; ; page++) {
    const res = await fetch(
      `${origin}/shows/${slug}/xhr/episodes/page/${page}/size/${PAGE_SIZE}/xs/0/season/${season}/`,
    );
    if (!res.ok) throw new Error(t('httpError', 'Paramount+', res.status));
    const json = (await res.json()) as { result?: { data?: ApiEpisode[] } };
    const data = json.result?.data ?? [];
    out.push(...data);
    if (data.length < PAGE_SIZE) return out;
  }
}

export async function syncParamount(
  seriesUrl: string,
  onProgress: (done: number, total: number) => Promise<void>,
): Promise<Episode[]> {
  const origin = new URL(seriesUrl).origin;
  const slug = showSlug(seriesUrl);
  const episodes = new Map<string, Episode>();
  let empty = 0;

  for (let season = 1; season <= MAX_SEASONS && empty < MAX_EMPTY_IN_A_ROW; season++) {
    const data = (await fetchSeason(origin, slug, season)).filter(
      (e) => !e.media_content_type || e.media_content_type === 'Full Episode',
    );
    empty = data.length ? 0 : empty + 1;
    for (const e of data) episodes.set(e.content_id, toEpisode(origin, e));
    // Le nombre de saisons n'est pas connu d'avance : total 0 = « saison en cours ».
    await onProgress(season, 0);
  }
  if (!episodes.size) throw new Error(t('noEpisodesFound', 'Paramount+'));
  return [...episodes.values()];
}
