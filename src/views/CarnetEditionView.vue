<template>
  <AppShell>
    <div v-if="data" class="page-head">
      <div>
        <p class="lede">{{ data.summary.universeName }}</p>
        <h1>Carnet {{ data.summary.editionName }}</h1>
        <p class="lede">
          {{ data.summary.editionCode }} · {{ data.summary.collectedSlots }}/{{ data.summary.totalSlots }} cartes
          · {{ data.summary.copies }} exemplaire{{ data.summary.copies > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="row">
        <RouterLink class="btn" :to="`/notebooks/${data.summary.editionId}`">Cahier</RouterLink>
        <RouterLink class="btn" to="/carnet">Retour</RouterLink>
      </div>
    </div>

    <div v-if="data" class="ledger" :style="{ '--accent': data.summary.accentColor }">
      <article
        v-for="slot in data.slots"
        :key="slot.collectorNumber"
        class="entry"
        :class="{ owned: slot.owned, missing: !slot.owned }"
      >
        <span class="num">#{{ pad(slot.collectorNumber) }}</span>
        <button
          v-if="slot.owned && slot.card"
          class="card-hit"
          type="button"
          :aria-label="`Ouvrir ${slot.card.name}`"
          @click="inspectSlot(slot)"
        >
          <TradingCard
            :card="slot.card"
            :foil="slot.foilCopies > 0"
            :foil-badge="false"
            :animated="slot.animatedCopies > 0"
            :owned-copies="slot.copies"
            :pocket="true"
          />
        </button>
        <div v-else class="mystery" :aria-label="`Carte #${pad(slot.collectorNumber)} inconnue`">?</div>
        <div class="meta">
          <strong v-if="slot.owned">{{ slot.card?.name }}</strong>
          <strong v-else class="unknown">Inconnue</strong>
          <span class="qty">{{ slot.owned ? `×${slot.copies}` : '?' }}</span>
          <span v-if="slot.foilCopies" class="foil-count">
            {{ slot.foilCopies }} brillante{{ slot.foilCopies > 1 ? 's' : '' }}
          </span>
        </div>
      </article>
    </div>
    <CardLightbox
      :card="inspected?.card ?? null"
      :foil="inspected?.foil"
      :foil-badge="false"
      :animated="inspected?.animated"
      :owned-copies="inspected?.copies"
      @close="inspected = null"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import CardLightbox from '@/components/CardLightbox.vue';
import TradingCard from '@/components/TradingCard.vue';
import { api } from '@/api/client';
import type { Card, NotebookDetail, NotebookSlot } from '@/types';

const route = useRoute();
const data = ref<NotebookDetail | null>(null);
const inspected = ref<{ card: Card; foil: boolean; animated: boolean; copies: number } | null>(null);

onMounted(async () => {
  data.value = await api<NotebookDetail>(`/collection/notebooks/${route.params.editionId}`);
});

function pad(n: number) {
  return String(n).padStart(3, '0');
}

function inspectSlot(slot: NotebookSlot) {
  if (!slot.owned || !slot.card) return;
  inspected.value = {
    card: slot.card,
    foil: slot.foilCopies > 0,
    animated: slot.animatedCopies > 0,
    copies: slot.copies,
  };
}
</script>

<style scoped>
.ledger {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}
.entry {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 12px 10px 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(12, 8, 18, .78);
}
.entry.owned { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }
.card-hit {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: zoom-in;
}
.entry.missing { filter: saturate(.35); }
.num {
  font-family: Cinzel, serif;
  font-size: 0.78rem;
  letter-spacing: .12em;
  color: var(--muted);
}
.mystery {
  width: 118px;
  height: 168px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-family: Cinzel, serif;
  font-size: 3.4rem;
  color: #f5e6a8;
  background:
    repeating-linear-gradient(45deg, #160c24 0 8px, #1f1430 8px 16px),
    radial-gradient(circle at 50% 40%, #3b2a10, #090712);
  border: 2px solid rgba(212, 175, 55, .28);
  box-shadow: inset 0 0 24px rgba(0,0,0,.45);
}
.meta {
  display: grid;
  justify-items: center;
  gap: 2px;
  text-align: center;
  min-height: 42px;
}
.meta strong { font-size: 0.86rem; line-height: 1.2; }
.unknown { color: var(--muted); font-weight: 500; }
.qty {
  font-family: Cinzel, serif;
  font-size: 1.05rem;
  color: var(--gold-2);
}
.foil-count {
  font-size: 0.72rem;
  color: var(--gold);
}
.entry.missing .qty { color: var(--muted); font-size: 1.4rem; }
</style>
