<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Cahiers de collection</h1>
        <p class="lede">Chaque édition a son cahier à pochettes. Range tes cartes à la main, case par case.</p>
      </div>
    </div>
    <div v-if="notebooks.length" class="grid cards">
      <RouterLink v-for="book in notebooks" :key="book.editionId" class="panel book" :to="`/notebooks/${book.editionId}`">
        <small>{{ book.universeName }}</small>
        <h2>{{ book.editionName }}</h2>
        <p>Édition {{ book.editionNumber }} · {{ book.editionCode }}</p>
        <strong>{{ book.ownedSlots }} / {{ book.totalSlots }} pochettes</strong>
        <span class="muted">{{ book.collectedSlots }} / {{ book.totalSlots }} au carnet · {{ book.unplaced }} à ranger</span>
        <div class="bar"><i :style="{ width: `${(book.ownedSlots / Math.max(book.totalSlots, 1)) * 100}%`, background: book.accentColor }" /></div>
      </RouterLink>
    </div>
    <div v-else class="panel empty">Ouvre un booster : les cartes iront dans la pile, à glisser dans le cahier.</div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api } from '@/api/client';
import type { NotebookSummary } from '@/types';

const notebooks = ref<NotebookSummary[]>([]);
onMounted(async () => {
  notebooks.value = await api<NotebookSummary[]>('/collection/notebooks');
});
</script>

<style scoped>
.book { display: flex; flex-direction: column; gap: 6px; min-height: 200px; }
.book small { color: var(--muted); letter-spacing: .12em; text-transform: uppercase; }
.muted { color: var(--muted); font-size: 0.88rem; }
.bar { height: 8px; background: #1b1528; border-radius: 99px; overflow: hidden; margin-top: auto; }
.bar i { display: block; height: 100%; }
</style>
