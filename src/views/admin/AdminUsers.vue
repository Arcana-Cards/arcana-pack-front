<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Collectionneurs</h1>
        <p class="lede">Ajoute des comptes, compose un lot par personne, puis offre à un seul ou à toute la liste.</p>
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

    <section class="panel people">
      <div class="table-head">
        <div>
          <p class="kicker">Liste d’attribution</p>
          <p class="lede summary">{{ selected.length }} compte{{ selected.length > 1 ? 's' : '' }} · {{ allPendingBoosters }} booster{{ allPendingBoosters > 1 ? 's' : '' }} à offrir</p>
        </div>
        <div class="actions">
          <button v-if="selected.length" class="btn" type="button" @click="clearList">Vider</button>
          <button
            class="btn primary"
            type="button"
            :disabled="!allPendingList.length || busy !== null"
            @click="grantAll"
          >
            {{ busy === 'all' ? 'Envoi…' : 'Offrir pour tous' }}
          </button>
        </div>
      </div>
      <p v-if="!selected.length" class="lede empty">Aucun compte choisi. Ajoute-les avec le menu.</p>
      <p v-if="message" :class="ok ? 'ok' : 'error'">{{ message }}</p>
      <article v-for="person in selected" :key="person.id" class="person">
        <div class="person-head">
          <div class="identity">
            <strong>{{ person.username }}</strong>
            <small>{{ person.email }}</small>
          </div>
          <div class="stats">
            <span>{{ person.collectedCopies || 0 }} carte{{ (person.collectedCopies || 0) > 1 ? 's' : '' }}</span>
            <span>{{ person.unopenedBoosters || 0 }} booster{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }} non ouvert{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }}</span>
          </div>
          <button class="btn" type="button" @click="removePerson(person.id)">Retirer</button>
        </div>
        <div class="pack-list">
          <label
            v-for="pack in grantTemplates"
            :key="pack.id"
            class="pack-pick"
            :class="{ on: qtyFor(person.id, pack.id) > 0 }"
          >
            <img v-if="pack.artUrl" :src="mediaUrl(pack.artUrl)" alt="" />
            <span>{{ pack.name }}</span>
            <small>{{ pack.cardCount }} cartes</small>
            <input
              :value="qtyFor(person.id, pack.id)"
              type="number"
              min="0"
              max="50"
              @input="onQtyInput(person.id, pack.id, $event)"
            />
          </label>
        </div>
        <div class="person-foot">
          <p class="lede">{{ pendingBoosters(person.id) }} booster{{ pendingBoosters(person.id) > 1 ? 's' : '' }} · ≈ {{ pendingCards(person.id) }} cartes</p>
          <button
            class="btn primary"
            type="button"
            :disabled="!packsFor(person.id).length || busy !== null"
            @click="grantPerson(person)"
          >
            {{ busy === person.id ? 'Envoi…' : 'Offrir' }}
          </button>
        </div>
      </article>
    </section>
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
const qty = reactive<Record<number, Record<number, number>>>({});
const busy = ref<number | 'all' | null>(null);
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
const allPendingList = computed(() => grantsFor(selected.value.map((person) => person.id)));
const allPendingBoosters = computed(() => allPendingList.value.reduce((sum, item) => sum + item.quantity, 0));

function emptyQty() {
  const row: Record<number, number> = {};
  for (const pack of grantTemplates.value) row[pack.id] = 0;
  return row;
}

function ensureQty(userId: number) {
  if (!qty[userId]) qty[userId] = emptyQty();
  for (const pack of grantTemplates.value) {
    if (qty[userId][pack.id] === undefined) qty[userId][pack.id] = 0;
  }
  return qty[userId];
}

function qtyFor(userId: number, templateId: number) {
  return Number(qty[userId]?.[templateId] || 0);
}

