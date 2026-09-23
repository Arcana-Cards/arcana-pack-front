<template>
  <div class="auth-wrap">
    <div class="panel auth-card">
      <h1>Arcana Pack</h1>
      <p class="lede">Entre dans la chambre forte.</p>
      <form @submit.prevent="submit">
        <label>Email <input v-model="email" type="email" required /></label>
        <label>Mot de passe <input v-model="password" type="password" required /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn primary" :disabled="loading">Entrer</button>
      </form>
      <p class="lede">Pas de compte ? <RouterLink to="/register">Créer un collectionneur</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('admin@arcana.local');
const password = ref('password');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    await router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Connexion impossible';
  } finally {
    loading.value = false;
  }
}
</script>
