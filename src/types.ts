export type UserRole = 'admin' | 'collector';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type CardStyle = 'painterly' | 'pixel' | 'comic' | 'gothic' | 'neon' | 'stained_glass' | 'watercolor' | 'holographic';
export type MagicType = 'none' | 'arcane' | 'nature' | 'fire' | 'water' | 'shadow' | 'holy' | 'chaos' | 'swamp' | 'tech';
export type FrameStyle = 'classic' | 'ornate' | 'minimal' | 'rune' | 'hextech' | 'swamp';
export type HolofoilPattern = 'none' | 'linear' | 'radial' | 'galaxy' | 'prism';
export type CardKind = 'creature' | 'object' | 'land' | 'spell' | 'enchantment';
export type ArtFilter = 'none' | 'shiny' | 'blur' | 'holo' | 'chrome' | 'vignette' | 'swamp' | 'neon' | 'pixel';
export type BorderFinish = 'matte' | 'shiny' | 'metallic' | 'neon' | 'prism' | 'swamp';

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
export const CARD_STYLES: CardStyle[] = ['painterly', 'pixel', 'comic', 'gothic', 'neon', 'stained_glass', 'watercolor', 'holographic'];
export const MAGIC_TYPES: MagicType[] = ['none', 'arcane', 'nature', 'fire', 'water', 'shadow', 'holy', 'chaos', 'swamp', 'tech'];
export const FRAME_STYLES: FrameStyle[] = ['classic', 'ornate', 'rune', 'swamp'];
export const HOLOFOIL_PATTERNS: HolofoilPattern[] = ['none', 'linear'];
export const CARD_KINDS: CardKind[] = ['creature', 'object', 'land', 'spell', 'enchantment'];
export const ART_FILTERS: ArtFilter[] = ['none', 'shiny', 'blur', 'holo', 'chrome', 'vignette', 'swamp', 'neon', 'pixel'];
export const CATALOG_ART_FILTERS: ArtFilter[] = ART_FILTERS.filter((filter) => filter !== 'holo' && filter !== 'shiny');
export const BORDER_FINISHES: BorderFinish[] = ['matte', 'shiny', 'metallic', 'neon', 'prism', 'swamp'];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
  mythic: 'Mythique',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#94a3b8',
  uncommon: '#34d399',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#fb7185',
};

/** Mix catalogue raisonnable, aligné sur un booster standard. */
export const CATALOG_RARITY_TARGETS: Record<Rarity, number> = {
  common: 62,
  uncommon: 22,
  rare: 10,
  epic: 4,
  legendary: 1,
  mythic: 1,
};

export const STYLE_LABELS: Record<CardStyle, string> = {
  painterly: 'Peinture',
  pixel: 'Pixel',
  comic: 'Comics',
  gothic: 'Gothique',
  neon: 'Néon',
  stained_glass: 'Vitrail',
  watercolor: 'Aquarelle',
  holographic: 'Holo',
};

export const MAGIC_LABELS: Record<MagicType, string> = {
  none: 'Aucune',
  arcane: 'Arcane',
  nature: 'Nature',
  fire: 'Feu',
  water: 'Eau',
  shadow: 'Ombre',
  holy: 'Sacré',
  chaos: 'Chaos',
  swamp: 'Marais',
  tech: 'Tech',
};

export const KIND_LABELS: Record<CardKind, string> = {
  creature: 'Créature',
  object: 'Objet',
  land: 'Terrain',
  spell: 'Sort',
  enchantment: 'Enchantement',
};

export const FILTER_LABELS: Record<ArtFilter, string> = {
  none: 'Aucun',
  shiny: 'Brillant',
  blur: 'Flou',
  holo: 'Holo',
  chrome: 'Chrome',
  vignette: 'Vignette',
  swamp: 'Marais',
  neon: 'Néon',
  pixel: 'Pixel',
};

