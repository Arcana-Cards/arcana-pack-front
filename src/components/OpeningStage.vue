<template>
  <div class="stage" :class="[fxClass, { ripping, shake, lined: pulls.length }]">
    <canvas ref="canvas" class="fx" />
    <div v-if="!pulls.length" class="idle">
      <PackArt
        tearable
        :torn="ripping"
        :name="booster.templateName"
        :subtitle="booster.universeName || 'Booster mixte'"
        :count="booster.cardCount"
        :average="booster.averageRarity"
        :art-url="booster.artUrl"
        @open="$emit('rip')"
      />
    </div>
    <div
      v-else
      ref="revealsEl"
      class="reveals"
      :style="{
        '--n': pulls.length,
        '--card-w': `${layout.cardW}px`,
        '--card-h': `${layout.cardH}px`,
      }"
    >
      <button
        v-for="(pull, index) in pulls"
        :key="pull.id"
        class="slot"
        type="button"
        :class="{ active: index === current, done: index < current, hidden: index > current }"
        :style="slotStyle(index)"
        @click="onSlotClick(index)"
      >
        <TradingCard
          :card="pull.card"
          :foil="pull.foil"
          :animated="pull.animated"
          :owned-copies="pull.copies"
          :faceup="index <= current"
        />
        <div v-if="index <= current" class="slot-odds">
          <span v-if="pull.isNew" class="badge r-legendary">Nouvelle</span>
          <span class="odds" :class="luckClass(pull.dropChance)">{{ formatChance(pull.dropChance) }}</span>
        </div>
      </button>
    </div>
    <p v-if="current >= pulls.length - 1 && pulls.length" class="done-msg">
      Tes cartes sont dans la pile. Range-les dans le cahier, ou ouvre un autre booster.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import PackArt from '@/components/PackArt.vue';
import TradingCard from '@/components/TradingCard.vue';
import type { PulledCopy, UserBooster } from '@/types';
import { playCardFlip, playFoilShimmer, playRareReveal } from '@/audio/packSounds';

const props = defineProps<{
  booster: UserBooster;
  pulls: PulledCopy[];
  ripping: boolean;
  current: number;
}>();
const emit = defineEmits<{ rip: []; next: [] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
const revealsEl = ref<HTMLElement | null>(null);
const shake = ref(false);
const layout = reactive({ cardW: 168, cardH: 240 });
let raf = 0;
let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
let resizeObs: ResizeObserver | null = null;

const currentPull = computed(() => props.pulls[props.current]);
const fxClass = computed(() => currentPull.value && props.current >= 0 ? `fx-${currentPull.value.card.rarity}` : '');

function computeLayout() {
  const el = revealsEl.value;
  const n = props.pulls.length;
  if (!el || n < 1) return;
  const odds = 36;
  const gap = 14;
  const pad = 8;
  const w = Math.max(200, el.clientWidth - pad * 2);
  const h = Math.max(220, el.clientHeight - pad * 2);
  const aspect = 236 / 338;
  const rows = n > 6 ? 2 : 1;
  const cols = Math.ceil(n / rows);
  const maxW = (w - gap * (cols - 1)) / cols;
  const maxH = (h - odds * rows - gap * (rows - 1)) / rows;
  let cardH = Math.min(280, maxH, maxW / aspect);
  if (cardH < 110) cardH = 110;
  layout.cardW = cardH * aspect;
  layout.cardH = cardH;
}

function slotStyle(index: number) {
  const active = index === props.current;
  return {
    transform: active ? 'translateY(-6px) scale(1.04)' : 'none',
    zIndex: active ? 2 : 1,
  };
}

function onSlotClick(index: number) {
  if (index === props.current + 1) emit('next');
}

function burst(color: string, count = 40) {
  const w = canvas.value?.width || 800;
  const h = canvas.value?.height || 500;
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: w / 2,
      y: h / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14,
      life: 1,
      color,
    });
  }
}

function tick() {
  const el = canvas.value;
  if (!el) return;
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, el.width, el.height);
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life -= 0.016;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(tick);
}

