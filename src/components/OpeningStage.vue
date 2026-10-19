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
      <button class="btn primary open-pack" type="button" :disabled="ripping" @click="$emit('rip')">
        {{ ripping ? 'Ouverture…' : 'Ouvrir le paquet' }}
      </button>
    </div>
    <div
      v-else-if="shownPull"
      class="focus"
    >
      <button
        ref="heroEl"
        class="hero"
        type="button"
        :style="{ '--card-w': `${layout.cardW}px`, '--card-h': `${layout.cardH}px` }"
        @click="onHeroClick"
      >
        <TradingCard
          :key="shownPull.id"
          large
          :card="shownPull.card"
          :foil="shownPull.foil"
          :animated="shownPull.animated"
          :owned-copies="copiesAt(shownIndex)"
          :faceup="shownIndex <= current"
        />
      </button>
      <div class="slot-odds">
        <span v-if="shownPull.isNew" class="badge r-legendary">Nouvelle</span>
        <span class="owned">×{{ copiesAt(shownIndex) }}</span>
        <span class="odds" :class="`r-${shownPull.card.rarity}`">{{ formatChance(shownPull) }}</span>
      </div>
      <div class="rail">
        <button
          v-for="(pull, index) in pulls"
          :key="pull.id"
          class="tick"
          type="button"
          :class="{ on: index === shownIndex, seen: index <= current, wait: index > current }"
          :disabled="index > current"
          :title="index <= current ? pull.card.name : `Carte ${index + 1}`"
          @click="onRailClick(index)"
        >
          {{ index + 1 }}
        </button>
      </div>
    </div>
    <p v-if="allOpened" class="done-msg">
      Range-les ensuite dans le cahier, ou ouvre un autre booster.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import PackArt from '@/components/PackArt.vue';
import TradingCard from '@/components/TradingCard.vue';
import type { PulledCopy, UserBooster } from '@/types';
import { RARITY_LABELS } from '@/types';
import { playCardFlip, playFoilShimmer, playRareReveal } from '@/audio/packSounds';

const props = defineProps<{
  booster: UserBooster;
  pulls: PulledCopy[];
  ripping: boolean;
  current: number;
}>();
const emit = defineEmits<{ rip: []; next: [] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
const heroEl = ref<HTMLElement | null>(null);
const shake = ref(false);
const picked = ref<number | null>(null);
const layout = reactive({ cardW: 320, cardH: 458 });
let raf = 0;
let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
let resizeObs: ResizeObserver | null = null;

const allOpened = computed(() => props.pulls.length > 0 && props.current >= props.pulls.length - 1);
const shownIndex = computed(() => {
  if (picked.value != null && picked.value <= props.current) return picked.value;
  return Math.max(0, props.current);
});
const shownPull = computed(() => props.pulls[shownIndex.value] || null);
const currentPull = computed(() => props.pulls[props.current]);
const fxClass = computed(() => currentPull.value && props.current >= 0 ? `fx-${currentPull.value.card.rarity}` : '');

function copiesAt(index: number) {
  const pull = props.pulls[index];
  if (!pull) return 1;
  const same = props.pulls.filter((item) => item.card.id === pull.card.id);
  const last = Math.max(...same.map((item) => Number(item.copies) || 1));
  const order = same.findIndex((item) => item.id === pull.id);
  const after = Math.max(0, same.length - 1 - Math.max(0, order));
  return Math.max(1, last - after);
}

function computeLayout() {
  const el = heroEl.value;
  if (!el) return;
  const w = Math.max(160, el.clientWidth);
  const h = Math.max(200, el.clientHeight);
  const aspect = 236 / 338;
  let cardH = h;
  let cardW = cardH * aspect;
  if (cardW > w) {
    cardW = w;
    cardH = cardW / aspect;
  }
  layout.cardW = Math.max(180, Math.floor(cardW));
  layout.cardH = Math.max(258, Math.floor(cardH));
}

function onHeroClick() {
  if (!allOpened.value) emit('next');
}

function onRailClick(index: number) {
  if (index > props.current) {
    if (index === props.current + 1) emit('next');
    return;
  }
  picked.value = index;
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
  picked.value = null;
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

watch(() => [props.pulls.length, shownIndex.value], async () => {
  await nextTick();
  if (heroEl.value && !resizeObs) {
    resizeObs = new ResizeObserver(() => computeLayout());
    resizeObs.observe(heroEl.value);
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

function formatChance(pull: PulledCopy) {
  const n = Math.round(Number(pull.dropChance));
  const label = RARITY_LABELS[pull.card.rarity];
  if (!Number.isFinite(n) || n < 0) return label;
  return `${label} · ${n} %`;
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
.stage.lined { min-height: 0; padding: 8px 8px 36px; }
.fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.idle { display: grid; place-items: center; align-content: center; gap: 16px; height: 100%; min-height: 0; }
.open-pack { z-index: 2; }
.idle p, .done-msg { text-align: center; color: var(--muted); }
.done-msg {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 6px;
  margin: 0;
  font-size: 0.82rem;
  pointer-events: none;
}
.focus {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  height: 100%;
  min-height: 0;
  gap: 8px;
}
.hero {
  min-height: 0;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  padding: 0;
  cursor: pointer;
}
.hero :deep(.card-wrap) {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  place-items: center;
}
.hero :deep(.card-scene) {
  width: var(--card-w, 320px);
  height: var(--card-h, 458px);
}
.slot-odds {
  z-index: 2;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 10px;
  align-items: center;
  pointer-events: none;
  text-align: center;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(9, 7, 18, .88);
  border: 1px solid var(--line);
  justify-self: center;
}
.rail {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tick {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #0c0914;
  color: var(--muted);
  font-family: Cinzel, serif;
  font-size: 0.72rem;
  cursor: pointer;
}
.tick.seen { color: var(--gold-2); border-color: color-mix(in srgb, var(--gold) 40%, var(--line)); }
.tick.on { color: #1a1028; background: var(--gold); border-color: var(--gold); }
.tick.wait { opacity: .45; cursor: default; }
.owned {
  font-family: Cinzel, serif;
  font-size: 0.7rem;
  letter-spacing: .03em;
  color: var(--gold-2);
}
.odds {
  font-family: Cinzel, serif;
  font-size: 0.74rem;
  letter-spacing: .04em;
  color: var(--muted);
}
.odds.r-common { color: #94a3b8; }
.odds.r-uncommon { color: #34d399; }
.odds.r-rare { color: #60a5fa; }
.odds.r-epic { color: #c084fc; }
.odds.r-legendary { color: #fbbf24; }
.odds.r-mythic { color: #fb7185; }
.shake { animation: boom .45s ease; }
.fx-rare { box-shadow: inset 0 0 80px rgba(96,165,250,.25); }
.fx-epic { box-shadow: inset 0 0 100px rgba(192,132,252,.3); }
.fx-legendary { box-shadow: inset 0 0 120px rgba(251,191,36,.35); }
.fx-mythic { box-shadow: inset 0 0 140px rgba(251,113,133,.4); animation: myth .9s ease; }
@keyframes boom { 10%, 90% { transform: translateX(-4px); } 20%, 80% { transform: translateX(4px); } }
@keyframes myth { 50% { filter: saturate(1.4) contrast(1.1); } }
</style>