export const BORDER_FINISH_LABELS: Record<BorderFinish, string> = {
  matte: 'Mat',
  shiny: 'Brillant',
  metallic: 'Métallique',
  neon: 'Néon',
  prism: 'Prisme',
  swamp: 'Marais',
};

export const FRAME_LABELS: Record<FrameStyle, string> = {
  classic: 'Classique',
  ornate: 'Orné',
  minimal: 'Classique',
  rune: 'Runes',
  hextech: 'Classique',
  swamp: 'Marais',
};

export function kindHasCombatStats(kind: CardKind): boolean {
  return kind === 'creature';
}

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  createdAt?: string;
  lastLogin?: string | null;
  unopenedBoosters?: number;
  collectedCopies?: number;
}

export interface Universe {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  accentColor: string;
  backdropColor: string;
}

export interface Edition {
  id: number;
  universeId: number;
  universeName?: string;
  name: string;
  code: string;
  number: number;
  description: string | null;
  releasedAt: string | null;
  coverColor: string;
  cardCount?: number;
}

export interface Card {
  id: number;
  universeId: number;
  universeName?: string;
  universeSlug?: string;
  editionId: number;
  editionName?: string;
  editionCode?: string;
  editionNumber?: number;
  collectorNumber: number;
  name: string;
  subtitle: string | null;
  description: string | null;
  flavorText: string | null;
  style: CardStyle;
  magicType: MagicType;
  kind: CardKind;
  subtype: string | null;
  rarity: Rarity;
  foil: boolean;
  animated: boolean;
  borderColor: string;
  backColor: string;
  glowColor: string;
  textColor: string;
  frameStyle: FrameStyle;
  holofoilPattern: HolofoilPattern;
  power: number | null;
  toughness: number | null;
  artist: string | null;
  artSeed: string;
  artUrl: string | null;
  artFilter: ArtFilter;
  borderFinish: BorderFinish;
  artAnimatedUrl: string | null;
  giphyUrl: string | null;
  animatedUnlockCopies: number;
}

export type RarityWeights = Record<Rarity, number>;

export interface BoosterTemplate {
  id: number;
  name: string;
  presetKey?: string | null;
  description: string | null;
  universeId: number | null;
  universeName?: string | null;
  editionId: number | null;
  editionName?: string | null;
  cardCount: number;
  rarityWeights: RarityWeights;
  averageRarity: Rarity;
  guaranteedRarity: Rarity;
  foilChance: number;
  animatedChance: number;
  allowDuplicates: boolean;
  artUrl: string | null;
}

export interface JiraStatus {
  configured: boolean;
  baseUrl: string | null;
  email: string | null;
  tokenSet: boolean;
  reachable?: boolean;
  error?: string | null;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string | null;
  endDate?: string | null;
  completeDate?: string | null;
  boardId?: number;
}

export interface SuggestedPack {
  templateId: number;
  name: string;
  quantity: number;
  reason: string;
}

export interface SprintContributor {
  jiraName: string;
  jiraEmail: string | null;
  userId: number | null;
  username: string | null;
  issuesDone: number;
  issuesInProgress?: number;
  issuesTotal: number;
  storyPoints: number;
  storyPointsCommitted?: number;
  completionPct?: number;
  suggestedCards: number;
  suggestedPacks: SuggestedPack[];
}

export interface SprintMetrics {
  sprint: {
    id: number;
    name: string;
    state: string;
    startDate: string | null;
    endDate: string | null;
    completeDate: string | null;
  };
  points: {
    committed: number;
    completed: number;
    remaining: number;
    added: number;
    startPct: number;
    endPct: number;
  };
  issues: {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    donePct: number;
    bugs: number;
    stories: number;
    unestimated: number;
    unassigned: number;
  };
  time: {
    elapsedPct: number;
    daysTotal: number;
    daysLeft: number;
    ahead: boolean | null;
  };
}

