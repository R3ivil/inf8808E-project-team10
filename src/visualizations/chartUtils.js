import * as d3 from 'd3'

export const BLUE = '#2f6f9f'
export const ORANGE = '#d98b35'
export const GREEN = '#3c9560'
export const PURPLE = '#7c6bb1'
export const GRID = '#d8dee8'
export const TEXT = '#1f2937'
export const MUTED = '#64748b'

export const ADOPTION_COLORS = {
  'Frequent%': '#2f6f9f',
  'Daily%': '#2f6f9f',
  'Weekly%': '#2f6f9f',
  'Monthly%': '#72a9ca',
  'Planned%': '#d9b43f',
  'NonUser%': '#aeb6bf',
}

export const ADOPTION_LABELS = {
  'Frequent%': 'Uses AI frequently',
  'Daily%': 'Daily',
  'Weekly%': 'Weekly',
  'Monthly%': 'Uses AI sometimes',
  'Planned%': 'Plans to use',
  'NonUser%': 'Does not use / no plan',
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

export function displayGroup(value) {
  return String(value)
    .replace(/^Dev: /, '')
    .replace('Hybrid (some remote, some in-person)', 'Hybrid')
    .replace('Hybrid, remote-leaning', 'Hybrid remote')
    .replace('Hybrid, office-leaning', 'Hybrid office')
    .replace('People manager', 'Manager')
    .replace('Individual contributor', 'Contributor')
    .replace('Just me - I am a freelancer, sole proprietor, etc.', 'Solo')
    .replace('Less than 20 employees', '<20')
    .replace('20 to 99 employees', '20-99')
    .replace('100 to 499 employees', '100-499')
    .replace('500 to 999 employees', '500-999')
    .replace('1,000 to 4,999 employees', '1k-4,999')
    .replace('5,000 to 9,999 employees', '5k-9,999')
    .replace('10,000 or more employees', '10k+')
    .replace('Neither trust nor distrust', 'Neutral / mixed')
    .replace('Somewhat trust', 'Trusts AI')
    .replace('Highly trust', 'Trusts AI')
    .replace('Somewhat distrust', 'Distrusts AI')
    .replace('Highly distrust', 'Distrusts AI')
}

export function contrastText(value, threshold = 10) {
  return Math.abs(toNumber(value)) >= threshold ? '#ffffff' : '#0f172a'
}

export function sequentialContrastText(value, threshold = 58) {
  return toNumber(value) >= threshold ? '#ffffff' : '#0f172a'
}

export function shortSituation(value) {
  const normalized = String(value).replaceAll('’', "'").replaceAll('‘', "'")
  const labels = {
    "When I don't trust AI's answers": 'Do not trust answer',
    'When I have ethical or security concerns about code': 'Ethics/security',
    'When I want to fully understand something': 'Need to understand',
    'When I want to learn best practices': 'Learn best practices',
    "When I'm stuck and can't explain the problem": 'Stuck / unclear problem',
    'When I need help fixing complex or unfamiliar code': 'Complex unfamiliar code',
    'When I want to compare different solutions': 'Compare solutions',
    'When I need quick help troubleshooting': 'Quick troubleshooting',
  }
  return labels[normalized] ?? String(value)
}

export function shortFrustration(value) {
  const normalized = String(value).replaceAll('’', "'").replaceAll('‘', "'")
  const labels = {
    'AI solutions that are almost right, but not quite': 'Almost right output',
    'Debugging AI-generated code is more time-consuming': 'Debugging takes longer',
    "I don't use AI tools regularly": 'Does not use regularly',
    "I haven't encountered any problems": 'No problems',
    "It's hard to understand how or why the code works": 'Hard to understand',
    "I've become less confident in my own problem-solving": 'Less confidence',
    'Other (write in):': 'Other (write in)',
  }
  return labels[normalized] ?? String(value)
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

export function applyPinnedMark(selection, isPinnedFn) {
  selection.classed('pinned-mark', (d) => Boolean(isPinnedFn(d)))
}

export function addPinLabelAffordance(selection, { isPinned, label, display, max = 31 }) {
  const normalText = (d) => truncate(display(d), max)
  const actionText = (d) => truncate(`${isPinned(d) ? 'Unpin' : 'Pin'}: ${display(d)}`, max)

  selection
    .classed('pin-label', true)
    .each(function restore(d) {
      d3.select(this).text(normalText(d))
    })
    .on('mouseenter.pinLabel focus.pinLabel', function enter(_event, d) {
      d3.select(this).text(actionText(d))
    })
    .on('mouseleave.pinLabel blur.pinLabel', function leave(_event, d) {
      d3.select(this).text(normalText(d))
    })
    .attr('aria-label', (d) => (isPinned(d) ? `Unpin ${label(d)}` : `Pin ${label(d)}`))
}
