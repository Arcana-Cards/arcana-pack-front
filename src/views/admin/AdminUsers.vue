<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Distribution de boosters</h1>
        <p class="lede">Choisis un sprint Jira pour estimer les cartes, puis offre les paquets aux comptes Anacra.</p>
      </div>
    </div>

    <section class="panel sprint-bar">
      <div class="sprint-copy">
        <p class="kicker">Fin de sprint</p>
        <h2>{{ activeSprint?.name || guide?.metrics?.sprint.name || 'Guide Jira' }}</h2>
        <p v-if="sprintDates" class="lede">{{ sprintDates }}</p>
        <p v-if="!jira.configured" class="lede">
          Jira n’est pas branché. Ajoute <code>JIRA_BASE_URL</code>, <code>JIRA_EMAIL</code> et
          <code>JIRA_API_TOKEN</code> côté API — la base Anacra n’est pas touchée.
        </p>
        <p v-else-if="jira.error || jiraError" class="error">{{ jira.error || jiraError }}</p>
        <p v-else class="lede">
          1 point terminé ≈ 1 carte. Un booster Standard couvre {{ standardSize }} cartes.
          Bonus Rare / Premium / Épique à 8 / 13 / 21 pts.
        </p>
      </div>
      <div class="sprint-controls">
        <label>Sprint
          <select v-model.number="sprintId" :disabled="!sprints.length" @change="loadRewards">
            <option :value="0" disabled>Choisir un sprint</option>
            <option v-for="sprint in sprints" :key="sprint.id" :value="sprint.id">
              {{ sprint.state === 'active' ? '● ' : '' }}{{ sprint.name }}
            </option>
          </select>
        </label>
        <button class="btn" type="button" :disabled="!sprintId || loadingJira" @click="loadRewards">
          {{ loadingJira ? 'Lecture…' : 'Lire le sprint' }}
        </button>
      </div>
    </section>

    <section v-if="guide?.metrics" class="panel metrics">
      <div class="point-compare">
        <article>
          <small>Début de sprint</small>
          <strong>{{ fmtPts(guide.metrics.points.committed) }}</strong>
          <em>{{ guide.metrics.points.startPct }}% livré</em>
        </article>
        <div class="bars">
          <label>Points livrés
            <span class="bar"><i :style="{ width: `${guide.metrics.points.endPct}%` }" /></span>
          </label>
          <label>Temps écoulé
            <span class="bar time"><i :style="{ width: `${guide.metrics.time.elapsedPct}%` }" /></span>
          </label>
          <p class="pace" :class="paceClass">{{ paceLabel }}</p>
        </div>
        <article>
          <small>{{ guide.metrics.sprint.state === 'active' ? 'Maintenant' : 'Fin de sprint' }}</small>
          <strong>{{ fmtPts(guide.metrics.points.completed) }}</strong>
          <em>{{ guide.metrics.points.endPct }}% livré</em>
        </article>
      </div>
      <div class="stats extra">
        <article class="stat"><small>Restant</small><strong>{{ fmtPts(guide.metrics.points.remaining) }}</strong></article>
        <article class="stat"><small>Ajoutés en cours</small><strong>{{ fmtPts(guide.metrics.points.added) }}</strong></article>
        <article class="stat"><small>Tickets done</small><strong>{{ guide.metrics.issues.done }}/{{ guide.metrics.issues.total }}</strong><em>{{ guide.metrics.issues.donePct }}%</em></article>
        <article class="stat"><small>En cours</small><strong>{{ guide.metrics.issues.inProgress }}</strong></article>
        <article class="stat"><small>Bugs</small><strong>{{ guide.metrics.issues.bugs }}</strong></article>
        <article class="stat"><small>Stories</small><strong>{{ guide.metrics.issues.stories }}</strong></article>
        <article class="stat"><small>Sans points</small><strong>{{ guide.metrics.issues.unestimated }}</strong></article>
        <article class="stat"><small>Non assignés</small><strong>{{ guide.metrics.issues.unassigned }}</strong></article>
        <article class="stat"><small>Jours restants</small><strong>{{ guide.metrics.time.daysLeft }}</strong></article>
        <article class="stat"><small>Cartes suggérées</small><strong>{{ guide.totals.suggestedCards }}</strong></article>
        <article class="stat"><small>Boosters suggérés</small><strong>{{ guide.totals.suggestedBoosters }}</strong></article>
        <article class="stat"><small>Comptes matchés</small><strong>{{ guide.totals.matched }}</strong></article>
      </div>
    </section>
    <div v-else-if="guide" class="stats">
      <article class="panel stat"><small>Points terminés</small><strong>{{ guide.totals.storyPoints }}</strong></article>
      <article class="panel stat"><small>Tickets done</small><strong>{{ guide.totals.issuesDone }}</strong></article>
      <article class="panel stat"><small>Cartes suggérées</small><strong>{{ guide.totals.suggestedCards }}</strong></article>
      <article class="panel stat"><small>Boosters suggérés</small><strong>{{ guide.totals.suggestedBoosters }}</strong></article>
    </div>

    <div class="layout">
      <section class="panel people">
        <div class="table-head">
          <label class="check">
            <input type="checkbox" :checked="allChecked" @change="toggleAll" />
            Collectionneurs
          </label>
          <input v-model="query" class="search" type="search" placeholder="Filtrer un compte…" />
        </div>
        <p v-if="!visibleUsers.length" class="lede empty">Aucun compte.</p>
        <article
          v-for="person in visibleUsers"
          :key="person.id"
          class="person"
          :class="{ on: checked[person.id], unmatched: !contributorFor(person.id) }"
        >
          <label class="check identity">
            <input v-model="checked[person.id]" type="checkbox" />
            <span>
              <strong>{{ person.username }}</strong>
              <small>{{ person.email }} · {{ person.unopenedBoosters || 0 }} non ouvert{{ (person.unopenedBoosters || 0) > 1 ? 's' : '' }} · {{ person.collectedCopies || 0 }} cartes</small>
            </span>
          </label>
          <div v-if="contributorFor(person.id)" class="jira">
            <span>{{ contributorFor(person.id)?.storyPoints }}/{{ contributorFor(person.id)?.storyPointsCommitted ?? contributorFor(person.id)?.storyPoints }} pts</span>
            <span>{{ contributorFor(person.id)?.completionPct ?? 0 }}%</span>
            <span>{{ contributorFor(person.id)?.issuesDone }}/{{ contributorFor(person.id)?.issuesTotal }} tickets</span>
            <span v-if="contributorFor(person.id)?.issuesInProgress">{{ contributorFor(person.id)?.issuesInProgress }} en cours</span>
            <span>{{ contributorFor(person.id)?.suggestedCards }} cartes</span>
          </div>
          <p v-else class="muted">Pas de ticket Jira matché (email / pseudo).</p>
          <div class="qty-row">
            <label v-for="pack in grantTemplates" :key="pack.id">
              {{ pack.name }}
              <input v-model.number="qty[key(person.id, pack.id)]" type="number" min="0" max="50" />
            </label>
          </div>
        </article>
      </section>

      <aside class="panel tray">
        <p class="kicker">À offrir</p>
        <h2>{{ selectedCount }} compte{{ selectedCount > 1 ? 's' : '' }}</h2>
        <p class="lede">{{ pendingBoosters }} booster{{ pendingBoosters > 1 ? 's' : '' }} · ≈ {{ pendingCards }} cartes</p>
        <div class="pack-list">
          <button
            v-for="pack in grantTemplates"
            :key="pack.id"
            class="pack-pick"
            :class="{ on: focusPack === pack.id }"
            type="button"
            @click="focusPack = pack.id"
          >
            <img v-if="pack.artUrl" :src="mediaUrl(pack.artUrl)" alt="" />
            <span>{{ pack.name }}</span>
            <small>{{ pack.cardCount }} cartes</small>
          </button>
        </div>
        <div class="actions">
          <button class="btn" type="button" :disabled="!guide" @click="applySuggestions">Appliquer le sprint</button>
          <button class="btn" type="button" :disabled="!focusPack" @click="fillSelected(1)">+1 {{ focusName }} aux cochés</button>
          <button class="btn primary" type="button" :disabled="!pendingBoosters || busy" @click="grantSelected">
            {{ busy ? 'Envoi…' : `Offrir ${pendingBoosters || ''} paquet${pendingBoosters > 1 ? 's' : ''}` }}
          </button>
        </div>
        <p v-if="message" :class="ok ? 'ok' : 'error'">{{ message }}</p>
        <div v-if="unmatched.length" class="unmatched">
          <p class="kicker">Jira sans compte Anacra</p>
          <p v-for="row in unmatched" :key="row.jiraName">
            {{ row.jiraName }} · {{ row.storyPoints }} pts · {{ row.suggestedCards }} cartes
          </p>
        </div>
      </aside>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api, ApiError, mediaUrl } from '@/api/client';
