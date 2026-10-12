<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" :key="route.fullPath" />
  </RouterView>
  <BurnNotice />
</template>

<script setup lang="ts">
import BurnNotice from '@/components/BurnNotice.vue';
</script>
