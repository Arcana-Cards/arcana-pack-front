<template>
  <Teleport to="body">
    <div
      v-if="card"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Détail de la carte"
      @click.self="close"
    >
      <button class="close" type="button" aria-label="Fermer" @click="close">Fermer</button>
      <TradingCard
        :card="card"
        :foil="foil"
        :foil-badge="foilBadge"
        :animated="animated"
        :owned-copies="ownedCopies"
        large
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import TradingCard from '@/components/TradingCard.vue';
import type { Card } from '@/types';

const props = withDefaults(defineProps<{
  card: Card | null;
  foil?: boolean;
  foilBadge?: boolean;
  animated?: boolean;
  ownedCopies?: number;
}>(), {
  foil: false,
  foilBadge: undefined,
  animated: false,
  ownedCopies: 1,
});

const emit = defineEmits<{ close: [] }>();

function close() {
  emit('close');
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close();
}

watch(() => props.card, (card, prev) => {
  if (card && !prev) {
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  }
  if (!card && prev) {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 28px 16px 36px;
  background: rgba(6, 3, 12, .78);
  backdrop-filter: blur(10px);
}
.close {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 1px solid var(--line);
  background: rgba(12, 8, 18, .9);
  color: var(--gold-2);
  border-radius: 999px;
  padding: 8px 14px;
  font-family: Cinzel, serif;
  letter-spacing: .06em;
  cursor: pointer;
}
.close:hover { border-color: var(--gold); }
</style>
