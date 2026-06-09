import * as d3 from 'd3'
export const AI_SELECT_ORDER = [
  'Yes, I use AI tools daily',
  'Yes, I use AI tools weekly',
  'Yes, I use AI tools monthly or infrequently',
  'No, but I plan to soon',
  'No, and I don\'t plan to',
]

export const PROFILE_VARS = ['Age', 'DevType', 'RemoteWork', 'OrgSize', 'YearsCode']

export function summarizeAdoption(data, profileVar) {
  
  const clean = data.filter(d => d[profileVar] && d.AISelect && d.AISelect !== 'NA')

  const groups = d3.group(clean, d => d[profileVar])

  const result = []

  groups.forEach((rows, groupKey) => {
    const total = rows.length
    const counts = d3.rollup(rows, v => v.length, d => d.AISelect)

    const row = { group: groupKey, total }
    AI_SELECT_ORDER.forEach(cat => {
      row[cat] = counts.get(cat) ?? 0
      row[cat + '_pct'] = ((row[cat] / total) * 100).toFixed(1)
    })
    result.push(row)
  })

  result.sort((a, b) => b[AI_SELECT_ORDER[0]] / b.total - a[AI_SELECT_ORDER[0]] / a.total)

  return result
}