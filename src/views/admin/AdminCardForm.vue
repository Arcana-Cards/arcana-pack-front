<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>{{ isNew ? 'Générer une carte' : 'Éditer la carte' }}</h1>
        <p class="lede">L’aperçu à droite suit chaque champ, y compris l’illustration (image ou GIF) et l’édition.</p>
      </div>
      <RouterLink class="btn" to="/admin/cards">Retour</RouterLink>
    </div>
    <div class="editor">
      <form class="form-stack" novalidate @submit.prevent="save">
        <details class="pane panel" open>
          <summary>
            <span>Carte</span>
            <small class="pane-hint">{{ form.name || 'Sans nom' }} · {{ selectedEdition?.code || 'SET' }}</small>
          </summary>
          <div class="pane-body grid form">
            <label>Univers
              <select v-model.number="form.universeId" required>
                <option disabled :value="0">Choisir</option>
                <option v-for="u in universes" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </label>
            <label>Édition
              <select v-model.number="form.editionId" required>
                <option disabled :value="0">Choisir</option>
                <option v-for="e in editionsForUniverse" :key="e.id" :value="e.id">{{ e.name }} ({{ e.code }})</option>
              </select>
            </label>
            <label>Nom <input v-model="form.name" type="text" autocomplete="off" required /></label>
            <label>Sous-titre <input v-model="form.subtitle" type="text" autocomplete="off" /></label>
            <label>Type de carte
              <select v-model="form.kind">
                <option v-for="k in CARD_KINDS" :key="k" :value="k">{{ KIND_LABELS[k] }}</option>
              </select>
            </label>
            <label>Sous-type <input v-model="form.subtype" type="text" autocomplete="off" :placeholder="subtypeHint" /></label>
            <label>Rareté
              <select v-model="form.rarity" @change="rarityTouched = true">
                <option v-for="r in RARITIES" :key="r" :value="r">{{ RARITY_LABELS[r] }}</option>
              </select>
              <small v-if="recommendedRarity">Valeur raisonnable : {{ RARITY_LABELS[recommendedRarity] }}</small>
            </label>
            <p class="lede span-2 collector-auto">
              N° {{ isNew ? 'auto' : String(form.collectorNumber).padStart(3, '0') }}
              — classé par rareté (mythique → commune), recalculé à chaque ajout
            </p>
            <label v-if="hasCombatStats" :key="'atk'">Attaque <input v-model="form.power" type="number" /></label>
            <label v-if="hasCombatStats" :key="'def'">Défense <input v-model="form.toughness" type="number" /></label>
          </div>
        </details>

        <details class="pane panel" open>
          <summary>
            <span>Illustration</span>
            <small class="pane-hint">{{ form.artAnimatedUrl ? 'GIF + image fixe' : (form.artUrl || localArt || localStill ? 'Image' : 'Aucune') }}</small>
          </summary>
          <div class="pane-body grid form">
            <label class="span-2">Image fixe (fichier)
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" @change="onArtFile" />
              <small v-if="uploading">Envoi en cours…</small>
              <small v-else>Ou choisis une image du GIF sous l’aperçu, à droite.</small>
            </label>
            <label class="span-2">GIF animé (fichier)
              <input type="file" accept="image/gif" @change="onAnimatedFile" />
            </label>
            <label>Exemplaires pour débloquer le GIF
              <input v-model="form.animatedUnlockCopies" type="number" min="1" max="99" />
            </label>
            <div class="row span-2">
              <button
                class="btn"
                type="button"
                :disabled="aiBusy || !form.universeId || !form.editionId || !(form.artAnimatedUrl || form.artUrl)"
                @click="fillWithAi"
              >{{ aiBusy ? 'L’IA écrit…' : 'Remplir avec l’IA' }}</button>
              <button v-if="form.artUrl || form.artAnimatedUrl || localArt" class="btn" type="button" @click="clearArt">Retirer les illustrations</button>
            </div>
            <details class="span-2 links-fold">
              <summary>Liens (optionnel)</summary>
              <label>Image fixe
                <input v-model="form.artUrl" type="text" autocomplete="off" placeholder="inutile si tu as choisi une image ci-dessus" />
              </label>
              <label>GIF
                <input
                  v-model="form.artAnimatedUrl"
                  type="text"
                  autocomplete="off"
                  placeholder="https://giphy.com/gifs/…"
                  @paste="onGifPaste"
                  @change="applyGifLink"
                />
              </label>
              <label v-if="form.giphyUrl">GIF d’origine
                <input :value="form.giphyUrl" type="text" readonly tabindex="-1" />
              </label>
            </details>
          </div>
        </details>

        <details class="pane panel">
          <summary>
            <span>Apparence</span>
            <small class="pane-hint">{{ FILTER_LABELS[form.artFilter] }} · {{ STYLE_LABELS[form.style] }}</small>
          </summary>
          <div class="pane-body grid form">
            <label>Filtre d’art
              <select v-model="form.artFilter">
                <option v-for="f in CATALOG_ART_FILTERS" :key="f" :value="f">{{ FILTER_LABELS[f] }}</option>
              </select>
            </label>
            <label>Finition de bordure
              <select v-model="form.borderFinish">
                <option v-for="b in BORDER_FINISHES" :key="b" :value="b">{{ BORDER_FINISH_LABELS[b] }}</option>
              </select>
            </label>
            <label>Style
              <select v-model="form.style">
                <option v-for="s in CARD_STYLES" :key="s" :value="s">{{ STYLE_LABELS[s] }}</option>
              </select>
            </label>
            <label>Magie
              <select v-model="form.magicType">
                <option v-for="m in MAGIC_TYPES" :key="m" :value="m">{{ MAGIC_LABELS[m] }}</option>
              </select>
            </label>
            <label>Artiste <input v-model="form.artist" type="text" autocomplete="off" /></label>
            <label>Graine d’art <input v-model="form.artSeed" type="text" autocomplete="off" /></label>
            <label>Dos / fond <input v-model="form.backColor" type="color" /></label>
            <label>Lueur <input v-model="form.glowColor" type="color" /></label>
            <label>Texte <input v-model="form.textColor" type="color" /></label>
          </div>
        </details>

        <details class="pane panel">
          <summary>
            <span>Textes</span>
            <small class="pane-hint">{{ form.description ? 'Description' : 'Vides' }}</small>
          </summary>
          <div class="pane-body grid form">
            <label class="span-2">Description <textarea v-model="form.description" /></label>
            <label class="span-2">Texte d’ambiance <textarea v-model="form.flavorText" /></label>
          </div>
        </details>

        <div class="pane panel actions">
          <p v-if="error" class="error">{{ error }}</p>
          <div class="row">
            <button class="btn primary" :disabled="saving || uploading">{{ isNew ? 'Créer' : 'Enregistrer' }}</button>
            <button v-if="!isNew" class="btn danger" type="button" @click="remove">Supprimer</button>
          </div>
        </div>
      </form>

      <div class="side">
        <details class="pane panel mix-col" open>
          <summary>
            <span>Mix de l’édition</span>
            <small class="pane-hint">{{ selectedEdition?.name || 'Aucune édition' }}{{ editionTotal ? ` · ${editionTotal}` : '' }}</small>
          </summary>
          <div class="pane-body mix-body">
            <h2>{{ selectedEdition?.name || 'Choisis une édition' }}</h2>
            <p class="lede">
              <template v-if="editionTotal">{{ editionTotal }} carte{{ editionTotal > 1 ? 's' : '' }} · cible 62 / 22 / 10 / 4 / 1 / 1</template>
              <template v-else>Les comptes suivent l’édition sélectionnée.</template>
            </p>
            <p v-if="recommendedRarity" class="mix-suggest">
              Prochaine valeur raisonnable
              <button class="btn" type="button" @click="applyRarity(recommendedRarity)">{{ RARITY_LABELS[recommendedRarity] }}</button>
              <small>{{ recommendReason }}</small>
            </p>
            <ul class="mix">
              <li
                v-for="row in mixRows"
                :key="row.rarity"
                :class="{ on: form.rarity === row.rarity, suggest: row.rarity === recommendedRarity }"
              >
                <button type="button" @click="applyRarity(row.rarity)">
                  <span class="badge" :class="`r-${row.rarity}`">{{ RARITY_LABELS[row.rarity] }}</span>
                  <span class="mix-count">{{ row.count }}</span>
                  <i class="bar" aria-hidden="true">
                    <b class="actual" :class="`r-${row.rarity}`" :style="{ width: `${row.pct}%` }" />
                    <em class="mark" :style="{ left: `${row.targetPct}%` }" />
                  </i>
                  <span class="mix-meta">
                    {{ row.pct }} % · cible {{ row.targetPct }} % ({{ row.targetCount }})
                  </span>
                  <span class="mix-status" :class="row.tone">{{ row.status }}</span>
                </button>
              </li>
            </ul>
          </div>
        </details>

        <aside class="preview-col panel">
          <p class="preview-kicker">Aperçu en direct</p>
          <h2>{{ selectedEdition?.name || 'Sans édition' }}</h2>
          <p class="lede">{{ selectedUniverse?.name || 'Univers' }} · {{ selectedEdition?.code || 'SET' }}</p>
          <TradingCard
            inspect
            :card="form"
            :art-override="previewArt"
            :owned-copies="previewCopies"
          />
          <label class="preview-copies">
            Simuler {{ previewCopies }} exemplaire{{ previewCopies > 1 ? 's' : '' }}
            <input v-model.number="previewCopies" type="range" min="1" max="8" />
            <small>{{ gifPreviewLabel }}</small>
          </label>
          <div v-if="form.artAnimatedUrl" class="gif-scrub">
            <p class="preview-kicker">Image fixe</p>
            <p v-if="gifLoading" class="lede">Lecture du GIF…</p>
            <p v-else-if="gifError" class="error">{{ gifError }}</p>
            <template v-else-if="gifFrameCount">
              <div class="gif-scrub-row">
                <button class="btn" type="button" :disabled="gifFrameIndex <= 0" @click="stepGifFrame(-1)">◀</button>
                <label>
                  Image {{ gifFrameIndex + 1 }} / {{ gifFrameCount }}
                  <input
                    v-model.number="gifFrameIndex"
                    type="range"
                    min="0"
                    :max="Math.max(0, gifFrameCount - 1)"
                    @input="onGifScrub"
                    @change="onGifScrub"
                  />
                </label>
                <button class="btn" type="button" :disabled="gifFrameIndex >= gifFrameCount - 1" @click="stepGifFrame(1)">▶</button>
              </div>
              <small v-if="stillDirty">Cette image sera enregistrée. Enregistre la carte pour la garder.</small>
              <small v-else>Déplace le curseur pour changer l’image fixe, puis Enregistrer.</small>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import TradingCard from '@/components/TradingCard.vue';
