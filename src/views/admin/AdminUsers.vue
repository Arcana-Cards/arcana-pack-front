<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Collectionneurs</h1>
        <p class="lede">Envoie un ou plusieurs boosters à un compte.</p>
      </div>
    </div>
    <div class="grid collectors">
      <article v-for="person in users" :key="person.id" class="panel collector">
        <div>
          <h2>{{ person.username }}</h2>
          <p class="lede">{{ person.email }} · {{ person.role }} · {{ person.unopenedBoosters || 0 }} booster{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }} non ouvert{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }}</p>
        </div>
        <form class="grant" @submit.prevent="grant(person.id)">
          <label>Booster
            <select v-model.number="selected[person.id]">
              <optgroup v-if="presetTemplates.length" label="Presets">
                <option v-for="pack in presetTemplates" :key="pack.id" :value="pack.id">{{ pack.name }}</option>
              </optgroup>
              <optgroup v-if="customTemplates.length" label="Personnalisés">
                <option v-for="pack in customTemplates" :key="pack.id" :value="pack.id">{{ pack.name }}</option>
              </optgroup>
            </select>
          </label>
          <label>Quantité
            <input v-model.number="qty[person.id]" type="number" min="1" max="20" />
          </label>
          <button class="btn primary">Offrir des boosters</button>
        </form>
      </article>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api } from '@/api/client';
import type { BoosterTemplate, User } from '@/types';

const users = ref<User[]>([]);
const templates = ref<BoosterTemplate[]>([]);
const selected = reactive<Record<number, number>>({});
const qty = reactive<Record<number, number>>({});
const presetTemplates = computed(() => templates.value.filter((pack) => pack.presetKey));
const customTemplates = computed(() => templates.value.filter((pack) => !pack.presetKey));

async function load() {
  [users.value, templates.value] = await Promise.all([
    api<User[]>('/admin/users'),
    api<BoosterTemplate[]>('/admin/boosters'),
  ]);
  for (const person of users.value) {
    selected[person.id] = templates.value[0]?.id;
    qty[person.id] = 1;
  }
}

async function grant(userId: number) {
  await api(`/admin/users/${userId}/boosters`, {
    method: 'POST',
    body: JSON.stringify({ templateId: selected[userId], quantity: qty[userId] || 1 }),
  });
  await load();
}

onMounted(load);
</script>

<style scoped>
.collectors { gap: 18px; }
.collector {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 1.1fr);
  gap: 20px 28px;
  align-items: end;
  padding: 24px 26px;
}
.collector h2 { font-size: 1.4rem; }
.collector .lede { max-width: none; font-size: 1rem; }
.grant {
  display: grid;
  grid-template-columns: 1fr 110px auto;
  gap: 12px;
  align-items: end;
}
@media (max-width: 860px) {
  .collector, .grant { grid-template-columns: 1fr; }
}
</style>