function setQty(userId: number, templateId: number, value: number) {
  const row = ensureQty(userId);
  row[templateId] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function onQtyInput(userId: number, templateId: number, event: Event) {
  setQty(userId, templateId, Number((event.target as HTMLInputElement).value));
}

function packsFor(userId: number) {
  return grantTemplates.value
    .map((pack) => ({
      templateId: pack.id,
      quantity: Math.max(0, Math.floor(qtyFor(userId, pack.id))),
    }))
    .filter((item) => item.quantity > 0);
}

function grantsFor(userIds: number[]) {
  const grants: Array<{ userId: number; templateId: number; quantity: number }> = [];
  for (const userId of userIds) {
    for (const pack of packsFor(userId)) {
      grants.push({ userId, templateId: pack.templateId, quantity: pack.quantity });
    }
  }
  return grants;
}

function pendingBoosters(userId: number) {
  return packsFor(userId).reduce((sum, item) => sum + item.quantity, 0);
}

function pendingCards(userId: number) {
  return packsFor(userId).reduce((sum, item) => {
    const pack = templates.value.find((row) => row.id === item.templateId);
    return sum + item.quantity * (pack?.cardCount || 0);
  }, 0);
}

function resetQty(userIds: number[]) {
  for (const userId of userIds) {
    const row = ensureQty(userId);
    for (const pack of grantTemplates.value) row[pack.id] = 0;
  }
}

function addPicked(event: Event) {
  const id = Number((event.target as HTMLSelectElement).value);
  const person = users.value.find((item) => item.id === id);
  if (person && !selected.value.some((item) => item.id === person.id)) {
    selected.value = [...selected.value, person];
    ensureQty(person.id);
  }
  (event.target as HTMLSelectElement).value = '0';
}

function removePerson(id: number) {
  selected.value = selected.value.filter((person) => person.id !== id);
  delete qty[id];
}

function clearList() {
  selected.value = [];
  for (const key of Object.keys(qty)) delete qty[Number(key)];
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
  for (const person of selected.value) ensureQty(person.id);
}

async function sendGrants(grants: Array<{ userId: number; templateId: number; quantity: number }>, userIds: number[]) {
  if (!grants.length) return;
  message.value = '';
  try {
    await api('/admin/users/boosters/batch', {
      method: 'POST',
      body: JSON.stringify({ grants }),
    });
    const total = grants.reduce((sum, item) => sum + item.quantity, 0);
    ok.value = true;
    message.value = `${total} booster${total > 1 ? 's' : ''} envoyé${total > 1 ? 's' : ''}.`;
    resetQty(userIds);
    await load();
  } catch (err) {
    ok.value = false;
    message.value = err instanceof ApiError || err instanceof Error ? err.message : 'Envoi impossible';
  }
}

async function grantPerson(person: User) {
  const grants = grantsFor([person.id]);
  if (!grants.length) return;
  busy.value = person.id;
  try {
    await sendGrants(grants, [person.id]);
  } finally {
    busy.value = null;
  }
}

async function grantAll() {
  const grants = allPendingList.value;
  if (!grants.length) return;
  const userIds = [...new Set(grants.map((item) => item.userId))];
  busy.value = 'all';
  try {
    await sendGrants(grants, userIds);
  } finally {
    busy.value = null;
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
.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.table-head .summary { margin: 4px 0 0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.person {
  border-top: 1px solid var(--line);
  padding: 16px 0;
  display: grid;
  gap: 12px;
}
.person-head {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}
.identity small, .empty { color: var(--muted); }
.identity small { display: block; font-size: 0.82rem; }
.stats { display: flex; flex-wrap: wrap; gap: 10px; color: var(--gold-2); font-size: 0.86rem; }
.person-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.person-foot .lede { margin: 0; white-space: nowrap; }
.pack-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
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
  .table-head, .person-head, .person-foot { grid-template-columns: 1fr; }
  .person-foot { flex-direction: column; align-items: stretch; }
}
</style>
