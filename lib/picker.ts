/**
 * Tirage "sac mélangé" : chaque épisode sort une fois par cycle,
 * et le dernier épisode d'un cycle n'ouvre jamais le cycle suivant.
 */
export interface BagState {
  /** Épisodes encore à tirer dans le cycle en cours (ordre aléatoire). */
  remaining: string[];
  /** Épisodes déjà tirés dans le cycle en cours, le dernier en fin de tableau. */
  seen: string[];
}

export type Rng = () => number;

export const emptyBag = (): BagState => ({ remaining: [], seen: [] });

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Aligne le sac sur le catalogue : retire les épisodes disparus, insère les nouveaux au hasard. */
export function reconcile(state: BagState, allIds: readonly string[], rng: Rng = Math.random): BagState {
  const all = new Set(allIds);
  const remaining = state.remaining.filter((id) => all.has(id));
  const seen = state.seen.filter((id) => all.has(id));
  const known = new Set([...remaining, ...seen]);
  for (const id of allIds) {
    if (known.has(id)) continue;
    known.add(id);
    remaining.splice(Math.floor(rng() * (remaining.length + 1)), 0, id);
  }
  return { remaining, seen };
}

/** Tire le prochain épisode. Renvoie null si le catalogue est vide. */
export function draw(
  state: BagState,
  allIds: readonly string[],
  rng: Rng = Math.random,
): { id: string; state: BagState } | null {
  if (allIds.length === 0) return null;
  let { remaining, seen } = reconcile(state, allIds, rng);

  if (remaining.length === 0) {
    const last = seen.at(-1) ?? state.seen.at(-1);
    remaining = shuffle(allIds, rng);
    if (remaining.length > 1 && remaining[0] === last) {
      const j = 1 + Math.floor(rng() * (remaining.length - 1));
      [remaining[0], remaining[j]] = [remaining[j]!, remaining[0]!];
    }
    seen = [];
  }

  const [id, ...rest] = remaining as [string, ...string[]];
  return { id, state: { remaining: rest, seen: [...seen, id] } };
}
