<template>
  <div class="pack-wrap" :class="{ tearable }">
    <button
      v-if="!tearable"
      class="pack"
      type="button"
      :class="{ pictured: Boolean(artSrc) }"
      :style="{ '--accent': accent }"
      @click="$emit('open')"
    >
      <img v-if="artSrc" class="art" :src="artSrc" alt="" />
      <div class="wax">✦</div>
      <div class="copy">
        <h3>{{ name }}</h3>
        <p>{{ subtitle }}</p>
        <small>{{ count }} cartes · moyenne {{ averageLabel }}</small>
      </div>
    </button>

    <div
      v-else
      class="pack tear-pack"
      :class="{ pictured: Boolean(artSrc), torn, tearing, strained: pull > 20 }"
      :style="{ '--accent': accent }"
      @pointerdown="onDown"
      @mousedown.prevent
    >
      <div class="guts" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div class="sheet body" :class="{ pictured: Boolean(artSrc) }" :style="bodyStyle">
        <img v-if="artSrc" class="art" :src="artSrc" alt="" />
        <div class="wax">✦</div>
        <div class="copy">
          <h3>{{ name }}</h3>
          <p>{{ subtitle }}</p>
          <small>{{ count }} cartes · moyenne {{ averageLabel }}</small>
        </div>
      </div>
      <div class="sheet lid" :class="{ pictured: Boolean(artSrc) }" :style="lidStyle">
        <img v-if="artSrc" class="art" :src="artSrc" alt="" />
        <i class="perf" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { mediaUrl } from '@/api/client';
import { playPackTear, playTearStrain, unlockAudio } from '@/audio/packSounds';
import { RARITY_LABELS, type Rarity } from '@/types';

const props = defineProps<{
  name: string;
  subtitle: string;
  count: number;
  average: string;
  accent?: string;
  artUrl?: string | null;
  tearable?: boolean;
  torn?: boolean;
}>();
const emit = defineEmits<{ open: [] }>();

const artSrc = computed(() => mediaUrl(props.artUrl) || mediaUrl('/boosters/default.svg'));
const averageLabel = computed(() => RARITY_LABELS[props.average as Rarity] || props.average);
const pull = ref(0);
const tearing = ref(false);
const tornLocal = ref(false);
const torn = computed(() => props.torn || tornLocal.value);
const startX = ref(0);
const THRESHOLD = 72;
const TEAR_Y = 22;
let lastStrainAt = 0;
let lastStrainPull = 0;

const visualPull = computed(() => Math.min(220, pull.value * 0.95));

function shearLine() {
  const steps = 26;
  const tooth = 0.55;
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * 100;
    const y = TEAR_Y + (i % 2 === 0 ? tooth : -tooth);
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return points;
}

const shear = shearLine();
const bodyStyle = {
  clipPath: `polygon(${shear.join(', ')}, 100% 100%, 0 100%)`,
};
const lidClip = `polygon(0% 0%, 100% 0%, ${[...shear].reverse().join(', ')})`;

const lidStyle = computed(() => {
  const x = torn.value ? 300 : visualPull.value;
  return {
    clipPath: lidClip,
    transform: `translate3d(${x}px, 0, 0)`,
  };
});

function bindMove(on: boolean) {
  const fn = on ? window.addEventListener : window.removeEventListener;
  fn('pointermove', onMove);
  fn('pointerup', onUp);
  fn('pointercancel', onUp);
  fn('mousemove', onMove);
  fn('mouseup', onUp);
}