export interface SprintRewardGuide {
  storyPointsField: string | null;
  totals: {
    storyPoints: number;
    issuesDone: number;
    suggestedCards: number;
    suggestedBoosters: number;
    matched: number;
  };
  metrics?: SprintMetrics;
  contributors: SprintContributor[];
}

export interface UserBooster {
  id: number;
  templateId: number;
  templateName: string;
  universeName: string | null;
  editionName: string | null;
  cardCount: number;
  averageRarity: Rarity;
  grantedAt: string;
  openedAt: string | null;
  artUrl: string | null;
}

export interface PulledCopy {
  id: number;
  serial: string;
  foil: boolean;
  animated: boolean;
  isNew: boolean;
  copies: number;
  dropChance: number;
  card: Card;
}

export interface NotebookSummary {
  editionId: number;
  editionName: string;
  editionCode: string;
  editionNumber: number;
  universeName: string;
  universeSlug: string;
  coverColor: string;
  accentColor: string;
  totalSlots: number;
  ownedSlots: number;
  collectedSlots: number;
  copies: number;
  unplaced: number;
}

export interface NotebookSlot {
  collectorNumber: number;
  card: Card | null;
  owned: boolean;
  placed: boolean;
  copies: number;
  placedCopies: number;
  foilCopies: number;
  animatedCopies: number;
  placedCopyId: number | null;
  placedFoil: boolean;
  placedAnimated: boolean;
}

export interface BinderPocket {
  slotIndex: number;
  copy: LooseCopy | null;
}

export interface LooseCopy {
  id: number;
  serial: string;
  foil: boolean;
  animated: boolean;
  card: Card;
}

export interface NotebookDetail {
  summary: NotebookSummary;
  slots: NotebookSlot[];
  pockets: BinderPocket[];
  pile: LooseCopy[];
}

export function emptyCard(): Card {
  return {
    id: 0,
    universeId: 0,
    editionId: 0,
    collectorNumber: 0,
    name: '',
    subtitle: '',
    description: '',
    flavorText: '',
    style: 'painterly',
    magicType: 'arcane',
    kind: 'creature',
    subtype: '',
    rarity: 'rare',
    foil: false,
    animated: false,
    borderColor: RARITY_COLORS.rare,
    backColor: '#1a1028',
    glowColor: RARITY_COLORS.rare,
    textColor: '#f4efe6',
    frameStyle: 'classic',
    holofoilPattern: 'none',
    power: null,
    toughness: null,
    artist: '',
    artSeed: 'preview-card',
    artUrl: '',
    artFilter: 'none',
    borderFinish: 'matte',
    artAnimatedUrl: '',
    giphyUrl: '',
    animatedUnlockCopies: 5,
  };
}

export function hydrateCard(card: Partial<Card> = {}): Card {
  const base = emptyCard();
  return {
    ...base,
    ...card,
    name: card.name ?? '',
    subtitle: card.subtitle ?? '',
    description: card.description ?? '',
    flavorText: card.flavorText ?? '',
    subtype: card.subtype ?? '',
    artist: card.artist ?? '',
    artSeed: card.artSeed ?? base.artSeed,
    artUrl: card.artUrl ?? '',
    artFilter: card.artFilter ?? 'none',
    borderFinish: card.borderFinish ?? 'matte',
    artAnimatedUrl: card.artAnimatedUrl ?? '',
    giphyUrl: card.giphyUrl ?? '',
    animatedUnlockCopies: card.animatedUnlockCopies ?? 5,
    textColor: card.textColor ?? base.textColor,
    kind: card.kind ?? 'creature',
    rarity: card.rarity ?? base.rarity,
    borderColor: RARITY_COLORS[(card.rarity ?? base.rarity)],
    frameStyle: card.frameStyle === 'minimal' || card.frameStyle === 'hextech' ? 'classic' : (card.frameStyle ?? base.frameStyle),
    holofoilPattern: !card.holofoilPattern || card.holofoilPattern === 'none' ? 'none' : 'linear',
  };
}

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
