<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Univers & éditions</h1>
        <p class="lede">Tous les univers et leurs éditions, au même endroit. Crée-les ici, puis rattache cartes et boosters.</p>
      </div>
    </div>

    <div class="grid two">
      <form class="panel create-form" @submit.prevent="saveUniverse">
        <h2>{{ editingUniverseId ? 'Modifier l’univers' : 'Nouvel univers' }}</h2>
        <div class="fields uni-fields">
          <label>Nom <input v-model="universe.name" required /></label>
          <label class="color-field">Couleur
            <input v-model="universe.accentColor" type="color" />
          </label>
          <label class="span">Accroche <input v-model="universe.tagline" /></label>
        </div>
        <div class="row">
          <button class="btn primary" type="submit">{{ editingUniverseId ? 'Enregistrer' : 'Créer l’univers' }}</button>
          <button v-if="editingUniverseId" class="btn" type="button" @click="cancelUniverseEdit">Annuler</button>
        </div>
      </form>
      <form class="panel create-form" @submit.prevent="saveEdition">
        <h2>{{ editingId ? 'Modifier l’édition' : 'Nouvelle édition' }}</h2>
        <div class="fields ed-fields">
          <label>Univers
            <select v-model.number="edition.universeId" required>
              <option disabled :value="0">Choisir</option>
              <option v-for="u in universes" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </label>
          <label class="color-field">Couverture
            <input v-model="edition.coverColor" type="color" />
          </label>
          <label class="span">Nom <input v-model="edition.name" required /></label>
          <label>Code <input v-model="edition.code" required maxlength="8" placeholder="CDM" /></label>
          <label>N°
            <input v-model.number="edition.number" type="number" min="1" :placeholder="editingId ? undefined : 'auto'" />
          </label>
          <label class="span">Description <textarea v-model="edition.description" rows="2" /></label>
        </div>
        <div class="row">
          <button class="btn primary" type="submit" :disabled="!universes.length">{{ editingId ? 'Enregistrer' : 'Créer l’édition' }}</button>
          <button v-if="editingId" class="btn" type="button" @click="cancelEdit">Annuler</button>
        </div>
      </form>
    </div>

    <p v-if="error" class="error" style="margin-top:16px">{{ error }}</p>

    <section v-if="universes.length" class="catalog">
      <article v-for="item in catalog" :key="item.universe.id" class="universe-card panel" :class="{ on: editingUniverseId === item.universe.id }">
        <header class="universe-head">
          <span class="swatch" :style="{ background: item.universe.accentColor }" />
          <div>
            <h2>{{ item.universe.name }}</h2>
            <p class="lede">{{ item.universe.tagline || 'Sans accroche' }}</p>
          </div>
          <div class="row universe-actions">
            <button class="btn" type="button" @click="startUniverseEdit(item.universe)">Modifier</button>
            <RouterLink class="btn" :to="{ path: '/admin/cards', query: { universeId: item.universe.id } }">Voir les cartes</RouterLink>
            <button class="btn danger" type="button" @click="removeUniverse(item)">Supprimer</button>
          </div>
        </header>
        <ul v-if="item.editions.length" class="editions">
          <li v-for="ed in item.editions" :key="ed.id" :class="{ on: editingId === ed.id }">
            <div>
              <strong>{{ ed.name }}</strong>
              <span class="lede">{{ ed.code }} · n°{{ ed.number }} · {{ ed.cardCount ?? 0 }} carte{{ (ed.cardCount ?? 0) > 1 ? 's' : '' }}</span>
            </div>
            <div class="ed-actions">
              <button class="btn" type="button" @click="startEdit(ed)">Modifier</button>
              <button class="btn danger" type="button" @click="removeEdition(ed)">Supprimer</button>
              <RouterLink class="btn" :to="{ path: '/admin/cards', query: { editionId: ed.id } }">Ouvrir</RouterLink>
            </div>
          </li>
        </ul>
        <p v-else class="empty-editions">Aucune édition dans cet univers.</p>
      </article>
    </section>
    <div v-else class="panel empty" style="margin-top:20px">Aucun univers pour le moment. Crée le premier ci-dessus.</div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api } from '@/api/client';
import type { Edition, Universe } from '@/types';

const universes = ref<Universe[]>([]);
const editions = ref<Edition[]>([]);
const error = ref('');
const editingId = ref(0);
const editingUniverseId = ref(0);
const universe = reactive({ name: '', tagline: '', accentColor: '#7c3aed' });
const edition = reactive({
  universeId: 0,
  name: '',
  code: '',
  number: 0,
  description: '',
  coverColor: '#1e1b4b',
});

const catalog = computed(() => universes.value.map((item) => ({
  universe: item,
  editions: editions.value.filter((ed) => ed.universeId === item.id),
})));

