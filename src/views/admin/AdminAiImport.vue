<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Collection IA</h1>
        <p class="lede">L’IA suit ta consigne : sujet, exclusions, raretés chiffrées. Les GIFs doivent coller à la demande.</p>
      </div>
      <RouterLink class="btn" to="/admin/cards">Retour</RouterLink>
    </div>

    <p v-if="!status.openai" class="error">OPENAI_API_KEY manquante dans le backend.</p>
    <p v-else-if="!status.giphy" class="lede">Sans clé Giphy, colle des liens de GIFs : l’IA les transforme en cartes. Avec une clé, elle peut aussi chercher toute seule.</p>

    <form class="panel form-grid" @submit.prevent="generate">
      <label>Univers
        <select v-model.number="universeId" required>
          <option disabled :value="0">Choisir</option>
          <option v-for="u in universes" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </label>
      <label v-if="!newEdition">Édition
        <select v-model.number="editionId" required>
          <option disabled :value="0">Choisir</option>
          <option v-for="e in editionsForUniverse" :key="e.id" :value="e.id">{{ e.name }} ({{ e.code }})</option>
        </select>
      </label>
      <label v-else>Nom de la nouvelle édition
        <input v-model="editionName" type="text" placeholder="Contes des fées" required />
      </label>
      <button class="btn edition-toggle" type="button" @click="toggleNewEdition">
        {{ newEdition ? 'Édition existante' : 'Nouvelle édition' }}
      </button>
      <label class="count-field">Nombre de cartes
        <input v-model.number="count" type="number" min="4" max="24" />
      </label>
      <label class="span-2">Thème
        <textarea v-model="theme" rows="3" placeholder="Personnages secondaires de Shrek (pas Shrek, pas l’âne). 13 communes et 3 peu communes." required />
        <small>La consigne est suivie : exclusions, qui a le droit d’être sur une carte, et le nombre par rareté.</small>
      </label>
      <label class="span-2">Liens Giphy (un par ligne, optionnel)
        <textarea v-model="urls" rows="5" placeholder="https://giphy.com/gifs/…" />
        <small>Ces GIFs sont utilisés tels quels, une carte chacun. L’IA n’en cherche d’autres que s’il en manque pour atteindre le nombre.</small>
      </label>
      <div class="actions span-2">
        <button class="btn primary" type="submit" :disabled="busy || !status.openai">{{ busy ? 'Génération…' : 'Générer les cartes' }}</button>
      </div>
      <div v-if="busy" class="progress-panel span-2">
        <div class="progress-meta">
          <strong>{{ progress.label || 'Génération en cours…' }}</strong>
          <span>{{ progress.percent }}%</span>
        </div>
        <div class="bar" :class="{ wait: progress.step === 'wait' }">
          <i :style="{ width: `${Math.max(4, progress.percent)}%` }" />
        </div>
        <ol class="steps">
          <li v-for="item in STEPS" :key="item.id" :class="stepClass(item.id)">{{ item.label }}</li>
        </ol>
      </div>
      <p v-if="error" class="error span-2">{{ error }}</p>
    </form>

    <div v-if="drafts.length" class="results">
      <div class="page-head">
        <p class="lede">{{ resultsLabel }}</p>
        <div class="row">
          <button class="btn" type="button" :disabled="busy" @click="drafts = []">Vider</button>
          <button class="btn primary" type="button" :disabled="saving || busy || !allFilled" @click="saveAll">{{ saving ? 'Création…' : 'Créer la collection' }}</button>
        </div>
      </div>
      <div class="grid cards">
        <article v-for="(draft, index) in drafts" :key="draft.giphyUrl || draft.artAnimatedUrl || index" class="panel draft" :class="{ pending: !draft.name }">
          <TradingCard :card="previewCard(draft)" compact />
          <label>Nom <input v-model="draft.name" type="text" :placeholder="busy && !draft.name ? 'L’IA écrit…' : ''" /></label>
          <label>Sous-titre <input v-model="draft.subtitle" type="text" :placeholder="busy && !draft.subtitle ? '…' : ''" /></label>
          <label>Rareté
            <select v-model="draft.rarity">
              <option v-for="r in RARITIES" :key="r" :value="r">{{ RARITY_LABELS[r] }}</option>
            </select>
          </label>
          <label>Type
            <select v-model="draft.kind">
              <option v-for="k in CARD_KINDS" :key="k" :value="k">{{ KIND_LABELS[k] }}</option>
            </select>
          </label>
          <button class="btn" type="button" :disabled="busy" @click="drafts.splice(index, 1)">Retirer</button>
        </article>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import TradingCard from '@/components/TradingCard.vue';