import { api } from '@/api/client';
import { giphyGifUrl, giphyIdFromUrl, giphyStillUrl } from '@/media/giphy';
import { gifFrameToBlob, loadGifStrip, type GifStrip } from '@/media/gifFrames';
import {
  CATALOG_ART_FILTERS, BORDER_FINISHES, BORDER_FINISH_LABELS, CARD_KINDS, CARD_STYLES, CATALOG_RARITY_TARGETS,
  FILTER_LABELS, KIND_LABELS, MAGIC_LABELS, MAGIC_TYPES,
  RARITY_COLORS, RARITY_LABELS, RARITIES, STYLE_LABELS, hydrateCard, kindHasCombatStats,
  type Card, type Edition, type Rarity, type Universe,
} from '@/types';

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.params.id == null);
const form = ref<Card>(hydrateCard());
const universes = ref<Universe[]>([]);
const editions = ref<Edition[]>([]);
const catalog = ref<Card[]>([]);
const rarityTouched = ref(false);
const saving = ref(false);
const uploading = ref(false);
const error = ref('');
const localArt = ref('');
const localStill = ref('');
const previewCopies = ref(1);
const gifStrip = ref<GifStrip | null>(null);
const gifFrameIndex = ref(0);
const gifLoading = ref(false);
const gifError = ref('');
const aiBusy = ref(false);
const stillDirty = ref(false);
let gifLoadToken = 0;
const gifFrameCount = computed(() => gifStrip.value?.frames.length || 0);
const previewArt = computed(() => {
  const unlockAt = form.value.animatedUnlockCopies || 5;
  if (previewCopies.value >= unlockAt && form.value.artAnimatedUrl) return '';
  if (stillDirty.value && localStill.value) return localStill.value;
  if (localArt.value) return localArt.value;
  return '';
});
const gifPreviewLabel = computed(() => {
  const unlockAt = form.value.animatedUnlockCopies || 5;
  const hasGif = Boolean(form.value.artAnimatedUrl);
  if (!hasGif) return 'Aucun GIF attaché';
  return previewCopies.value >= unlockAt ? 'GIF animé débloqué' : `Encore ${unlockAt - previewCopies.value} ex. pour le GIF`;
});
const editionsForUniverse = computed(() => editions.value.filter((e) => e.universeId === form.value.universeId));
const selectedEdition = computed(() => editions.value.find((e) => e.id === form.value.editionId));
const selectedUniverse = computed(() => universes.value.find((u) => u.id === form.value.universeId));
const editionCards = computed(() => catalog.value.filter((card) => (
  form.value.editionId > 0 && card.editionId === form.value.editionId
)));
const editionTotal = computed(() => editionCards.value.length);
const rarityCounts = computed(() => {
  const counts = Object.fromEntries(RARITIES.map((rarity) => [rarity, 0])) as Record<Rarity, number>;
  for (const card of editionCards.value) counts[card.rarity] += 1;
  return counts;
});

