<template>
  <AppShell>
    <div class="page-head">
      <div>
        <h1>Sprint Jira</h1>
        <p class="lede">Points livrés, rythme et suggestions de cartes à offrir en fin de sprint.</p>
      </div>
      <RouterLink class="btn" to="/admin">Atelier</RouterLink>
    </div>

    <section class="panel sprint-bar">
      <div class="sprint-copy">
        <p class="kicker">Guide</p>
        <h2>{{ activeSprint?.name || guide?.metrics?.sprint.name || 'Aucun sprint' }}</h2>
        <p v-if="sprintDates" class="lede">{{ sprintDates }}</p>
        <p v-if="jira.error || jiraError" class="error">{{ jira.error || jiraError }}</p>
        <p v-else-if="jira.configured" class="lede">
          1 point terminé ≈ 1 carte. Un booster Standard couvre {{ standardSize }} cartes.
          Bonus Rare / Premium / Épique à 8 / 13 / 21 pts.
        </p>
        <p v-else class="lede">Jira n’est pas encore joignable depuis l’API.</p>
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

    <section v-if="guide" class="panel people">
      <p class="kicker">Contributeurs</p>
      <article v-for="row in guide.contributors" :key="row.jiraName" class="person">
        <div>
          <strong>{{ row.username || row.jiraName }}</strong>
          <small>{{ row.userId ? 'Compte Anacra' : 'Pas de compte Anacra' }}</small>
        </div>
        <div class="jira">
          <span>{{ row.storyPoints }}/{{ row.storyPointsCommitted ?? row.storyPoints }} pts</span>
          <span>{{ row.completionPct ?? 0 }}%</span>
          <span>{{ row.issuesDone }}/{{ row.issuesTotal }} tickets</span>
          <span v-if="row.issuesInProgress">{{ row.issuesInProgress }} en cours</span>
          <span>{{ row.suggestedCards }} cartes</span>
        </div>
        <p v-if="row.suggestedPacks.length" class="packs">
          {{ row.suggestedPacks.map((pack) => `${pack.quantity}× ${pack.name}`).join(' · ') }}
        </p>
      </article>
    </section>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { api, ApiError } from '@/api/client';
import type { BoosterTemplate, JiraSprint, JiraStatus, SprintRewardGuide } from '@/types';

const templates = ref<BoosterTemplate[]>([]);
const sprints = ref<JiraSprint[]>([]);
const guide = ref<SprintRewardGuide | null>(null);
const jira = ref<JiraStatus>({ configured: false, baseUrl: null, email: null, tokenSet: false, reachable: false, error: null });
const sprintId = ref(0);
const loadingJira = ref(false);
const jiraError = ref('');

const standardSize = computed(() => templates.value.find((pack) => pack.presetKey === 'standard')?.cardCount || 5);
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

async function load() {
  const [packs, status] = await Promise.all([
    api<BoosterTemplate[]>('/admin/boosters').catch(() => [] as BoosterTemplate[]),
    api<JiraStatus>('/admin/jira/status').catch(() => jira.value),
  ]);
  templates.value = packs;
  jira.value = status;
  if (!status.configured) return;
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
.metrics { margin-bottom: 18px; }
.point-compare {
  display: grid;
  grid-template-columns: minmax(120px, .7fr) minmax(180px, 1.4fr) minmax(120px, .7fr);
  gap: 16px;
  align-items: center;
}
.point-compare strong { display: block; font-size: 2rem; font-family: Cinzel, serif; }
.point-compare em, .point-compare small, .person small { color: var(--muted); font-style: normal; }
.person small { display: block; font-size: 0.82rem; }
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
.ok { color: var(--ok); }
.stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 0;
}
.stat small { color: var(--muted); }
.stat strong { display: block; font-size: 1.25rem; font-family: Cinzel, serif; }
.stat em { display: block; color: var(--muted); font-style: normal; font-size: 0.78rem; }
.person {
  border-top: 1px solid var(--line);
  padding: 14px 0;
  display: grid;
  gap: 8px;
}
.jira, .packs { display: flex; gap: 10px; flex-wrap: wrap; color: var(--gold-2); font-size: 0.86rem; }
.packs { color: var(--muted); margin: 0; }
@media (max-width: 980px) {
  .sprint-bar, .point-compare, .stats { grid-template-columns: 1fr; }
}
</style>
