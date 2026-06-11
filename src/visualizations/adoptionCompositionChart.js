import * as d3 from 'd3'
import {
  ADOPTION_COLORS,
  ADOPTION_LABELS,
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

const STACK_KEYS = ['Daily%', 'Weekly%', 'Monthly%', 'Planned%', 'NonUser%']

function sortRows(rows, sortBy) {
  if (sortBy === 'source') return rows
  const key = sortBy ?? 'AnyUser%'
  return rows.slice().sort((a, b) => toNumber(b[key]) - toNumber(a[key]))
}

export function renderAdoptionCompositionChart(container, data, options = {}) {
  const root = clear(container)
  const pinned = options.pinned
  const sorted = sortRows(data.slice(), options.sortBy)
  const limited = sorted.slice(0, options.maxRows ?? 12)
  const pinnedRow = pinned ? data.find((d) => d.group === pinned) : null
  const rows = pinnedRow && !limited.some((d) => d.group === pinned)
    ? [pinnedRow, ...limited.slice(0, Math.max(0, (options.maxRows ?? 12) - 1))]
    : limited

  const margin = { top: 26, right: 56, bottom: 54, left: 194 }
  const rowHeight = 34
  const width = 920
  const height = margin.top + margin.bottom + rows.length * rowHeight
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  addLegend(root, STACK_KEYS.map((key) => ({ label: ADOPTION_LABELS[key], color: ADOPTION_COLORS[key] })))

  const svg = makeSvg(root, width, height, 'AI adoption composition', 'One hundred percent stacked bars show daily, weekly, occasional, planned, and non-use shares.')
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth])
  const y = d3.scaleBand().domain(rows.map((d) => d.group)).range([0, innerHeight]).padding(0.28)

  addVerticalGrid(g, x, innerHeight)
  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickFormat((d) => `${pinned === d ? '★ ' : ''}${truncate(d, 27)}`))
    .call((axis) => axis.select('.domain').remove())
  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`))
    .call((axis) => axis.select('.domain').remove())

  rows.forEach((row) => {
    let start = 0
    STACK_KEYS.forEach((key) => {
      const value = toNumber(row[key])
      const rect = g.append('rect')
        .attr('x', x(start))
        .attr('y', y(row.group))
        .attr('width', Math.max(0, x(start + value) - x(start)))
        .attr('height', y.bandwidth())
        .attr('fill', ADOPTION_COLORS[key])
        .attr('class', pinned === row.group ? 'pinned-mark' : null)
        .on('click keydown', (event) => {
          if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            options.onPin?.(row.group)
          }
        })
        .on('mousemove focus', (event) => showTooltip(event, `
          <strong>${row.group}</strong><br>
          ${ADOPTION_LABELS[key]}: ${formatPct(value)}<br>
          Valid AISelect n: ${Number(row.n_AISelect).toLocaleString()}<br>
          Missing / NA: ${Number(row.missing_AISelect).toLocaleString()}<br>
          Click or press Enter to pin this cohort.
        `))
        .on('mouseleave blur', hideTooltip)
      markInteractive(rect, `${row.group}, ${ADOPTION_LABELS[key]} ${formatPct(value)}, valid n ${row.n_AISelect}, missing ${row.missing_AISelect}. Press Enter to pin.`)
      if (value >= 12) {
        g.append('text')
          .attr('class', 'stack-label')
          .attr('x', x(start + value / 2))
          .attr('y', y(row.group) + y.bandwidth() / 2 + 4)
          .text(formatPct(value, 0))
      }
      start += value
    })
  })

  g.append('text')
    .attr('x', innerWidth)
    .attr('y', innerHeight + 42)
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .text('Share of valid AISelect responses')
}
