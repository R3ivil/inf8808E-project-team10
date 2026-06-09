import * as d3 from 'd3'

Promise.all([
  d3.csv('/data/results.csv'),
  d3.csv('/data/schema.csv')
]).then(([results, schema]) => {
  console.log('Respondents:', results.length)
  console.log('First row:', results[0])
  console.log('Schema:', schema.slice(0, 5))
})