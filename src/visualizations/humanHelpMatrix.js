import * as d3 from 'd3'
import {
  clear,
  formatPct,
  hideTooltip,
  makeSvg,
  markInteractive,
  sequentialContrastText,
  shortSituation,
  showTooltip,
  toNumber,
  truncate,
} from './chartUtils.js'

const SITUATIONS = [
  "When I don't trust AI's answers",
  'When I have ethical or security concerns about code',
  'When I want to fully understand something',
  'When I want to learn best practices',
  'When I need help fixing complex or unfamiliar code',
  "When I'm stuck and can't explain the problem",
  'When I want to compare different solutions',
]

function mergeRows(rows, group, names) {
  const selected = rows.filter((row) => names.includes(row.group))
  const n = selected.reduce((sum, row) => sum + toNumber(row.n_resp), 0)
  const out = {
    group,
    n_resp: n,
    missing_AIHuman: selected.reduce((sum, row) => sum + toNumber(row.missing_AIHuman), 0),
  }
  SITUATIONS.forEach((situation) => {
    out[situation] = n
      ? selected.reduce((sum, row) => sum + getValue(row, situation) * toNumber(row.n_resp), 0) / n
      : 0
  })
  return out
}

function getValue(row, key) {
  if (row[key] !== undefined) return toNumber(row[key])
  const curly = key.replaceAll("'", '’')
  if (row[curly] !== undefined) return toNumber(row[curly])
  return 0
}

function groupedRows(data, grouping) {
  if (grouping === 'Confidence') {
    return [
      mergeRows(data, 'Confident', ['Good, but not great at handling complex tasks', 'Very well at handling complex tasks']),
      mergeRows(data, 'Mixed / unknown', ['Neither good or bad at handling complex tasks', "I don't use AI tools for complex tasks / I don't know"]),
      mergeRows(data, 'Low confidence', ['Bad at handling complex tasks', 'Very poor at handling complex tasks']),
    ]
  }
  if (grouping === 'Adoption') {
    return [
      mergeRows(data, 'Frequent users', ['Daily users', 'Weekly users']),
      mergeRows(data, 'Occasional users', ['Occasional users']),
      mergeRows(data, 'Planned users', ['Planned users']),
      mergeRows(data, 'Non-users', ['Non-users']),
    ]
  }
  return [
    mergeRows(data, 'Trusts AI', ['Somewhat trust', 'Highly trust']),
    mergeRows(data, 'Neutral / mixed', ['Neither trust nor distrust']),
    mergeRows(data, 'Distrusts AI', ['Somewhat distrust', 'Highly distrust']),
  ]
}

export function renderHumanHelpMatrix(container, { data, grouping = 'Trust' }) {
  const root = clear(container)
  const rows = groupedRows(data, grouping)
  const cells = SITUATIONS.flatMap((situation) => rows.map((row) => ({
    situation,
    group: row.group,
    value: toNumber(row[situation]),
    n: row.n_resp,
    missing: row.missing_AIHuman,
  })))

  const margin = { top: 100, right: 24, bottom: 48, left: 210 }
  const cellW = grouping === 'Adoption' ? 118 : 140
  const cellH = 54
  const width = margin.left + margin.right + cellW * rows.length
  const height = margin.top + margin.bottom + cellH * SITUATIONS.length + 26
  const svg = makeSvg(root, width, height, `Human-help situations by ${grouping.toLowerCase()} group`, 'A matrix compares situations where developers still prefer human help across selected groups.')

  svg.append('text')
    .attr('x', 16)
    .attr('y', 34)
    .attr('class', 'chart-title')
    .text(`Human-help situations by ${grouping.toLowerCase()} group`)
  svg.append('text')
    .attr('x', 16)
    .attr('y', 64)
    .attr('class', 'chart-note')
    .text(`Rows are top AIHuman situations; cells show share within each ${grouping.toLowerCase()} group.`)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleBand().domain(rows.map((d) => d.group)).range([0, cellW * rows.length])
  const y = d3.scaleBand().domain(SITUATIONS).range([0, cellH * SITUATIONS.length])
  const color = d3.scaleSequential([0, 86], d3.interpolateBlues)

  const rects = g.selectAll('rect.help-cell')
    .data(cells)
    .join('rect')
    .attr('class', 'matrix-cell')
    .attr('x', (d) => x(d.group))
    .attr('y', (d) => y(d.situation))
    .attr('width', x.bandwidth() - 2)
    .attr('height', y.bandwidth() - 2)
    .attr('fill', (d) => color(d.value))
    .on('mousemove focus', (event, d) => showTooltip(event, `
      <strong>${d.group}</strong><br>
      ${shortSituation(d.situation)}: ${formatPct(d.value)}<br>
      Valid n: ${Number(d.n).toLocaleString()}<br>
      Missing / NA: ${Number(d.missing).toLocaleString()}
    `))
    .on('mouseleave blur', hideTooltip)
  markInteractive(rects, (d) => `${d.group}, ${shortSituation(d.situation)}, ${formatPct(d.value)}, valid n ${d.n}`)

  g.selectAll('text.help-value')
    .data(cells)
    .join('text')
    .attr('class', 'matrix-label')
    .attr('x', (d) => x(d.group) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.situation) + y.bandwidth() / 2 + 5)
    .style('fill', (d) => sequentialContrastText(d.value))
    .text((d) => formatPct(d.value, 0))

  g.selectAll('text.trust-label')
    .data(rows.map((d) => d.group))
    .join('text')
    .attr('class', 'matrix-x')
    .attr('x', (d) => x(d) + x.bandwidth() / 2)
    .attr('y', -14)
    .attr('text-anchor', 'middle')
    .text((d) => d)

  g.selectAll('text.situation-label')
    .data(SITUATIONS)
    .join('text')
    .attr('class', 'matrix-y')
    .attr('x', -12)
    .attr('y', (d) => y(d) + y.bandwidth() / 2 + 5)
    .attr('text-anchor', 'end')
    .text((d) => truncate(shortSituation(d), 24))

  svg.append('text')
    .attr('x', 16)
    .attr('y', height - 10)
    .attr('class', 'chart-note')
    .text('AIHuman is multi-select, so percentages across rows can exceed 100%.')
}
