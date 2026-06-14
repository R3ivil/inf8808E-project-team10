import * as d3 from 'd3'
import {
  addPinLabelAffordance,
  applyPinnedMark,
  clear,
  contrastText,
  displayGroup,
  formatPct,
  hideTooltip,
  makeSvg,
  markInteractive,
  showTooltip,
  toNumber,
  truncate,
} from './chartUtils.js'

const BASELINES = {
  'Adoption': 78.5,
  'Trust': 32.8,
  'Complex confidence': 29.6,
  'Job-threat concern': 15.0,
}

const METRICS = [
  ['Adoption', 'AnyUser%', 'n_AISelect', 'missing_AISelect'],
  ['Trust', 'Trust%', 'n_Trust', 'missing_Trust'],
  ['Complex confidence', 'ComplexConf%', 'n_Complex', 'missing_Complex'],
  ['Job-threat concern', 'Threat%', 'n_Threat', 'missing_Threat'],
]

const RISK_METRICS = new Set(['Job-threat concern'])

const ROLE_FOCUS = new Set([
  'AI/ML engineer',
  'Dev: front-end',
  'Dev: mobile',
  'Dev: back-end',
  'Cloud infra engineer',
  'DevOps engineer',
  'Senior executive',
  'Founder',
  'Manager',
  'Dev: full-stack',
])

