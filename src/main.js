import * as d3 from 'd3'

const VARIABLES = [
  'ResponseId', 'MainBranch', 'Age', 'EdLevel', 'Employment',
  'YearsCode', 'WorkExp', 'DevType', 'OrgSize', 'ICorPM',
  'RemoteWork', 'Industry', 'AISelect', 'AISent', 'AIAcc',
  'AIComplex', 'AIThreat', 'AIFrustration', 'AIAgents',
  'AIAgentChange', 'AIHuman', 'SOFriction'
]

Promise.all([
  d3.csv('/data/results.csv'),
  d3.csv('/data/schema.csv')
]).then(([results, schema]) => {
  
  const data = results.map(row => {
    const filtered = {}
    VARIABLES.forEach(v => { filtered[v] = row[v] })
    return filtered
  })

  console.log('Respondents:', data.length)
  console.log('First row:', data[0])
  console.log('Variables:', Object.keys(data[0]))
})