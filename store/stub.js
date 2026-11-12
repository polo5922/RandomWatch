// Fausses API d'extension pour afficher la popup / les options hors extension (visuels du store).
// Paramètres d'URL : lang=en|fr, state=default|syncing|progress
(() => {
  const params = new URLSearchParams(location.search);
  const lang = params.get('lang') || 'en';
  const state = params.get('state') || 'default';
  // art=none : fonds abstraits aux couleurs des séries, sans visuel tiers (README public).
  const noArt = params.get('art') === 'none';

  const xhr = new XMLHttpRequest();
  xhr.open('GET', `/_locales/${lang}/messages.json`, false);
  xhr.send();
  const msgs = JSON.parse(xhr.responseText);

  const img = (id) =>
    `https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/${id}/compose?aspectRatio=1.78&format=webp&width=1200`;
  const eps = (show, n) =>
    Array.from({ length: n }, (_, i) => ({ id: `${show}-${i}`, url: '#', season: 1 + Math.floor(i / 22), number: (i % 22) + 1, title: '' }));
  const catalog = {
    simpsons: eps('simpsons', 790),
    americandad: eps('americandad', 362),
    familyguy: eps('familyguy', 424),
    southpark: eps('southpark', 334),
  };
  const data = {
    settings: { surprise: ['simpsons', 'americandad', 'familyguy', 'southpark'], autoplay: true, urls: {} },
    artwork: {
      simpsons: img('46f2b4ab-8419-44be-9dc8-da2170bb17ce'),
      americandad: img('b68ec977-bce9-4445-a0b5-e9b07b50f03c'),
      familyguy: img('43067158-0630-4865-a07a-a88ba2946377'),
    },
    catalog,
    syncStatus: {},
    bags: {},
    sessions: {},
  };
  if (noArt) {
    const abstract = (a, b) =>
      'data:image/svg+xml,' +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
        <rect width="400" height="225" fill="url(#g)"/>
        <circle cx="320" cy="40" r="110" fill="#fff" opacity=".12"/><circle cx="360" cy="190" r="70" fill="#000" opacity=".18"/>
        <circle cx="250" cy="150" r="40" fill="#fff" opacity=".08"/></svg>`);
    data.settings.backgrounds = {
      simpsons: abstract('#facc15', '#ea580c'),
      americandad: abstract('#ef4444', '#7c2d12'),
      familyguy: abstract('#22c55e', '#0f766e'),
      southpark: abstract('#3b82f6', '#312e81'),
    };
    data.artwork = {};
  }
  if (state === 'syncing') {
    delete catalog.southpark;
    data.syncStatus = { southpark: { running: true, done: 11, total: 27 } };
  }
  if (state === 'progress') {
    const left = { simpsons: 512, americandad: 97, familyguy: 301, southpark: 18 };
    for (const [show, n] of Object.entries(left)) {
      data.bags[show] = { remaining: catalog[show].slice(0, n).map((e) => e.id), seen: [] };
    }
    data.sessions = { 1: { key: 'surprise', currentId: 'x' } };
  }

  const listeners = new Set();
  const ev = { addListener() {}, removeListener() {}, hasListener: () => false };
  const local = {
    get: async (keys) => {
      const ks = keys == null ? Object.keys(data) : [].concat(keys);
      return Object.fromEntries(ks.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    set: async (o) => {
      const changes = Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { oldValue: data[k], newValue: v }]));
      Object.assign(data, o);
      listeners.forEach((l) => l(changes, 'local'));
    },
    remove: async () => {},
    clear: async () => {},
    onChanged: { addListener: (l) => listeners.add(l), removeListener: (l) => listeners.delete(l), hasListener: () => false },
  };

  // Tirage simulé : épisodes « réalistes » piochés dans une liste fixe.
  const picks = [
    { showId: 'southpark', season: 13, number: 6 },
    { showId: 'simpsons', season: 7, number: 12 },
    { showId: 'familyguy', season: 4, number: 9 },
    { showId: 'americandad', season: 5, number: 3 },
  ];
  let pickIndex = 0;

  globalThis.chrome = globalThis.browser = {
    runtime: {
      id: 'store-preview',
      getURL: (p) => p,
      openOptionsPage() {},
      onMessage: ev,
      sendMessage: async (msg) => {
        if (msg.type !== 'play') return { ok: true };
        const p = msg.key === 'surprise' ? picks[pickIndex++ % picks.length] : { ...picks.find((x) => x.showId === msg.key) };
        return { ok: true, episode: { id: 'x', url: '#', title: '', ...p } };
      },
    },
    storage: { local, session: local, sync: local, managed: local, onChanged: local.onChanged },
    i18n: {
      getUILanguage: () => lang,
      getMessage: (k, s = []) => (msgs[k]?.message ?? '').replace(/\$(\d)/g, (_, i) => s[i - 1] ?? ''),
    },
  };
})();
