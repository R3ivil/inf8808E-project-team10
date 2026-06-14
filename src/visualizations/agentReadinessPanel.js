import * as d3 from 'd3'
import {
  GREEN,
  PURPLE,
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

export function renderAgentReadinessPanel(container, { data, source, state, store }) {
  const root = clear(container)
  const minValidN = state.minValidN
  const maxRows = state.v6MaxRows ?? 12
  const pinnedLabels = new Set(
    state.pinnedCohorts.filter((c) => c.source === source).map((c) => c.label),
  )

  const passing = data.filter((d) => toNumber(d.n_agent) >= Math.max(150, minValidN))
  const pinnedRows = passing.filter((d) => pinnedLabels.has(d.group))
  const candidates = passing
    .filter((d) => !pinnedLabels.has(d.group))
    .sort((a, b) => toNumber(b['AgentUser%']) - toNumber(a['AgentUser%']))
  const slots = Math.max(0, maxRows - pinnedRows.length)
  const topCandidates = candidates.slice(0, slots)
  const pinnedSorted = [...pinnedRows].sort(
    (a, b) => toNumber(b['AgentUser%']) - toNumber(a['AgentUser%']),
  )
  const rows = [...pinnedSorted, ...topCandidates]

  const margin = { top: 46, right: 126, bottom: 58, left: 214 }
  const rowHeight = 46
  const width = 920
  const height = margin.top + margin.bottom + rows.length * rowHeight
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  addLegend(root, [
    { label: 'Uses AI agents', color: PURPLE },
    { label: 'Strong work change', color: GREEN },
  ])

  const svg = makeSvg(root, width, height, `AI-agent readiness by ${source}`, 'Paired dots compare AI-agent use with strong perceived work change by cohort.')
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 20)
    .attr('class', 'chart-title')
    .text(`AI agent readiness by ${source === 'industry' ? 'industry' : 'role'}`)
  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 38)
    .attr('class', 'chart-note')
    .text(`Sorted by agent use; min valid n=${Math.max(150, minValidN)}.`)
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth])
  const y = d3.scaleBand().domain(rows.map((d) => d.group)).range([0, innerHeight]).padding(0.34)

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

  g.selectAll('line.agent-gap')
    .data(rows)
    .join('line')
    .attr('class', 'gap-line')
    .attr('x1', (d) => x(toNumber(d['AgentUser%'])))
    .attr('x2', (d) => x(toNumber(d['GreatChange%'])))
    .attr('y1', (d) => y(d.group) + y.bandwidth() / 2)
    .attr('y2', (d) => y(d.group) + y.bandwidth() / 2)
  applyPinnedMark(g.selectAll('line.agent-gap'), (d) => pinnedLabels.has(d.group))

  const points = [
    { key: 'AgentUser%', className: 'agent-user', label: 'Agent users', color: PURPLE, n: 'n_agent', missing: 'missing_Agent' },
    { key: 'GreatChange%', className: 'great-change', label: 'Strong work change', color: GREEN, n: 'n_change', missing: 'missing_Change' },
  ]
  points.forEach((point) => {
    const circles = g.selectAll(`circle.${point.className}`)
      .data(rows)
      .join('circle')
      .attr('class', `dot ${point.className}`)
      .attr('cx', (d) => x(toNumber(d[point.key])))
      .attr('cy', (d) => y(d.group) + y.bandwidth() / 2)
      .attr('r', (d) => (pinnedLabels.has(d.group) ? 7 : 5.5))
      .attr('fill', point.color)
      .attr('stroke', (d) => (pinnedLabels.has(d.group) ? '#111827' : '#ffffff'))
      .attr('stroke-width', (d) => (pinnedLabels.has(d.group) ? 2 : 1.5))
      .on('mousemove focus', (event, d) => showTooltip(event, `
        <strong>${d.group}</strong><br>
        ${point.label}: ${formatPct(d[point.key])}<br>
        Valid n: ${Number(d[point.n]).toLocaleString()}<br>
        Missing / NA: ${Number(d[point.missing]).toLocaleString()}
      `))
      .on('mouseleave blur', hideTooltip)
    markInteractive(circles, (d) => `${d.group}, ${point.label} ${formatPct(d[point.key])}, valid n ${d[point.n]}, missing ${d[point.missing]}`)

    const labels = g.selectAll(`text.${point.className}-label`)
      .data(rows)
      .join('text')
      .attr('class', 'mark-label')
      .attr('x', (d) => x(toNumber(d[point.key])) + (point.key === 'AgentUser%' ? 9 : -9))
      .attr('y', (d) => y(d.group) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', point.key === 'AgentUser%' ? 'start' : 'end')
      .style('fill', point.color)
      .text((d) => formatPct(d[point.key], 1))
    applyPinnedMark(labels, (d) => pinnedLabels.has(d.group))
  })

  g.append('text')
    .attr('x', innerWidth)
    .attr('y', innerHeight + 42)
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .text('Percent of valid respondents')
}

function togglePinned(list, label, source) {
  const id = `${source === 'industry' ? 'industry' : 'role'}:${label}`
  const exists = list.some((c) => c.id === id)
  if (exists) return list.filter((c) => c.id !== id)
  return [...list, { id, source: source === 'industry' ? 'industry' : 'role', label }]
}
