<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Atelier admin</h1>
        <p class="lede">Crée les univers, les cartes, les boosters, et envoie des paquets aux collectionneurs.</p>
      </div>
    </div>
    <div class="grid hub">
      <RouterLink class="hub-card panel" to="/admin/universes">
        <h2>Univers & éditions</h2>
        <p class="lede">{{ universeCount }} univers · {{ editionCount }} édition{{ editionCount > 1 ? 's' : '' }}</p>
      </RouterLink>
      <RouterLink class="hub-card panel" to="/admin/cards/import">
        <h2>Collection IA</h2>
        <p class="lede">Thème + GIFs Giphy : ChatGPT écrit les cartes, tu valides, ça crée l’édition.</p>
      </RouterLink>
      <RouterLink class="hub-card panel" to="/admin/cards">
        <h2>Cartes</h2>
        <p class="lede">Style, magie, rareté, illustration, filtres, couleurs de texte.</p>
      </RouterLink>
      <RouterLink class="hub-card panel" to="/admin/boosters">
        <h2>Boosters</h2>
        <p class="lede">Rareté moyenne, édition, chances brillantes et d’animation.</p>
      </RouterLink>
      <RouterLink class="hub-card panel collectors" to="/admin/users">
        <h2>Collectionneurs</h2>
        <p class="lede">Offrir des boosters à un compte, plusieurs paquets à la fois.</p>
      </RouterLink>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api } from '@/api/client';
import type { Edition, Universe } from '@/types';

const universeCount = ref(0);
const editionCount = ref(0);

onMounted(async () => {
  const [universes, editions] = await Promise.all([
    api<Universe[]>('/admin/universes'),
    api<Edition[]>('/admin/editions'),
  ]);
  universeCount.value = universes.length;
  editionCount.value = editions.length;
});
</script>
