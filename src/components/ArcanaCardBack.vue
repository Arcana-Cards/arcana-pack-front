<template>
  <div class="card-back-art" aria-hidden="true">
    <svg viewBox="0 0 280 400" class="mark">
      <defs>
        <radialGradient :id="`${uid}-glow`" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stop-color="#5b3a12" stop-opacity="0.9" />
          <stop offset="55%" stop-color="#160c24" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#07050d" stop-opacity="1" />
        </radialGradient>
        <linearGradient :id="`${uid}-gold`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff3c4" />
          <stop offset="40%" stop-color="#d4af37" />
          <stop offset="100%" stop-color="#8a6d1c" />
        </linearGradient>
        <linearGradient :id="`${uid}-ink`" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="#2a1844" />
          <stop offset="100%" stop-color="#0b0712" />
        </linearGradient>
      </defs>
      <rect width="280" height="400" :fill="`url(#${uid}-ink)`" />
      <rect width="280" height="400" :fill="`url(#${uid}-glow)`" />
      <g fill="none" :stroke="`url(#${uid}-gold)`" stroke-width="1.2" opacity="0.35">
        <rect x="18" y="18" width="244" height="364" rx="10" />
        <rect x="28" y="28" width="224" height="344" rx="6" />
      </g>
      <g fill="none" stroke="#d4af37" stroke-width="0.6" opacity="0.22">
        <path d="M40 80 H240 M40 320 H240 M80 40 V360 M200 40 V360" />
        <circle cx="140" cy="200" r="92" />
        <circle cx="140" cy="200" r="118" />
      </g>
      <g transform="translate(140 188)">
        <circle r="62" fill="#120818" :stroke="`url(#${uid}-gold)`" stroke-width="3" />
        <circle r="52" fill="none" stroke="#d4af37" stroke-width="1" opacity="0.55" stroke-dasharray="3 5" />
        <path
          :fill="`url(#${uid}-gold)`"
          d="M0 -36 L12 -8 H32 L16 8 L22 34 L0 18 L-22 34 L-16 8 L-32 -8 H-12 Z"
        />
        <path fill="#120818" d="M0 -18 L6 2 H-6 Z" />
        <circle r="4.5" fill="#fff3c4" />
      </g>
      <text x="140" y="278" text-anchor="middle" fill="#f4efe6" font-family="Cinzel, serif" font-size="22" letter-spacing="4">ARCANA</text>
      <text x="140" y="302" text-anchor="middle" fill="#d4af37" font-family="Cinzel, serif" font-size="13" letter-spacing="8">PACK</text>
      <g fill="#d4af37">
        <circle cx="140" cy="54" r="2.4" />
        <circle cx="140" cy="348" r="2.4" />
        <circle cx="52" cy="200" r="2" />
        <circle cx="228" cy="200" r="2" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{ uid: string }>();
</script>

<style scoped>
.card-back-art,
.mark {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
