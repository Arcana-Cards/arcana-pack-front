<template>
  <AppShell>
    <div v-if="data" class="page-head">
      <div>
        <p class="lede">{{ data.summary.universeName }}</p>
        <h1>Cahier {{ data.summary.editionName }}</h1>
        <p class="lede">
          {{ data.summary.editionCode }} · {{ filledCount }}/{{ pockets.length }} pochettes
          · {{ pileStacks.length }} carte{{ pileStacks.length > 1 ? 's' : '' }} à ranger
        </p>
      </div>
      <div class="row">
        <RouterLink class="btn" :to="`/carnet/${data.summary.editionId}`">Carnet</RouterLink>
        <RouterLink class="btn" to="/notebooks">Retour</RouterLink>
      </div>
    </div>

    <p v-if="hint" class="hint">{{ hint }}</p>

    <div v-if="data" class="cahier" :style="{ '--cover': data.summary.coverColor, '--accent': data.summary.accentColor }">
      <div class="toolbar">
        <button class="btn" type="button" aria-label="Pages précédentes" :disabled="spread <= 0" @click="spread -= 1">◀</button>
        <span>Pages {{ leftPageNo }}–{{ rightPageNo }} / {{ lastPageNo }}</span>
        <button class="btn" type="button" aria-label="Pages suivantes" :disabled="spread >= lastSpread" @click="spread += 1">▶</button>
        <button class="btn" type="button" @click="addPage">Ajouter une page</button>
      </div>

      <div class="spread">
        <section class="sheet">
          <header>Page {{ leftPageNo }}</header>
          <div class="pockets">
            <article
              v-for="pocket in leftPage"
              :key="pocket.slotIndex"
              class="pocket"
              :class="pocketClass(pocket)"
              role="button"
              tabindex="0"
              :aria-label="pocketLabel(pocket)"
              @dragover.prevent="onDragOver"
              @drop.prevent="onDropPocket($event, pocket)"
              @click="onClickPocket(pocket)"
              @keyup.enter="onClickPocket(pocket)"
            >
              <div
                v-if="pocket.copy"
                class="sleeve"
                draggable="true"
                @dragstart="onDragStart($event, pocket.copy)"
                @dragend="onDragEnd"
                @dblclick.stop="inspectCopy(pocket.copy)"
              >
                <TradingCard
                  :card="pocket.copy.card"
                  :foil="hasFoil(pocket.copy.card.id)"
                  :foil-badge="pocket.copy.foil"
                  :animated="pocket.copy.animated"
                  :owned-copies="copiesOf(pocket.copy.card.id)"
                  :pocket="true"
                />
                <button
                  class="inspect-btn"
                  type="button"
                  aria-label="Voir la carte en grand"
                  @click.stop="inspectCopy(pocket.copy)"
                >Agrandir</button>
                <span v-if="copiesOf(pocket.copy.card.id) > 1" class="qty">×{{ copiesOf(pocket.copy.card.id) }}</span>
              </div>
              <div v-else class="empty-sleeve">
                <span class="blank" />
                <small>Vide</small>
              </div>
            </article>
          </div>
        </section>

        <div class="spine" aria-hidden="true">
          <i v-for="n in 6" :key="n" />
        </div>

        <section class="sheet">
          <header>Page {{ rightPageNo }}</header>
          <div class="pockets">
            <article
              v-for="pocket in rightPage"
              :key="pocket.slotIndex"
              class="pocket"
              :class="pocketClass(pocket)"
              role="button"
              tabindex="0"
              :aria-label="pocketLabel(pocket)"
              @dragover.prevent="onDragOver"
              @drop.prevent="onDropPocket($event, pocket)"
              @click="onClickPocket(pocket)"
              @keyup.enter="onClickPocket(pocket)"
            >
              <div
                v-if="pocket.copy"
                class="sleeve"
                draggable="true"
                @dragstart="onDragStart($event, pocket.copy)"
                @dragend="onDragEnd"
                @dblclick.stop="inspectCopy(pocket.copy)"
              >
                <TradingCard
                  :card="pocket.copy.card"
                  :foil="hasFoil(pocket.copy.card.id)"
                  :foil-badge="pocket.copy.foil"
                  :animated="pocket.copy.animated"
                  :owned-copies="copiesOf(pocket.copy.card.id)"
                  :pocket="true"
                />
                <button
                  class="inspect-btn"
                  type="button"
                  aria-label="Voir la carte en grand"
                  @click.stop="inspectCopy(pocket.copy)"
                >Agrandir</button>
                <span v-if="copiesOf(pocket.copy.card.id) > 1" class="qty">×{{ copiesOf(pocket.copy.card.id) }}</span>
              </div>
              <div v-else class="empty-sleeve">
                <span class="blank" />
                <small>Vide</small>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <aside
      v-if="data"
      class="pile"
      :class="{ over: pileOver, active: Boolean(selectedId) }"
      @dragover.prevent="pileOver = true"
      @dragleave="pileOver = false"
      @drop.prevent="onDropPile"
      @click="onClickPileBg"
    >
      <div class="pile-head">
        <h2>Pile à ranger</h2>
        <p>Glisse n’importe quelle carte dans n’importe quelle pochette. Clic pour sélectionner, puis clic sur la case.</p>
      </div>
      <div v-if="pileStacks.length" class="pile-row">
        <div
          v-for="stack in pileStacks"
          :key="stack.copy.card.id"
          class="sleeve pile-card"
          :class="{ selected: selectedId === stack.copy.id }"
          role="button"
          tabindex="0"
          draggable="true"
          @dragstart="onDragStart($event, stack.copy)"
          @dragend="onDragEnd"
          @click.stop="selectCopy(stack.copy)"
          @dblclick.stop="inspectCopy(stack.copy)"
          @keyup.enter.stop="selectCopy(stack.copy)"
        >
          <TradingCard
            :card="stack.copy.card"
            :foil="hasFoil(stack.copy.card.id)"
            :foil-badge="stack.count === 1 && stack.copy.foil"
            :animated="stack.copy.animated"
            :owned-copies="copiesOf(stack.copy.card.id)"
            :pocket="true"
          />
          <button
            class="inspect-btn"
            type="button"
            aria-label="Voir la carte en grand"
            @click.stop="inspectCopy(stack.copy)"
          >Agrandir</button>
          <span v-if="stack.count > 1" class="qty">×{{ stack.count }}</span>
        </div>
      </div>
      <p v-else class="empty-pile">Toutes tes cartes de cette édition sont rangées dans le cahier.</p>
    </aside>
    <CardLightbox
      :card="inspected?.card ?? null"
      :foil="inspected?.foil"
      :foil-badge="inspected?.foilBadge"
      :animated="inspected?.animated"
      :owned-copies="inspected?.copies"
      @close="inspected = null"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import CardLightbox from '@/components/CardLightbox.vue';
