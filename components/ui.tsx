import { useState } from 'react';
import { Tv } from 'lucide-react';
import logoUrl from '@/assets/logo.svg?url';
import { PLATFORM_LABEL, SHOWS, type Show, type ShowId } from '@/lib/shows';
import { artworkItem, type Settings } from '@/lib/storage';
import { useStorage } from '@/lib/useStorage';

/** Fond de chaque série : image personnalisée, sinon visuel par défaut de la série, sinon visuel de la plateforme. */
export function useBackgrounds(settings?: Settings): Partial<Record<ShowId, string>> {
  const artwork = useStorage(artworkItem) ?? {};
  const defaults = Object.fromEntries(SHOWS.filter((s) => s.defaultImage).map((s) => [s.id, s.defaultImage]));
  return { ...artwork, ...defaults, ...Object.fromEntries(Object.entries(settings?.backgrounds ?? {}).filter(([, v]) => v)) };
}

/** Logo de l'extension (même dessin que les icônes, cf. assets/logo.svg). */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <img
      src={logoUrl}
      alt="RandomWatch"
      className={`${size === 'lg' ? 'size-12' : 'size-9'} shrink-0 drop-shadow-[0_0_12px_rgba(217,70,239,0.55)]`}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 ${
        checked ? 'bg-fuchsia-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export function PlatformBadge({ show }: { show: Show }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-200 ring-1 ring-white/10 backdrop-blur">
      <Tv className="size-3" />
      {PLATFORM_LABEL[show.platform]}
    </span>
  );
}

/** Image de fond plein cadre, avec un dégradé aux couleurs de la série si elle manque ou ne charge pas. */
export function ShowBackdrop({ show, image, className = '' }: { show: Show; image?: string; className?: string }) {
  const [failed, setFailed] = useState<string>();
  const usable = image && failed !== image;
  return (
    <div
      className="absolute inset-0"
      style={{ background: `radial-gradient(120% 140% at 100% 0%, ${show.color}66, transparent 60%), #18181b` }}
      aria-hidden
    >
      {usable && (
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(image)}
          className={`size-full object-cover ${className}`}
        />
      )}
    </div>
  );
}
