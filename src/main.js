import * as d3 from 'd3'
import { renderAdoptionTrustGapChart } from './visualizations/adoptionTrustGapChart.js'
import { renderAdoptionCompositionChart } from './visualizations/adoptionCompositionChart.js'
import { renderAgentReadinessPanel } from './visualizations/agentReadinessPanel.js'
import { renderBaselineDifferenceMatrix } from './visualizations/baselineDifferenceMatrix.js'
import { renderFrustrationProfiles } from './visualizations/frustrationProfiles.js'
import { renderHumanHelpMatrix } from './visualizations/humanHelpMatrix.js'
import './styles/style.css'

const DATA = `${import.meta.env.BASE_URL}data/analysis/`

const compositionSources = {
  Experience: 'yearscode_cohort_stats.csv',
  Age: 'age_cohort_stats.csv',
  Role: 'role_adoption_composition.csv',
  'Manager / IC': 'icorpm_adoption_composition.csv',
  Industry: 'industry_cohort_stats.csv',
}

const humanOrders = {
  Trust: ['Highly distrust', 'Somewhat distrust', 'Neither trust nor distrust', 'Somewhat trust', 'Highly trust'],
  Confidence: [
    'Very poor at handling complex tasks',
    'Bad at handling complex tasks',
    'Neither good or bad at handling complex tasks',
    'Good, but not great at handling complex tasks',
    'Very well at handling complex tasks',
  ],
  Adoption: ['Daily users', 'Weekly users', 'Occasional users', 'Planned users', 'Non-users'],
}

function csv(name) {
  return d3.csv(`${DATA}${name}`)
}

function setLoading(message) {
  document.querySelector('#status').textContent = message
}

function value(id) {
  return document.querySelector(id).value
}

function setValue(id, nextValue) {
  document.querySelector(id).value = nextValue
}

function setText(id, text) {
  document.querySelector(id).textContent = text
}

function mountTabs(container, names, activeName, onChange) {
  const root = document.querySelector(container)
  root.replaceChildren()
  names.forEach((name) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `tab-btn${name === activeName ? ' active' : ''}`
    button.textContent = name
    button.addEventListener('click', () => {
      root.querySelectorAll('.tab-btn').forEach((node) => node.classList.remove('active'))
      button.classList.add('active')
      onChange(name)
    })
    root.appendChild(button)
  })
}

async function init() {
  setLoading('Loading analysis summaries...')

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

  const metricSources = { Role: roleMetrics, Industry: industryMetrics }
  const agentSources = { Role: agentRole, Industry: agentIndustry }
  const humanSources = { Trust: humanTrust, Confidence: humanComplex, Adoption: humanAdoption }
  const compositions = Object.fromEntries(Object.keys(compositionSources).map((name, index) => [name, compositionData[index]]))

  function renderV1() {
    const grouping = value('#gap-grouping')
    const metric = value('#gap-metric')
    setText('#gap-state', `${grouping}; ${metric === 'Trust%' ? 'trust' : 'complex confidence'}`)
    renderAdoptionTrustGapChart('#v1-chart', metricSources[grouping], {
      grouping,
      labelKey: grouping === 'Role' ? 'Role' : 'Industry',
      metric,
    })
  }
  document.querySelector('#gap-grouping').addEventListener('change', renderV1)
  document.querySelector('#gap-metric').addEventListener('change', renderV1)
  document.querySelector('#gap-reset').addEventListener('click', () => {
    setValue('#gap-grouping', 'Role')
    setValue('#gap-metric', 'Trust%')
    renderV1()
  })
  renderV1()

  let compositionTab = 'Experience'
  let pinnedCohort = null
  function renderV2() {
    const sortBy = value('#composition-sort')
    setText('#composition-state', `${compositionTab}; sort ${document.querySelector('#composition-sort').selectedOptions[0].textContent}; pinned ${pinnedCohort ?? 'none'}`)
    renderAdoptionCompositionChart('#v2-chart', compositions[compositionTab], {
      maxRows: compositionTab === 'Role' || compositionTab === 'Industry' ? 12 : 10,
      sortBy,
      pinned: pinnedCohort,
      onPin: (group) => {
        pinnedCohort = pinnedCohort === group ? null : group
        renderV2()
      },
    })
    setText('#composition-note',
      compositionTab === 'Experience'
        ? 'Experience shows the clearest adoption decay: 85.5% any-use at 3-5 years versus 72.2% at 21+ years.'
        : compositionTab === 'Manager / IC'
          ? 'People managers adopt more often than individual contributors, and the gap is clearer than RemoteWork or OrgSize.'
          : 'Click or keyboard-select any segment to pin that cohort while sorting.'
    )
  }
  mountTabs('#composition-tabs', Object.keys(compositionSources), compositionTab, (name) => {
    compositionTab = name
    pinnedCohort = null
    renderV2()
  })
  document.querySelector('#composition-sort').addEventListener('change', renderV2)
  document.querySelector('#composition-reset').addEventListener('click', () => {
    setValue('#composition-sort', 'AnyUser%')
    pinnedCohort = null
    renderV2()
  })
  renderV2()

  function renderV6() {
    const grouping = value('#agent-grouping')
    setText('#agent-state', `${grouping}; top cohorts by agent use`)
    renderAgentReadinessPanel('#v6-chart', agentSources[grouping], { grouping, maxRows: 12 })
  }
  document.querySelector('#agent-grouping').addEventListener('change', renderV6)
  document.querySelector('#agent-reset').addEventListener('click', () => {
    setValue('#agent-grouping', 'Role')
    renderV6()
  })
  renderV6()

  function renderV3() {
    const grouping = value('#baseline-grouping')
    const sortMetric = value('#baseline-sort')
    setText('#baseline-state', `${grouping}; sorted by ${sortMetric}`)
    renderBaselineDifferenceMatrix('#v3-chart', metricSources[grouping], {
      grouping,
      labelKey: grouping === 'Role' ? 'Role' : 'Industry',
      sortMetric,
    })
  }
  document.querySelector('#baseline-grouping').addEventListener('change', renderV3)
  document.querySelector('#baseline-sort').addEventListener('change', renderV3)
  document.querySelector('#baseline-reset').addEventListener('click', () => {
    setValue('#baseline-grouping', 'Role')
    setValue('#baseline-sort', 'Adoption')
    renderV3()
  })
  renderV3()

  renderFrustrationProfiles('#v4-chart', frustrations)

  function renderV5() {
    const grouping = value('#human-grouping')
    setText('#human-state', `Grouped by ${grouping.toLowerCase()}`)
    renderHumanHelpMatrix('#v5-chart', humanSources[grouping], {
      grouping: grouping.toLowerCase(),
      order: humanOrders[grouping],
    })
  }
  document.querySelector('#human-grouping').addEventListener('change', renderV5)
  document.querySelector('#human-reset').addEventListener('click', () => {
    setValue('#human-grouping', 'Trust')
    renderV5()
  })
  renderV5()

  setLoading('Ready. Rates are descriptive associations from Stack Overflow Developer Survey 2025.')
}

init().catch((error) => {
  console.error(error)
  setLoading('Could not load the project data. Check the static data paths under public/data/analysis/.')
})
