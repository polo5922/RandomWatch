import { browser, defineBackground, type Browser } from '#imports';
import { t } from '@/lib/i18n';
import { draw, emptyBag } from '@/lib/picker';
import { getShow, PLATFORM_HOST, SHOWS, playingEpisodeId, type ShowId } from '@/lib/shows';
import {
  artworkItem,
  bagsItem,
  catalogItem,
  sessionsItem,
  settingsItem,
  syncStatusItem,
  type PlaySession,
} from '@/lib/storage';
import { fetchArtwork } from '@/lib/sync/artwork';
import { syncDisney } from '@/lib/sync/disney';
import { syncParamount } from '@/lib/sync/paramount';
import type { Episode, Message, PickKey, PlayResult } from '@/lib/types';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
    handle(msg, sender).then(sendResponse, (err: unknown) =>
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    );
    return true; // réponse asynchrone (Chrome et Firefox)
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) void onTabUrl(tabId, changeInfo.url);
  });
  browser.tabs.onRemoved.addListener((tabId) => void setSession(tabId, null));
  browser.runtime.onInstalled.addListener(() => void ensureArtwork());
});

async function handle(msg: Message, sender: Browser.runtime.MessageSender): Promise<unknown> {
  switch (msg.type) {
    case 'play':
      return play(msg.key);
    case 'sync':
      void sync(msg.showId);
      return { ok: true };
    case 'artwork':
      void ensureArtwork();
      return { ok: true };
    case 'stop':
      await sessionsItem.setValue({});
      return { ok: true };
    case 'ended': {
      const tabId = sender.tab?.id;
      const session = tabId != null ? (await sessionsItem.getValue())[tabId] : undefined;
      // Ignoré tant que l'épisode lancé n'a pas chargé (évite un double tirage).
      if (tabId != null && session?.currentId) await play(session.key, tabId);
      return { ok: true };
    }
  }
}

// ---------- Tirage et lecture ----------

async function drawEpisode(key: PickKey): Promise<(Episode & { showId: ShowId }) | null> {
  const [catalog, settings, bags] = await Promise.all([
    catalogItem.getValue(),
    settingsItem.getValue(),
    bagsItem.getValue(),
  ]);
  const showIds = key === 'surprise' ? settings.surprise : [key];
  const pool = new Map<string, Episode & { showId: ShowId }>();
  for (const showId of showIds) {
    for (const ep of catalog[showId] ?? []) pool.set(ep.id, { ...ep, showId });
  }
  const result = draw(bags[key] ?? emptyBag(), [...pool.keys()]);
  if (!result) return null;
  await bagsItem.setValue({ ...bags, [key]: result.state });
  return pool.get(result.id)!;
}

async function play(key: PickKey, tabId?: number): Promise<PlayResult> {
  const episode = await drawEpisode(key);
  if (!episode) {
    return {
      ok: false,
      error:
        key === 'surprise' ? t('noEpisodesSurprise') : t('noEpisodesShow', getShow(key).name),
    };
  }

  const targetTab = tabId ?? (await findPlayerTab());
  const { autoplay } = await settingsItem.getValue();
  if (targetTab == null) {
    // Onglet vierge d'abord pour enregistrer la session avant le chargement du lecteur.
    const tab = await browser.tabs.create({ url: 'about:blank', active: true });
    await setSession(tab.id!, autoplay ? { key } : null);
    await browser.tabs.update(tab.id!, { url: episode.url });
  } else {
    await setSession(targetTab, autoplay ? { key } : null);
    await browser.tabs.update(targetTab, { url: episode.url, active: true });
  }
  return { ok: true, episode };
}

/** Réutilise l'onglet de lecture aléatoire, ou l'onglet actif s'il est déjà sur une plateforme. */
async function findPlayerTab(): Promise<number | undefined> {
  const sessions = await sessionsItem.getValue();
  for (const id of Object.keys(sessions)) {
    try {
      const tab = await browser.tabs.get(Number(id));
      if (tab.id != null) return tab.id;
    } catch {
      await setSession(Number(id), null);
    }
  }
  const [active] = await browser.tabs.query({ active: true, currentWindow: true });
  const host = active?.url ? new URL(active.url).hostname : '';
  if (active?.id != null && Object.values(PLATFORM_HOST).some((re) => re.test(host))) return active.id;
  return undefined;
}

async function setSession(tabId: number, session: PlaySession | null) {
  const sessions = await sessionsItem.getValue();
  if (session) sessions[tabId] = session;
  else if (tabId in sessions) delete sessions[tabId];
  else return;
  await sessionsItem.setValue(sessions);
}

/**
 * Suit l'URL des onglets en lecture aléatoire : quand la plateforme enchaîne
 * d'elle-même sur un autre épisode, on le remplace par un nouveau tirage.
 */
async function onTabUrl(tabId: number, url: string) {
  const session = (await sessionsItem.getValue())[tabId];
  if (!session) return;
  const id = playingEpisodeId(url);

  if (!session.currentId) {
    if (id) await setSession(tabId, { ...session, currentId: id });
    return;
  }
  if (!id) {
    // L'utilisateur a quitté le lecteur : fin de la lecture aléatoire dans cet onglet.
    await setSession(tabId, null);
  } else if (id !== session.currentId) {
    await play(session.key, tabId);
  }
}

// ---------- Synchronisation du catalogue ----------

const running = new Set<ShowId>();

async function sync(showId: ShowId) {
  if (running.has(showId)) return;
  running.add(showId);
  const setStatus = async (status: Parameters<typeof updateStatus>[1]) => updateStatus(showId, status);

  try {
    await setStatus({ running: true, done: 0, total: 0 });
    const show = getShow(showId);
    const url = (await settingsItem.getValue()).urls[showId] || show.defaultUrl;
    const onProgress = (done: number, total: number) => setStatus({ running: true, done, total });
    if (!show.defaultImage) void updateArtwork(showId, url);
    const episodes = await (show.platform === 'disney' ? syncDisney : syncParamount)(url, onProgress);
    episodes.sort((a, b) => a.season - b.season || a.number - b.number);

    const catalog = await catalogItem.getValue();
    await catalogItem.setValue({ ...catalog, [showId]: episodes });
    await setStatus({ running: false, done: 0, total: 0, finishedAt: Date.now() });
  } catch (err) {
    await setStatus({ running: false, done: 0, total: 0, error: err instanceof Error ? err.message : String(err) });
  } finally {
    running.delete(showId);
  }
}

/** Récupère le visuel des séries qui n'en ont pas encore (sans attendre une synchro). */
async function ensureArtwork() {
  const [artwork, settings] = await Promise.all([artworkItem.getValue(), settingsItem.getValue()]);
  await Promise.all(
    SHOWS.filter((s) => !artwork[s.id] && !s.defaultImage).map((s) => updateArtwork(s.id, settings.urls[s.id] || s.defaultUrl)),
  );
}

/** Le visuel est un bonus : un échec ne doit pas faire échouer la synchro. */
async function updateArtwork(showId: ShowId, url: string) {
  try {
    const image = await fetchArtwork(url);
    if (!image) return;
    const all = await artworkItem.getValue();
    await artworkItem.setValue({ ...all, [showId]: image });
  } catch {
    // Pas de visuel : la popup garde son fond dégradé.
  }
}

async function updateStatus(
  showId: ShowId,
  status: { running: boolean; done: number; total: number; error?: string; finishedAt?: number },
) {
  const all = await syncStatusItem.getValue();
  await syncStatusItem.setValue({ ...all, [showId]: { ...all[showId], ...status, error: status.error } });
}
