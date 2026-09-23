<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Chambre forte</h1>
        <p class="lede">Les boosters offerts par l’admin attendent ici. Ouvre-les, puis glisse tes cartes dans les pochettes du cahier.</p>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="unopened.length" class="grid packs">
      <PackArt
        v-for="pack in unopened"
        :key="pack.id"
        :name="pack.templateName"
        :subtitle="pack.universeName || pack.editionName || 'Mixte'"
        :count="pack.cardCount"
        :average="pack.averageRarity"
        :art-url="pack.artUrl"
        @open="goOpen(pack.id)"
      />
    </div>
    <div v-else class="panel empty">Aucun booster en attente. Demande à un admin de t’en envoyer.</div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import PackArt from '@/components/PackArt.vue';
import { api } from '@/api/client';
import { unlockAudio } from '@/audio/packSounds';
import type { UserBooster } from '@/types';

const router = useRouter();
const unopened = ref<UserBooster[]>([]);
const error = ref('');

onMounted(async () => {
  try {
    unopened.value = await api<UserBooster[]>('/collection/boosters?opened=0');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Impossible de charger les boosters';
  }
});

function goOpen(id: number) {
  unlockAudio();
  void router.push(`/open/${id}`);
}
</script>
