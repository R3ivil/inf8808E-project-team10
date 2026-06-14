import * as d3 from 'd3'
import {
  BLUE,
  ORANGE,
  addLegend,
  addVerticalGrid,
  addPinLabelAffordance,
  applyPinnedMark,
  clear,
  displayGroup,
  formatPct,
  hideTooltip,
  makeSvg,
  markInteractive,
  showTooltip,
  toNumber,
  truncate,
} from './chartUtils.js'

export function renderAdoptionTrustGapChart(container, { data, source, state, store }) {
  const root = clear(container)
  const labelKey = 'group'
  const metric = state.v1Metric
  const metricLabel = metric === 'ComplexConf%' ? 'complex-task confidence' : 'trust in AI accuracy'
  const nKey = metric === 'ComplexConf%' ? 'n_Complex' : 'n_Trust'
  const missingKey = metric === 'ComplexConf%' ? 'missing_Complex' : 'missing_Trust'
  const minValidN = state.minValidN
  const maxRows = 8
  const pinnedLabels = new Set(
    state.pinnedCohorts.filter((c) => c.source === source).map((c) => c.label),
  )

  const passing = data.filter((d) => toNumber(d.n_AISelect) >= minValidN && toNumber(d[nKey]) >= minValidN)
  const pinnedRows = passing.filter((d) => pinnedLabels.has(d[labelKey]))
  const candidates = passing
    .filter((d) => !pinnedLabels.has(d[labelKey]))
    .sort((a, b) => (toNumber(b['AnyUser%']) - toNumber(b[metric])) - (toNumber(a['AnyUser%']) - toNumber(a[metric])))
  const slots = Math.max(0, maxRows - pinnedRows.length)
  const topCandidates = candidates.slice(0, slots)
  const pinnedSorted = [...pinnedRows].sort(
    (a, b) => (toNumber(b['AnyUser%']) - toNumber(b[metric])) - (toNumber(a['AnyUser%']) - toNumber(a[metric])),
  )
  const rows = [...pinnedSorted, ...topCandidates]

  const margin = { top: 44, right: 150, bottom: 58, left: 214 }
  const rowHeight = 46
  const width = 920
  const height = margin.top + margin.bottom + rows.length * rowHeight
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const title = `Adoption-${metricLabel} gap by ${source === 'industry' ? 'industry' : 'role'}`
  const svg = makeSvg(root, width, height, title, 'Connected dots compare AI adoption with trust or complex-task confidence for selected cohorts.')
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 20)
    .attr('class', 'chart-title')
    .text(`Adoption and ${metric === 'ComplexConf%' ? 'complex-confidence' : 'trust'} gap by ${source === 'industry' ? 'industry' : 'role'}`)
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 38)
    .attr('class', 'chart-note')
    .text(`Sorted by adoption minus ${metric === 'ComplexConf%' ? 'complex-task confidence' : 'trust'}, min valid n=${minValidN}.`)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth])
  const y = d3.scaleBand().domain(rows.map((d) => d[labelKey])).range([0, innerHeight]).padding(0.36)

  addVerticalGrid(g, x, innerHeight)
  const yAxis = g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickFormat((d) => truncate(displayGroup(d), 31)))
    .call((axis) => axis.select('.domain').remove())

  const labelSelection = yAxis.selectAll('text')
    .attr('class', (d) => `cohort-label${pinnedLabels.has(d) ? ' pinned-mark' : ''}`)
    .style('cursor', 'pointer')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => (pinnedLabels.has(d) ? `Unpin ${d}` : `Pin ${d}`))
    .on('click', (_event, d) => {
      store.setState((s) => ({ ...s, pinnedCohorts: togglePinned(s.pinnedCohorts, d, source) }))
    })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        store.setState((s) => ({ ...s, pinnedCohorts: togglePinned(s.pinnedCohorts, d, source) }))
      }
    })

  addPinLabelAffordance(labelSelection, {
    label: (d) => d,
    display: displayGroup,
    isPinned: (d) => pinnedLabels.has(d),
  })

  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`))
    .call((axis) => axis.select('.domain').remove())

  g.selectAll('line.gap')
    .data(rows)
    .join('line')
    .attr('class', 'gap-line')
    .attr('x1', (d) => x(toNumber(d['AnyUser%'])))
    .attr('x2', (d) => x(toNumber(d[metric])))
    .attr('y1', (d) => y(d[labelKey]) + y.bandwidth() / 2)
    .attr('y2', (d) => y(d[labelKey]) + y.bandwidth() / 2)
  applyPinnedMark(g.selectAll('line.gap'), (d) => pinnedLabels.has(d[labelKey]))

  const points = [
    { key: 'AnyUser%', label: 'AI users', color: BLUE, n: 'n_AISelect', missing: 'missing_AISelect' },
    { key: metric, label: metricLabel, color: ORANGE, n: nKey, missing: missingKey },
  ]

  points.forEach((point) => {
    const circles = g.selectAll(`circle.${point.key.replace('%', '')}`)
      .data(rows)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(toNumber(d[point.key])))
      .attr('cy', (d) => y(d[labelKey]) + y.bandwidth() / 2)
      .attr('r', (d) => (pinnedLabels.has(d[labelKey]) ? 7 : 5.5))
      .attr('fill', point.color)
      .attr('stroke', (d) => (pinnedLabels.has(d[labelKey]) ? '#111827' : '#ffffff'))
      .attr('stroke-width', (d) => (pinnedLabels.has(d[labelKey]) ? 2 : 1.5))
      .on('mousemove focus', (event, d) => showTooltip(event, `
        <strong>${d[labelKey]}</strong><br>
        ${point.label}: ${formatPct(d[point.key])}<br>
        Valid n: ${Number(d[point.n]).toLocaleString()}<br>
        Missing / NA: ${Number(d[point.missing]).toLocaleString()}
      `))
      .on('mouseleave blur', hideTooltip)

    markInteractive(circles, (d) => `${d[labelKey]}, ${point.label} ${formatPct(d[point.key])}, valid n ${d[point.n]}, missing ${d[point.missing]}`)

    const labels = g.selectAll(`text.${point.key.replace('%', '')}-label`)
      .data(rows)
      .join('text')
      .attr('class', 'mark-label')
      .attr('x', (d) => x(toNumber(d[point.key])) + (point.key === 'AnyUser%' ? 9 : -9))
      .attr('y', (d) => y(d[labelKey]) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', point.key === 'AnyUser%' ? 'start' : 'end')
      .style('fill', point.color)
      .text((d) => formatPct(d[point.key], 1))
    applyPinnedMark(labels, (d) => pinnedLabels.has(d[labelKey]))
  })

  g.selectAll('text.gap-value')
    .data(rows)
    .join('text')
    .attr('class', 'mark-label')
    .attr('x', innerWidth + 16)
    .attr('y', (d) => y(d[labelKey]) + y.bandwidth() / 2 + 4)
    .style('fill', '#64748b')
    .text((d) => `gap ${(toNumber(d['AnyUser%']) - toNumber(d[metric])).toFixed(1)} pp`)

  g.append('text')
    .attr('x', innerWidth)
    .attr('y', innerHeight + 42)
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .text('Percent of valid respondents')

  addLegend(root, [
    { label: 'AI adoption rate', color: BLUE },
    { label: metricLabel, color: ORANGE },
  ])
}

function togglePinned(list, label, source) {
  const id = `${source === 'industry' ? 'industry' : 'role'}:${label}`
  const exists = list.some((c) => c.id === id)
  if (exists) return list.filter((c) => c.id !== id)
  return [...list, { id, source: source === 'industry' ? 'industry' : 'role', label }]
}
