import { browser, defineContentScript } from '#imports';

/**
 * Prévient le background quand la vidéo se termine, pour enchaîner sur un épisode aléatoire.
 * Le lecteur peut être dans un shadow DOM : on cherche donc les <video> régulièrement.
 */
export default defineContentScript({
  matches: ['*://*.disneyplus.com/*', '*://*.paramountplus.com/*'],
  main(ctx) {
    const watched = new WeakSet<HTMLVideoElement>();

    const onEnded = () => void browser.runtime.sendMessage({ type: 'ended' }).catch(() => {});

    const findVideos = (root: Document | ShadowRoot, out: HTMLVideoElement[] = []) => {
      root.querySelectorAll('video').forEach((v) => out.push(v));
      root.querySelectorAll('*').forEach((el) => el.shadowRoot && findVideos(el.shadowRoot, out));
      return out;
    };

    ctx.setInterval(() => {
      for (const video of findVideos(document)) {
        if (watched.has(video)) continue;
        watched.add(video);
        video.addEventListener('ended', onEnded);
      }
    }, 2000);
  },
});