function targetCountsFor(total: number) {
  const rows = RARITIES.map((rarity) => {
    const raw = total * CATALOG_RARITY_TARGETS[rarity] / 100;
    return { rarity, floor: Math.floor(raw), frac: raw - Math.floor(raw) };
  });
  let used = rows.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...rows].sort((a, b) => b.frac - a.frac);
  for (const row of ranked) {
    if (used >= total) break;
    row.floor += 1;
    used += 1;
  }
  return Object.fromEntries(rows.map((row) => [row.rarity, row.floor])) as Record<Rarity, number>;
}

const mixRows = computed(() => {
  const total = editionTotal.value;
  const targets = targetCountsFor(total);
  return RARITIES.map((rarity) => {
    const count = rarityCounts.value[rarity];
    const targetCount = total ? targets[rarity] : 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    const targetPct = CATALOG_RARITY_TARGETS[rarity];
    const delta = count - targetCount;
    let status = total ? 'dans la cible' : '—';
    let tone = 'ok';
    if (total && delta < 0) {
      status = `manque ${-delta}`;
      tone = 'low';
    } else if (total && delta > 0) {
      status = `trop +${delta}`;
      tone = 'high';
    }
    return { rarity, count, pct, targetPct, targetCount, status, tone, delta };
  });
});

