<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Collectionneurs</h1>
        <p class="lede">Ajoute des comptes, choisis les boosters, puis offre le même lot à toute la liste. Les jours / sprint servent de défaut quand une absence n’est pas dans Jira.</p>
      </div>
      <RouterLink class="btn" to="/admin">Atelier</RouterLink>
    </div>

    <section class="panel pick">
      <label>Ajouter un collectionneur
        <select :value="0" :disabled="!availableUsers.length" @change="addPicked">
          <option :value="0">{{ availableUsers.length ? 'Choisir un compte…' : 'Tous les comptes sont déjà dans la liste' }}</option>
          <option v-for="person in availableUsers" :key="person.id" :value="person.id">
            {{ person.username }} · {{ person.collectedCopies || 0 }} cartes · {{ person.unopenedBoosters || 0 }} non ouvert{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }}
          </option>
        </select>
      </label>
    </section>

    <div class="layout">
      <section class="panel people">
        <div class="table-head">
          <p class="kicker">Liste d’attribution</p>
          <button v-if="selected.length" class="btn" type="button" @click="selected = []">Vider</button>
        </div>
        <p v-if="!selected.length" class="lede empty">Aucun compte choisi. Ajoute-les avec le menu.</p>
        <article v-for="person in selected" :key="person.id" class="person">
          <div class="identity">
            <strong>{{ person.username }}</strong>
            <small>{{ person.email }}</small>
          </div>
          <div class="stats">
            <span>{{ person.collectedCopies || 0 }} carte{{ (person.collectedCopies || 0) > 1 ? 's' : '' }}</span>
            <span>{{ person.unopenedBoosters || 0 }} booster{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }} non ouvert{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }}</span>
          </div>
          <label class="days">Jours / sprint
            <input
              type="number"
              min="0"
              max="31"
              step="0.5"
              :value="person.sprintDays ?? ''"
              placeholder="—"
              @change="saveSprintDays(person, $event)"
            />
          </label>
          <button class="btn" type="button" @click="removePerson(person.id)">Retirer</button>
        </article>
      </section>

      <aside class="panel tray">
        <p class="kicker">Boosters pour la liste</p>
        <h2>{{ selected.length }} compte{{ selected.length > 1 ? 's' : '' }}</h2>
        <p class="lede">{{ pendingBoosters }} booster{{ pendingBoosters > 1 ? 's' : '' }} · ≈ {{ pendingCards }} cartes par personne</p>
        <div class="pack-list">
          <label
            v-for="pack in grantTemplates"
            :key="pack.id"
            class="pack-pick"
            :class="{ on: Number(qty[pack.id] || 0) > 0 }"
          >
            <img v-if="pack.artUrl" :src="mediaUrl(pack.artUrl)" alt="" />
            <span>{{ pack.name }}</span>
            <small>{{ pack.cardCount }} cartes</small>
            <input v-model.number="qty[pack.id]" type="number" min="0" max="50" />
          </label>
        </div>
        <button class="btn primary" type="button" :disabled="!pendingList.length || busy" @click="grantSelected">
          {{ busy ? 'Envoi…' : `Offrir à ${selected.length || 0} compte${selected.length > 1 ? 's' : ''}` }}
        </button>
        <p v-if="message" :class="ok ? 'ok' : 'error'">{{ message }}</p>
      </aside>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api, ApiError, mediaUrl } from '@/api/client';
import type { BoosterTemplate, User } from '@/types';

const users = ref<User[]>([]);
const templates = ref<BoosterTemplate[]>([]);
const selected = ref<User[]>([]);
const qty = reactive<Record<number, number>>({});
const busy = ref(false);
const message = ref('');
const ok = ref(false);

const grantTemplates = computed(() => [
  ...templates.value.filter((pack) => pack.presetKey),
  ...templates.value.filter((pack) => !pack.presetKey),
]);
const availableUsers = computed(() => {
  const taken = new Set(selected.value.map((person) => person.id));
  return users.value.filter((person) => !taken.has(person.id));
});
const pendingPacks = computed(() => grantTemplates.value
  .map((pack) => ({ templateId: pack.id, quantity: Math.max(0, Math.floor(Number(qty[pack.id] || 0))) }))
  .filter((item) => item.quantity > 0));
