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

export function togglePinnedCohort(state, label, source) {
  const normalizedSource = source === 'industry' ? 'industry' : 'role'
  const id = `${normalizedSource}:${label}`
  const isPinned = state.pinnedCohorts.some((cohort) => cohort.id === id)
  const pinnedCohorts = isPinned
    ? state.pinnedCohorts.filter((cohort) => cohort.id !== id)
    : [...state.pinnedCohorts, { id, source: normalizedSource, label }]

  return { ...state, pinnedCohorts }
}