import TradingCard from '@/components/TradingCard.vue';
import { api, ApiError } from '@/api/client';
import type { BinderPocket, Card, LooseCopy, NotebookDetail } from '@/types';

const SLOTS_PER_PAGE = 9;
const SLOTS_PER_SPREAD = 18;

const route = useRoute();
const data = ref<NotebookDetail | null>(null);
const spread = ref(0);
const extraPages = ref(0);
const selectedId = ref<number | null>(null);
const dragging = ref<LooseCopy | null>(null);
const pileOver = ref(false);
const hint = ref('');
const busy = ref(false);
const inspected = ref<{ card: Card; foil: boolean; foilBadge: boolean; animated: boolean; copies: number } | null>(null);

const pockets = computed<BinderPocket[]>(() => {
  const base = data.value?.pockets ?? [];
  const wanted = base.length + extraPages.value * SLOTS_PER_PAGE;
  const size = Math.max(SLOTS_PER_SPREAD, Math.ceil(wanted / SLOTS_PER_SPREAD) * SLOTS_PER_SPREAD);
  const padded = [...base];
  for (let i = padded.length; i < size; i += 1) {
    padded.push({ slotIndex: i, copy: null });
  }
  return padded;
});
const filledCount = computed(() => pockets.value.filter((pocket) => pocket.copy).length);
const lastSpread = computed(() => Math.max(0, Math.ceil((pockets.value.length || 1) / SLOTS_PER_SPREAD) - 1));
const lastPageNo = computed(() => Math.max(1, Math.ceil((pockets.value.length || 1) / SLOTS_PER_PAGE)));
const leftPageNo = computed(() => spread.value * 2 + 1);
const rightPageNo = computed(() => spread.value * 2 + 2);
const leftPage = computed(() => pockets.value.slice(spread.value * SLOTS_PER_SPREAD, spread.value * SLOTS_PER_SPREAD + SLOTS_PER_PAGE));
const rightPage = computed(() => pockets.value.slice(spread.value * SLOTS_PER_SPREAD + SLOTS_PER_PAGE, spread.value * SLOTS_PER_SPREAD + SLOTS_PER_SPREAD));
const editionId = computed(() => Number(route.params.editionId));
const activeCopy = computed(() => dragging.value || findCopy(selectedId.value));
const pileStacks = computed(() => {
  const placed = new Set(
    (data.value?.pockets ?? []).flatMap((pocket) => (pocket.copy ? [pocket.copy.card.id] : [])),
  );
  const groups = new Map<number, LooseCopy[]>();
  for (const copy of data.value?.pile ?? []) {
    if (placed.has(copy.card.id)) continue;
    const list = groups.get(copy.card.id) ?? [];
    list.push(copy);
    groups.set(copy.card.id, list);
  }
  return [...groups.values()].map((copies) => ({
    copy: copies.find((item) => item.foil) ?? copies.find((item) => item.animated) ?? copies[0],
    count: copies.length,
  }));
});

