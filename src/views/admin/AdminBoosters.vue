<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Modèles de boosters</h1>
        <p class="lede">Les presets sont déjà distribuables. Pour un modèle perso, choisis-en un, ajuste-le, puis crée.</p>
      </div>
    </div>

    <section class="presets">
      <h2>Presets</h2>
      <div class="preset-grid">
        <button
          v-for="preset in presetPacks"
          :key="preset.key"
          class="preset"
          :class="{ on: activePreset === preset.key }"
          type="button"
          @click="applyPreset(preset)"
        >
          <img :src="mediaUrl(preset.artUrl)" alt="" />
          <strong>{{ preset.name }}</strong>
          <span>{{ preset.description }}</span>
          <small>{{ preset.cardCount }} cartes · brillant {{ preset.foilChance }}%</small>
        </button>
      </div>
    </section>

    <form class="panel form-card" @submit.prevent="create">
      <div class="grid form">
        <label>Nom <input v-model="form.name" required /></label>
        <label>Univers
          <select v-model="form.universeId">
            <option :value="null">Tous</option>
            <option v-for="u in universes" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </label>
        <label>Édition
          <select v-model="form.editionId">
            <option :value="null">Toutes</option>
            <option v-for="e in editionsForUniverse" :key="e.id" :value="e.id">{{ e.name }} ({{ e.code }})</option>
          </select>
        </label>
        <label>Nombre de cartes <input v-model="form.cardCount" type="number" min="1" max="15" /></label>
        <label>Rareté garantie (dernière carte)
          <select v-model="form.guaranteedRarity">
            <option v-for="r in RARITIES" :key="r" :value="r">{{ RARITY_LABELS[r] }}</option>
          </select>
        </label>
        <label>Chance brillant % <input v-model="form.foilChance" type="number" min="0" max="100" /></label>
        <label>Chance animée % <input v-model="form.animatedChance" type="number" min="0" max="100" /></label>
        <label class="span-2">Image du booster
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onFormArtFile" />
          <small v-if="uploading">Envoi en cours…</small>
        </label>
        <label class="span-2">Ou URL d’image
          <input v-model="form.artUrl" type="text" placeholder="/boosters/standard.svg ou https://…" />
        </label>
        <div class="span-2 art-preview">
          <img :src="mediaUrl(previewArt)" alt="" />
          <button v-if="form.artUrl" class="btn" type="button" @click="form.artUrl = ''">Image par défaut</button>
        </div>
        <label class="span-2">Description <textarea v-model="form.description" /></label>
      </div>

      <div class="weights">
        <div class="weights-head">
          <h2>Pourcentage par rareté</h2>
          <p :class="{ warn: weightTotal !== 100 }">
            Total {{ weightTotal }}%
            <span v-if="weightTotal !== 100"> — les chances seront proportionnelles</span>
          </p>
        </div>
        <label v-for="rarity in RARITIES" :key="rarity" class="weight-row">
          <span class="badge" :class="`r-${rarity}`">{{ RARITY_LABELS[rarity] }}</span>
          <input v-model="form.rarityWeights[rarity]" type="range" min="0" max="100" />
          <input v-model="form.rarityWeights[rarity]" class="pct" type="number" min="0" max="100" />
          <span class="pct-sign">%</span>
        </label>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn primary">Créer un booster à partir du preset</button>
    </form>

    <div v-if="customTemplates.length" class="grid packs" style="margin-top:20px">
      <article v-for="pack in customTemplates" :key="pack.id" class="panel pack-card">
        <img class="thumb" :src="mediaUrl(pack.artUrl || '/boosters/default.svg')" alt="" />
        <h3>{{ pack.name }}</h3>
        <p class="lede">{{ pack.description }}</p>
        <p>{{ pack.cardCount }} cartes · {{ pack.universeName || 'mixte' }}{{ pack.editionName ? ` · ${pack.editionName}` : '' }}</p>
        <ul class="bars">
          <li v-for="rarity in RARITIES" :key="rarity">
            <span class="badge" :class="`r-${rarity}`">{{ RARITY_LABELS[rarity] }}</span>
            <i><b :style="{ width: `${pack.rarityWeights[rarity] || 0}%` }" :class="`r-${rarity}`" /></i>
            <em>{{ pack.rarityWeights[rarity] || 0 }}%</em>
          </li>
        </ul>
        <label class="file-swap">
          Changer l’image
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onExistingArtFile(pack.id, $event)" />
        </label>
        <button class="btn danger" type="button" @click="remove(pack.id)">Supprimer</button>
      </article>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api, mediaUrl } from '@/api/client';
