<template>
  <div class="auth-wrap">
    <div class="panel auth-card">
      <h1>Nouveau collectionneur</h1>
      <form @submit.prevent="submit">
        <label>Pseudo <input v-model="username" required minlength="3" /></label>
        <label>Email <input v-model="email" type="email" required /></label>
        <label>Mot de passe <input v-model="password" type="password" required minlength="6" /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn primary" :disabled="loading">Créer le compte</button>
      </form>
      <p class="lede">Déjà inscrit ? <RouterLink to="/login">Connexion</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const username = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.register(email.value, username.value, password.value);
    await router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Inscription impossible';
  } finally {
    loading.value = false;
  }
}
</script>
