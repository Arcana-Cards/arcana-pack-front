<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink to="/" class="brand">Anacra <span>Pack</span></RouterLink>
      <nav class="nav">
        <RouterLink to="/">Boosters</RouterLink>
        <RouterLink to="/notebooks">Cahiers</RouterLink>
        <RouterLink to="/carnet">Carnet</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin">Admin</RouterLink>
      </nav>
      <div class="row">
        <span class="muted">{{ auth.user?.username }}</span>
        <button class="ghost" type="button" @click="logout">Quitter</button>
      </div>
    </header>
    <main class="page">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  void router.push('/login');
}
</script>

<style scoped>
.muted { color: var(--muted); font-size: 0.9rem; }
</style>
