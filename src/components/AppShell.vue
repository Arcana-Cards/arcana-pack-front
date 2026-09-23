<template>
  <div class="shell" :class="{ 'with-rail': showAdminRail }">
    <header class="topbar">
      <RouterLink to="/" class="brand">Arcana <span>Pack</span></RouterLink>
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
    <div class="body">
      <aside v-if="showAdminRail" class="admin-rail">
        <p class="rail-kicker">Atelier</p>
        <RouterLink to="/admin" :class="{ on: route.path === '/admin' }">Accueil</RouterLink>
        <RouterLink to="/admin/universes" :class="{ on: isAdminPath('/admin/universes') }">Univers & éditions</RouterLink>
        <RouterLink to="/admin/cards" :class="{ on: isAdminPath('/admin/cards') }">Cartes</RouterLink>
        <RouterLink to="/admin/boosters" :class="{ on: isAdminPath('/admin/boosters') }">Boosters</RouterLink>
        <RouterLink to="/admin/users" :class="{ on: isAdminPath('/admin/users') }">Collectionneurs</RouterLink>
      </aside>
      <main class="page">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const showAdminRail = computed(() => auth.isAdmin && route.path.startsWith('/admin'));

function isAdminPath(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`);
}

function logout() {
  auth.logout();
  void router.push('/login');
}
</script>

<style scoped>
.muted { color: var(--muted); font-size: 0.9rem; }
.body {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}
.with-rail .body {
  grid-template-columns: 232px minmax(0, 1fr);
}
.admin-rail {
  border-right: 1px solid var(--line);
  background: rgba(7, 6, 13, 0.55);
  padding: 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 61px;
  height: calc(100vh - 61px);
}
.rail-kicker {
  margin: 0 10px 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.68rem;
  color: var(--gold);
}
.admin-rail a {
  display: block;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--muted);
}
.admin-rail a:hover,
.admin-rail a.on {
  color: var(--text);
  background: rgba(212, 175, 55, 0.12);
}
@media (max-width: 860px) {
  .with-rail .body { grid-template-columns: 1fr; }
  .admin-rail {
    position: static;
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
}
</style>