const recommendedRarity = computed<Rarity>(() => {
  if (!form.value.editionId) return 'common';
  const total = editionTotal.value;
  const nextTotal = isNew.value ? total + 1 : total;
  const current = { ...rarityCounts.value };
  if (!isNew.value) current[form.value.rarity] = Math.max(0, current[form.value.rarity] - 1);
  let best: Rarity = 'common';
  let bestScore = -Infinity;
  for (const rarity of RARITIES) {
    const score = (nextTotal * CATALOG_RARITY_TARGETS[rarity] / 100) - current[rarity];
    if (score > bestScore) {
      bestScore = score;
      best = rarity;
    }
  }
  return best;
});

const recommendReason = computed(() => {
  const row = mixRows.value.find((item) => item.rarity === recommendedRarity.value);
  if (!editionTotal.value) return 'Commence par des communes : elles doivent rester majoritaires.';
  if (row && row.delta < 0) return `Il en manque ${-row.delta} pour coller au mix d’un booster standard.`;
  return 'C’est la rareté la plus en dessous de sa cible.';
});

function applyRarity(rarity: Rarity) {
  form.value.rarity = rarity;
  form.value.borderColor = RARITY_COLORS[rarity];
  rarityTouched.value = true;
}

const hasCombatStats = computed(() => kindHasCombatStats(form.value.kind));
const subtypeHint = computed(() => ({
  creature: 'Ogre, dragon, yordle…',
  object: 'Relique, équipement, artefact…',
  land: 'Marais, forêt, île…',
  spell: 'Éphémère, rituel…',
  enchantment: 'Aura, malédiction…',
}[form.value.kind]));

