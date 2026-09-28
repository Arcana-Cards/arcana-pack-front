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
          1 point terminé ≈ 1 carte, ajusté par les jours présents et le sprint précédent.
          Un booster Standard couvre {{ standardSize }} cartes.
        </p>
        <p v-else class="lede">Jira n’est pas encore joignable depuis l’API.</p>
      </div>
      <div class="sprint-controls">
        <label>Sprint
          <select v-model.number="sprintId" :disabled="!visibleSprints.length" @change="loadRewards">
            <option :value="0" disabled>Choisir un sprint</option>
            <option v-for="sprint in visibleSprints" :key="sprint.id" :value="sprint.id">
              {{ sprint.state === 'active' ? '● ' : '' }}{{ sprint.name }}
            </option>
          </select>
        </label>
        <button
          v-if="sprints.length > visibleCount"
          class="btn"
          type="button"
          @click="loadMore"
        >
          Charger 20 de plus ({{ visibleSprints.length }}/{{ sprints.length }})
        </button>
        <button class="btn" type="button" :disabled="!sprintId || loadingJira" @click="loadRewards">
          {{ loadingJira ? 'Lecture…' : 'Lire le sprint' }}
        </button>
      </div>
    </section>

    <section v-if="guide?.comparison" class="panel compare">
      <p class="kicker">Comparaison</p>
      <h2>{{ guide.metrics?.sprint.name }} vs {{ guide.comparison.previous.name }}</h2>
      <div class="compare-grid">
        <article>
          <small>Points livrés</small>
          <strong>{{ fmtPts(guide.comparison.points.current) }}</strong>
          <em :class="deltaClass(guide.comparison.points.delta)">{{ fmtDelta(guide.comparison.points.delta) }} vs préc.</em>
        </article>
        <article>
          <small>Engagés</small>
          <strong>{{ fmtPts(guide.comparison.committed.current) }}</strong>
          <em :class="deltaClass(guide.comparison.committed.delta)">{{ fmtDelta(guide.comparison.committed.delta) }}</em>
        </article>
        <article>
          <small>% livré</small>
          <strong>{{ guide.comparison.endPct.current }}%</strong>
          <em :class="deltaClass(guide.comparison.endPct.delta)">{{ fmtDelta(guide.comparison.endPct.delta) }} pts</em>
        </article>
        <article>
          <small>Tickets done</small>
          <strong>{{ guide.comparison.issuesDone.current }}</strong>
          <em :class="deltaClass(guide.comparison.issuesDone.delta)">{{ fmtDelta(guide.comparison.issuesDone.delta) }}</em>
        </article>
        <article>
          <small>Pts / jour ouvré</small>
          <strong>{{ fmtPts(guide.comparison.pointsPerDay.current) }}</strong>
          <em :class="deltaClass(guide.comparison.pointsPerDay.delta)">{{ fmtDelta(guide.comparison.pointsPerDay.delta) }}</em>
        </article>
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
        <article class="stat"><small>Jours ouvrés</small><strong>{{ guide.metrics.time.workingDays }}</strong></article>
        <article class="stat"><small>Cartes suggérées</small><strong>{{ guide.totals.suggestedCards }}</strong></article>
        <article class="stat"><small>Boosters suggérés</small><strong>{{ guide.totals.suggestedBoosters }}</strong></article>
        <article class="stat"><small>Comptes matchés</small><strong>{{ guide.totals.matched }}</strong></article>
      </div>
    </section>

    <section v-if="guide" class="panel people">
      <p class="kicker">Contributeurs</p>
      <p class="lede">Les jours absents de Jira se règlent ici. La suggestion compare le rythme (pts/jour) au sprint précédent.</p>
      <article v-for="row in guide.contributors" :key="row.personKey" class="person">
        <div>
          <strong>{{ row.username || row.jiraName }}</strong>
          <small>{{ row.userId ? 'Compte Anacra' : 'Pas de compte Anacra' }}</small>
        </div>
        <label class="days">Jours présents
          <input
            :value="row.daysPresent"
            type="number"
            min="0"
            max="31"
            step="0.5"
            @change="onDaysChange(row, $event)"
          />
          <small>/ {{ row.daysDefault }} j par défaut</small>
        </label>
        <div class="jira">
          <span>{{ fmtPts(row.storyPoints) }}/{{ fmtPts(row.storyPointsCommitted ?? row.storyPoints) }} pts</span>
          <span>{{ fmtPts(row.pointsPerDay) }} pts/j</span>
          <span>{{ row.completionPct ?? 0 }}%</span>
          <span>{{ row.issuesDone }}/{{ row.issuesTotal }} tickets</span>
          <span v-if="row.deltaPoints != null" :class="deltaClass(row.deltaPoints)">
            {{ fmtDelta(row.deltaPoints) }} pts vs préc.
          </span>
          <span v-if="row.compareBonus" :class="deltaClass(row.compareBonus)">
            {{ fmtDelta(row.compareBonus) }} cartes rythme
          </span>
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
import type { BoosterTemplate, JiraSprint, JiraStatus, SprintContributor, SprintRewardGuide, SuggestedPack } from '@/types';

