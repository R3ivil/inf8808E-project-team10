export const INITIAL_STATE = Object.freeze({
  scope: 'Role',                 
  minValidN: 250,                 
  v1Metric: 'Trust%',          
  v2Tab: 'Profile',             
  v2Sort: 'source',             
  v3SortMetric: 'Adoption',     
  v5Grouping: 'Trust',            
  v6MaxRows: 12,                  
  pinnedCohorts: [],              
})

export function createStore(initial = INITIAL_STATE) {
  let state = { ...initial }
  const listeners = new Set()

  function getState() {
    return state
  }

  function setState(patch) {
    const prev = state
    const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
    if (next === prev) return
    state = next
    listeners.forEach((fn) => {
      try {
        fn(next, prev)
      } catch (error) {
        console.error('state listener failed', error)
      }
    })
  }

  function subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  function reset() {
    setState({ ...INITIAL_STATE, pinnedCohorts: [] })
  }

  return { getState, setState, subscribe, reset }
}

export function cohortId(label, source) {
  return `${source === 'industry' ? 'industry' : 'role'}:${label}`
}

export function isPinned(state, label, source) {
  const id = cohortId(label, source)
  return state.pinnedCohorts.some((c) => c.id === id)
}

export function togglePin(state, label, source) {
  const id = cohortId(label, source)
  const current = state.pinnedCohorts
  const exists = current.some((c) => c.id === id)
  const next = exists
    ? current.filter((c) => c.id !== id)
    : [...current, { id, source: source === 'industry' ? 'industry' : 'role', label }]
  return { ...state, pinnedCohorts: next }
}
