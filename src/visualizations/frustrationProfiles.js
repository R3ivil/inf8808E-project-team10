import * as d3 from 'd3'
import {
  BLUE,
  clear,
  formatPct,
  hideTooltip,
  makeSvg,
  markInteractive,
  shortFrustration,
  showTooltip,
  toNumber,
  truncate,
} from './chartUtils.js'

function weightedAverage(rows, key) {
  const total = rows.reduce((sum, row) => sum + toNumber(row.n_resp), 0)
  if (!total) return 0
  return rows.reduce((sum, row) => sum + toNumber(row[key]) * toNumber(row.n_resp), 0) / total
}

function profileRows(data) {
  const daily = data.find((d) => d.group === 'Daily users')
  const weekly = data.find((d) => d.group === 'Weekly users')
  const occasional = data.find((d) => d.group === 'Occasional users')
  const planned = data.find((d) => d.group === 'Planned users')
  const non = data.find((d) => d.group === 'Non-users')
  const keys = Object.keys(daily).filter((key) => !['group', 'n_resp'].includes(key))

  return [
    {
      title: 'Uses AI frequently',
      n: toNumber(daily.n_resp) + toNumber(weekly.n_resp),
      values: Object.fromEntries(keys.map((key) => [key, weightedAverage([daily, weekly], key)])),
    },
    { title: 'Uses AI sometimes', n: toNumber(occasional.n_resp), values: occasional },
    { title: 'Plans to use', n: toNumber(planned.n_resp), values: planned },
    { title: 'Does not use / no plan', n: toNumber(non.n_resp), values: non },
  ]
}

export function renderFrustrationProfiles(container, data) {
  const root = clear(container)
  const profiles = profileRows(data)
  const allKeys = Object.keys(data[0]).filter((key) => !['group', 'n_resp'].includes(key))

  const margin = { top: 86, right: 24, bottom: 58, left: 174 }
  const cardWidth = 304
  const cardHeight = 238
  const gapX = 128
  const gapY = 72
  const width = margin.left + margin.right + cardWidth * 2 + gapX
  const height = margin.top + margin.bottom + cardHeight * 2 + gapY
  const svg = makeSvg(root, width, height, 'AI frustration profile cards', 'Four small lollipop charts show the top AI frustrations by adoption profile.')

  svg.append('text')
    .attr('x', 16)
    .attr('y', 30)
    .attr('class', 'chart-title')
    .text('AI frustration profile cards')
  svg.append('text')
    .attr('x', 16)
    .attr('y', 56)
    .attr('class', 'chart-note')
    .text('Each card uses the same 0-100% scale. Multi-select shares can exceed 100%.')

  profiles.forEach((profile, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x0 = margin.left + col * (cardWidth + gapX)
    const y0 = margin.top + row * (cardHeight + gapY)
    const rows = allKeys
      .map((key) => ({ key, value: toNumber(profile.values[key]) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    const x = d3.scaleLinear().domain([0, 100]).range([0, cardWidth])
    const y = d3.scaleBand().domain(rows.map((d) => d.key)).range([48, cardHeight]).padding(0.34)
    const g = svg.append('g').attr('transform', `translate(${x0},${y0})`)

    g.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('class', 'chart-subtitle')
      .text(profile.title)
    g.append('text')
      .attr('x', 0)
      .attr('y', 24)
      .attr('class', 'chart-subtitle small')
      .text(`valid n=${Number(profile.n).toLocaleString()}`)

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${cardHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-(cardHeight - 48)).tickFormat((d) => `${d}`))
      .call((axis) => axis.select('.domain').remove())

    g.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(y).tickSize(0).tickPadding(14).tickFormat((d) => truncate(shortFrustration(d), 24)))
      .call((axis) => axis.select('.domain').remove())

    g.selectAll('line.lollipop')
      .data(rows)
      .join('line')
      .attr('class', 'gap-line')
      .attr('x1', 0)
      .attr('x2', (d) => x(d.value))
      .attr('y1', (d) => y(d.key) + y.bandwidth() / 2)
      .attr('y2', (d) => y(d.key) + y.bandwidth() / 2)

    const marks = g.selectAll('circle.frustration-dot')
      .data(rows)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.value))
      .attr('cy', (d) => y(d.key) + y.bandwidth() / 2)
      .attr('r', 5)
      .attr('fill', BLUE)
      .on('mousemove focus', (event, d) => showTooltip(event, `
        <strong>${profile.title}</strong><br>
        ${shortFrustration(d.key)}: ${formatPct(d.value)}<br>
        Valid n: ${Number(profile.n).toLocaleString()}
      `))
      .on('mouseleave blur', hideTooltip)
    markInteractive(marks, (d) => `${profile.title}, ${shortFrustration(d.key)}, ${formatPct(d.value)}`)

    g.selectAll('text.value-label')
      .data(rows)
      .join('text')
      .attr('class', 'mark-label')
      .attr('x', (d) => x(d.value) + 6)
      .attr('y', (d) => y(d.key) + y.bandwidth() / 2 + 4)
      .text((d) => formatPct(d.value, 0))
  })
}
