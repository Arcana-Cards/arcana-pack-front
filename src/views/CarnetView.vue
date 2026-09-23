<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Carnet de collection</h1>
        <p class="lede">Toutes les cartes de chaque édition. Un point d’interrogation tant que tu ne l’as pas, le nombre d’exemplaires dès que tu l’as.</p>
      </div>
    </div>
    <div v-if="editions.length" class="grid cards">
      <RouterLink v-for="book in editions" :key="book.editionId" class="panel book" :to="`/carnet/${book.editionId}`">
        <small>{{ book.universeName }}</small>
        <h2>{{ book.editionName }}</h2>
        <p>Édition {{ book.editionNumber }} · {{ book.editionCode }}</p>
        <strong>{{ book.collectedSlots }} / {{ book.totalSlots }} cartes</strong>
        <span class="muted">{{ book.copies }} exemplaire{{ book.copies > 1 ? 's' : '' }}</span>
        <div class="bar"><i :style="{ width: `${(book.collectedSlots / Math.max(book.totalSlots, 1)) * 100}%`, background: book.accentColor }" /></div>
      </RouterLink>
    </div>
    <div v-else class="panel empty">Aucune édition n’a encore de cartes.</div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api } from '@/api/client';
import type { NotebookSummary } from '@/types';

const editions = ref<NotebookSummary[]>([]);
onMounted(async () => {
  editions.value = await api<NotebookSummary[]>('/collection/carnet');
});
</script>

<style scoped>
.book { display: flex; flex-direction: column; gap: 6px; min-height: 200px; }
.book small { color: var(--muted); letter-spacing: .12em; text-transform: uppercase; }
.muted { color: var(--muted); font-size: 0.88rem; }
.bar { height: 8px; background: #1b1528; border-radius: 99px; overflow: hidden; margin-top: auto; }
.bar i { display: block; height: 100%; }
</style>
