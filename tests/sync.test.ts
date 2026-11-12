import { describe, expect, it } from 'vitest';
import { playingEpisodeId, SHOWS } from '../lib/shows';
import { findEpisodesBlock, parseEpisodeTitle, playUrl, syncDisney } from '../lib/sync/disney';
import { showSlug, syncParamount, toEpisode } from '../lib/sync/paramount';

describe('disney', () => {
  it('parses "S3:E1 Title"', () => {
    expect(parseEpisodeTitle('S3:E1 Camp de réfougiés', 0, 0)).toEqual({
      season: 3,
      number: 1,
      title: 'Camp de réfougiés',
    });
    expect(parseEpisodeTitle('Spécial', 4, 7)).toEqual({ season: 4, number: 7, title: 'Spécial' });
  });

  it('builds play urls with the locale', () => {
    expect(playUrl('https://www.disneyplus.com/fr-fr/browse/entity-x', 'abc')).toBe(
      'https://www.disneyplus.com/fr-fr/play/abc',
    );
    expect(playUrl('https://www.disneyplus.com/browse/entity-x', 'abc')).toBe('https://www.disneyplus.com/play/abc');
  });

  it('finds the Episodes block anywhere in the page data', () => {
    const block = { _type: 'Episodes', seasons: [], selectedSeasonId: 's', episodes: [] };
    expect(findEpisodesBlock({ props: { a: [{}, { b: block }] } })).toBe(block);
    expect(findEpisodesBlock({})).toBeNull();
  });
});

describe('paramount', () => {
  it('extracts the show slug and episode', () => {
    expect(showSlug('https://www.paramountplus.com/fr/shows/south-park/')).toBe('south-park');
    expect(
      toEpisode('https://www.paramountplus.com', {
        content_id: 'ID1',
        url: '/fr/shows/video/ID1/',
        season_number: '5',
        episode_number: '1',
        label: 'Scott Tenorman doit mourir',
      }),
    ).toEqual({
      id: 'ID1',
      url: 'https://www.paramountplus.com/fr/shows/video/ID1/',
      season: 5,
      number: 1,
      title: 'Scott Tenorman doit mourir',
    });
  });
});

describe('playingEpisodeId', () => {
  it('reads the episode id from player urls', () => {
    expect(playingEpisodeId('https://www.disneyplus.com/fr-fr/play/85b82e37-39c0')).toBe('85b82e37-39c0');
    expect(playingEpisodeId('https://www.paramountplus.com/fr/shows/video/PS7x_Fv/')).toBe('PS7x_Fv');
    expect(playingEpisodeId('https://www.disneyplus.com/fr-fr/browse/entity-x')).toBeNull();
    expect(playingEpisodeId('https://example.com/play/x')).toBeNull();
  });
});

// Appels réels aux plateformes : `LIVE=1 npm test`
declare const process: { env: Record<string, string | undefined> };
describe.runIf(process.env.LIVE)('live sync', () => {
  const noop = async () => {};
  for (const show of SHOWS) {
    it(`syncs ${show.name}`, { timeout: 180_000 }, async () => {
      const eps = await (show.platform === 'disney' ? syncDisney : syncParamount)(show.defaultUrl, noop);
      const seasons = new Set(eps.map((e) => e.season));
      console.log(`${show.name}: ${eps.length} épisodes, ${seasons.size} saisons, ex. ${JSON.stringify(eps[0])}`);
      expect(eps.length).toBeGreaterThan(100);
    });
  }
});

describe('artwork', () => {
  it('reads og:image, falling back to twitter:image', async () => {
    const { extractArtwork } = await import('../lib/sync/artwork');
    const base = 'https://www.paramountplus.com/shows/south-park/';
    expect(
      extractArtwork('<meta content="https://img.example.com/a.jpg?w=1&amp;h=2" property="og:image">', base),
    ).toBe('https://img.example.com/a.jpg?w=1&h=2');
    expect(extractArtwork("<meta name='twitter:image' content='/b.jpg'>", base)).toBe(
      'https://www.paramountplus.com/b.jpg',
    );
    expect(extractArtwork('<meta property="og:image" content="http://insecure/c.jpg">', base)).toBeNull();
    expect(extractArtwork('<title>rien</title>', base)).toBeNull();
  });
});
