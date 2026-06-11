import * as d3 from 'd3'
import {
  clear,
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

export function renderBaselineDifferenceMatrix(container, data, options = {}) {
  const root = clear(container)
  const labelKey = options.labelKey ?? 'group'
  const focus = options.grouping === 'Role'
    ? (d) => ROLE_FOCUS.has(d[labelKey])
    : (d) => toNumber(d.n_AISelect) >= 650
  const sortMetric = options.sortMetric ?? 'Adoption'
  const metricSpec = METRICS.find(([metric]) => metric === sortMetric) ?? METRICS[0]
  const rows = data
    .filter(focus)
    .sort((a, b) => (toNumber(b[metricSpec[1]]) - BASELINES[metricSpec[0]]) - (toNumber(a[metricSpec[1]]) - BASELINES[metricSpec[0]]))
    .slice(0, 10)

  const cells = rows.flatMap((row) => METRICS.map(([metric, key, nKey, missingKey]) => ({
    cohort: row[labelKey],
    metric,
    value: toNumber(row[key]) - BASELINES[metric],
    rate: toNumber(row[key]),
    n: row[nKey],
    missing: row[missingKey],
  })))

  const margin = { top: 62, right: 24, bottom: 28, left: 184 }
  const width = 860
  const cellW = 148
  const cellH = 38
  const innerWidth = cellW * METRICS.length
  const innerHeight = cellH * rows.length
  const height = margin.top + margin.bottom + innerHeight
  const svg = makeSvg(root, width, height, `Baseline differences by ${options.grouping ?? 'cohort'}`, 'A colored matrix shows cohort percentage-point differences from the overall survey baseline.')
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
    .attr('fill', (d) => color(d.value))
    .on('mousemove focus', (event, d) => showTooltip(event, `
      <strong>${d.cohort}</strong><br>
      ${d.metric}: ${formatPct(d.rate)}<br>
      Difference from baseline: ${d.value > 0 ? '+' : ''}${d.value.toFixed(1)} pp<br>
      Valid n: ${Number(d.n).toLocaleString()}<br>
      Missing / NA: ${Number(d.missing).toLocaleString()}
    `))
    .on('mouseleave blur', hideTooltip)
  markInteractive(rects, (d) => `${d.cohort}, ${d.metric}, ${d.value > 0 ? '+' : ''}${d.value.toFixed(1)} percentage points from baseline, valid n ${d.n}, missing ${d.missing}`)

  g.selectAll('text.cell-label')
    .data(cells)
    .join('text')
    .attr('class', 'matrix-label')
    .attr('x', (d) => x(d.metric) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.cohort) + y.bandwidth() / 2 + 4)
    .text((d) => `${d.value > 0 ? '+' : ''}${d.value.toFixed(1)}`)

  g.append('g')
    .attr('class', 'matrix-x')
    .selectAll('text')
    .data(METRICS.map((d) => d[0]))
    .join('text')
    .attr('x', (d) => x(d) + x.bandwidth() / 2)
    .attr('y', -18)
    .attr('text-anchor', 'middle')
    .text((d) => d)

  g.append('g')
    .attr('class', 'matrix-y')
    .selectAll('text')
    .data(rows.map((d) => d[labelKey]))
    .join('text')
    .attr('x', -12)
    .attr('y', (d) => y(d) + y.bandwidth() / 2 + 4)
    .attr('text-anchor', 'end')
    .text((d) => truncate(d, 27))

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 24)
    .attr('class', 'chart-note')
    .text(`Rows sorted by ${sortMetric}; cell values are percentage-point differences from the overall baseline.`)
}
