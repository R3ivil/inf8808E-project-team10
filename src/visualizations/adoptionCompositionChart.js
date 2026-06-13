import * as d3 from 'd3'
import {
  ADOPTION_COLORS,
  ADOPTION_LABELS,
  addLegend,
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

const STACK_KEYS = ['Frequent%', 'Monthly%', 'Planned%', 'NonUser%']

function panelSource(title) {
  return title === 'Role' ? 'role' : null
}

function preparedRows(rows, maxRows, sortBy, pinnedLabels = new Set()) {
  const prepared = rows
    .filter((d) => toNumber(d.n_AISelect) >= 150)
    .map((d) => ({
      ...d,
      'Frequent%': toNumber(d['Daily%']) + toNumber(d['Weekly%']),
    }))
  const sorted = sortBy === 'source'
    ? prepared
    : prepared.slice().sort((a, b) => toNumber(b[sortBy]) - toNumber(a[sortBy]))
  const pinnedRows = sorted.filter((d) => pinnedLabels.has(d.group))
  const candidates = sorted.filter((d) => !pinnedLabels.has(d.group))
  return [...pinnedRows, ...candidates].slice(0, maxRows)
}

export function renderAdoptionCompositionChart(container, panels, options = {}) {
  const root = clear(container)
  const panelEntries = Array.isArray(panels)
    ? [{ title: options.title ?? 'Adoption', rows: panels }]
    : Object.entries(panels).map(([title, rows]) => ({ title, rows }))

  addLegend(root, STACK_KEYS.map((key) => ({ label: ADOPTION_LABELS[key], color: ADOPTION_COLORS[key] })))

  const margin = { top: 78, right: 20, bottom: 70, left: 158 }
  const panelWidth = 265
  const panelGapX = 78
  const panelGapY = 86
  const rowHeight = 40
  const maxRows = Math.max(...panelEntries.map((panel) => Math.min(options.maxRows ?? 5, panel.rows.length)))
  const panelHeight = maxRows * rowHeight
  const width = margin.left + margin.right + panelWidth * 2 + panelGapX
  const height = margin.top + margin.bottom + panelHeight * 2 + panelGapY
  const svg = makeSvg(root, width, height, 'AI adoption composition across selected groupings', 'Small multiples repeat the same 100 percent scale for profile and work-context groups.')

  svg.append('text')
    .attr('x', 16)
    .attr('y', 28)
    .attr('class', 'chart-title')
    .text('AI adoption composition across selected groupings')
  svg.append('text')
    .attr('x', 16)
    .attr('y', 52)
    .attr('class', 'chart-note')
    .text('Each panel repeats the same 100% scale and AI-use order.')

  panelEntries.forEach((panel, index) => {
    const source = panelSource(panel.title)
    const pinnedLabels = source
      ? new Set((options.state?.pinnedCohorts ?? []).filter((c) => c.source === source).map((c) => c.label))
      : new Set()
    const col = index % 2
    const row = Math.floor(index / 2)
    const rows = preparedRows(panel.rows, options.maxRows ?? 5, options.sortBy ?? 'source', pinnedLabels)
    const x0 = margin.left + col * (panelWidth + panelGapX)
    const y0 = margin.top + row * (panelHeight + panelGapY)
    const g = svg.append('g').attr('transform', `translate(${x0},${y0})`)
    const x = d3.scaleLinear().domain([0, 100]).range([0, panelWidth])
    const y = d3.scaleBand().domain(rows.map((d) => d.group)).range([0, panelHeight]).padding(0.28)

    g.append('text')
      .attr('x', 0)
      .attr('y', -12)
      .attr('class', 'chart-subtitle')
      .text(panel.title)

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisTop(x).ticks(5).tickSize(-panelHeight).tickFormat(''))
      .call((axis) => axis.select('.domain').remove())

    const yAxis = g.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(y).tickSize(0).tickPadding(12).tickFormat((d) => truncate(displayGroup(d), 24)))
      .call((axis) => axis.select('.domain').remove())

    if (source) {
      const labels = yAxis.selectAll('text')
        .attr('class', (d) => `cohort-label${pinnedLabels.has(d) ? ' pinned-mark' : ''}`)
        .style('cursor', 'pointer')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', (d) => (pinnedLabels.has(d) ? `Unpin ${d}` : `Pin ${d}`))
        .on('click', (_event, d) => {
          options.store?.setState((s) => ({ ...s, pinnedCohorts: togglePinned(s.pinnedCohorts, d, source) }))
        })
        .on('keydown', (event, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            options.store?.setState((s) => ({ ...s, pinnedCohorts: togglePinned(s.pinnedCohorts, d, source) }))
          }
        })
      applyPinnedMark(labels, (d) => pinnedLabels.has(d))
      addPinLabelAffordance(labels, {
        label: (d) => d,
        display: displayGroup,
        isPinned: (d) => pinnedLabels.has(d),
        max: 24,
      })
    }

    g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${panelHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}`))
      .call((axis) => axis.select('.domain').remove())

    rows.forEach((rowData) => {
      let start = 0
      STACK_KEYS.forEach((key) => {
        const value = toNumber(rowData[key])
        const rect = g.append('rect')
          .attr('x', x(start))
          .attr('y', y(rowData.group))
          .attr('width', Math.max(0, x(start + value) - x(start)))
          .attr('height', y.bandwidth())
          .attr('fill', ADOPTION_COLORS[key])
          .on('mousemove focus', (event) => showTooltip(event, `
            <strong>${panel.title}: ${displayGroup(rowData.group)}</strong><br>
            ${ADOPTION_LABELS[key]}: ${formatPct(value)}<br>
            Valid AISelect n: ${Number(rowData.n_AISelect).toLocaleString()}<br>
            Missing / NA: ${Number(rowData.missing_AISelect).toLocaleString()}
          `))
          .on('mouseleave blur', hideTooltip)
        markInteractive(rect, `${panel.title}, ${rowData.group}, ${ADOPTION_LABELS[key]} ${formatPct(value)}`)
        applyPinnedMark(rect, () => pinnedLabels.has(rowData.group))

        if ((key === 'Frequent%' || key === 'Monthly%' || key === 'NonUser%') && value >= 11) {
          g.append('text')
            .attr('class', 'stack-label')
            .attr('x', x(start + value / 2))
            .attr('y', y(rowData.group) + y.bandwidth() / 2 + 4)
            .text(formatPct(value, 0))
        }
        start += value
      })
    })
  })
}

function togglePinned(list, label, source) {
  const id = `${source === 'industry' ? 'industry' : 'role'}:${label}`
  const exists = list.some((c) => c.id === id)
  if (exists) return list.filter((c) => c.id !== id)
  return [...list, { id, source: source === 'industry' ? 'industry' : 'role', label }]
}