import type { BoosterTemplate, JiraSprint, JiraStatus, SprintRewardGuide, User } from '@/types';

const users = ref<User[]>([]);
const templates = ref<BoosterTemplate[]>([]);
const sprints = ref<JiraSprint[]>([]);
const guide = ref<SprintRewardGuide | null>(null);
const jira = ref<JiraStatus>({ configured: false, baseUrl: null, email: null, tokenSet: false, reachable: false, error: null });
const sprintId = ref(0);
const query = ref('');
const checked = reactive<Record<number, boolean>>({});
const qty = reactive<Record<string, number>>({});
const focusPack = ref(0);
const loadingJira = ref(false);
const busy = ref(false);
const message = ref('');
const ok = ref(false);
const jiraError = ref('');

const grantTemplates = computed(() => [
  ...templates.value.filter((pack) => pack.presetKey),
  ...templates.value.filter((pack) => !pack.presetKey),
]);
const standardSize = computed(() => grantTemplates.value.find((pack) => pack.presetKey === 'standard')?.cardCount || 5);
const focusName = computed(() => grantTemplates.value.find((pack) => pack.id === focusPack.value)?.name || 'booster');
const activeSprint = computed(() => sprints.value.find((sprint) => sprint.id === sprintId.value) || null);
const sprintDates = computed(() => {
  const sprint = guide.value?.metrics?.sprint || activeSprint.value;
  if (!sprint?.startDate && !sprint?.endDate) return '';
  const fmt = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  const state = sprint.state === 'active' ? 'en cours' : sprint.state === 'closed' ? 'terminé' : sprint.state;
  return `${fmt(sprint.startDate)} → ${fmt(sprint.endDate)} · ${state}`;
});
const visibleUsers = computed(() => {
  const q = query.value.trim().toLowerCase();
  return users.value.filter((person) => (
    !q
    || person.username.toLowerCase().includes(q)
    || person.email.toLowerCase().includes(q)
  ));
});
const unmatched = computed(() => (guide.value?.contributors ?? []).filter((row) => !row.userId));
const selectedCount = computed(() => users.value.filter((person) => checked[person.id]).length);
const pendingList = computed(() => {
  const grants: Array<{ userId: number; templateId: number; quantity: number }> = [];
  for (const person of users.value) {
    if (!checked[person.id]) continue;
    for (const pack of grantTemplates.value) {
      const quantity = Number(qty[key(person.id, pack.id)] || 0);
      if (quantity > 0) grants.push({ userId: person.id, templateId: pack.id, quantity });
    }
  }
  return grants;
});
const pendingBoosters = computed(() => pendingList.value.reduce((sum, item) => sum + item.quantity, 0));
const pendingCards = computed(() => pendingList.value.reduce((sum, item) => {
  const pack = templates.value.find((row) => row.id === item.templateId);
  return sum + item.quantity * (pack?.cardCount || 0);
}, 0));
const allChecked = computed(() => visibleUsers.value.length > 0 && visibleUsers.value.every((person) => checked[person.id]));
const paceClass = computed(() => {
  const ahead = guide.value?.metrics?.time.ahead;
  if (ahead == null) return '';
  return ahead ? 'ok' : 'late';
});
const paceLabel = computed(() => {
  const metrics = guide.value?.metrics;
  if (!metrics) return '';
  if (metrics.time.ahead == null) return 'Pas assez de points pour juger le rythme';
  if (metrics.sprint.state === 'closed') {
    return metrics.points.endPct >= 100
      ? 'Sprint bouclé à 100%'
      : `Terminé à ${metrics.points.endPct}% des points engagés`;
  }
  return metrics.time.ahead
    ? `En avance sur le temps (${metrics.points.endPct}% livré · ${metrics.time.elapsedPct}% écoulé)`
    : `En retard sur le temps (${metrics.points.endPct}% livré · ${metrics.time.elapsedPct}% écoulé)`;
});