watch(() => form.value.kind, (kind) => {
  if (!kindHasCombatStats(kind)) {
    form.value.power = null;
    form.value.toughness = null;
  }
});

watch(() => form.value.rarity, (rarity) => {
  form.value.borderColor = RARITY_COLORS[rarity];
});

watch(() => form.value.universeId, () => {
  if (!editionsForUniverse.value.find((e) => e.id === form.value.editionId)) {
    form.value.editionId = editionsForUniverse.value[0]?.id ?? 0;
  }
});

watch(
  () => [form.value.editionId, recommendedRarity.value] as const,
  ([, rarity]) => {
    if (!isNew.value || rarityTouched.value || !form.value.editionId) return;
    form.value.rarity = rarity;
  },
);

watch([selectedEdition, selectedUniverse], () => {
  form.value.editionName = selectedEdition.value?.name;
  form.value.editionCode = selectedEdition.value?.code;
  form.value.editionNumber = selectedEdition.value?.number;
  form.value.universeName = selectedUniverse.value?.name;
}, { immediate: true });

onMounted(async () => {
  [universes.value, editions.value, catalog.value] = await Promise.all([
    api<Universe[]>('/admin/universes'),
    api<Edition[]>('/admin/editions'),
    api<Card[]>('/admin/cards'),
  ]);
  if (!isNew.value) {
    const card = await api<Card>(`/catalog/cards/${route.params.id}`);
    form.value = hydrateCard(card);
    rarityTouched.value = true;
  } else if (universes.value[0]) {
    form.value.universeId = universes.value[0].id;
  }
});

watch(() => form.value.artAnimatedUrl, (url, prev) => {
  if (url === prev) return;
  void loadGifFrames(url || '');
});

function revokeStill() {
  if (localStill.value) URL.revokeObjectURL(localStill.value);
  localStill.value = '';
}

async function refreshStill() {
  if (!gifStrip.value?.frames.length) return;
  const blob = await gifFrameToBlob(gifStrip.value, gifFrameIndex.value);
  if (localStill.value) URL.revokeObjectURL(localStill.value);
  localStill.value = URL.createObjectURL(blob);
}

async function loadGifFrames(src: string) {
  const token = ++gifLoadToken;
  gifError.value = '';
  gifStrip.value = null;
  gifFrameIndex.value = 0;
  stillDirty.value = false;
  revokeStill();
  if (!src) return;
  gifLoading.value = true;
  try {
    const strip = await loadGifStrip(src);
    if (token !== gifLoadToken) return;
    gifStrip.value = strip;
    gifFrameIndex.value = 0;
  } catch (err) {
    if (token !== gifLoadToken) return;
    gifError.value = err instanceof Error ? err.message : 'Impossible de parcourir ce GIF';
  } finally {
    if (token === gifLoadToken) gifLoading.value = false;
  }
}

function revealStillPreview() {
  const unlockAt = form.value.animatedUnlockCopies || 5;
  if (previewCopies.value >= unlockAt) previewCopies.value = Math.max(1, unlockAt - 1);
}

function onGifScrub() {
  stillDirty.value = true;
  revealStillPreview();
  void refreshStill();
}

function stepGifFrame(delta: number) {
  const max = Math.max(0, gifFrameCount.value - 1);
  gifFrameIndex.value = Math.max(0, Math.min(max, gifFrameIndex.value + delta));
  onGifScrub();
}

function applyGifLink() {
  const rawGif = (form.value.artAnimatedUrl || '').trim();
  const rawStill = (form.value.artUrl || '').trim();
  const id = giphyIdFromUrl(rawGif) || giphyIdFromUrl(rawStill);
  if (!id) return;
  const gif = giphyGifUrl(id);
  const still = giphyStillUrl(id);
  if (form.value.artAnimatedUrl !== gif) form.value.artAnimatedUrl = gif;
  if (form.value.giphyUrl !== gif) form.value.giphyUrl = gif;
  if (!stillDirty.value && (!form.value.artUrl || giphyIdFromUrl(form.value.artUrl))) {
    if (form.value.artUrl !== still) form.value.artUrl = still;
  }
}

function onGifPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text')?.trim();
  if (!pasted || !giphyIdFromUrl(pasted)) return;
  event.preventDefault();
  form.value.artAnimatedUrl = pasted;
  applyGifLink();
}

async function fillWithAi() {
  applyGifLink();
  const url = (form.value.artAnimatedUrl || form.value.artUrl || '').trim();
  if (!url || !form.value.universeId || !form.value.editionId) return;
  aiBusy.value = true;
  error.value = '';
  try {
    const draft = await api<Partial<Card>>('/admin/ai/from-gif', {
      method: 'POST',
      body: JSON.stringify({
        url,
        universeId: form.value.universeId,
        editionId: form.value.editionId,
      }),
    });
    const collectorNumber = form.value.collectorNumber;
    form.value = hydrateCard({
      ...form.value,
      ...draft,
      collectorNumber,
      foil: false,
      holofoilPattern: 'none',
      artFilter: 'none',
      frameStyle: 'classic',
      artUrl: draft.artUrl || form.value.artUrl,
      artAnimatedUrl: draft.artAnimatedUrl || form.value.artAnimatedUrl,
      giphyUrl: draft.giphyUrl || draft.artAnimatedUrl || form.value.giphyUrl,
    });
    rarityTouched.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'L’IA n’a pas pu remplir la carte';
  } finally {
    aiBusy.value = false;
  }
}

async function uploadArtFile(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const data = await api<{ url: string }>('/admin/uploads/art', { method: 'POST', body });
  return data.url;
}

async function onArtFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (localArt.value) URL.revokeObjectURL(localArt.value);
  localArt.value = URL.createObjectURL(file);
  uploading.value = true;
  error.value = '';
  try {
    form.value.artUrl = await uploadArtFile(file);
    stillDirty.value = false;
    if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
      form.value.artAnimatedUrl = form.value.artUrl;
    }
    URL.revokeObjectURL(localArt.value);
    localArt.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload impossible';
  } finally {
    uploading.value = false;
  }
}

async function onAnimatedFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = '';
  try {
    form.value.artAnimatedUrl = await uploadArtFile(file);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload du GIF impossible';
  } finally {
    uploading.value = false;
  }
}

function clearArt() {
  if (localArt.value) URL.revokeObjectURL(localArt.value);
  localArt.value = '';
  gifLoadToken += 1;
  gifStrip.value = null;
  gifFrameIndex.value = 0;
  gifError.value = '';
  gifLoading.value = false;
  revokeStill();
  stillDirty.value = false;
  form.value.artUrl = '';
  form.value.artAnimatedUrl = '';
  form.value.giphyUrl = '';
}

