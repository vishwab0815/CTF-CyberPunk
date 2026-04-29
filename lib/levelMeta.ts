import { normalizeLevelId } from './levelIds';

export type LevelId = '1' | '2' | '3' | '4' | '5' | '6' | '7';

export interface LevelMeta {
  id: LevelId;
  displayLevel: number;
  title: string;
  shortTitle: string;
  tagline: string;
  storyIntro: string;
  hint?: string;
  order: number;
}

export const LEVEL_META: Record<LevelId, LevelMeta> = {
  '1': {
    id: '1',
    displayLevel: 1,
    title: 'Chapter I — Echoes of the Archive',
    shortTitle: 'Echoes of the Archive',
    tagline: 'Old infrastructure leaves traces. Read between the comments.',
    storyIntro:
      "You arrive at a dimly-lit datacafe where devs once left breadcrumbs. The old DNS archive hums in the background — careful inspection reveals whispers the corporation hoped you'd forget.",
    hint: 'Try viewing the page source or scanning for developer notes.',
    order: 1,
  },
  '2': {
    id: '2',
    displayLevel: 2,
    title: 'Chapter II — Broken Ledger',
    shortTitle: 'Broken Ledger',
    tagline: 'Client-side rules are only as strong as the client.',
    storyIntro:
      "A patched input field bars your way with a polite limit. The ledger assumes honest readers — but reality in Neon City rewards those who test assumptions.",
    hint: 'Client-side restrictions can be bypassed from DevTools or by calling the API directly.',
    order: 2,
  },
  '3': {
    id: '3',
    displayLevel: 3,
    title: 'Chapter III — Illusion of Control',
    shortTitle: 'Illusion of Control',
    tagline: 'GUI guards are theatre; the backstage tells the truth.',
    storyIntro:
      "The console mutters a mantra of protection. It looks secure from the stage, but backstage the props are flimsy. You know how to pull the curtain.",
    hint: 'Experiment with devtools and runtime manipulation to bypass JavaScript checks.',
    order: 3,
  },
  '4': {
    id: '4',
    displayLevel: 4,
    title: 'Chapter IV — Ghost Endpoint',
    shortTitle: 'Ghost Endpoint',
    tagline: 'Hidden doors open if you know where to knock.',
    storyIntro:
      "While poking around the network map you discover a forgotten admin panel — an off-ramp from the main highway, dusty but functional. Some doors were never locked.",
    hint: 'Look for undocumented API routes and legacy endpoints.',
    order: 4,
  },
  '5': {
    id: '5',
    displayLevel: 5,
    title: 'Chapter V — The Ghost Admin',
    shortTitle: 'The Ghost Admin',
    tagline: 'Access control mistakes let phantoms walk the halls.',
    storyIntro:
      "The corp kept its skeleton keys in plain sight. One ID can masquerade as another if the checks are naive. Find the ghost account to continue.",
    hint: 'Try enumerating profiles and look for high-value IDs.',
    order: 5,
  },
  '6': {
    id: '6',
    displayLevel: 6,
    title: 'Chapter VI — The Gauntlet',
    shortTitle: 'The Gauntlet',
    tagline: 'Five trials separate you from the core.',
    storyIntro:
      "The core guarded itself with a theatrical defense: a multi-phase gauntlet that tests reflex, memory, pattern recognition and patience. Survive the choreography to earn the final key.",
    hint: 'Complete each phase in sequence; pay attention to timing and precise order.',
    order: 6,
  },
  '7': {
    id: '7',
    displayLevel: 7,
    title: 'Chapter VII — The Silent Database',
    shortTitle: 'The Silent Database',
    tagline: 'Queries whisper answers if you know how to listen.',
    storyIntro:
      "Buried beneath layers of indices is an archive that speaks in queries. Ask the right question and the silence returns a secret that changes everything.",
    hint: 'Use advanced query techniques for deeper reconnaissance.',
    order: 7,
  },
};

export function getDisplayLevel(levelId: string): number | null {
  const meta = LEVEL_META[normalizeLevelId(levelId) as LevelId];
  return meta?.displayLevel ?? null;
}

export default LEVEL_META;