function fmtPts(value: number) {
  const n = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function key(userId: number, templateId: number) {
  return `${userId}:${templateId}`;
}

function contributorFor(userId: number) {
  return guide.value?.contributors.find((row) => row.userId === userId) ?? null;
}

async function load() {
  const [people, packs, status] = await Promise.all([
    api<User[]>('/admin/users'),
    api<BoosterTemplate[]>('/admin/boosters'),
    api<JiraStatus>('/admin/jira/status').catch(() => jira.value),
  ]);
  users.value = people;
  templates.value = packs;
  jira.value = status;
  focusPack.value = packs.find((pack) => pack.presetKey === 'standard')?.id || packs[0]?.id || 0;
  for (const person of people) {
    if (checked[person.id] === undefined) checked[person.id] = person.role !== 'admin';
    for (const pack of packs) {
      if (qty[key(person.id, pack.id)] === undefined) qty[key(person.id, pack.id)] = 0;
    }
  }
  if (status.configured) {
    try {
      sprints.value = await api<JiraSprint[]>('/admin/jira/sprints');
      const active = sprints.value.find((sprint) => sprint.state === 'active') || sprints.value[0];
      if (active && !sprintId.value) {
        sprintId.value = active.id;
        await loadRewards();
      }
    } catch (err) {
      jiraError.value = err instanceof ApiError || err instanceof Error ? err.message : 'Jira inaccessible';
    }
  }
}

async function loadRewards() {
  if (!sprintId.value) return;
  loadingJira.value = true;
  jiraError.value = '';
  try {
    guide.value = await api<SprintRewardGuide>(`/admin/jira/sprints/${sprintId.value}/rewards`);
  } catch (err) {
    guide.value = null;
    jiraError.value = err instanceof ApiError || err instanceof Error ? err.message : 'Sprint illisible';
  } finally {
    loadingJira.value = false;
  }
}

function toggleAll(event: Event) {
  const on = (event.target as HTMLInputElement).checked;
  for (const person of visibleUsers.value) checked[person.id] = on;
}

function applySuggestions() {
  if (!guide.value) return;
  for (const person of users.value) {
    for (const pack of grantTemplates.value) qty[key(person.id, pack.id)] = 0;
  }
  for (const row of guide.value.contributors) {
    if (!row.userId) continue;
    checked[row.userId] = true;
    for (const pack of row.suggestedPacks) {
      qty[key(row.userId, pack.templateId)] = pack.quantity;
    }
  }
  message.value = 'Quantités remplies depuis le sprint. Vérifie puis offre.';
  ok.value = true;
}

function fillSelected(amount: number) {
  if (!focusPack.value) return;
  for (const person of users.value) {
    if (!checked[person.id]) continue;
    qty[key(person.id, focusPack.value)] = Math.max(0, Number(qty[key(person.id, focusPack.value)] || 0) + amount);
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
    message.value = `${pendingBoosters.value} booster${pendingBoosters.value > 1 ? 's' : ''} envoyé${pendingBoosters.value > 1 ? 's' : ''}.`;
    for (const person of users.value) {
      for (const pack of grantTemplates.value) qty[key(person.id, pack.id)] = 0;
    }
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
.sprint-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1.4fr) minmax(240px, .8fr);
  gap: 20px;
  margin-bottom: 18px;
  align-items: end;
}
.kicker {
  margin: 0;
  letter-spacing: .14em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--gold-2);
}
.sprint-bar h2 { margin: 6px 0 0; }
.sprint-controls { display: grid; gap: 10px; }
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.stat small { color: var(--muted); }
.stat strong { display: block; font-size: 1.8rem; font-family: Cinzel, serif; }
.stat em { display: block; color: var(--muted); font-style: normal; font-size: 0.78rem; }
.metrics { margin-bottom: 18px; }
.point-compare {
  display: grid;
  grid-template-columns: minmax(120px, .7fr) minmax(180px, 1.4fr) minmax(120px, .7fr);
  gap: 16px;
  align-items: center;
}
.point-compare strong { display: block; font-size: 2rem; font-family: Cinzel, serif; }
.point-compare em, .point-compare small { color: var(--muted); font-style: normal; }
.bars { display: grid; gap: 8px; }
.bars label { display: grid; gap: 4px; font-size: 0.78rem; color: var(--muted); }
.bar {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: #1a1424;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--gold-2), var(--gold));
}
.bar.time i { background: color-mix(in srgb, var(--gold) 45%, #7c3aed); }
.pace { margin: 4px 0 0; font-size: 0.82rem; }
.pace.late { color: #e7a08a; }
.stats.extra {
  margin: 16px 0 0;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.stats.extra .stat strong { font-size: 1.25rem; }
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(260px, .7fr);
  gap: 16px;
  align-items: start;
}
.table-head, .identity, .qty-row, .actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.table-head { justify-content: space-between; margin-bottom: 12px; }
.search { min-width: 200px; }
.person {
  border-top: 1px solid var(--line);
  padding: 14px 0;
  display: grid;
  gap: 8px;
}
.person.on { background: rgba(212, 175, 55, .04); margin: 0 -12px; padding: 14px 12px; border-radius: 12px; }
.check { display: flex; gap: 10px; align-items: center; color: var(--text); }
.identity small, .muted { display: block; color: var(--muted); font-size: 0.82rem; }
.jira { display: flex; gap: 10px; flex-wrap: wrap; color: var(--gold-2); font-size: 0.86rem; }
.qty-row label { min-width: 88px; }
.qty-row input { width: 100%; }
.tray { position: sticky; top: 86px; }
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
  cursor: pointer;
}
.pack-pick.on { border-color: var(--gold); }
.pack-pick img { width: 100%; height: 64px; object-fit: cover; border-radius: 8px; }
.pack-pick small { color: var(--muted); }
.actions { display: grid; gap: 8px; }
.ok { color: var(--ok); }
.unmatched { margin-top: 16px; }
.unmatched p { margin: 6px 0 0; color: var(--muted); font-size: 0.82rem; }
.empty { margin: 0; }
@media (max-width: 980px) {
  .sprint-bar, .layout, .stats, .point-compare, .stats.extra { grid-template-columns: 1fr; }
  .tray { position: static; }
}
</style>
