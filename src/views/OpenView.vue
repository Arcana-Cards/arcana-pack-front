<template>
  <AppShell>
    <div class="open-fit">
      <OpeningStage
        v-if="booster"
        class="open-stage"
        :booster="booster"
        :pulls="pulls"
        :ripping="ripping"
        :current="current"
        @rip="openPack"
        @next="revealNext"
      />
      <p v-if="error" class="error">{{ error }}</p>
      <div v-if="pulls.length && current < pulls.length - 1" class="row open-actions">
        <button class="btn primary" type="button" @click="revealNext">Carte suivante</button>
      </div>
      <div v-else-if="pulls.length || error" class="row open-actions">
        <RouterLink class="btn" :to="nextBoosterHref">{{ nextBoosterLabel }}</RouterLink>
        <RouterLink class="btn primary" :to="binderHref">Ranger dans le cahier</RouterLink>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import OpeningStage from '@/components/OpeningStage.vue';
import { api } from '@/api/client';
import { playPackShake, unlockAudio } from '@/audio/packSounds';
import type { PulledCopy, UserBooster } from '@/types';

const route = useRoute();
const booster = ref<UserBooster | null>(null);
const pulls = ref<PulledCopy[]>([]);
const ripping = ref(false);
const current = ref(-1);
const error = ref('');
const leftover = ref<UserBooster[]>([]);
const binderHref = computed(() => {
  const editionId = pulls.value[0]?.card.editionId;
  const mixed = pulls.value.some((pull) => pull.card.editionId !== editionId);
  return editionId && !mixed ? `/notebooks/${editionId}` : '/notebooks';
});
const nextPack = computed(() => leftover.value.find((item) => String(item.id) !== String(route.params.id)) || null);
const nextBoosterHref = computed(() => nextPack.value ? `/open/${nextPack.value.id}` : '/');
const nextBoosterLabel = computed(() => nextPack.value ? 'Ouvrir un autre booster' : 'Retour aux boosters');
let autoToken = 0;

watch(
  () => String(route.params.id),
  async (id) => {
    autoToken += 1;
    pulls.value = [];
    leftover.value = [];
    current.value = -1;
    ripping.value = false;
    error.value = '';
    booster.value = null;
    try {
      const unopened = await api<UserBooster[]>('/collection/boosters?opened=0');
      leftover.value = unopened.filter((item) => String(item.id) !== id);
      booster.value = unopened.find((item) => String(item.id) === id) || null;
      if (!booster.value) {
        error.value = leftover.value.length
          ? 'Ce booster est déjà ouvert. Prends-en un autre.'
          : 'Booster introuvable.';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Booster introuvable.';
    }
  },
  { immediate: true },
);

async function openPack() {
  if (!booster.value || ripping.value || pulls.value.length) return;
  unlockAudio();
  playPackShake();
  ripping.value = true;
  try {
    await new Promise((r) => setTimeout(r, 280));
    pulls.value = await api<PulledCopy[]>(`/collection/boosters/${booster.value.id}/open`, { method: 'POST' });
    current.value = -1;
    try {
      leftover.value = (await api<UserBooster[]>('/collection/boosters?opened=0'))
        .filter((item) => item.id !== booster.value?.id);
    } catch {
      leftover.value = [];
    }
    void autoReveal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Ouverture impossible';
  } finally {
    ripping.value = false;
  }
}

function delayFor(rarity: string) {
  if (rarity === 'mythic') return 3800;
  if (rarity === 'legendary') return 3200;
  if (rarity === 'epic') return 2500;
  if (rarity === 'rare') return 2000;
  if (rarity === 'uncommon') return 1700;
  return 1550;
}

async function autoReveal() {
  const token = ++autoToken;
  while (current.value < pulls.value.length - 1) {
    const wait = current.value < 0 ? 1600 : delayFor(pulls.value[current.value]?.card.rarity || 'common');
    await new Promise((resolve) => setTimeout(resolve, wait));
    if (token !== autoToken) return;
    current.value += 1;
  }
}

function revealNext() {
  if (current.value >= pulls.value.length - 1) return;
  current.value += 1;
  void autoReveal();
}
</script>

<style scoped>
.open-fit {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100dvh - 123px);
  min-height: 0;
  overflow: hidden;
}
.open-stage {
  flex: 1 1 auto;
  min-height: 0;
}
.open-actions {
  flex: 0 0 auto;
  justify-content: center;
}
@media (max-width: 860px) {
  .open-fit { height: calc(100dvh - 111px); }
}
</style>