import { api, streamAiFromTheme, type AiProgressEvent } from '@/api/client';
import {
  CARD_KINDS, KIND_LABELS, RARITIES, RARITY_LABELS, hydrateCard,
  type Card, type CardKind, type Edition, type Rarity, type Universe,
} from '@/types';

type AiDraft = {
  name: string;
  subtitle: string | null;
  description: string | null;
  flavorText: string | null;
  kind: CardKind;
  subtype: string | null;
  rarity: Rarity;
  magicType: Card['magicType'];
  style: Card['style'];
  artFilter: Card['artFilter'];
  borderFinish: Card['borderFinish'];
  power: number | null;
  toughness: number | null;
  artist: string | null;
  artUrl: string | null;
  artAnimatedUrl: string | null;
  giphyUrl: string | null;
  artSeed: string;
};

const router = useRouter();
const universes = ref<Universe[]>([]);
const editions = ref<Edition[]>([]);
const universeId = ref(0);
const editionId = ref(0);
const newEdition = ref(false);
const editionName = ref('');
const theme = ref('');
const urls = ref('');
const count = ref(12);
const busy = ref(false);
const saving = ref(false);
const error = ref('');
const drafts = ref<AiDraft[]>([]);
const status = ref({ openai: false, giphy: false });
const progress = ref<AiProgressEvent>({ step: 'start', label: '', percent: 0 });

const STEPS = [
  { id: 'brief', label: 'Consigne' },
  { id: 'giphy', label: 'GIFs' },
  { id: 'filter', label: 'Tri' },
  { id: 'cards', label: 'Cartes' },
] as const;

function stepClass(id: (typeof STEPS)[number]['id']) {
  const order = ['brief', 'giphy', 'filter', 'cards'] as const;
  const current = progress.value.step === 'wait' || progress.value.step === 'start' || progress.value.step === 'done'
    ? (progress.value.percent >= 50 ? 'cards' : progress.value.percent >= 36 ? 'filter' : progress.value.percent >= 22 ? 'giphy' : 'brief')
    : progress.value.step;
  const here = order.indexOf(id);
  const now = order.indexOf(current as typeof id);
  if (progress.value.percent >= 100 || (id === 'cards' && progress.value.step === 'done')) return 'done';
  if (here < now) return 'done';
  if (here === now) return progress.value.step === 'wait' ? 'wait' : 'on';
  return '';
}

const editionsForUniverse = computed(() => editions.value.filter((item) => item.universeId === universeId.value));

onMounted(async () => {
  const [u, e, s] = await Promise.all([
    api<Universe[]>('/admin/universes'),
    api<Edition[]>('/admin/editions'),
    api<{ openai: boolean; giphy: boolean }>('/admin/ai/status'),
  ]);
  universes.value = u;
  editions.value = e;
  status.value = s;
  universeId.value = u[0]?.id || 0;
  editionId.value = editionsForUniverse.value[0]?.id || 0;
});

watch(universeId, () => {
  if (!editionsForUniverse.value.some((item) => item.id === editionId.value)) {
    editionId.value = editionsForUniverse.value[0]?.id || 0;
  }
});

function toggleNewEdition() {
  newEdition.value = !newEdition.value;
  if (!newEdition.value && !editionId.value) {
    editionId.value = editionsForUniverse.value[0]?.id || 0;
  }
}

function previewCard(draft: AiDraft): Card {
  return hydrateCard({
    ...draft,
    universeId: universeId.value,
    editionId: editionId.value,
    name: draft.name || '…',
    subtitle: draft.subtitle || '',
    description: draft.description || '',
    flavorText: draft.flavorText || '',
    artUrl: draft.artUrl || '',
    artAnimatedUrl: draft.artAnimatedUrl || '',
    giphyUrl: draft.giphyUrl || draft.artAnimatedUrl || '',
    artFilter: 'none',
    foil: false,
  });
}