import {
  RARITIES, RARITY_LABELS, type BoosterTemplate, type Edition, type Rarity, type RarityWeights, type Universe,
} from '@/types';

interface BoosterPreset {
  key: string;
  name: string;
  description: string;
  cardCount: number;
  guaranteedRarity: Rarity;
  foilChance: number;
  animatedChance: number;
  weights: RarityWeights;
  artUrl: string;
}

const FALLBACK_PRESETS: BoosterPreset[] = [
  {
    key: 'standard',
    name: 'Standard',
    description: 'Mix classique : beaucoup de communes, quelques rares.',
    cardCount: 5,
    guaranteedRarity: 'uncommon',
    foilChance: 8,
    animatedChance: 3,
    weights: { common: 62, uncommon: 22, rare: 10, epic: 4, legendary: 1, mythic: 1 },
    artUrl: '/boosters/standard.svg',
  },
  {
    key: 'rare',
    name: 'Rare',
    description: 'Les rares tombent nettement plus souvent.',
    cardCount: 5,
    guaranteedRarity: 'rare',
    foilChance: 12,
    animatedChance: 5,
    weights: { common: 20, uncommon: 25, rare: 35, epic: 12, legendary: 6, mythic: 2 },
    artUrl: '/boosters/rare.svg',
  },
  {
    key: 'premium',
    name: 'Premium',
    description: 'Paquet haut de gamme, épiques et légendaires en vue.',
    cardCount: 5,
    guaranteedRarity: 'epic',
    foilChance: 20,
    animatedChance: 10,
    weights: { common: 8, uncommon: 15, rare: 30, epic: 28, legendary: 14, mythic: 5 },
    artUrl: '/boosters/premium.svg',
  },
  {
    key: 'epique',
    name: 'Épique',
    description: 'Tourné vers les épiques, avec une tension légendaire.',
    cardCount: 5,
    guaranteedRarity: 'epic',
    foilChance: 22,
    animatedChance: 12,
    weights: { common: 5, uncommon: 10, rare: 20, epic: 35, legendary: 20, mythic: 10 },
    artUrl: '/boosters/epique.svg',
  },
  {
    key: 'legendaire',
    name: 'Légendaire',
    description: 'Très peu de communes, grosse tension.',
    cardCount: 5,
    guaranteedRarity: 'legendary',
    foilChance: 25,
    animatedChance: 14,
    weights: { common: 4, uncommon: 8, rare: 16, epic: 22, legendary: 32, mythic: 18 },
    artUrl: '/boosters/legendaire.svg',
  },
  {
    key: 'mythique',
    name: 'Mythique',
    description: 'Petit paquet, chance mythique.',
    cardCount: 3,
    guaranteedRarity: 'rare',
    foilChance: 28,
    animatedChance: 15,
    weights: { common: 5, uncommon: 10, rare: 20, epic: 20, legendary: 20, mythic: 25 },
    artUrl: '/boosters/mythique.svg',
  },
];

const templates = ref<BoosterTemplate[]>([]);
const universes = ref<Universe[]>([]);
const editions = ref<Edition[]>([]);
const error = ref('');
const uploading = ref(false);
const activePreset = ref('standard');
const form = reactive({
  name: FALLBACK_PRESETS[0].name,
  description: FALLBACK_PRESETS[0].description,
  universeId: null as number | null,
  editionId: null as number | null,
  cardCount: FALLBACK_PRESETS[0].cardCount,
  guaranteedRarity: FALLBACK_PRESETS[0].guaranteedRarity,
  foilChance: FALLBACK_PRESETS[0].foilChance,
  animatedChance: FALLBACK_PRESETS[0].animatedChance,
  rarityWeights: { ...FALLBACK_PRESETS[0].weights },
  artUrl: FALLBACK_PRESETS[0].artUrl,
});

const presetPacks = computed<BoosterPreset[]>(() => {
  const fromApi = templates.value
    .filter((pack) => pack.presetKey)
    .map((pack) => ({
      key: pack.presetKey as string,
      name: pack.name,
      description: pack.description || '',
      cardCount: pack.cardCount,
      guaranteedRarity: pack.guaranteedRarity,
      foilChance: pack.foilChance,
      animatedChance: pack.animatedChance,
      weights: { ...pack.rarityWeights },
      artUrl: pack.artUrl || `/boosters/${pack.presetKey}.svg`,
    }));
  return fromApi.length ? fromApi : FALLBACK_PRESETS;
});
const customTemplates = computed(() => templates.value.filter((pack) => !pack.presetKey));
const previewArt = computed(() => form.artUrl || '/boosters/default.svg');

