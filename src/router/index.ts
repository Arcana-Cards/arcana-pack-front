import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
    { path: '/register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },
    { path: '/', component: () => import('@/views/VaultView.vue'), meta: { auth: true } },
    { path: '/open/:id', component: () => import('@/views/OpenView.vue'), meta: { auth: true } },
    { path: '/notebooks', component: () => import('@/views/NotebooksView.vue'), meta: { auth: true } },
    { path: '/notebooks/:editionId', component: () => import('@/views/NotebookView.vue'), meta: { auth: true } },
    { path: '/carnet', component: () => import('@/views/CarnetView.vue'), meta: { auth: true } },
    { path: '/carnet/:editionId', component: () => import('@/views/CarnetEditionView.vue'), meta: { auth: true } },
    { path: '/admin', component: () => import('@/views/admin/AdminHome.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/universes', component: () => import('@/views/admin/AdminUniverses.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/cards', component: () => import('@/views/admin/AdminCards.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/cards/import', component: () => import('@/views/admin/AdminAiImport.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/cards/new', component: () => import('@/views/admin/AdminCardForm.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/cards/:id', component: () => import('@/views/admin/AdminCardForm.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/boosters', component: () => import('@/views/admin/AdminBoosters.vue'), meta: { auth: true, admin: true } },
    { path: '/admin/users', component: () => import('@/views/admin/AdminUsers.vue'), meta: { auth: true, admin: true } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.auth && !auth.isLoggedIn) return '/login';
  if (to.meta.guest && auth.isLoggedIn) return '/';
  if (to.meta.admin && !auth.isAdmin) return '/';
  return true;
});

export default router;