const PAGE = 20;
const templates = ref<BoosterTemplate[]>([]);
const sprints = ref<JiraSprint[]>([]);
const visibleCount = ref(PAGE);
const guide = ref<SprintRewardGuide | null>(null);
const jira = ref<JiraStatus>({ configured: false, baseUrl: null, email: null, tokenSet: false, reachable: false, error: null });
const sprintId = ref(0);
const loadingJira = ref(false);
const jiraError = ref('');
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const standardSize = computed(() => templates.value.find((pack) => pack.presetKey === 'standard')?.cardCount || 5);
const visibleSprints = computed(() => sprints.value.slice(0, visibleCount.value));
const activeSprint = computed(() => sprints.value.find((sprint) => sprint.id === sprintId.value) || null);
const sprintDates = computed(() => {
  const sprint = guide.value?.metrics?.sprint || activeSprint.value;
  if (!sprint?.startDate && !sprint?.endDate) return '';
  const fmt = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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

function fmtDelta(value: number) {
  const text = fmtPts(value);
  if (Number(value) > 0) return `+${text}`;
  return text;
}

function deltaClass(value: number) {
  if (value > 0) return 'ok';
  if (value < 0) return 'late';
  return '';
}

function loadMore() {
  visibleCount.value += PAGE;
}

function suggestPacks(points: number, issuesDone: number): { cards: number; packs: SuggestedPack[] } {
  const cards = points > 0 ? Math.max(0, Math.round(points)) : issuesDone;
  const byKey = Object.fromEntries(templates.value.filter((pack) => pack.presetKey).map((pack) => [pack.presetKey, pack]));
  const standard = byKey.standard;
  const packs: SuggestedPack[] = [];
  if (standard && cards > 0) {
    const quantity = Math.max(1, Math.ceil(cards / standard.cardCount));
    packs.push({
      templateId: standard.id,
      name: standard.name,
      quantity,
      reason: `${cards} carte${cards > 1 ? 's' : ''} → ${quantity}×${standard.cardCount}`,
    });
  }
  for (const bonus of [
    { key: 'rare', min: 8, label: '≥ 8 pts' },
    { key: 'premium', min: 13, label: '≥ 13 pts' },
    { key: 'epique', min: 21, label: '≥ 21 pts' },
  ]) {
    const pack = byKey[bonus.key];
    if (pack && cards >= bonus.min) {
      packs.push({ templateId: pack.id, name: pack.name, quantity: 1, reason: bonus.label });
    }
  }
  return { cards, packs };
}

function applyDays(row: SprintContributor, days: number): SprintContributor {
  const safeDays = Math.max(0.5, days);
  const pointsPerDay = row.storyPoints / safeDays;
  const previousPerDay = row.previousPoints != null && row.previousDays != null
    ? row.previousPoints / Math.max(0.5, row.previousDays)
    : null;
  const compareBonus = previousPerDay == null ? 0 : Math.max(0, Math.round((pointsPerDay - previousPerDay) * safeDays));
  const suggestion = suggestPacks(row.storyPoints + compareBonus, row.issuesDone);
  return {
    ...row,
    daysPresent: Math.round(days * 10) / 10,
    pointsPerDay: Math.round(pointsPerDay * 10) / 10,
    deltaPerDay: previousPerDay == null ? null : Math.round((pointsPerDay - previousPerDay) * 10) / 10,
    compareBonus,
    suggestedCards: suggestion.cards,
    suggestedPacks: suggestion.packs,
  };
}

function refreshTotals() {
  if (!guide.value) return;
  const totals = guide.value.contributors.reduce(
    (acc, row) => {
      acc.storyPoints += row.storyPoints;
      acc.issuesDone += row.issuesDone;
      acc.suggestedCards += row.suggestedCards;
      acc.suggestedBoosters += row.suggestedPacks.reduce((sum, pack) => sum + pack.quantity, 0);
      acc.matched += row.userId ? 1 : 0;
      return acc;
    },
    { storyPoints: 0, issuesDone: 0, suggestedCards: 0, suggestedBoosters: 0, matched: 0 },
  );
  guide.value = { ...guide.value, totals };
}

function persistDays() {
  if (!sprintId.value || !guide.value) return;
  const days = Object.fromEntries(guide.value.contributors.map((row) => [row.personKey, row.daysPresent]));
  api(`/admin/jira/sprints/${sprintId.value}/attendance`, {
    method: 'PUT',
    body: JSON.stringify({ days }),
  }).catch(() => {
    jiraError.value = 'Jours présents non enregistrés';
  });
}

function onDaysChange(row: SprintContributor, event: Event) {
  if (!guide.value) return;
  const days = Math.max(0, Math.min(31, Number((event.target as HTMLInputElement).value)));
  guide.value = {
    ...guide.value,
    contributors: guide.value.contributors.map((item) => (item.personKey === row.personKey ? applyDays(item, days) : item)),
  };
  refreshTotals();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistDays, 400);
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
    visibleCount.value = PAGE;
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
.sprint-bar h2, .compare h2 { margin: 6px 0 0; }
.sprint-controls { display: grid; gap: 10px; }
.compare, .metrics { margin-bottom: 18px; }
.compare-grid, .stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.compare-grid strong, .stat strong {
  display: block;
  font-size: 1.45rem;
  font-family: Cinzel, serif;
}
.compare-grid small, .compare-grid em, .stat small, .stat em, .person small {
  color: var(--muted);
  font-style: normal;
}
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
.late { color: #e7a08a; }
.ok { color: var(--ok); }
.stats.extra {
  margin: 16px 0 0;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.stat em { display: block; font-size: 0.78rem; }
.person {
  border-top: 1px solid var(--line);
  padding: 14px 0;
  display: grid;
  gap: 8px;
}
.days {
  max-width: 220px;
}
.days input { width: 100%; }
.jira, .packs { display: flex; gap: 10px; flex-wrap: wrap; color: var(--gold-2); font-size: 0.86rem; }
.packs { color: var(--muted); margin: 0; }
.people .lede { margin-bottom: 12px; }
@media (max-width: 980px) {
  .sprint-bar, .point-compare, .stats, .compare-grid, .stats.extra { grid-template-columns: 1fr; }
}
</style>