onMounted(async () => {
  data.value = await api<NotebookDetail>(`/collection/notebooks/${route.params.editionId}`);
});

function pocketLabel(pocket: BinderPocket) {
  if (pocket.copy) return `Pochette remplie · ${pocket.copy.card.name}`;
  return 'Pochette vide';
}

function copiesOf(cardId: number) {
  if (!data.value) return 1;
  const inPile = data.value.pile.filter((copy) => copy.card.id === cardId).length;
  const inBinder = data.value.pockets.filter((pocket) => pocket.copy?.card.id === cardId).length;
  return inPile + inBinder || 1;
}

function hasFoil(cardId: number) {
  if (!data.value) return false;
  return data.value.pile.some((copy) => copy.card.id === cardId && copy.foil)
    || data.value.pockets.some((pocket) => pocket.copy?.card.id === cardId && pocket.copy.foil);
}

function findCopy(id: number | null): LooseCopy | null {
  if (!id || !data.value) return null;
  const piled = data.value.pile.find((copy) => copy.id === id);
  if (piled) return piled;
  return data.value.pockets.find((pocket) => pocket.copy?.id === id)?.copy ?? null;
}

function pocketClass(pocket: BinderPocket) {
  const copy = activeCopy.value;
  return {
    filled: Boolean(pocket.copy),
    droppable: Boolean(copy && pocket.copy?.id !== copy.id),
  };
}

function addPage() {
  extraPages.value += 1;
  spread.value = lastSpread.value;
}

function selectCopy(copy: LooseCopy) {
  selectedId.value = selectedId.value === copy.id ? null : copy.id;
  hint.value = selectedId.value ? 'Choisis n’importe quelle pochette' : '';
}

function inspectCopy(copy: LooseCopy) {
  inspected.value = {
    card: copy.card,
    foil: copy.foil,
    foilBadge: copy.foil,
    animated: copy.animated,
    copies: copiesOf(copy.card.id),
  };
}