const pendingList = computed(() => {
  const grants: Array<{ userId: number; templateId: number; quantity: number }> = [];
  for (const person of selected.value) {
    for (const pack of pendingPacks.value) {
      grants.push({ userId: person.id, templateId: pack.templateId, quantity: pack.quantity });
    }
  }
  return grants;
});
const pendingBoosters = computed(() => pendingPacks.value.reduce((sum, item) => sum + item.quantity, 0));
const pendingCards = computed(() => pendingPacks.value.reduce((sum, item) => {
  const pack = templates.value.find((row) => row.id === item.templateId);
  return sum + item.quantity * (pack?.cardCount || 0);
}, 0));

function addPicked(event: Event) {
  const id = Number((event.target as HTMLSelectElement).value);
  const person = users.value.find((item) => item.id === id);
  if (person && !selected.value.some((item) => item.id === person.id)) {
    selected.value = [...selected.value, person];
  }
  (event.target as HTMLSelectElement).value = '0';
}

function removePerson(id: number) {
  selected.value = selected.value.filter((person) => person.id !== id);
}

async function saveSprintDays(person: User, event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  const sprintDays = raw === '' ? null : Number(raw);
  try {
    const updated = await api<User>(`/admin/users/${person.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ sprintDays }),
    });
    const nextDays = updated.sprintDays ?? null;
    users.value = users.value.map((item) => (item.id === person.id ? { ...item, sprintDays: nextDays } : item));
    selected.value = selected.value.map((item) => (item.id === person.id ? { ...item, sprintDays: nextDays } : item));
  } catch (err) {
    ok.value = false;
    message.value = err instanceof ApiError || err instanceof Error ? err.message : 'Jours non enregistrés';
  }
}

async function load() {
  const ids = new Set(selected.value.map((person) => person.id));
  const [people, packs] = await Promise.all([
    api<User[]>('/admin/users'),
    api<BoosterTemplate[]>('/admin/boosters'),
  ]);
  users.value = people;
  templates.value = packs;
  selected.value = people.filter((person) => ids.has(person.id));
  for (const pack of packs) {
    if (qty[pack.id] === undefined) qty[pack.id] = 0;
  }
}

async function grantSelected() {
  if (!pendingList.value.length) return;
  busy.value = true;
  message.value = '';
  try {
    await api('/admin/users/boosters/batch', {
      method: 'POST',
      body: JSON.stringify({ grants: pendingList.value }),
    });
    ok.value = true;
    message.value = `${pendingBoosters.value * selected.value.length} booster${pendingBoosters.value * selected.value.length > 1 ? 's' : ''} envoyé${pendingBoosters.value * selected.value.length > 1 ? 's' : ''}.`;
    for (const pack of grantTemplates.value) qty[pack.id] = 0;
    await load();
  } catch (err) {
    ok.value = false;
    message.value = err instanceof ApiError || err instanceof Error ? err.message : 'Envoi impossible';
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.kicker {
  margin: 0;
  letter-spacing: .14em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--gold-2);
}
.pick { margin-bottom: 18px; }
.pick label { max-width: 520px; }
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, .7fr);
  gap: 16px;
  align-items: start;
}
.table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.person {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 120px auto;
  gap: 12px;
  align-items: center;
  border-top: 1px solid var(--line);
  padding: 14px 0;
}
.days input { width: 100%; }
.identity small, .empty { color: var(--muted); }
.identity small { display: block; font-size: 0.82rem; }
.stats { display: flex; flex-wrap: wrap; gap: 10px; color: var(--gold-2); font-size: 0.86rem; }
.tray { position: sticky; top: 86px; }
.tray h2 { margin: 6px 0 0; }
.pack-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; }
.pack-pick {
  border: 1px solid var(--line);
  background: #0c0914;
  border-radius: 12px;
  padding: 8px;
  display: grid;
  justify-items: center;
  gap: 4px;
  color: inherit;
}
.pack-pick.on { border-color: var(--gold); }
.pack-pick img { width: 100%; height: 64px; object-fit: cover; border-radius: 8px; }
.pack-pick small { color: var(--muted); }
.pack-pick input { width: 100%; }
.ok { color: var(--ok); }
@media (max-width: 980px) {
  .layout, .person { grid-template-columns: 1fr; }
  .tray { position: static; }
}
</style>
