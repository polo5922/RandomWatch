import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { CircleAlert, Play, RefreshCw, Settings, Shuffle, Square } from 'lucide-react';
import { Logo, useBackgrounds } from '@/components/ui';
import { SHOWS, type ShowId } from '@/lib/shows';
import { bagsItem, catalogItem, sessionsItem, settingsItem, syncStatusItem } from '@/lib/storage';
import type { Message, PickKey, PlayResult } from '@/lib/types';
import { t } from '@/lib/i18n';
import { useStorage } from '@/lib/useStorage';
import ShowCard from './ShowCard';

const send = <T,>(msg: Message) => browser.runtime.sendMessage(msg) as Promise<T>;

export default function App() {
  const settings = useStorage(settingsItem);
  const catalog = useStorage(catalogItem) ?? {};
  const bags = useStorage(bagsItem) ?? {};
  const status = useStorage(syncStatusItem) ?? {};
  const sessions = useStorage(sessionsItem) ?? {};
  const backgrounds = useBackgrounds(settings);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();

  // Visuels des séries pas encore récupérés : le background les charge, la popup se met à jour seule.
  useEffect(() => {
    void send({ type: 'artwork' });
  }, []);

  if (!settings) return null;

  async function play(key: PickKey) {
    const res = await send<PlayResult>({ type: 'play', key });
    if (!res.ok || !res.episode) return setMessage({ text: res.error ?? t('unknownError'), error: true });
    const ep = res.episode;
    const show = SHOWS.find((s) => s.id === ep.showId)!;
    setMessage({ text: `${show.name} — S${ep.season}E${ep.number} ${ep.title}` });
  }

  const toggleSurprise = (id: ShowId, on: boolean) =>
    settingsItem.setValue({
      ...settings,
      surprise: on ? [...new Set([...settings.surprise, id])] : settings.surprise.filter((s) => s !== id),
    });

  const surpriseCount = settings.surprise.reduce((n, id) => n + (catalog[id]?.length ?? 0), 0);
  const anySyncRunning = SHOWS.some((s) => status[s.id]?.running);
  const surpriseShows = SHOWS.filter((s) => settings.surprise.includes(s.id));

  return (
    <main className="flex w-[380px] flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <Logo />
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight tracking-tight">RandomWatch</h1>
          <p className="text-xs text-zinc-400">{t('tagline')}</p>
        </div>
        <button
          className="grid size-9 place-items-center rounded-full bg-white/5 text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          onClick={() => browser.runtime.openOptionsPage()}
          title={t('options')}
          aria-label={t('options')}
        >
          <Settings className="size-4" />
        </button>
      </header>

      <button
        className="group relative overflow-hidden rounded-2xl p-4 text-left shadow-[0_8px_30px_-8px_rgba(217,70,239,0.7)] ring-1 ring-white/15 transition duration-300 hover:shadow-[0_10px_44px_-4px_rgba(217,70,239,0.85)] hover:ring-white/30 disabled:opacity-40 disabled:shadow-none"
        disabled={surpriseCount === 0}
        onClick={() => play('surprise')}
      >
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(surpriseShows.length, 1)}, 1fr)` }}
          aria-hidden
        >
          {surpriseShows.map((s) =>
            backgrounds[s.id] ? (
              <img key={s.id} src={backgrounds[s.id]} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
            ) : (
              <span key={s.id} style={{ background: s.color }} />
            ),
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/90 via-fuchsia-700/70 to-indigo-600/55" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <Shuffle className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-bold leading-tight">{t('surpriseTitle')}</span>
            <span className="block text-xs text-white/80">
              {t('surpriseCount', surpriseCount, settings.surprise.length)}
            </span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-fuchsia-700 shadow-lg transition group-hover:scale-110 group-disabled:scale-100">
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </div>
      </button>

      {message && (
        <p
          className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ring-1 ${
            message.error ? 'bg-red-950/60 text-red-200 ring-red-900/60' : 'bg-white/5 text-zinc-200 ring-white/10'
          }`}
        >
          {message.error ? (
            <CircleAlert className="mt-px size-4 shrink-0" />
          ) : (
            <Play className="mt-px size-4 shrink-0 fill-current text-fuchsia-400" />
          )}
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t('showsHeading')}</h2>
        {SHOWS.map((show) => (
          <ShowCard
            key={show.id}
            show={show}
            episodes={catalog[show.id] ?? []}
            bag={bags[show.id]}
            status={status[show.id]}
            image={backgrounds[show.id]}
            inSurprise={settings.surprise.includes(show.id)}
            onPlay={() => play(show.id)}
            onSync={() => send({ type: 'sync', showId: show.id })}
            onToggleSurprise={(on) => toggleSurprise(show.id, on)}
          />
        ))}
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-zinc-400">
        <button
          className="inline-flex items-center gap-1.5 transition hover:text-zinc-100 disabled:opacity-40 disabled:hover:text-zinc-400"
          disabled={anySyncRunning}
          onClick={() => SHOWS.forEach((s) => send({ type: 'sync', showId: s.id }))}
        >
          <RefreshCw className={`size-3.5 ${anySyncRunning ? 'animate-spin' : ''}`} />
          {t('syncAll')}
        </button>
        {Object.keys(sessions).length > 0 && (
          <button
            className="inline-flex items-center gap-1.5 transition hover:text-zinc-100"
            onClick={() => send({ type: 'stop' })}
          >
            <Square className="size-3 fill-current" />
            {t('stopAutoplay')}
          </button>
        )}
      </footer>
    </main>
  );
}
