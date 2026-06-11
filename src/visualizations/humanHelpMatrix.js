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

const DEFAULT_ORDER = ['Highly distrust', 'Somewhat distrust', 'Neither trust nor distrust', 'Somewhat trust', 'Highly trust']
const SITUATIONS = [
  "When I don’t trust AI’s answers",
  'When I have ethical or security concerns about code',
  'When I want to fully understand something',
  'When I want to learn best practices',
  'When I need help fixing complex or unfamiliar code',
  'When I’m stuck and can’t explain the problem',
  'When I want to compare different solutions',
]

export function renderHumanHelpMatrix(container, data, options = {}) {
  const root = clear(container)
  const order = options.order ?? DEFAULT_ORDER
  const rows = data
    .filter((d) => order.includes(d.group))
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
  const cells = SITUATIONS.flatMap((situation) => rows.map((row) => ({
    situation,
    group: row.group,
    value: toNumber(row[situation]),
    n: row.n_resp,
    missing: row.missing_AIHuman,
  })))

  const margin = { top: 72, right: 18, bottom: 24, left: 248 }
  const cellW = Math.max(104, Math.floor(590 / Math.max(1, rows.length)))
  const cellH = 42
  const width = margin.left + margin.right + cellW * rows.length
  const height = margin.top + margin.bottom + cellH * SITUATIONS.length
  const svg = makeSvg(root, width, height, `Human-help situations by ${options.grouping ?? 'trust'} group`, 'A matrix compares situations where developers still prefer human help across selected groups.')
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleBand().domain(rows.map((d) => d.group)).range([0, cellW * rows.length])
  const y = d3.scaleBand().domain(SITUATIONS).range([0, cellH * SITUATIONS.length])
  const color = d3.scaleSequential([18, 86], d3.interpolateBlues)

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
      ${d.situation}: ${formatPct(d.value)}<br>
      Valid n: ${Number(d.n).toLocaleString()}<br>
      Missing / NA: ${Number(d.missing).toLocaleString()}
    `))
    .on('mouseleave blur', hideTooltip)
  markInteractive(rects, (d) => `${d.group}, ${d.situation}, ${formatPct(d.value)}, valid n ${d.n}, missing ${d.missing}`)

  g.selectAll('text.help-value')
    .data(cells)
    .join('text')
    .attr('class', 'matrix-label')
    .attr('x', (d) => x(d.group) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.situation) + y.bandwidth() / 2 + 4)
    .text((d) => formatPct(d.value, 0))

  g.selectAll('text.trust-label')
    .data(rows.map((d) => d.group))
    .join('text')
    .attr('class', 'matrix-x rotated')
    .attr('x', (d) => x(d) + x.bandwidth() / 2)
    .attr('y', -12)
    .attr('text-anchor', 'middle')
    .text((d) => truncate(d, 19))

  g.selectAll('text.situation-label')
    .data(SITUATIONS)
    .join('text')
    .attr('class', 'matrix-y')
    .attr('x', -12)
    .attr('y', (d) => y(d) + y.bandwidth() / 2 + 4)
    .attr('text-anchor', 'end')
    .text((d) => truncate(d, 43))

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 24)
    .attr('class', 'chart-note')
    .text(`Columns grouped by ${options.grouping ?? 'trust'}; AIHuman is multi-select and values do not sum to 100%.`)
}
