<template>
  <Teleport to="body">
    <div v-if="current" class="burn-veil" role="dialog" aria-modal="true" aria-label="Carte brûlée">
      <p class="kicker">Punition</p>
      <h2>Une de tes cartes brûle</h2>
      <div class="stage" :class="{ spent }">
        <div class="embers" aria-hidden="true">
          <i v-for="n in 18" :key="n" :style="emberStyle(n)" />
        </div>
        <TradingCard
          :card="current.card"
          :foil="current.foil"
          :foil-badge="current.foil"
          :animated="current.animated"
          large
        />
      </div>
      <p class="lede">{{ current.card.name }} a disparu de ta collection.</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import TradingCard from '@/components/TradingCard.vue';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import type { CardBurn } from '@/types';

const auth = useAuthStore();
const queue = ref<CardBurn[]>([]);
const current = ref<CardBurn | null>(null);
const spent = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let fetching = false;

function emberStyle(n: number) {
  const delay = ((n * 137) % 900) / 1000;
  const left = 8 + ((n * 53) % 84);
  const duration = 1.4 + ((n * 17) % 12) / 10;
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

async function ack(id: number) {
  try {
    await api('/collection/burns/ack', {
      method: 'POST',
      body: JSON.stringify({ ids: [id] }),
    });
  } catch {
    /* next login will retry */
  }
}

function playNext() {
  clearTimer();
  spent.value = false;
  const next = queue.value[0] ?? null;
  current.value = next;
  if (!next) return;
  timer = setTimeout(() => {
    spent.value = true;
    timer = setTimeout(() => {
      const done = queue.value.shift();
      if (done) void ack(done.id);
      playNext();
    }, 900);
  }, 2400);
}

async function loadBurns() {
  if (!auth.isLoggedIn || fetching) return;
  fetching = true;
  try {
    const burns = await api<CardBurn[]>('/collection/burns');
    if (!burns.length) return;
    queue.value = [...queue.value, ...burns.filter((burn) => !queue.value.some((item) => item.id === burn.id))];
    if (!current.value) playNext();
  } catch {
    /* stay silent if the session is stale */
  } finally {
    fetching = false;
  }
}

watch(() => auth.isLoggedIn, (logged) => {
  if (logged) void loadBurns();
  else {
    clearTimer();
    queue.value = [];
    current.value = null;
    spent.value = false;
  }
});

onMounted(() => {
  if (auth.isLoggedIn) void loadBurns();
});
</script>

<style scoped>
.burn-veil {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  padding: 28px 16px;
  background: rgba(8, 3, 4, .82);
  backdrop-filter: blur(10px);
  text-align: center;
}
.kicker {
  margin: 0;
  letter-spacing: .16em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: #fb7185;
}
h2 { margin: 0; color: #f5e6a8; }
.lede { color: var(--muted); margin: 0; }
.stage {
  position: relative;
  filter: contrast(1.05);
  animation: char 2.4s ease forwards;
}
.stage.spent { animation: ash .9s ease forwards; }
.embers {
  position: absolute;
  inset: -18px -10px 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}
.embers i {
  position: absolute;
  bottom: 8%;
  width: 5px;
  height: 8px;
  border-radius: 999px;
  background: #fb923c;
  box-shadow: 0 0 8px #f97316;
  animation-name: rise;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes char {
  0% { filter: none; }
  35% { filter: sepia(.45) saturate(1.4) contrast(1.15) brightness(1.05); }
  70% { filter: sepia(.9) saturate(1.6) contrast(1.35) brightness(.72) hue-rotate(-18deg); }
  100% { filter: brightness(.28) contrast(1.5) sepia(1); }
}
@keyframes ash {
  to { opacity: 0; transform: translateY(18px) scale(.94); filter: brightness(0); }
}
@keyframes rise {
  0% { opacity: 0; transform: translateY(12px) scale(.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-140px) scale(.2); }
}
</style>
