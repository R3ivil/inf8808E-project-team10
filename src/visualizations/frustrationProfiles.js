import * as d3 from 'd3'
import {
  BLUE,
  ORANGE,
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

const GROUPS = ['Occasional users', 'Weekly users', 'Daily users']

export function renderFrustrationProfiles(container, data) {
  const root = clear(container)
  const daily = data.find((d) => d.group === 'Daily users')
  const categories = Object.keys(daily)
    .filter((key) => !['group', 'n_resp'].includes(key) && key !== 'Other (write in):')
    .sort((a, b) => toNumber(daily[b]) - toNumber(daily[a]))
    .slice(0, 5)

  const rows = categories.flatMap((category) => GROUPS.map((group) => {
    const row = data.find((d) => d.group === group)
    return { category, group, value: toNumber(row[category]), n: row.n_resp }
  }))

  const margin = { top: 46, right: 150, bottom: 58, left: 240 }
  const width = 920
  const rowHeight = 52
  const height = margin.top + margin.bottom + categories.length * rowHeight
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const svg = makeSvg(root, width, height, 'AI frustrations by adoption maturity', 'A line chart with a visible percentage axis shows how common frustrations change from occasional to daily AI users.')
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 85]).range([0, innerWidth])
  const y = d3.scaleBand().domain(categories).range([0, innerHeight]).padding(0.32)
  const offset = d3.scalePoint().domain(GROUPS).range([0, y.bandwidth()]).padding(0.5)
  const line = d3.line()
    .x((d) => x(d.value))
    .y((d) => y(d.category) + offset(d.group))

  addVerticalGrid(g, x, innerHeight)
  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickFormat((d) => truncate(d, 38)))
    .call((axis) => axis.select('.domain').remove())
  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}%`))
    .call((axis) => axis.select('.domain').remove())

  g.selectAll('path.frustration-line')
    .data(categories)
    .join('path')
    .attr('class', 'frustration-line')
    .attr('d', (category) => line(rows.filter((d) => d.category === category)))
    .attr('stroke', (category) => category.startsWith('AI solutions') ? ORANGE : '#94a3b8')

  GROUPS.forEach((group, index) => {
    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', innerWidth + 10)
      .attr('y', offset(group) + 4)
      .text(group.replace(' users', ''))
      .attr('fill', index === GROUPS.length - 1 ? ORANGE : BLUE)
  })

  const marks = g.selectAll('circle.frustration-point')
    .data(rows)
    .join('circle')
    .attr('class', 'dot')
    .attr('cx', (d) => x(d.value))
    .attr('cy', (d) => y(d.category) + offset(d.group))
    .attr('r', 5)
    .attr('fill', (d) => d.category.startsWith('AI solutions') ? ORANGE : BLUE)
    .on('mousemove focus', (event, d) => showTooltip(event, `
      <strong>${d.group}</strong><br>
      ${d.category}: ${formatPct(d.value)}<br>
      Valid n: ${Number(d.n).toLocaleString()}<br>
      Missing / NA: shown in source summary denominator notes
    `))
    .on('mouseleave blur', hideTooltip)
  markInteractive(marks, (d) => `${d.group}, ${d.category}, ${formatPct(d.value)}, valid n ${d.n}`)

  g.selectAll('text.value-label')
    .data(rows.filter((d) => d.group === 'Daily users' || d.group === 'Occasional users'))
    .join('text')
    .attr('class', 'mark-label')
    .attr('x', (d) => x(d.value) + (d.group === 'Daily users' ? 8 : -8))
    .attr('y', (d) => y(d.category) + offset(d.group) + 4)
    .attr('text-anchor', (d) => d.group === 'Daily users' ? 'start' : 'end')
    .text((d) => formatPct(d.value, 0))

  g.append('text')
    .attr('x', innerWidth)
    .attr('y', innerHeight + 44)
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .text('Percent of valid AIFrustration respondents')

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 20)
    .attr('class', 'chart-note')
    .text('Multi-select responses; each row uses a visible percent scale and values do not sum to 100%.')
}