const editionsForUniverse = computed(() => (
  form.universeId ? editions.value.filter((ed) => ed.universeId === form.universeId) : editions.value
));
const weightTotal = computed(() => RARITIES.reduce((sum, rarity) => sum + Number(form.rarityWeights[rarity] || 0), 0));

watch(() => form.universeId, () => {
  if (form.editionId && !editionsForUniverse.value.some((ed) => ed.id === form.editionId)) {
    form.editionId = null;
  }
});

function applyPreset(preset: BoosterPreset) {
  activePreset.value = preset.key;
  form.name = preset.name;
  form.description = preset.description;
  form.cardCount = preset.cardCount;
  form.guaranteedRarity = preset.guaranteedRarity;
  form.foilChance = preset.foilChance;
  form.animatedChance = preset.animatedChance;
  form.rarityWeights = { ...preset.weights };
  form.artUrl = preset.artUrl;
}

async function uploadPackArt(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const data = await api<{ url: string }>('/admin/uploads/art', { method: 'POST', body });
  return data.url;
}

async function onFormArtFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = '';
  try {
    form.artUrl = await uploadPackArt(file);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload impossible';
  } finally {
    uploading.value = false;
  }
}

async function onExistingArtFile(id: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = '';
  try {
    const artUrl = await uploadPackArt(file);
    await api(`/admin/boosters/${id}`, { method: 'PATCH', body: JSON.stringify({ artUrl }) });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Image impossible à enregistrer';
  } finally {
    input.value = '';
  }
}

async function load() {
  [templates.value, universes.value, editions.value] = await Promise.all([
    api<BoosterTemplate[]>('/admin/boosters'),
    api<Universe[]>('/admin/universes'),
    api<Edition[]>('/admin/editions'),
  ]);
}

async function create() {
  error.value = '';
  try {
    await api('/admin/boosters', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        cardCount: Number(form.cardCount),
        foilChance: Number(form.foilChance),
        animatedChance: Number(form.animatedChance),
        rarityWeights: Object.fromEntries(
          RARITIES.map((rarity) => [rarity, Number(form.rarityWeights[rarity] || 0)]),
        ),
        artUrl: form.artUrl || '/boosters/default.svg',
      }),
    });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Création impossible';
  }
}

async function remove(id: number) {
  if (!confirm('Supprimer ce modèle ?')) return;
  await api(`/admin/boosters/${id}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<style scoped>
.presets { margin-bottom: 20px; }
.presets h2, .weights h2 { margin-bottom: 12px; }
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.preset {
  text-align: left;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 16px;
  padding: 0;
  display: grid;
  gap: 6px;
  cursor: pointer;
  color: var(--text);
  overflow: hidden;
}
.preset img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  background: #120818;
}
.preset strong, .preset span, .preset small { padding: 0 14px; }
.preset small { padding-bottom: 14px; }
.preset span, .preset small { color: var(--muted); font-size: 0.88rem; }
.preset.on, .preset:hover { border-color: color-mix(in srgb, var(--gold) 60%, var(--line)); }
.form-card { display: grid; gap: 22px; }
.span-2 { grid-column: 1 / -1; }
.weights-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
}
.weights-head p { margin: 0; color: var(--muted); }
.weights-head .warn { color: #fbbf24; }
.weight-row {
  display: grid;
  grid-template-columns: 140px 1fr 72px auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}
.pct { width: 72px; }
.pct-sign { color: var(--muted); }
.pack-card { display: grid; gap: 10px; }
.thumb {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
}
.file-swap {
  font-size: 0.82rem;
}
.file-swap input { margin-top: 6px; }
.art-preview {
  display: grid;
  gap: 10px;
  justify-items: start;
}
.art-preview img {
  width: min(280px, 100%);
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
}
.bars { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
.bars li { display: grid; grid-template-columns: 110px 1fr 48px; gap: 8px; align-items: center; }
.bars i {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
}
.bars b { display: block; height: 100%; background: currentColor; }
.bars em { font-style: normal; font-size: 0.78rem; color: var(--muted); text-align: right; }
@media (max-width: 860px) {
  .weight-row { grid-template-columns: 1fr 72px auto; }
  .weight-row .badge { grid-column: 1 / -1; }
}
</style>