function onDragStart(event: DragEvent, copy: LooseCopy) {
  dragging.value = copy;
  selectedId.value = copy.id;
  event.dataTransfer?.setData('text/plain', String(copy.id));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onDragEnd() {
  dragging.value = null;
  pileOver.value = false;
}

function onDragOver(event: DragEvent) {
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

async function onDropPocket(event: DragEvent, pocket: BinderPocket) {
  pileOver.value = false;
  const raw = event.dataTransfer?.getData('text/plain');
  const copyId = Number(raw || dragging.value?.id);
  dragging.value = null;
  await placeAt(copyId, pocket);
}

async function onClickPocket(pocket: BinderPocket) {
  if (selectedId.value) {
    await placeAt(selectedId.value, pocket);
    return;
  }
  if (pocket.copy) {
    selectedId.value = pocket.copy.id;
    hint.value = 'Dépose-la dans la pile pour la retirer, ou clique une autre case.';
  }
}

async function onDropPile() {
  pileOver.value = false;
  const copyId = dragging.value?.id ?? selectedId.value;
  dragging.value = null;
  if (copyId) await unplace(copyId);
}

function onClickPileBg() {
  if (selectedId.value && !data.value?.pile.some((copy) => copy.id === selectedId.value)) {
    void unplace(selectedId.value);
  }
}

async function placeAt(copyId: number, pocket: BinderPocket) {
  const copy = findCopy(copyId);
  if (!copy || busy.value) return;
  if (pocket.copy?.id === copyId) {
    selectedId.value = null;
    return;
  }
  const alreadyPlaced = data.value?.pockets.some((item) => (
    item.copy
    && item.copy.card.id === copy.card.id
    && item.copy.id !== copy.id
  ));
  if (alreadyPlaced) {
    hint.value = 'Cette carte est déjà dans le cahier';
    selectedId.value = null;
    return;
  }
  busy.value = true;
  try {
    data.value = await api<NotebookDetail>(`/collection/notebooks/${editionId.value}/place`, {
      method: 'POST',
      body: JSON.stringify({ copyId, slotIndex: pocket.slotIndex }),
    });
    selectedId.value = null;
    hint.value = '';
  } catch (err) {
    hint.value = err instanceof ApiError || err instanceof Error ? err.message : 'Impossible de ranger cette carte';
  } finally {
    busy.value = false;
  }
}

async function unplace(copyId: number) {
  if (busy.value) return;
  if (data.value?.pile.some((copy) => copy.id === copyId)) {
    selectedId.value = null;
    return;
  }
  busy.value = true;
  try {
    data.value = await api<NotebookDetail>(`/collection/notebooks/${editionId.value}/unplace`, {
      method: 'POST',
      body: JSON.stringify({ copyId }),
    });
    selectedId.value = null;
    hint.value = '';
  } catch (err) {
    hint.value = err instanceof ApiError || err instanceof Error ? err.message : 'Impossible de retirer cette carte';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.hint {
  margin: 0 0 14px;
  color: var(--gold-2);
  text-align: center;
}
.cahier {
  background:
    radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 46%),
    linear-gradient(180deg, color-mix(in srgb, var(--cover) 88%, #1a120c), #120c0a);
  border: 1px solid rgba(212, 175, 55, .28);
  border-radius: 22px;
  padding: 18px 18px 22px;
  box-shadow: inset 0 0 0 6px rgba(40, 22, 12, .55), 0 24px 60px rgba(0,0,0,.35);
}
.toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  color: var(--gold-2);
  font-family: Cinzel, serif;
  position: sticky;
  top: 64px;
  z-index: 6;
  background: color-mix(in srgb, var(--cover) 88%, #120c0a);
  border-radius: 999px;
  padding: 6px 12px;
}
.spread {
  display: grid;
  grid-template-columns: 1fr 28px 1fr;
  gap: 8px;
  min-height: 620px;
}
.sheet {
  background:
    linear-gradient(90deg, rgba(80, 50, 30, .18), transparent 18px),
    repeating-linear-gradient(0deg, rgba(90, 60, 30, .05) 0 2px, transparent 2px 28px),
    #f3e6c8;
  color: #3b2a18;
  border-radius: 4px 12px 12px 4px;
  padding: 14px 14px 18px;
  box-shadow: inset 0 0 40px rgba(90, 50, 20, .12);
}
.sheet:last-child { border-radius: 12px 4px 4px 12px; }
.sheet header {
  font-family: Cinzel, serif;
  font-size: 0.78rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 10px;
  opacity: .7;
}
.pockets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.pocket {
  min-height: 196px;
  border-radius: 10px;
  border: 1px dashed rgba(80, 50, 20, .28);
  background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(180, 140, 90, .18));
  display: grid;
  place-items: center;
  padding: 6px;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
}
.pocket.droppable { border: 2px solid #2f9e44; box-shadow: 0 0 0 3px rgba(47,158,68,.18); }
.pocket.filled { border-style: solid; border-color: rgba(80, 50, 20, .4); background: rgba(255,255,255,.2); }
.empty-sleeve {
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  padding: 12px 6px;
}
.empty-sleeve .blank {
  width: 42px;
  height: 58px;
  border-radius: 4px;
  border: 1px dashed rgba(80, 50, 20, .28);
  background: rgba(255,255,255,.18);
}
.empty-sleeve small { color: #7a5c3a; font-size: 0.72rem; }
.spine {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
}
.spine i {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f5e6a8, #8a6d1c 55%, #3b2a10);
  box-shadow: 0 2px 4px rgba(0,0,0,.4);
}
.inspect-btn {
  position: absolute;
  left: 6px;
  bottom: 6px;
  z-index: 3;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(80, 50, 20, .35);
  background: rgba(255, 248, 230, .92);
  color: #3b2a18;
  font-size: 0.68rem;
  font-family: Cinzel, serif;
  cursor: zoom-in;
}
.pile-card .inspect-btn {
  color: var(--gold-2);
  background: rgba(12, 8, 18, .88);
  border-color: rgba(212, 175, 55, .35);
}
.sleeve { display: grid; justify-items: center; gap: 4px; cursor: grab; position: relative; }
.sleeve :deep(img) { pointer-events: none; }
.qty {
  position: absolute;
  right: 6px;
  bottom: 6px;
  z-index: 2;
  min-width: 1.6em;
  padding: 1px 7px;
  border-radius: 999px;
  font-family: Cinzel, serif;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
  color: #3b2a18;
  background: rgba(255, 248, 230, .9);
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
}
.pile-card .qty {
  color: var(--gold-2);
  background: rgba(12, 8, 18, .88);
  border: 1px solid rgba(212, 175, 55, .35);
}
.pile {
  margin-top: 18px;
  background: rgba(12, 8, 18, .9);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px;
}
.pile.over, .pile.active { border-color: var(--gold); }
.pile-head h2 { font-size: 1.1rem; }
.pile-head p { color: var(--muted); margin: 6px 0 0; }
.pile-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 14px 4px 6px;
}
.pile-card {
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  padding: 4px;
  border-radius: 12px;
}
.pile-card.selected { border-color: var(--gold); background: rgba(212, 175, 55, .08); }
.empty-pile { color: var(--muted); margin: 12px 0 0; }

@media (max-width: 980px) {
  .spread { grid-template-columns: 1fr; min-height: 0; }
  .spine { flex-direction: row; height: 24px; }
  .sheet, .sheet:last-child { border-radius: 12px; }
}
</style>