const allFilled = computed(() => drafts.value.length > 0 && drafts.value.every((draft) => Boolean(draft.name.trim())));
const resultsLabel = computed(() => {
  if (busy.value) {
    const filled = drafts.value.filter((draft) => draft.name).length;
    return filled
      ? `${filled}/${drafts.value.length} cartes rédigées — le reste arrive…`
      : `${drafts.value.length} GIF${drafts.value.length > 1 ? 's' : ''} — l’IA rédige les cartes…`;
  }
  return `${drafts.value.length} brouillon${drafts.value.length > 1 ? 's' : ''} — corrige puis crée.`;
});

async function generate() {
  error.value = '';
  busy.value = true;
  progress.value = { step: 'start', label: 'Préparation de la génération…', percent: 2 };
  try {
    if (newEdition.value) {
      const name = editionName.value.trim() || theme.value.trim().slice(0, 40);
      const code = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'SET';
      const created = await api<Edition>('/admin/editions', {
        method: 'POST',
        body: JSON.stringify({ universeId: universeId.value, name, code }),
      });
      editions.value.push(created);
      editionId.value = created.id;
      newEdition.value = false;
      editionName.value = '';
    }
    drafts.value = [];
    drafts.value = await streamAiFromTheme<AiDraft>(
      {
        theme: theme.value,
        universeId: universeId.value,
        editionId: editionId.value,
        count: count.value,
        urls: urls.value,
      },
      (event) => { progress.value = event; },
      (items) => { drafts.value = items; },
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Génération impossible';
  } finally {
    busy.value = false;
  }
}

async function saveAll() {
  if (!drafts.value.length) return;
  error.value = '';
  saving.value = true;
  try {
    await api('/admin/cards/batch', {
      method: 'POST',
      body: JSON.stringify({
        cards: drafts.value.map((draft) => ({
          ...draft,
          universeId: universeId.value,
          editionId: editionId.value,
          collectorNumber: 0,
          foil: false,
          animated: false,
          artFilter: 'none',
          holofoilPattern: 'none',
          frameStyle: 'classic',
          giphyUrl: draft.giphyUrl || draft.artAnimatedUrl || null,
          animatedUnlockCopies: 5,
        })),
      }),
    });
    await router.push({ path: '/admin/cards', query: { editionId: String(editionId.value) } });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Création impossible';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 14px 16px;
  margin-bottom: 28px;
  align-items: end;
}
.span-2 { grid-column: 1 / -1; }
.count-field { grid-column: 1; max-width: 220px; }
.edition-toggle {
  white-space: nowrap;
  height: 42px;
}
.actions {
  display: flex;
  justify-content: flex-start;
}
.progress-panel {
  display: grid;
  gap: 10px;
  padding-top: 4px;
}
.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  color: var(--muted);
}
.progress-meta strong {
  color: var(--text);
  font-weight: 600;
}
.bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line);
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--gold), var(--gold-2));
  transition: width 0.35s ease;
}
.bar.wait i {
  background: linear-gradient(90deg, #7c3aed, var(--gold));
}
.steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
}
.steps li {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.85rem;
}
.steps li.on {
  color: #1a1204;
  background: linear-gradient(180deg, var(--gold-2), var(--gold));
  border-color: #8a6d1c;
}
.steps li.wait {
  color: var(--text);
  border-color: rgba(124, 58, 237, 0.55);
  background: rgba(124, 58, 237, 0.22);
}
.steps li.done {
  color: var(--ok);
  border-color: rgba(52, 211, 153, 0.35);
}
.draft {
  display: grid;
  gap: 8px;
}
.draft.pending {
  opacity: 0.82;
}
.results { margin-top: 8px; }
@media (max-width: 720px) {
  .form-grid { grid-template-columns: 1fr; align-items: stretch; }
  .count-field { max-width: none; }
  .edition-toggle { width: 100%; height: auto; }
}
</style>