async function save() {
  error.value = '';
  saving.value = true;
  try {
    if (stillDirty.value) {
      if (!gifStrip.value?.frames.length) {
        throw new Error('Le GIF n’est pas encore lu. Attends un instant, rechoisis l’image, puis enregistre.');
      }
      const blob = await gifFrameToBlob(gifStrip.value, gifFrameIndex.value);
      const stillFile = new File([blob], 'still.png', { type: 'image/png' });
      form.value.artUrl = await uploadArtFile(stillFile);
      stillDirty.value = false;
    }
    const payload = {
      ...form.value,
      foil: false,
      holofoilPattern: 'none',
      artFilter: form.value.artFilter === 'holo' || form.value.artFilter === 'shiny' ? 'none' : form.value.artFilter,
      frameStyle: 'classic',
      collectorNumber: 0,
      artUrl: form.value.artUrl || null,
      artAnimatedUrl: form.value.artAnimatedUrl || null,
      giphyUrl: form.value.giphyUrl || form.value.artAnimatedUrl || null,
      subtitle: form.value.subtitle || null,
      description: form.value.description || null,
      flavorText: form.value.flavorText || null,
      subtype: form.value.subtype || null,
      artist: form.value.artist || null,
    };
    if (isNew.value) {
      await api('/admin/cards', { method: 'POST', body: JSON.stringify(payload) });
    } else {
      await api(`/admin/cards/${route.params.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    }
    await router.push('/admin/cards');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sauvegarde impossible';
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm('Supprimer cette carte ?')) return;
  await api(`/admin/cards/${route.params.id}`, { method: 'DELETE' });
  await router.push('/admin/cards');
}
</script>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}
.form-stack {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.pane {
  padding: 0;
  overflow: hidden;
}
.pane > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  font-family: Cinzel, serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.78rem;
  color: var(--gold);
  user-select: none;
}
.pane > summary::-webkit-details-marker { display: none; }
.pane > summary::after {
  content: '▾';
  color: var(--muted);
  font-size: 0.85rem;
  transition: transform .18s ease;
}
.pane:not([open]) > summary::after { transform: rotate(-90deg); }
.pane-hint {
  margin-left: auto;
  font-family: Outfit, sans-serif;
  letter-spacing: 0;
  text-transform: none;
  font-size: 0.72rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 46%;
}
.pane[open] .pane-hint { display: none; }
.pane-body {
  padding: 4px 18px 18px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.pane.actions { padding: 16px 18px; }
.side {
  display: grid;
  gap: 16px;
  position: sticky;
  top: 88px;
}
.mix-col { text-align: left; }
.mix-col h2 { margin: 0; font-size: 1.05rem; }
.mix-body { display: grid; gap: 8px; }
.mix-suggest {
  display: grid;
  gap: 8px;
  margin: 4px 0 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line));
  background: rgba(212, 175, 55, .08);
}
.mix-suggest .btn { justify-self: start; }
.mix {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.mix button {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "badge count"
    "bar bar"
    "meta status";
  gap: 4px 8px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: inherit;
  padding: 8px;
  cursor: pointer;
}
.mix .badge { grid-area: badge; justify-self: start; white-space: nowrap; }
.mix-count {
  grid-area: count;
  font-family: Cinzel, serif;
  font-size: 1.05rem;
}
.mix-meta {
  grid-area: meta;
  color: var(--muted);
  font-size: 0.72rem;
}
.mix-status {
  grid-area: status;
  font-size: 0.72rem;
  text-align: right;
  color: var(--muted);
}
.mix-status.low { color: #fbbf24; }
.mix-status.high { color: #fb7185; }
.mix-status.ok { color: #34d399; }
.mix .bar {
  grid-area: bar;
  position: relative;
  display: block;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
}
.mix .actual {
  display: block;
  height: 100%;
  background: currentColor;
}
.mix .mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f4efe6;
  opacity: .85;
}
.mix li.on button,
.mix li.suggest button { border-color: color-mix(in srgb, var(--gold) 50%, var(--line)); }
.mix li.on button { background: rgba(255,255,255,.04); }
.preview-col {
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
}
.preview-kicker {
  margin: 0;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--gold);
}
.preview-copies {
  display: grid;
  gap: 6px;
  width: 100%;
  font-size: 0.82rem;
}
.preview-copies input { width: 100%; }
.gif-scrub {
  display: grid;
  gap: 8px;
  width: 100%;
  text-align: center;
}
.gif-scrub-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: end;
}
.gif-scrub-row label {
  display: grid;
  gap: 6px;
  font-size: 0.82rem;
}
.gif-scrub-row input { width: 100%; }
.gif-scrub .btn { min-width: 40px; }
.still-editor { display: grid; gap: 10px; }
.still-label {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.still-thumb {
  width: 100%;
  max-width: 280px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #0c0914;
}
.still-thumb img {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
}
.links-fold {
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.links-fold > summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 0.82rem;
  margin-bottom: 10px;
}
.links-fold label { margin-top: 8px; }
.span-2 { grid-column: 1 / -1; }
.collector-auto { margin: 0; }
small { color: var(--muted); }
@media (max-width: 980px) {
  .editor { grid-template-columns: 1fr; }
  .side { position: static; }
}
</style>
