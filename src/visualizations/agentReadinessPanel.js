import * as d3 from 'd3'
import {
  BLUE,
  PURPLE,
  addLegend,
  addVerticalGrid,
  clear,
  formatPct,
  hideTooltip,
  makeSvg,
  markInteractive,
  showTooltip,
  toNumber,
  truncate,
} from './chartUtils.js'

export function renderAgentReadinessPanel(container, data, options = {}) {
  const root = clear(container)
  const rows = data
    .filter((d) => toNumber(d.n_agent) >= 150)
    .sort((a, b) => toNumber(b['AgentUser%']) - toNumber(a['AgentUser%']))
    .slice(0, options.maxRows ?? 12)

  const margin = { top: 28, right: 140, bottom: 54, left: 188 }
  const rowHeight = 36
  const width = 920
  const height = margin.top + margin.bottom + rows.length * rowHeight
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  addLegend(root, [
    { label: 'Uses AI agents', color: BLUE },
    { label: 'Work changed greatly', color: PURPLE },
  ])

  const svg = makeSvg(root, width, height, `AI-agent readiness by ${options.grouping ?? 'cohort'}`, 'Paired dots compare AI-agent use with strong perceived work change by cohort.')
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth])
  const y = d3.scaleBand().domain(rows.map((d) => d.group)).range([0, innerHeight]).padding(0.34)

  addVerticalGrid(g, x, innerHeight)
  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickFormat((d) => truncate(d, 27)))
    .call((axis) => axis.select('.domain').remove())
  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`))
    .call((axis) => axis.select('.domain').remove())

  g.selectAll('line.agent-gap')
    .data(rows)
    .join('line')
    .attr('class', 'gap-line')
    .attr('x1', (d) => x(toNumber(d['AgentUser%'])))
    .attr('x2', (d) => x(toNumber(d['GreatChange%'])))
    .attr('y1', (d) => y(d.group) + y.bandwidth() / 2)
    .attr('y2', (d) => y(d.group) + y.bandwidth() / 2)

  const points = [
    { key: 'AgentUser%', className: 'agent-user', label: 'Agent users', color: BLUE, n: 'n_agent', missing: 'missing_Agent' },
    { key: 'GreatChange%', className: 'great-change', label: 'Work changed greatly', color: PURPLE, n: 'n_change', missing: 'missing_Change' },
  ]
  points.forEach((point) => {
    const marks = g.selectAll(`circle.${point.className}`)
      .data(rows)
      .join('circle')
      .attr('class', `dot ${point.className}`)
      .attr('cx', (d) => x(toNumber(d[point.key])))
      .attr('cy', (d) => y(d.group) + y.bandwidth() / 2)
      .attr('r', 5.5)
      .attr('fill', point.color)
      .on('mousemove focus', (event, d) => showTooltip(event, `
        <strong>${d.group}</strong><br>
        ${point.label}: ${formatPct(d[point.key])}<br>
        Valid n: ${Number(d[point.n]).toLocaleString()}<br>
        Missing / NA: ${Number(d[point.missing]).toLocaleString()}
      `))
      .on('mouseleave blur', hideTooltip)
    markInteractive(marks, (d) => `${d.group}, ${point.label} ${formatPct(d[point.key])}, valid n ${d[point.n]}, missing ${d[point.missing]}`)
  })

  g.append('text')
    .attr('x', innerWidth)
    .attr('y', innerHeight + 42)
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .text('Percent of valid respondents')
}