watch(() => props.current, (index) => {
  const pull = props.pulls[index];
  if (!pull) return;
  const rare = ['rare', 'epic', 'legendary', 'mythic'].includes(pull.card.rarity);
  if (rare) playRareReveal(pull.card.rarity);
  else playCardFlip(pull.card.rarity);
  if (pull.foil) playFoilShimmer();
  if (rare) {
    burst(pull.card.glowColor, pull.card.rarity === 'mythic' ? 90 : 50);
    shake.value = true;
    setTimeout(() => { shake.value = false; }, pull.card.rarity === 'legendary' || pull.card.rarity === 'mythic' ? 900 : 520);
  }
});

watch(() => props.pulls.length, async () => {
  await nextTick();
  if (revealsEl.value && !resizeObs) {
    resizeObs = new ResizeObserver(() => computeLayout());
    resizeObs.observe(revealsEl.value);
  }
  requestAnimationFrame(() => computeLayout());
});

onMounted(() => {
  const resize = () => {
    if (!canvas.value) return;
    canvas.value.width = canvas.value.clientWidth;
    canvas.value.height = canvas.value.clientHeight;
    computeLayout();
  };
  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObs?.disconnect();
});

function formatChance(value: number | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 10) return `${Math.round(n)} %`;
  if (n >= 1) return `${n.toFixed(1).replace('.', ',')} %`;
  if (n >= 0.1) return `${n.toFixed(2).replace('.', ',')} %`;
  return `${n.toFixed(3).replace('.', ',')} %`;
}

function luckClass(value: number | undefined) {
  const n = Number(value);
  if (n < 2) return 'hot';
  if (n < 6) return 'lucky';
  if (n < 15) return 'nice';
  return 'common-odds';
}
</script>

<style scoped>
.stage {
  position: relative;
  min-height: 0;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: radial-gradient(circle at 50% 30%, rgba(124,58,237,.18), transparent 40%), #090712;
  padding: 12px 12px 40px;
}
.stage.lined { min-height: 0; }
.fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.idle { display: grid; place-items: center; height: 100%; min-height: 0; }
.idle p, .done-msg { text-align: center; color: var(--muted); }
.done-msg {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 8px;
  margin: 0;
  font-size: 0.82rem;
  pointer-events: none;
}
.reveals {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  align-content: center;
  gap: 28px 16px;
  height: 100%;
  width: 100%;
  margin: 0 auto;
}
.slot {
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  color: inherit;
  padding: 0 0 28px;
  cursor: pointer;
  transition: transform .35s ease, opacity .35s ease, filter .35s ease;
}
.slot :deep(.card-scene) {
  width: var(--card-w, 176px);
  height: var(--card-h, 252px);
}
.slot :deep(.desc),
.slot :deep(.flavor) { display: none; }
.slot :deep(.bar) { font-size: 0.68rem; }
.slot :deep(.badge) { font-size: 0.58rem; padding: 1px 5px; }
.slot.hidden { filter: brightness(.92); }
.slot.active { filter: none; }
.slot-odds {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  pointer-events: none;
  text-align: center;
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(9, 7, 18, .88);
  border: 1px solid var(--line);
}
.odds {
  font-family: Cinzel, serif;
  font-size: 0.74rem;
  letter-spacing: .04em;
  color: var(--muted);
}
.odds.nice { color: #34d399; }
.odds.lucky { color: #60a5fa; }
.odds.hot { color: #fbbf24; }
.shake { animation: boom .45s ease; }
.fx-rare { box-shadow: inset 0 0 80px rgba(96,165,250,.25); }
.fx-epic { box-shadow: inset 0 0 100px rgba(192,132,252,.3); }
.fx-legendary { box-shadow: inset 0 0 120px rgba(251,191,36,.35); }
.fx-mythic { box-shadow: inset 0 0 140px rgba(251,113,133,.4); animation: myth .9s ease; }
@keyframes boom { 10%, 90% { transform: translateX(-4px); } 20%, 80% { transform: translateX(4px); } }
@keyframes myth { 50% { filter: saturate(1.4) contrast(1.1); } }
</style>
