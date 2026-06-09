import * as d3 from 'd3'
import { summarizeAdoption, PROFILE_VARS } from './scripts/preprocess.js'
import { drawAdoptionChart } from './scripts/viz.js'

const VARIABLES = [
  'ResponseId', 'MainBranch', 'Age', 'EdLevel', 'Employment',
  'YearsCode', 'WorkExp', 'DevType', 'OrgSize', 'ICorPM',
  'RemoteWork', 'Industry', 'AISelect', 'AISent', 'AIAcc',
  'AIComplex', 'AIThreat', 'AIFrustration', 'AIAgents',
  'AIAgentChange', 'AIHuman', 'SOFriction'
]

const TAB_LABELS = {
  Age: 'Age',
  DevType: 'Role',
  RemoteWork: 'Work Mode',
  OrgSize: 'Org Size',
}

Promise.all([
  d3.csv('/data/results.csv'),
  d3.csv('/data/schema.csv')
]).then(([results]) => {

  const data = results.map(row => {
    const filtered = {}
    VARIABLES.forEach(v => { filtered[v] = row[v] })
    return filtered
  })

  const tabsContainer = document.getElementById('tabs')
  let activeVar = 'Age'

  Object.entries(TAB_LABELS).forEach(([varName, label]) => {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className = 'tab-btn' + (varName === activeVar ? ' active' : '')
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeVar = varName
      const summary = summarizeAdoption(data, activeVar)
      drawAdoptionChart(summary, 'chart')
    })
    tabsContainer.appendChild(btn)
  })

  const summary = summarizeAdoption(data, activeVar)
  drawAdoptionChart(summary, 'chart')
})