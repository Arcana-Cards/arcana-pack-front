import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('arcana_token') || '');
  const user = ref<User | null>(JSON.parse(localStorage.getItem('arcana_user') || 'null'));

  const isLoggedIn = computed(() => Boolean(token.value));
  const isAdmin = computed(() => user.value?.role === 'admin');

  function persist(nextToken: string, nextUser: User) {
    token.value = nextToken;
    user.value = nextUser;
    localStorage.setItem('arcana_token', nextToken);
    localStorage.setItem('arcana_user', JSON.stringify(nextUser));
  }

  async function login(email: string, password: string) {
    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    persist(data.token, data.user);
  }

  async function register(email: string, username: string, password: string) {
    const data = await api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    persist(data.token, data.user);
  }

  async function refreshProfile() {
    if (!token.value) return;
    user.value = await api<User>('/auth/profile');
    localStorage.setItem('arcana_user', JSON.stringify(user.value));
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('arcana_token');
    localStorage.removeItem('arcana_user');
  }

  return { token, user, isLoggedIn, isAdmin, login, register, refreshProfile, logout };
});