function onDown(event: PointerEvent) {
  if (torn.value) return;
  event.preventDefault();
  unlockAudio();
  tearing.value = true;
  startX.value = event.clientX;
  pull.value = 0;
  lastStrainAt = 0;
  lastStrainPull = 0;
  try {
    if (event.isTrusted) {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
  } catch {
    /* window listeners keep the tear going */
  }
  bindMove(true);
}

function onMove(event: Event) {
  if (!tearing.value || torn.value) return;
  const x = 'clientX' in event ? Number((event as PointerEvent).clientX) : startX.value;
  pull.value = Math.min(240, Math.max(0, x - startX.value));
  const now = performance.now();
  if (pull.value > 6 && pull.value - lastStrainPull > 10 && now - lastStrainAt > 95) {
    playTearStrain(Math.min(1, pull.value / THRESHOLD));
    lastStrainAt = now;
    lastStrainPull = pull.value;
  }
}

function finishTear() {
  tornLocal.value = true;
  pull.value = 200;
  playPackTear();
  window.setTimeout(() => emit('open'), 420);
}

function onUp() {
  if (!tearing.value) return;
  tearing.value = false;
  bindMove(false);
  if (pull.value >= THRESHOLD) {
    finishTear();
    return;
  }
  pull.value = 0;
}

onBeforeUnmount(() => bindMove(false));
</script>

<style scoped>
.pack-wrap { display: grid; justify-items: center; gap: 14px; width: 100%; }
.pack {
  position: relative;
  width: 280px;
  max-width: 100%;
  min-height: 400px;
  border-radius: 8px 8px 18px 18px;
  border: 1px solid color-mix(in srgb, var(--accent, #d4af37) 50%, white 10%);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent, #d4af37) 35%, #120818), #0b0712 70%);
  color: var(--text);
  text-align: left;
  padding: 28px 24px 24px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}
.tear-pack {
  overflow: visible;
  cursor: grab;
  padding: 0;
  display: block;
  width: 280px;
  height: 400px;
  min-height: 400px;
  max-width: 100%;
  touch-action: none;
  user-select: none;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
.tear-pack.tearing { cursor: grabbing; }
.art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.pack.pictured::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(11,7,18,.15) 10%, rgba(11,7,18,.92) 78%);
  z-index: 1;
}
.sheet.pictured::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(11,7,18,.12) 8%, rgba(11,7,18,.88) 78%);
  z-index: 1;
  pointer-events: none;
}
.lid.pictured::after {
  background: linear-gradient(180deg, rgba(11,7,18,.06), rgba(11,7,18,.22));
}
.pack:not(.tear-pack):hover { transform: translateY(-6px) rotate(-1deg); box-shadow: 0 24px 50px rgba(0,0,0,.45); }
.wax {
  position: relative;
  z-index: 2;
  width: 64px; height: 64px; border-radius: 50%;
  display: grid; place-items: center;
  background: radial-gradient(circle at 30% 30%, #fff7, var(--accent, #d4af37));
  color: #1a1204; font-size: 1.35rem;
  margin-top: 24%;
  pointer-events: none;
}
.copy { position: relative; z-index: 2; pointer-events: none; }
h3 {
  font-family: Cinzel, serif;
  margin: 0 0 10px;
  font-size: 1.35rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
p, small {
  color: color-mix(in srgb, var(--text) 78%, var(--muted));
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
}
small { display: block; margin-top: 12px; font-size: 0.92rem; }
.sheet {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
.guts {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 8px;
  height: 22%;
  z-index: 1;
  pointer-events: none;
  display: grid;
  place-items: center;
}
.guts span {
  position: absolute;
  width: 72%;
  height: 78%;
  border-radius: 6px;
  background:
    linear-gradient(180deg, #2a1a3a, #120818);
  border: 1px solid color-mix(in srgb, var(--accent, #d4af37) 55%, #000);
  box-shadow: 0 8px 18px rgba(0,0,0,.45);
}
.guts span:nth-child(1) { transform: translate(-10px, 6px) rotate(-8deg); }
.guts span:nth-child(2) { transform: translate(8px, 4px) rotate(6deg); }
.guts span:nth-child(3) { transform: translate(0, 0) rotate(-1deg); width: 76%; }
.body {
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 22px 22px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent, #d4af37) 35%, #120818), #0b0712 70%);
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
  border: 1px solid color-mix(in srgb, var(--accent, #d4af37) 50%, white 10%);
}
.lid {
  z-index: 5;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent, #d4af37) 35%, #120818), #0b0712 70%);
  transform-origin: 0 0;
  transition: transform .2s ease;
  filter: drop-shadow(6px 4px 10px rgba(0,0,0,.35));
  border: 1px solid color-mix(in srgb, var(--accent, #d4af37) 50%, white 10%);
}
.tearing .lid { transition: none; }
.torn .lid {
  transition: transform .55s cubic-bezier(.12,.72,.2,1);
}
.perf {
  position: absolute;
  left: 8px;
  right: 8px;
  top: calc(22% - 5px);
  z-index: 4;
  height: 11px;
  pointer-events: none;
  background: radial-gradient(circle, transparent 3px, rgba(11,7,18,.95) 3.6px) 0 0 / 11px 11px repeat-x;
}
</style>
