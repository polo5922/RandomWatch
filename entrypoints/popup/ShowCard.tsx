import type { CSSProperties } from 'react';
import { CircleAlert, Film, Hourglass, Play, RefreshCw, Shuffle } from 'lucide-react';
import { PlatformBadge, ShowBackdrop, Switch } from '@/components/ui';
import { reconcile, type BagState } from '@/lib/picker';
import { t } from '@/lib/i18n';
import type { Show } from '@/lib/shows';
import type { Episode, SyncStatus } from '@/lib/types';

interface Props {
  show: Show;
  episodes: Episode[];
  bag?: BagState;
  status?: SyncStatus;
  image?: string;
  inSurprise: boolean;
  onPlay: () => void;
  onSync: () => void;
  onToggleSurprise: (on: boolean) => void;
}

function syncLabel(status?: SyncStatus) {
  if (!status?.running) return null;
  if (!status.done) return t('syncing');
  return status.total ? t('syncSeasonOf', status.done, status.total) : t('syncSeason', status.done);
}

export default function ShowCard({ show, episodes, bag, status, image, inSurprise, onPlay, onSync, onToggleSurprise }: Props) {
  const total = episodes.length;
  const left = bag ? reconcile(bag, episodes.map((e) => e.id), () => 0).remaining.length || total : total;
  const syncing = syncLabel(status);
  const progress = status?.running && status.total ? status.done / status.total : null;

  return (
    <section
      className="group relative overflow-hidden rounded-2xl bg-zinc-900 shadow-[0_6px_22px_-12px_var(--glow)] ring-1 ring-[color-mix(in_srgb,var(--glow)_35%,transparent)] transition duration-300 hover:shadow-[0_8px_34px_-8px_var(--glow)] hover:ring-[color-mix(in_srgb,var(--glow)_70%,transparent)]"
      style={{ '--glow': show.color } as CSSProperties}
    >
      <ShowBackdrop
        show={show}
        image={image}
        className="opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/5" />
      {/* Halo de la couleur de la série sur le bord gauche */}
      <div
        className="absolute inset-y-0 left-0 w-1/2 opacity-30 transition-opacity duration-300 group-hover:opacity-50"
        style={{ background: `radial-gradient(90% 120% at 0% 50%, ${show.color}, transparent 70%)` }}
      />
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ background: show.color, boxShadow: `0 0 12px 2px ${show.color}` }} />

      <div className="relative flex flex-col gap-3 p-3.5">
        <div className="flex items-center justify-between">
          <PlatformBadge show={show} />
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
            <Shuffle className="size-3.5" />
            {t('surprise')}
            <Switch checked={inSurprise} onChange={onToggleSurprise} label={t('includeInSurprise')} />
          </label>
        </div>

        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold leading-tight">
            <span className="size-2 shrink-0 rounded-full" style={{ background: show.color }} />
            {show.name}
          </h2>
          {total ? (
            <p className="mt-1 flex items-center gap-3 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1">
                <Film className="size-3.5 text-zinc-400" />
                {t('episodeCount', total)}
              </span>
              <span className="inline-flex items-center gap-1" title={t('leftTitle')}>
                <Hourglass className="size-3.5 text-zinc-400" />
                {t('leftCount', left)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">{t('notSynced')}</p>
          )}
          {status?.error && !status.running && (
            <p className="mt-1.5 flex items-start gap-1 text-xs text-red-300">
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              {status.error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 shadow-[0_0_14px_-2px_var(--glow)] transition hover:scale-[1.03] hover:shadow-[0_0_22px_2px_var(--glow)] disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
            disabled={!total}
            onClick={onPlay}
          >
            <Play className="size-4 fill-current" />
            {t('randomEpisode')}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-100 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/20 disabled:cursor-default disabled:hover:bg-white/10"
            disabled={!!syncing}
            onClick={onSync}
            title={t('syncTitle')}
          >
            <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ?? t('sync')}
          </button>
        </div>
      </div>

      {status?.running && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
          <div
            className={`h-full transition-[width] ${progress === null ? 'w-full animate-pulse' : ''}`}
            style={{ background: show.color, width: progress === null ? undefined : `${Math.max(progress, 0.04) * 100}%` }}
          />
        </div>
      )}
    </section>
  );
}
