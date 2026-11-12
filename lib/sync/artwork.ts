/**
 * Visuel d'une série : l'image de partage (og:image / twitter:image) de sa page publique
 * sur la plateforme, utilisée comme fond dans la popup et les options.
 */

export function extractArtwork(html: string, baseUrl: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const key of ['og:image', 'twitter:image']) {
    for (const tag of metas) {
      const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
      if (name?.toLowerCase() !== key) continue;
      const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!content) continue;
      try {
        const url = new URL(content.replace(/&amp;/g, '&'), baseUrl);
        if (url.protocol === 'https:') return url.href;
      } catch {
        // URL invalide : on essaie la balise suivante.
      }
    }
  }
  return null;
}

export async function fetchArtwork(seriesUrl: string): Promise<string | null> {
  const res = await fetch(seriesUrl, { credentials: 'omit' });
  if (!res.ok) return null;
  return extractArtwork(await res.text(), seriesUrl);
}
