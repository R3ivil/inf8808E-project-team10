import * as d3 from 'd3'
import { createStore, INITIAL_STATE } from './state.js'
import { mountGlobalControls } from './components/globalControls.js'
import { mountSideNav } from './components/sideNav.js'
import { mountCohortWorkspace } from './components/cohortWorkspace.js'
import { renderAdoptionTrustGapChart } from './visualizations/adoptionTrustGapChart.js'
import { renderAdoptionCompositionChart } from './visualizations/adoptionCompositionChart.js'
import { renderAgentReadinessPanel } from './visualizations/agentReadinessPanel.js'
import { renderBaselineDifferenceMatrix } from './visualizations/baselineDifferenceMatrix.js'
import { renderFrustrationProfiles } from './visualizations/frustrationProfiles.js'
import { renderHumanHelpMatrix } from './visualizations/humanHelpMatrix.js'
import './styles/style.css'

const DATA = `${import.meta.env.BASE_URL}data/analysis/`

const compositionSources = {
  Age: 'age_cohort_stats.csv',
  'Work experience': 'yearscode_cohort_stats.csv',
  Role: 'role_adoption_composition.csv',
  'Work mode': 'remotework_cohort_stats.csv',
  'Organization size': 'orgsize_cohort_stats.csv',
  'IC / manager': 'icorpm_adoption_composition.csv',
}

const v2PanelSets = {
  Profile: ['Age', 'Work experience', 'Role'],
  'Work context': ['Work mode', 'Organization size', 'IC / manager'],
}

function csv(name) {
  return d3.csv(`${DATA}${name}`)
}

function setText(id, text) {
  const el = document.querySelector(id)
  if (el) el.textContent = text
}

function setValue(id, nextValue) {
  const el = document.querySelector(id)
  if (el) el.value = nextValue
}

async function init() {
  setText('#status', 'Loading analysis summaries...')

  const store = createStore(INITIAL_STATE)

  mountGlobalControls(document.querySelector('#global-controls'), store)
  mountSideNav(document.querySelector('#side-nav'))
  mountCohortWorkspace(document.querySelector('#cohort-workspace'), store)

  const [
    roleMetrics,
    industryMetrics,
    agentRole,
    agentIndustry,
    frustrations,
    humanTrust,
    humanComplex,
    humanAdoption,
    ...compositionData
  ] = await Promise.all([
    csv('role_metrics.csv'),
    csv('industry_metrics.csv'),
    csv('agent_readiness_by_role.csv'),
    csv('agent_readiness_by_industry.csv'),
    csv('frustrations_by_adoption.csv'),
    csv('aihuman_by_trust.csv'),
    csv('aihuman_by_complex.csv'),
    csv('aihuman_by_adoption.csv'),
    ...Object.values(compositionSources).map(csv),
  ])

  const metricSources = { role: roleMetrics, industry: industryMetrics }
  const agentSources = { role: agentRole, industry: agentIndustry }
  const humanSources = { Trust: humanTrust, Confidence: humanComplex, Adoption: humanAdoption }
  const compositions = Object.fromEntries(
    Object.keys(compositionSources).map((name, index) => [name, compositionData[index]]),
  )

  function source() {
    return store.getState().scope === 'Industry' ? 'industry' : 'role'
  }

  function renderV1() {
    const state = store.getState()
    const src = source()
    setText('#gap-state', state.v1Metric === 'ComplexConf%' ? 'complex confidence' : 'trust')
    renderAdoptionTrustGapChart('#v1-chart', {
      data: metricSources[src],
      source: src,
      state,
      store,
    })
  }

  function renderV2() {
    const state = store.getState()
    const panels = Object.fromEntries(v2PanelSets[state.v2Tab].map((name) => [name, compositions[name]]))
    setText('#composition-state', `${state.v2Tab}; order ${state.v2Sort === 'source' ? 'survey' : state.v2Sort}`)
    document.querySelectorAll('[data-v2-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.v2Tab === state.v2Tab)
    })
    renderAdoptionCompositionChart('#v2-chart', panels, {
      maxRows: state.v2Tab === 'Profile' ? 8 : 9,
      sortBy: state.v2Sort,
      state,
      store,
    })
  }

  function renderV3() {
    const state = store.getState()
    const src = source()
    setText('#baseline-state', `Sorted by ${state.v3SortMetric}`)
    renderBaselineDifferenceMatrix('#v3-chart', {
      data: metricSources[src],
      source: src,
      state,
      store,
    })
  }

  function renderV4() {
    renderFrustrationProfiles('#v4-chart', frustrations)
  }

  function renderV5() {
    const state = store.getState()
    setText('#human-state', `Grouped by ${state.v5Grouping.toLowerCase()}`)
    renderHumanHelpMatrix('#v5-chart', {
      data: humanSources[state.v5Grouping],
      grouping: state.v5Grouping,
    })
  }

  function renderV6() {
    const state = store.getState()
    const src = source()
    setText('#agent-state', `Top ${state.v6MaxRows} ${src === 'industry' ? 'industries' : 'roles'} by agent use`)
    renderAgentReadinessPanel('#v6-chart', {
      data: agentSources[src],
      source: src,
      state,
      store,
    })
  }

  document.querySelector('#gap-metric').addEventListener('change', (e) => {
    store.setState({ v1Metric: e.target.value })
  })
  setValue('#gap-metric', INITIAL_STATE.v1Metric)

  document.querySelectorAll('[data-v2-tab]').forEach((button) => {
    button.addEventListener('click', () => store.setState({ v2Tab: button.dataset.v2Tab }))
  })
  document.querySelector('#composition-sort').addEventListener('change', (e) => {
    store.setState({ v2Sort: e.target.value })
  })
  setValue('#composition-sort', INITIAL_STATE.v2Sort)

  document.querySelector('#baseline-sort').addEventListener('change', (e) => {
    store.setState({ v3SortMetric: e.target.value })
  })
  setValue('#baseline-sort', INITIAL_STATE.v3SortMetric)

  document.querySelector('#human-grouping').addEventListener('change', (e) => {
    store.setState({ v5Grouping: e.target.value })
  })
  setValue('#human-grouping', INITIAL_STATE.v5Grouping)

  store.subscribe((next, prev) => {
    if (next.scope !== prev.scope) {
      renderV1(); renderV3(); renderV6()
    }
    if (next.minValidN !== prev.minValidN) {
      renderV1(); renderV6()
    }
    if (next.v1Metric !== prev.v1Metric) renderV1()
    if (next.v2Tab !== prev.v2Tab || next.v2Sort !== prev.v2Sort || next.pinnedCohorts !== prev.pinnedCohorts) renderV2()
    if (next.v3SortMetric !== prev.v3SortMetric) renderV3()
    if (next.v5Grouping !== prev.v5Grouping) renderV5()
    if (next.v6MaxRows !== prev.v6MaxRows) renderV6()
    if (next.pinnedCohorts !== prev.pinnedCohorts) {
      renderV1(); renderV3(); renderV6()
    }
  })

  renderV1()
  renderV2()
  renderV3()
  renderV4()
  renderV5()
  renderV6()

  setText(
    '#status',
    'Ready. Rates are descriptive associations from Stack Overflow Developer Survey 2025.',
  )
}

init().catch((error) => {
  console.error(error)
  setText(
    '#status',
    'Could not load the project data. Check the static data paths under public/data/analysis/.',
  )
})
