import * as d3 from 'd3'
import { AI_SELECT_ORDER } from './preprocess.js'

const COLORS = {
  'Yes, I use AI tools daily': '#4C9BE8',
  'Yes, I use AI tools weekly': '#7BC4F5',
  'Yes, I use AI tools monthly or infrequently': '#B8DFF9',
  'No, but I plan to soon': '#F5C842',
  "No, and I don't plan to": '#E87B4C',
}

export function drawAdoptionChart(data, containerId) {
  const container = document.getElementById(containerId)
  container.innerHTML = ''

  const margin = { top: 20, right: 200, bottom: 40, left: 180 }
  const width = container.clientWidth - margin.left - margin.right
  const rowHeight = 40
  const height = data.length * rowHeight

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3.scaleLinear().domain([0, 100]).range([0, width])
  const y = d3.scaleBand().domain(data.map(d => d.group)).range([0, height]).padding(0.3)

  // Axes
  svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d + '%'))
  svg.append('g').call(d3.axisLeft(y))

  // Stacked bars
  data.forEach(row => {
    let xOffset = 0
    AI_SELECT_ORDER.forEach(cat => {
      const pct = parseFloat(row[cat + '_pct']) || 0
      const barWidth = x(pct)

      svg.append('rect')
        .attr('x', xOffset)
        .attr('y', y(row.group))
        .attr('width', barWidth)
        .attr('height', y.bandwidth())
        .attr('fill', COLORS[cat])
        .on('mouseover', function(event) {
          d3.select('#tooltip')
            .style('display', 'block')
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 20 + 'px')
            .html(`<strong>${row.group}</strong><br>${cat}<br>${pct}% (n=${row[cat].toLocaleString()})`)
        })
        .on('mouseout', () => d3.select('#tooltip').style('display', 'none'))

      xOffset += barWidth
    })
  })

  const legend = svg.append('g').attr('transform', `translate(${width + 10}, 0)`)
  AI_SELECT_ORDER.forEach((cat, i) => {
    const g = legend.append('g').attr('transform', `translate(0, ${i * 22})`)
    g.append('rect').attr('width', 14).attr('height', 14).attr('fill', COLORS[cat])
    g.append('text').attr('x', 18).attr('y', 11).attr('font-size', '11px').attr('fill', '#ccc').text(cat.replace('Yes, I use AI tools ', '').replace('No, ', 'No, '))
  })
}