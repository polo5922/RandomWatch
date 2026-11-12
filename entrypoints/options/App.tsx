import { useState, type ReactNode } from 'react';
import { CircleCheck, Database, Image, Link, Play, RotateCcw, Trash, Tv } from 'lucide-react';
import { Logo, PlatformBadge, ShowBackdrop, Switch, useBackgrounds } from '@/components/ui';
import { SHOWS, type ShowId } from '@/lib/shows';
import { artworkItem, bagsItem, catalogItem, settingsItem, syncStatusItem, type Settings } from '@/lib/storage';
import { t } from '@/lib/i18n';
import { useStorage } from '@/lib/useStorage';

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-zinc-900/60 p-6 ring-1 ring-white/10">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-fuchsia-300 ring-1 ring-white/10">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <span className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500">{icon}</span>
        <input
          type="url"
          className="w-full rounded-xl bg-zinc-950/70 py-2 pr-3 pl-9 text-sm ring-1 ring-white/10 transition placeholder:text-zinc-600 focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
        />
      </span>
    </label>
  );
}

export default function App() {
  const settings = useStorage(settingsItem);
  const backgrounds = useBackgrounds(settings);
  const [notice, setNotice] = useState<string>();

  if (!settings) return null;

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(undefined), 2500);
  };

  const update = (patch: Partial<Settings>) => settingsItem.setValue({ ...settings, ...patch });
  const setUrl = (id: ShowId, v: string) => update({ urls: { ...settings.urls, [id]: v } });
  const setBackground = (id: ShowId, v: string) => update({ backgrounds: { ...settings.backgrounds, [id]: v } });

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 grid grid-cols-4 opacity-40" aria-hidden>
          {SHOWS.map((show) => (
            <div key={show.id} className="relative">
              <ShowBackdrop show={show} image={backgrounds[show.id]} className="blur-[2px]" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/80 to-zinc-950" />
        <div className="relative mx-auto flex max-w-4xl items-center gap-4 px-6 pt-14 pb-8">
          <Logo size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RandomWatch</h1>
            <p className="text-sm text-zinc-400">{t('options')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
        <Section icon={<Play className="size-4" />} title={t('playback')}>
          <div className="flex items-center justify-between gap-6 rounded-xl bg-zinc-950/50 p-4 ring-1 ring-white/5">
            <div>
              <p className="font-medium">{t('autoplay')}</p>
              <p className="text-sm text-zinc-400">{t('autoplayDesc')}</p>
            </div>
            <Switch checked={settings.autoplay} onChange={(on) => update({ autoplay: on })} label={t('autoplay')} />
          </div>
        </Section>

        <Section
          icon={<Tv className="size-4" />}
          title={t('showsHeading')}
          description={t('showsDesc')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {SHOWS.map((show) => (
              <article key={show.id} className="overflow-hidden rounded-xl bg-zinc-950/50 ring-1 ring-white/10">
                <div className="relative h-28">
                  <ShowBackdrop show={show} image={backgrounds[show.id]} />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <span className="size-2 rounded-full" style={{ background: show.color }} />
                      {show.name}
                    </h3>
                    <PlatformBadge show={show} />
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <Field
                    icon={<Link className="size-4" />}
                    label={t('showPage')}
                    placeholder={show.defaultUrl}
                    value={settings.urls[show.id] ?? ''}
                    onChange={(v) => setUrl(show.id, v)}
                  />
                  <Field
                    icon={<Image className="size-4" />}
                    label={t('backgroundImage')}
                    placeholder={t('backgroundPlaceholder')}
                    value={settings.backgrounds?.[show.id] ?? ''}
                    onChange={(v) => setBackground(show.id, v)}
                  />
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section icon={<Database className="size-4" />} title={t('data')}>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm ring-1 ring-white/10 transition hover:bg-white/10"
              onClick={async () => {
                await bagsItem.setValue({});
                flash(t('resetHistoryDone'));
              }}
            >
              <RotateCcw className="size-4" />
              {t('resetHistory')}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-red-950/60 px-4 py-2 text-sm text-red-200 ring-1 ring-red-900/60 transition hover:bg-red-900/60"
              onClick={async () => {
                await Promise.all([
                  catalogItem.setValue({}),
                  bagsItem.setValue({}),
                  syncStatusItem.setValue({}),
                  artworkItem.setValue({}),
                ]);
                flash(t('clearAllDone'));
              }}
            >
              <Trash className="size-4" />
              {t('clearAll')}
            </button>
          </div>
          {notice && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
              <CircleCheck className="size-4" />
              {notice}
            </p>
          )}
        </Section>
      </main>
    </div>
  );
}
