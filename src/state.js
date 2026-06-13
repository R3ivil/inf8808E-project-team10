export const INITIAL_STATE = Object.freeze({
  scope: 'Role',                  // global grouping for V1, V3, V6: 'Role' | 'Industry'
  minValidN: 250,                 // global minimum valid n
  v1Metric: 'Trust%',             // V1 second axis: 'Trust%' | 'ComplexConf%'
  v2Tab: 'Profile',               // V2 small-multiple set: 'Profile' | 'Work context'
  v2Sort: 'source',               // V2 row order: 'source' | 'AnyUser%' | 'Frequent%' | 'NonUser%'
  v3SortMetric: 'Adoption',       // V3 sort metric
  v5Grouping: 'Trust',            // V5 columns: 'Trust' | 'Confidence' | 'Adoption'
  v6MaxRows: 12,                  // V6 row cap
  pinnedCohorts: [],              // [{ id, source: 'role' | 'industry', label }]
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
