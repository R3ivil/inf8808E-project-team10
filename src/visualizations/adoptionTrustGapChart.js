import * as d3 from 'd3'
import {
  BLUE,
  ORANGE,
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

const ROLE_FOCUS = new Set([
  'AI/ML engineer',
  'Dev: front-end',
  'Dev: mobile',
  'Dev: back-end',
  'Cloud infra engineer',
  'DevOps engineer',
  'Dev: full-stack',
  'Architect',
  'Manager',
  'Senior executive',
  'Founder',
  'Data scientist',
])

export function renderAdoptionTrustGapChart(container, data, options = {}) {
  const root = clear(container)
  const labelKey = options.labelKey ?? 'group'
  const metric = options.metric ?? 'Trust%'
  const metricLabel = metric === 'ComplexConf%' ? 'complex-task confidence' : 'trust in AI accuracy'
  const nKey = metric === 'ComplexConf%' ? 'n_Complex' : 'n_Trust'
  const missingKey = metric === 'ComplexConf%' ? 'missing_Complex' : 'missing_Trust'
  const focus = options.grouping === 'Role'
    ? (d) => ROLE_FOCUS.has(d[labelKey])
    : (d) => toNumber(d.n_AISelect) >= 650

  const rows = data
    .filter((d) => focus(d) && toNumber(d.n_AISelect) >= 250)
    .sort((a, b) => toNumber(b['AnyUser%']) - toNumber(a['AnyUser%']))
    .slice(0, 12)

  const margin = { top: 32, right: 140, bottom: 54, left: 188 }
  const rowHeight = 38
  const width = 920
  const height = margin.top + margin.bottom + rows.length * rowHeight
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  addLegend(root, [
    { label: 'AI users', color: BLUE },
    { label: metricLabel, color: ORANGE },
  ])

  const title = `Adoption-${metricLabel} gap by ${options.grouping ?? 'cohort'}`
  const svg = makeSvg(root, width, height, title, 'Connected dots compare AI adoption with trust or complex-task confidence for selected cohorts.')
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth])
  const y = d3.scaleBand().domain(rows.map((d) => d[labelKey])).range([0, innerHeight]).padding(0.36)

  addVerticalGrid(g, x, innerHeight)
  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickFormat((d) => truncate(d, 26)))
    .call((axis) => axis.select('.domain').remove())
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

  const points = [
    { key: 'AnyUser%', label: 'AI users', color: BLUE, n: 'n_AISelect', missing: 'missing_AISelect' },
    { key: metric, label: metricLabel, color: ORANGE, n: nKey, missing: missingKey },
  ]

  points.forEach((point) => {
    const marks = g.selectAll(`circle.${point.key.replace('%', '')}`)
      .data(rows)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(toNumber(d[point.key])))
      .attr('cy', (d) => y(d[labelKey]) + y.bandwidth() / 2)
      .attr('r', 5.5)
      .attr('fill', point.color)
      .on('mousemove focus', (event, d) => showTooltip(event, `
        <strong>${d[labelKey]}</strong><br>
        ${point.label}: ${formatPct(d[point.key])}<br>
        Valid n: ${Number(d[point.n]).toLocaleString()}<br>
        Missing / NA: ${Number(d[point.missing]).toLocaleString()}
      `))
      .on('mouseleave blur', hideTooltip)

    markInteractive(marks, (d) => `${d[labelKey]}, ${point.label} ${formatPct(d[point.key])}, valid n ${d[point.n]}, missing ${d[point.missing]}`)
  })

  g.selectAll('text.value')
    .data(rows)
    .join('text')
    .attr('class', 'mark-label')
    .attr('x', (d) => x(Math.max(toNumber(d['AnyUser%']), toNumber(d[metric]))) + 8)
    .attr('y', (d) => y(d[labelKey]) + y.bandwidth() / 2 + 4)
    .text((d) => `${formatPct(d['AnyUser%'], 0)} vs ${formatPct(d[metric], 0)}`)

  g.append('text')
    .attr('x', innerWidth)
    .attr('y', innerHeight + 42)
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .text('Percent of valid respondents')

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 18)
    .attr('class', 'chart-note')
    .text('Rates exclude missing/NA responses; tooltips show valid and missing counts.')
}
