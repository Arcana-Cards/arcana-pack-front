<template>
  <div class="card-wrap">
    <div
      class="card-scene"
      :class="[`rarity-${card.rarity}`, `frame-${card.frameStyle || 'classic'}`, { compact, pocket, large, faceup, foil: showFoil }]"
      :style="sceneStyle"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <div class="tilt" :style="tiltStyle">
        <div class="flipper" :class="{ faceup }">
          <div class="face back">
            <div class="face-inner">
              <AnacraCardBack :uid="uid" />
            </div>
          </div>
          <div class="face front" :class="finishClass">
            <div class="face-inner" :style="copyStyle">
              <header class="bar">
                <strong class="name">{{ card.name }}</strong>
                <span class="mana">{{ magicGlyph }}</span>
              </header>
              <div class="art" :class="[card.style, filterClass]">
                <img v-if="artSrc" class="art-image" :src="artSrc" alt="" referrerpolicy="no-referrer" @error="onArtError" />
                <svg v-else viewBox="0 0 300 220" aria-hidden="true">
                  <defs>
                    <radialGradient :id="`g-${uid}`" cx="50%" cy="40%">
                      <stop offset="0%" :stop-color="card.glowColor" stop-opacity="0.95" />
                      <stop offset="70%" :stop-color="contourColor" stop-opacity="0.55" />
                      <stop offset="100%" :stop-color="card.backColor" />
                    </radialGradient>
                  </defs>
                  <rect width="300" height="220" :fill="`url(#g-${uid})`" />
                  <g :transform="`translate(150 110) rotate(${rot})`">
                    <polygon v-for="(poly, i) in shapes" :key="i" :points="poly" :fill="i % 2 ? card.glowColor : contourColor" :opacity="0.28 + (i % 3) * 0.12" />
                    <circle r="18" :fill="card.glowColor" opacity="0.85" />
                    <circle r="46" fill="none" :stroke="contourColor" stroke-width="3" opacity="0.6" />
                    <circle r="72" fill="none" :stroke="contourColor" stroke-width="1.5" opacity="0.4" :stroke-dasharray="dash" />
                  </g>
                  <text x="16" y="204" fill="white" opacity="0.55" font-size="12" font-family="Cinzel, serif">{{ card.subtype }}</text>
                </svg>
                <div class="vignette" />
              </div>
              <div ref="copyEl" class="copy">
                <p v-if="card.subtitle" class="subtitle">{{ card.subtitle }}</p>
                <div class="meta">
                  <span class="badge r-rare">{{ typeLine }}</span>
                  <span class="badge" :class="`r-${card.rarity}`">{{ rarityLabel }}</span>
                  <span v-if="showFoil" class="badge r-legendary">Brillante</span>
                  <span v-if="card.artAnimatedUrl" class="badge r-epic">GIF</span>
                </div>
                <p class="desc">{{ card.description }}</p>
                <p v-if="flavorLine" class="flavor">« {{ flavorLine }} »</p>
              </div>
              <footer class="bar bottom">
                <span>{{ paddedNumber }} · {{ card.editionCode || 'SET' }}{{ card.editionName ? ` · ${card.editionName}` : '' }}</span>
                <strong v-if="showCombatStats">{{ card.power ?? 0 }}/{{ card.toughness ?? 0 }}</strong>
              </footer>
              <div class="foil-sheet" :class="holoActive ? 'linear' : 'none'" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="inspect" class="inspect">
      <label>
        Incliner la carte
        <input v-model.number="inspectYaw" type="range" min="-14" max="14" />
      </label>
      <p>Passe la souris sur la carte pour le holo.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { mediaUrl } from '@/api/client';
import { giphyIdFromUrl, resolveArtSrc } from '@/media/giphy';
import AnacraCardBack from '@/components/AnacraCardBack.vue';
import { hashSeed, KIND_LABELS, RARITY_COLORS, RARITY_LABELS, kindHasCombatStats, type Card } from '@/types';