async function load() {
  [universes.value, editions.value] = await Promise.all([
    api<Universe[]>('/admin/universes'),
    api<Edition[]>('/admin/editions'),
  ]);
  if (!edition.universeId) edition.universeId = universes.value[0]?.id ?? 0;
}

async function saveUniverse() {
  error.value = '';
  try {
    const payload = {
      name: universe.name,
      tagline: universe.tagline || null,
      accentColor: universe.accentColor,
    };
    if (editingUniverseId.value) {
      await api(`/admin/universes/${editingUniverseId.value}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await api('/admin/universes', { method: 'POST', body: JSON.stringify(payload) });
    }
    cancelUniverseEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Enregistrement impossible';
  }
}

function startUniverseEdit(item: Universe) {
  cancelEdit();
  editingUniverseId.value = item.id;
  universe.name = item.name;
  universe.tagline = item.tagline || '';
  universe.accentColor = item.accentColor || '#7c3aed';
  error.value = '';
}

function cancelUniverseEdit() {
  editingUniverseId.value = 0;
  universe.name = '';
  universe.tagline = '';
  universe.accentColor = '#7c3aed';
}

function startEdit(ed: Edition) {
  cancelUniverseEdit();
  editingId.value = ed.id;
  edition.universeId = ed.universeId;
  edition.name = ed.name;
  edition.code = ed.code;
  edition.number = ed.number;
  edition.description = ed.description || '';
  edition.coverColor = ed.coverColor || '#1e1b4b';
  error.value = '';
}

function cancelEdit() {
  editingId.value = 0;
  edition.name = '';
  edition.code = '';
  edition.number = 0;
  edition.description = '';
  edition.coverColor = '#1e1b4b';
}

async function saveEdition() {
  error.value = '';
  try {
    const payload = {
      universeId: edition.universeId,
      name: edition.name,
      code: edition.code,
      number: edition.number > 0 ? edition.number : undefined,
      description: edition.description || null,
      coverColor: edition.coverColor,
    };
    if (editingId.value) {
      await api(`/admin/editions/${editingId.value}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await api('/admin/editions', { method: 'POST', body: JSON.stringify(payload) });
    }
    cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Enregistrement impossible';
  }
}

async function removeEdition(ed: Edition) {
  const extra = ed.cardCount
    ? ` ${ed.cardCount} carte${ed.cardCount > 1 ? 's' : ''} et tous les exemplaires collectionnés seront effacés définitivement.`
    : '';
  if (!confirm(`Supprimer définitivement l’édition « ${ed.name} » ?${extra}`)) return;
  error.value = '';
  try {
    await api(`/admin/editions/${ed.id}`, { method: 'DELETE' });
    if (editingId.value === ed.id) cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Suppression impossible';
  }
}

async function removeUniverse(item: { universe: Universe; editions: Edition[] }) {
  const cards = item.editions.reduce((n, ed) => n + (ed.cardCount ?? 0), 0);
  const eds = item.editions.length;
  const extra = ` ${eds} édition${eds > 1 ? 's' : ''} et ${cards} carte${cards > 1 ? 's' : ''} seront effacées, ainsi que les exemplaires et boosters liés.`;
  if (!confirm(`Supprimer définitivement l’univers « ${item.universe.name} » ?${extra}`)) return;
  error.value = '';
  try {
    await api(`/admin/universes/${item.universe.id}`, { method: 'DELETE' });
    if (item.editions.some((ed) => ed.id === editingId.value)) cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Suppression impossible';
  }
}

onMounted(load);
</script>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}
.create-form .row { margin-top: auto; }
.create-form h2 { margin: 0; font-size: 1.15rem; }
.fields {
  display: grid;
  gap: 12px;
  align-items: end;
}
.uni-fields,
.ed-fields { grid-template-columns: minmax(0, 1fr) auto; }
.span { grid-column: 1 / -1; }
.color-field input[type="color"] {
  width: 44px;
  height: 38px;
  padding: 3px;
  cursor: pointer;
}
.create-form textarea { min-height: 64px; }
.catalog { display: grid; gap: 16px; margin-top: 24px; }
.universe-card { padding: 20px 22px; }
.universe-card.on { border-color: color-mix(in srgb, var(--gold) 55%, var(--line)); }
.universe-head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.universe-head .lede { margin-top: 4px; }
.universe-head .universe-actions { margin-left: auto; }
.swatch {
  width: 18px;
  height: 48px;
  border-radius: 999px;
  flex-shrink: 0;
  border: 1px solid var(--line);
}
.editions {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.editions li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.03);
  border: 1px solid var(--line);
}
.editions li.on { border-color: color-mix(in srgb, var(--gold) 55%, var(--line)); }
.editions .lede { display: block; margin: 4px 0 0; }
.ed-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.empty-editions { color: var(--muted); margin: 16px 0 0; }
</style>
