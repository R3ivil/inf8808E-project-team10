import * as d3 from 'd3'

export const BLUE = '#2563eb'
export const ORANGE = '#d97706'
export const TEAL = '#0f766e'
export const PURPLE = '#7c3aed'
export const GRID = '#d8dee8'
export const TEXT = '#1f2937'
export const MUTED = '#64748b'

export const ADOPTION_COLORS = {
  'Daily%': '#1d4ed8',
  'Weekly%': '#3b82f6',
  'Monthly%': '#93c5fd',
  'Planned%': '#f59e0b',
  'NonUser%': '#94a3b8',
}

export const ADOPTION_LABELS = {
  'Daily%': 'Daily',
  'Weekly%': 'Weekly',
  'Monthly%': 'Monthly or infrequent',
  'Planned%': 'Plans to use',
  'NonUser%': 'Does not plan',
}

export function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function clear(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root) throw new Error('Container not found')
  root.replaceChildren()
  return root
}

export function makeSvg(root, width, height, title, desc) {
  const svg = d3.select(root)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', title)

  svg.append('title').text(title)
  svg.append('desc').text(desc)
  return svg
}

export function formatPct(value, digits = 1) {
  return `${toNumber(value).toFixed(digits)}%`
}

export function truncate(value, max = 32) {
  const text = String(value)
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

export function showTooltip(event, html) {
  const target = event.currentTarget
  const rect = target?.getBoundingClientRect?.()
  const hasPointerPosition = Number.isFinite(event.pageX) && Number.isFinite(event.pageY) && event.type !== 'focus'
  const left = hasPointerPosition ? event.pageX + 12 : (rect ? rect.left + window.scrollX + rect.width + 10 : 16)
  const top = hasPointerPosition ? event.pageY + 12 : (rect ? rect.top + window.scrollY - 6 : window.scrollY + 16)

  d3.select('#tooltip')
    .style('display', 'block')
    .style('left', `${left}px`)
    .style('top', `${top}px`)
    .html(html)
}

export function hideTooltip() {
  d3.select('#tooltip').style('display', 'none')
}

export function addXAxis(g, scale, y, width, label) {
  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${y})`)
    .call(d3.axisBottom(scale).ticks(5).tickFormat((d) => `${d}%`))
    .call((axis) => axis.select('.domain').remove())

  g.append('text')
    .attr('x', width)
    .attr('y', y + 42)
    .attr('text-anchor', 'end')
    .attr('class', 'axis-label')
    .text(label)
}

export function addVerticalGrid(g, scale, height) {
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisTop(scale).ticks(5).tickSize(-height).tickFormat(''))
    .call((axis) => axis.select('.domain').remove())
}

export function addLegend(root, items) {
  const legend = d3.select(root).append('div').attr('class', 'legend')
  items.forEach((item) => {
    const node = legend.append('span').attr('class', 'legend-item')
    node.append('span')
      .attr('class', 'legend-swatch')
      .style('background', item.color)
    node.append('span').text(item.label)
  })
}

export function markInteractive(selection, label) {
  selection
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', label)
}