export function renderBaselineDifferenceMatrix(container, { data, source, state, store }) {
  const root = clear(container)
  const labelKey = 'group'
  const minValidN = state.minValidN
  const pinnedLabels = new Set(
    state.pinnedCohorts.filter((c) => c.source === source).map((c) => c.label),
  )
  const focus = source === 'role'
    ? (d) => ROLE_FOCUS.has(d[labelKey]) && toNumber(d.n_AISelect) >= Math.min(250, minValidN)
    : (d) => toNumber(d.n_AISelect) >= Math.max(650, minValidN)
  const sortMetric = state.v3SortMetric
  const metricSpec = METRICS.find(([metric]) => metric === sortMetric) ?? METRICS[0]
  const maxRows = 8

  const passing = data.filter(focus)
  const pinnedRows = passing.filter((d) => pinnedLabels.has(d[labelKey]))
  const candidates = passing
    .filter((d) => !pinnedLabels.has(d[labelKey]))
    .sort((a, b) => (toNumber(b[metricSpec[1]]) - BASELINES[metricSpec[0]]) - (toNumber(a[metricSpec[1]]) - BASELINES[metricSpec[0]]))
  const slots = Math.max(0, maxRows - pinnedRows.length)
  const topCandidates = candidates.slice(0, slots)
  const pinnedSorted = [...pinnedRows].sort(
    (a, b) => (toNumber(b[metricSpec[1]]) - BASELINES[metricSpec[0]]) - (toNumber(a[metricSpec[1]]) - BASELINES[metricSpec[0]]),
  )
  const rows = [...pinnedSorted, ...topCandidates]

  const cells = rows.flatMap((row) => METRICS.map(([metric, key, nKey, missingKey]) => ({
    cohort: row[labelKey],
    metric,
    value: toNumber(row[key]) - BASELINES[metric],
    rate: toNumber(row[key]),
    n: row[nKey],
    missing: row[missingKey],
    pinned: pinnedLabels.has(row[labelKey]),
  })))

  const margin = { top: 86, right: 18, bottom: 48, left: 170 }
  const cellW = 124
  const cellH = 42
  const innerWidth = cellW * METRICS.length
  const innerHeight = cellH * rows.length
  const width = margin.left + margin.right + innerWidth
  const height = margin.top + margin.bottom + innerHeight
  const svg = makeSvg(root, width, height, `Baseline differences by ${source}`, 'A colored matrix shows cohort percentage-point differences from the overall survey baseline.')
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 30)
    .attr('class', 'chart-title')
    .text(`Difference from overall average by ${source === 'industry' ? 'industry' : 'role'}`)
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleBand().domain(METRICS.map((d) => d[0])).range([0, innerWidth])
  const y = d3.scaleBand().domain(rows.map((d) => d[labelKey])).range([0, innerHeight])
  const color = d3.scaleDiverging([-24, 0, 24], d3.interpolateRdBu)

  const rects = g.selectAll('rect.cell')
    .data(cells)
    .join('rect')
    .attr('class', 'matrix-cell')
    .attr('x', (d) => x(d.metric))
    .attr('y', (d) => y(d.cohort))
    .attr('width', x.bandwidth() - 2)
    .attr('height', y.bandwidth() - 2)
    .attr('fill', (d) => color(RISK_METRICS.has(d.metric) ? -d.value : d.value))
    .on('mousemove focus', (event, d) => showTooltip(event, `
      <strong>${d.cohort}</strong><br>
      ${d.metric}: ${formatPct(d.rate)}<br>
      Difference from baseline: ${d.value > 0 ? '+' : ''}${d.value.toFixed(1)} pp<br>
      Valid n: ${Number(d.n).toLocaleString()}<br>
      Missing / NA: ${Number(d.missing).toLocaleString()}
    `))
    .on('mouseleave blur', hideTooltip)
  applyPinnedMark(rects, (d) => d.pinned)
  markInteractive(rects, (d) => `${d.cohort}, ${d.metric}, ${d.value > 0 ? '+' : ''}${d.value.toFixed(1)} percentage points from baseline, valid n ${d.n}, missing ${d.missing}`)

  g.selectAll('text.cell-label')
    .data(cells)
    .join('text')
    .attr('class', 'matrix-label')
    .attr('x', (d) => x(d.metric) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.cohort) + y.bandwidth() / 2 + 4)
    .style('fill', (d) => contrastText(d.value))
    .text((d) => `${d.value > 0 ? '+' : ''}${d.value.toFixed(1)}`)

  g.append('g')
    .attr('class', 'matrix-x')
    .selectAll('text')
    .data(METRICS.map((d) => d[0]))
    .join('text')
    .attr('x', (d) => x(d) + x.bandwidth() / 2)
    .attr('y', -18)
    .attr('text-anchor', 'middle')
    .text((d) => d === 'Job-threat concern' ? 'Threat yes' : d === 'Complex confidence' ? 'Complex conf.' : d)

  g.append('text')
    .attr('x', x('Job-threat concern') + x.bandwidth() / 2)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('class', 'risk-label')
    .text('risk')

  const yLabels = g.append('g')
    .attr('class', 'matrix-y')
    .selectAll('text')
    .data(rows.map((d) => d[labelKey]))
    .join('text')
    .attr('y', (d) => y(d) + y.bandwidth() / 2 + 4)
    .attr('text-anchor', 'end')
    .attr('x', -12)
    .style('cursor', 'pointer')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => (pinnedLabels.has(d) ? `Unpin ${d}` : `Pin ${d}`))
    .text((d) => truncate(displayGroup(d), 27))

  applyPinnedMark(yLabels, (d) => pinnedLabels.has(d))
  yLabels
    .on('click', (_event, d) => {
      store.setState((s) => ({ ...s, pinnedCohorts: togglePinned(s.pinnedCohorts, d, source) }))
    })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        store.setState((s) => ({ ...s, pinnedCohorts: togglePinned(s.pinnedCohorts, d, source) }))
      }
    })

  addPinLabelAffordance(yLabels, {
    label: (d) => d,
    display: displayGroup,
    isPinned: (d) => pinnedLabels.has(d),
    max: 27,
  })

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', height - 14)
    .attr('class', 'chart-note')
    .text('Values are percentage-point differences from the overall rate. Threat is a risk metric.')
}

function togglePinned(list, label, source) {
  const id = `${source === 'industry' ? 'industry' : 'role'}:${label}`
  const exists = list.some((c) => c.id === id)
  if (exists) return list.filter((c) => c.id !== id)
  return [...list, { id, source: source === 'industry' ? 'industry' : 'role', label }]
}
