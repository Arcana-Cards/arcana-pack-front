<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Cartes</h1>
        <p class="lede">{{ visible.length }} carte{{ visible.length > 1 ? 's' : '' }} · filtre et trie le catalogue.</p>
      </div>
      <div class="row">
        <RouterLink class="btn" to="/admin/cards/import">Collection IA</RouterLink>
        <RouterLink class="btn primary" to="/admin/cards/new">Nouvelle carte</RouterLink>
      </div>
    </div>
    <div class="toolbar">
      <label>Univers
        <select v-model.number="universeId">
          <option :value="0">Tous</option>
          <option v-for="u in universes" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </label>
      <label>Édition
        <select v-model.number="editionId">
          <option :value="0">Toutes</option>
          <option v-for="e in editionsForFilter" :key="e.id" :value="e.id">{{ e.name }} ({{ e.code }})</option>
        </select>
      </label>
      <label>Rareté
        <select v-model="rarity">
          <option value="">Toutes</option>
          <option v-for="r in RARITIES" :key="r" :value="r">{{ RARITY_LABELS[r] }}</option>
        </select>
      </label>
      <label>Type
        <select v-model="kind">
          <option value="">Tous</option>
          <option v-for="k in CARD_KINDS" :key="k" :value="k">{{ KIND_LABELS[k] }}</option>
        </select>
      </label>
      <label>Magie
        <select v-model="magicType">
          <option value="">Toutes</option>
          <option v-for="m in MAGIC_TYPES" :key="m" :value="m">{{ MAGIC_LABELS[m] }}</option>
        </select>
      </label>
      <label>Trier par
        <select v-model="sortKey">
          <option v-for="option in SORT_OPTIONS" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
      </label>
      <button class="btn" type="button" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
        {{ sortDir === 'asc' ? 'Croissant' : 'Décroissant' }}
      </button>
    </div>
    <p v-if="!visible.length" class="empty">Aucune carte pour ces critères.</p>
    <div class="grid cards">
      <RouterLink v-for="card in visible" :key="card.id" :to="`/admin/cards/${card.id}`">
        <TradingCard :card="card" compact :owned-copies="1" />
      </RouterLink>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import TradingCard from '@/components/TradingCard.vue';
import { api } from '@/api/client';
import {
  CARD_KINDS, KIND_LABELS, MAGIC_LABELS, MAGIC_TYPES, RARITIES, RARITY_LABELS,
  type Card, type CardKind, type Edition, type MagicType, type Rarity, type Universe,
} from '@/types';

type SortKey = 'number' | 'name' | 'rarity' | 'kind' | 'magic' | 'power' | 'edition';

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'number', label: 'N° collecteur' },
  { id: 'name', label: 'Nom' },
  { id: 'rarity', label: 'Rareté' },
  { id: 'kind', label: 'Type de carte' },
  { id: 'magic', label: 'Magie' },
  { id: 'power', label: 'Attaque' },
  { id: 'edition', label: 'Édition' },
];

const route = useRoute();
const cards = ref<Card[]>([]);
const universes = ref<Universe[]>([]);
const editions = ref<Edition[]>([]);
const universeId = ref(Number(route.query.universeId) || 0);
const editionId = ref(Number(route.query.editionId) || 0);
const rarity = ref<Rarity | ''>('');
const kind = ref<CardKind | ''>('');
const magicType = ref<MagicType | ''>('');
const sortKey = ref<SortKey>('number');
const sortDir = ref<'asc' | 'desc'>('asc');

const editionsForFilter = computed(() => (
  universeId.value ? editions.value.filter((ed) => ed.universeId === universeId.value) : editions.value
));

const visible = computed(() => {
  const list = cards.value.filter((card) => {
    if (universeId.value && card.universeId !== universeId.value) return false;
    if (editionId.value && card.editionId !== editionId.value) return false;
    if (rarity.value && card.rarity !== rarity.value) return false;
    if (kind.value && card.kind !== kind.value) return false;
    if (magicType.value && card.magicType !== magicType.value) return false;
    return true;
  });
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => compareCards(a, b, sortKey.value) * dir);
});

function compareCards(a: Card, b: Card, key: SortKey) {
  if (key === 'name') return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  if (key === 'rarity') return RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity);
  if (key === 'kind') return CARD_KINDS.indexOf(a.kind) - CARD_KINDS.indexOf(b.kind);
  if (key === 'magic') return MAGIC_TYPES.indexOf(a.magicType) - MAGIC_TYPES.indexOf(b.magicType);
  if (key === 'power') return (a.power ?? -1) - (b.power ?? -1);
  if (key === 'edition') {
    const edition = (a.editionName || '').localeCompare(b.editionName || '', 'fr', { sensitivity: 'base' });
    return edition || a.collectorNumber - b.collectorNumber;
  }
  const number = a.collectorNumber - b.collectorNumber;
  if (number) return number;
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

watch(universeId, () => {
  if (editionId.value && !editionsForFilter.value.some((ed) => ed.id === editionId.value)) {
    editionId.value = 0;
  }
});

onMounted(async () => {
  [cards.value, universes.value, editions.value] = await Promise.all([
    api<Card[]>('/admin/cards'),
    api<Universe[]>('/admin/universes'),
    api<Edition[]>('/admin/editions'),
  ]);
  if (editionId.value) {
    const match = editions.value.find((ed) => ed.id === editionId.value);
    if (match && !universeId.value) universeId.value = match.universeId;
  }
});
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 14px;
  margin-bottom: 18px;
  align-items: end;
}
.toolbar label {
  display: grid;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--muted);
  letter-spacing: .04em;
  text-transform: uppercase;
}
.toolbar select { min-width: 160px; }
.empty { color: var(--muted); padding: 28px 0; }
</style>
