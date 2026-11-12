import type { Episode } from '../types';
import { t } from '../i18n';

/**
 * Disney+ sert ses pages série publiques avec un JSON Next.js (__NEXT_DATA__)
 * qui contient la liste des saisons et les épisodes de la saison demandée (?season=<id>).
 * L'_id de chaque épisode s'ouvre dans le lecteur via /<locale>/play/<_id>.
 */

interface ImageCard {
  _id: string;
  title: string;
}

interface EpisodesBlock {
  _type: 'Episodes';
  seasons: { id: string; name: string }[];
  selectedSeasonId: string;
  episodes: ImageCard[];
}

export function extractNextData(html: string): unknown {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(t('disneyUnexpectedPage'));
  return JSON.parse(m[1]!);
}

export function findEpisodesBlock(data: unknown): EpisodesBlock | null {
  const stack: unknown[] = [data];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if ((node as { _type?: string })._type === 'Episodes' && Array.isArray((node as EpisodesBlock).seasons)) {
      return node as EpisodesBlock;
    }
    stack.push(...Object.values(node));
  }
  return null;
}

/** "S3:E1 Camp de réfougiés" → saison 3, épisode 1. */
export function parseEpisodeTitle(title: string, fallbackSeason: number, fallbackNumber: number) {
  const m = title.match(/^S(\d+)\s*:\s*E(\d+)\s*(.*)$/i);
  if (!m) return { season: fallbackSeason, number: fallbackNumber, title: title.trim() };
  return { season: Number(m[1]), number: Number(m[2]), title: m[3]!.trim() || title.trim() };
}

export function playUrl(seriesUrl: string, episodeId: string): string {
  const u = new URL(seriesUrl);
  const locale = u.pathname.split('/')[1] ?? '';
  const prefix = /^[a-z]{2}-[a-z0-9]+$/i.test(locale) ? `/${locale}` : '';
  return `${u.origin}${prefix}/play/${episodeId}`;
}

async function fetchBlock(url: string): Promise<EpisodesBlock> {
  // Sans cookies : on veut la page publique, qui contient les données des épisodes.
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(t('httpError', 'Disney+', res.status));
  const block = findEpisodesBlock(extractNextData(await res.text()));
  if (!block) throw new Error(t('disneyNoEpisodeList'));
  return block;
}

export async function syncDisney(
  seriesUrl: string,
  onProgress: (done: number, total: number) => Promise<void>,
): Promise<Episode[]> {
  const base = new URL(seriesUrl);
  base.search = '';
  const first = await fetchBlock(base.href);
  const seasons = first.seasons;
  const episodes = new Map<string, Episode>();
  await onProgress(0, seasons.length);

  for (const [i, season] of seasons.entries()) {
    const block =
      season.id === first.selectedSeasonId ? first : await fetchBlock(`${base.href}?season=${season.id}`);
    const seasonNumber = Number(season.name.match(/\d+/)?.[0] ?? i + 1);
    block.episodes.forEach((card, idx) => {
      episodes.set(card._id, {
        id: card._id,
        url: playUrl(base.href, card._id),
        ...parseEpisodeTitle(card.title, seasonNumber, idx + 1),
      });
    });
    await onProgress(i + 1, seasons.length);
  }
  if (!episodes.size) throw new Error(t('noEpisodesFound', 'Disney+'));
  return [...episodes.values()];
}