function unwrapQuotes(value: string | null | undefined): string {
  let text = String(value || '').trim().replace(/^=\s*/, '');
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(/^[«‹“"']+\s*/, '').replace(/\s*[»›”"']+$/, '').trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

const props = withDefaults(defineProps<{
  card: Card;
  foil?: boolean;
  animated?: boolean;
  faceup?: boolean;
  compact?: boolean;
  pocket?: boolean;
  large?: boolean;
  artOverride?: string;
  ownedCopies?: number | null;
  inspect?: boolean;
}>(), {
  foil: false,
  animated: false,
  faceup: true,
  compact: false,
  pocket: false,
  large: false,
  artOverride: '',
  ownedCopies: undefined,
  inspect: false,
});

const tilt = ref({ x: 0, y: 0 });
const inspectYaw = ref(0);
const uid = computed(() => `c${hashSeed(props.card.artSeed + props.card.name)}`);
const seed = computed(() => hashSeed(props.card.artSeed || props.card.name));
const rot = computed(() => (seed.value % 50) - 25);
const dash = computed(() => `${8 + (seed.value % 10)} ${6 + (seed.value % 8)}`);
const rarityLabel = computed(() => RARITY_LABELS[props.card.rarity]);
const flavorLine = computed(() => unwrapQuotes(props.card.flavorText));
const typeLine = computed(() => {
  const kind = KIND_LABELS[props.card.kind] || 'Carte';
  return props.card.subtype ? `${kind} — ${props.card.subtype}` : kind;
});
const showCombatStats = computed(() => kindHasCombatStats(props.card.kind || 'creature'));
const paddedNumber = computed(() => String(props.card.collectorNumber || 0).padStart(3, '0'));
const unlockAt = computed(() => props.card.animatedUnlockCopies || 5);
const gifUnlocked = computed(() => {
  const hasGif = Boolean(props.card.artAnimatedUrl || giphyIdFromUrl(props.card.artUrl));
  if (!hasGif) return false;
  if (props.ownedCopies == null) return true;
  return props.ownedCopies >= unlockAt.value;
});
const brokenArt = ref('');
const artSrc = computed(() => {
  if (props.artOverride) return mediaUrl(props.artOverride);
  const still = props.card.artUrl;
  const gif = props.card.artAnimatedUrl;
  const pick = gifUnlocked.value ? (gif || still) : (still || gif);
  const src = resolveArtSrc(pick, gifUnlocked.value);
  return src && src !== brokenArt.value ? src : '';
});
function onArtError() {
  if (artSrc.value) brokenArt.value = artSrc.value;
}
watch(() => [props.card.artUrl, props.card.artAnimatedUrl, props.artOverride], () => {
  brokenArt.value = '';
});
const showFoil = computed(() => props.foil || props.card.artFilter === 'holo' || props.card.artFilter === 'shiny');
const holoActive = computed(() => props.card.artFilter === 'holo');
const filterClass = computed(() => `filter-${props.card.artFilter || 'none'}`);
const finishClass = computed(() => `finish-${props.card.borderFinish || 'matte'}`);
const yaw = computed(() => tilt.value.y + inspectYaw.value);
const magicGlyph = computed(() => ({
  none: '◇', arcane: '✶', nature: '❀', fire: '🜂', water: '🜄', shadow: '☾', holy: '✧', chaos: '☯', swamp: '🌿', tech: '⬡',
}[props.card.magicType]));

const shapes = computed(() => {
  const n = 4 + (seed.value % 4);
  return Array.from({ length: n }, (_, i) => {
    const r = 40 + ((seed.value >> i) % 70);
    const a = (Math.PI * 2 * i) / n;
    const b = a + 0.8;
    const c = a + 1.8;
    return `0,0 ${Math.cos(a) * r},${Math.sin(a) * r} ${Math.cos(b) * r * 0.6},${Math.sin(b) * r * 0.6} ${Math.cos(c) * r},${Math.sin(c) * r}`;
  });
});

const contourColor = computed(() => RARITY_COLORS[props.card.rarity] || RARITY_COLORS.common);

const copyEl = ref<HTMLElement | null>(null);
const copyScale = ref(1);
const nameScale = ref(1);
const copyStyle = computed(() => ({
  '--copy-scale': String(copyScale.value),
  '--name-scale': String(nameScale.value),
}));

function nameFits(el: HTMLElement) {
  const fs = parseFloat(getComputedStyle(el).fontSize) || 12;
  return el.scrollHeight <= fs * 2.55 + 1;
}

function fits(el: HTMLElement) {
  return el.scrollHeight <= el.clientHeight + 1;
}

function applyScale(inner: HTMLElement, name: number, copy: number) {
  inner.style.setProperty('--name-scale', String(name));
  inner.style.setProperty('--copy-scale', String(copy));
}

function fitCopy() {
  if (props.pocket) {
    copyScale.value = 1;
    nameScale.value = 1;
    return;
  }
  const el = copyEl.value;
  const inner = el?.closest('.face-inner') as HTMLElement | null;
  const name = inner?.querySelector('.name') as HTMLElement | null;
  if (!el || !inner) return;

  applyScale(inner, 1, 1);
  void inner.offsetHeight;

  let nameBest = 1;
  if (name) {
    let lo = 0.55;
    let hi = 1;
    nameBest = 0.55;
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) / 2;
      applyScale(inner, mid, 1);
      void name.offsetHeight;
      if (nameFits(name)) {
        nameBest = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
  }

  applyScale(inner, nameBest, 1);
  void el.offsetHeight;
  let copyBest = 1;
  if (!fits(el)) {
    let lo = 0.48;
    let hi = 1;
    copyBest = 0.48;
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) / 2;
      applyScale(inner, nameBest, mid);
      void el.offsetHeight;
      if (fits(el)) {
        copyBest = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
  }

  nameScale.value = Number(nameBest.toFixed(3));
  copyScale.value = Number(copyBest.toFixed(3));
  applyScale(inner, nameScale.value, copyScale.value);
}

let copyObserver: ResizeObserver | null = null;
let fitFrame = 0;
function scheduleFit() {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => {
    nextTick(fitCopy);
  });
}

onMounted(() => {
  scheduleFit();
  copyObserver = new ResizeObserver(scheduleFit);
  if (copyEl.value) copyObserver.observe(copyEl.value);
  const scene = copyEl.value?.closest('.card-scene');
  if (scene) copyObserver.observe(scene);
  void document.fonts?.ready?.then(scheduleFit);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(fitFrame);
  copyObserver?.disconnect();
});
watch(
  () => [
    props.card.name,
    props.card.subtitle,
    props.card.description,
    props.card.flavorText,
    props.card.kind,
    props.card.subtype,
    props.card.rarity,
    props.compact,
    props.pocket,
    props.large,
  ],
  scheduleFit,
);

const sceneStyle = computed(() => ({
  '--border': contourColor.value,
  '--back': props.card.backColor,
  '--glow': props.card.glowColor,
  '--text': props.card.textColor || '#f4efe6',
  '--holo-x': `${50 + yaw.value * 3.4}%`,
  '--holo-y': `${50 + tilt.value.x * 3.6}%`,
  '--holo-o': holoActive.value ? String(0.34 + Math.min(0.4, Math.abs(yaw.value) / 22)) : '0',
}));

const tiltStyle = computed(() => {
  if (!props.faceup) return { transform: 'none' };
  return { transform: `rotateX(${tilt.value.x}deg) rotateY(${yaw.value}deg)` };
});

function onMove(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const px = (event.clientX - box.left) / box.width - 0.5;
  const py = (event.clientY - box.top) / box.height - 0.5;
  tilt.value = { x: py * -7, y: px * 11 };
}

function onLeave() {
  tilt.value = { x: 0, y: 0 };
}
</script>

<style scoped>
.card-wrap { display: grid; justify-items: center; gap: 10px; }
.card-scene {
  width: 280px;
  height: 400px;
  perspective: 920px;
  cursor: pointer;
}
.card-scene.compact { width: 210px; height: 300px; }
.card-scene.large {
  width: min(420px, 86vw, calc(78vh * 0.7));
  height: min(600px, 78vh, calc(86vw * 1.428));
}
.card-scene.pocket { width: 118px; height: 168px; }
.card-scene.pocket .desc,
.card-scene.pocket .flavor,
.card-scene.pocket .subtitle { display: none; }
.card-scene.pocket .face-inner { padding: 4px; border-width: 2px; }
.card-scene.pocket .bar { font-size: 0.55rem; gap: 2px; }
.card-scene.pocket .name { font-size: 0.55rem; }
.card-scene.pocket .art { height: 48%; min-height: 0; margin: 3px 0; border-radius: 6px; }
.card-scene.pocket .copy { min-height: 0; }
.card-scene.pocket .meta { gap: 2px; }
.card-scene.pocket .badge { font-size: 0.55rem; padding: 1px 4px; }
.card-scene.pocket .bottom { font-size: 0.52rem; }
.card3d,
.tilt {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  transition: transform 0.12s ease-out;
}
.flipper {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateY(180deg);
  transition: transform 1.2s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.flipper.faceup { transform: rotateY(0deg); }
.face {
  position: absolute;
  inset: 0;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform-style: flat;
  border-radius: 16px;
}
.face-inner {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  border: 3px solid var(--border);
  box-shadow: 0 18px 40px rgba(0,0,0,.4), 0 0 24px color-mix(in srgb, var(--border) 45%, transparent);
}
.card-scene.frame-ornate .face { border-radius: 18px; }
.card-scene.frame-rune .face { border-radius: 14px; }
.card-scene.frame-swamp .face { border-radius: 16px; }
.front {
  transform: rotateY(0deg) translateZ(1px);
  z-index: 2;
}
.front .face-inner {
  position: relative;
  background: linear-gradient(180deg, color-mix(in srgb, var(--back) 70%, #fff 8%), var(--back));
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px;
  color: var(--text);
}
.card-scene.compact .front .face-inner { padding: 6px; }
.back {
  transform: rotateY(180deg) translateZ(1px);
  z-index: 1;
}
.back .face-inner {
  border-color: #d4af37;
  box-shadow: 0 18px 40px rgba(0,0,0,.4), 0 0 22px rgba(212, 175, 55, .28);
  background: #0b0712;
  padding: 0;
}
.finish-shiny .face-inner {
  box-shadow:
    0 18px 40px rgba(0,0,0,.4),
    0 0 28px color-mix(in srgb, var(--border) 55%, white 20%),
    inset 0 1px 0 rgba(255,255,255,.55),
    inset 0 0 0 1px color-mix(in srgb, var(--border) 70%, white 35%);
}
.finish-metallic .face-inner {
  box-shadow:
    0 18px 40px rgba(0,0,0,.45),
    0 0 20px color-mix(in srgb, var(--border) 40%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--border) 55%, white 45%),
    inset 0 0 18px rgba(255,255,255,.25);
  background-image: linear-gradient(145deg, rgba(255,255,255,.16), transparent 40%, rgba(0,0,0,.2));
}
.finish-neon .face-inner {
  box-shadow:
    0 0 10px var(--border),
    0 0 28px color-mix(in srgb, var(--border) 70%, transparent),
    inset 0 0 14px color-mix(in srgb, var(--border) 35%, transparent);
}
.finish-prism .face-inner {
  animation: prism-border 5s linear infinite;
}
.finish-swamp .face-inner {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--border) 70%, #000 30%),
    0 18px 40px rgba(0,0,0,.4);
}
.sigil {
  width: 84px; height: 84px; border-radius: 50%;
  display: grid; place-items: center;
  border: 2px solid var(--gold);
  font-size: 2rem;
  background: rgba(0,0,0,.3);
}
.bar { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; font-size: 0.82rem; flex-shrink: 0; }
.name {
  font-family: Cinzel, serif;
  font-size: calc(0.82rem * var(--name-scale, 1));
  line-height: 1.15;
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.mana { color: var(--glow); flex-shrink: 0; }
.art {
  position: relative;
  margin: 6px 0 4px;
  flex: 0 0 36%;
  min-height: 88px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 70%, white 10%);
}
.card-scene.compact .art { flex-basis: 34%; min-height: 72px; }
.card-scene.frame-ornate .art { border-radius: 12px; }
.art svg, .art-image { width: 100%; height: 100%; display: block; }
.art-image { object-fit: cover; }
.copy {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: calc(3px * var(--copy-scale, 1));
}
.subtitle {
  font-size: calc(0.72rem * var(--copy-scale, 1));
  line-height: 1.2;
  color: color-mix(in srgb, var(--text) 72%, transparent);
  margin: 0;
  overflow-wrap: anywhere;
}
.art.pixel { image-rendering: pixelated; filter: contrast(1.15) saturate(1.2); }
.art.neon { filter: saturate(1.4) brightness(1.1); }
.art.watercolor { filter: blur(0.2px) saturate(0.9); }
.art.gothic { filter: contrast(1.2) grayscale(.15); }
.filter-shiny .art-image { filter: brightness(1.18) saturate(1.3) contrast(1.06); }
.filter-blur .art-image { filter: blur(1.5px) saturate(1.08); }
.filter-holo .art-image { filter: saturate(1.35) contrast(1.1) hue-rotate(8deg); }
.filter-chrome .art-image { filter: grayscale(.4) contrast(1.45) brightness(1.18); }
.filter-swamp .art-image { filter: sepia(.28) hue-rotate(62deg) saturate(1.15); }
.filter-neon .art-image { filter: saturate(1.85) brightness(1.12) contrast(1.08); }
.filter-pixel .art-image { image-rendering: pixelated; filter: contrast(1.25) saturate(1.15); }
.filter-vignette .vignette,
.filter-holo .vignette {
  position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 42px 10px rgba(0,0,0,.45);
}
.foil-sheet {
  pointer-events: none;
  position: absolute;
  inset: -40%;
  z-index: 6;
  opacity: var(--holo-o, 0);
  mix-blend-mode: color-dodge;
  background-image:
    repeating-linear-gradient(
      118deg,
      rgba(255, 90, 200, 0.7) 0px,
      rgba(125, 211, 252, 0.75) 36px,
      rgba(255, 255, 255, 0.95) 68px,
      rgba(134, 239, 172, 0.7) 102px,
      rgba(196, 181, 253, 0.75) 138px,
      rgba(253, 230, 138, 0.7) 174px,
      rgba(255, 90, 200, 0.7) 210px
    );
  background-size: 320% 320%;
  background-position: var(--holo-x, 50%) var(--holo-y, 50%);
  transition: opacity .12s ease, background-position .08s linear;
}
.foil-sheet.none { opacity: 0; }
.desc {
  font-size: calc(0.78rem * var(--copy-scale, 1));
  line-height: 1.3;
  margin: 0;
  overflow-wrap: anywhere;
}
.flavor {
  font-size: calc(0.72rem * var(--copy-scale, 1));
  line-height: 1.25;
  font-style: italic;
  color: color-mix(in srgb, var(--text) 72%, transparent);
  margin: 0;
  overflow-wrap: anywhere;
}
.meta { display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; }
.copy .badge {
  font-size: calc(0.68rem * var(--copy-scale, 1));
  padding: calc(2px * var(--copy-scale, 1)) calc(6px * var(--copy-scale, 1));
}
.bottom { font-size: 0.7rem; margin-top: 4px; }
.inspect { width: 280px; text-align: center; }
.inspect label { display: grid; gap: 6px; font-size: 0.82rem; color: var(--muted); }
.inspect input { width: 100%; }
.inspect p { margin: 0; font-size: 0.75rem; color: var(--muted); }
.rarity-legendary .front .face-inner, .rarity-mythic .front .face-inner { animation: pulse 2.6s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 18px 40px rgba(0,0,0,.4), 0 0 42px color-mix(in srgb, var(--border) 70%, transparent); } }
@keyframes prism-border {
  0% { box-shadow: 0 0 16px var(--border), 0 18px 40px rgba(0,0,0,.4); }
  50% { box-shadow: 0 0 28px color-mix(in srgb, var(--border) 80%, white 20%), 0 18px 40px rgba(0,0,0,.4); }
  100% { box-shadow: 0 0 16px var(--border), 0 18px 40px rgba(0,0,0,.4); }
}
</style>
