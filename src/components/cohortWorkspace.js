import { cohortId } from '../state.js'

function makeChip(cohort, onUnpin) {
  const li = document.createElement('li')
  li.className = 'cohort-chip'
  li.dataset.id = cohort.id

  const source = document.createElement('span')
  source.className = 'cohort-chip-source'
  source.textContent = cohort.source === 'industry' ? 'Industry' : 'Role'
  li.appendChild(source)

  const label = document.createElement('span')
  label.className = 'cohort-chip-label'
  label.textContent = cohort.label
  label.title = cohort.label
  li.appendChild(label)

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'cohort-chip-remove'
  remove.setAttribute('aria-label', `Unpin ${cohort.label}`)
  remove.textContent = '×'
  remove.addEventListener('click', () => onUnpin(cohort))
  li.appendChild(remove)

  return li
}

export function mountCohortWorkspace(container, store) {
  if (!container) return
  container.replaceChildren()

  const title = document.createElement('h2')
  title.className = 'cohort-workspace-title'
  title.textContent = 'Pinned cohorts'
  container.appendChild(title)

  const hint = document.createElement('p')
  hint.className = 'cohort-workspace-hint'
  hint.textContent = 'Pin a cohort in V1, V3, or V6 to compare it across charts.'
  container.appendChild(hint)

  const list = document.createElement('ul')
  list.className = 'cohort-chip-list'
  container.appendChild(list)

  const empty = document.createElement('p')
  empty.className = 'cohort-workspace-empty'
  empty.textContent = 'No cohorts pinned yet.'
  container.appendChild(empty)

  function render() {
    const { pinnedCohorts } = store.getState()
    list.replaceChildren()
    if (!pinnedCohorts.length) {
      empty.style.display = ''
      return
    }
    empty.style.display = 'none'
    pinnedCohorts.forEach((cohort) => {
      const chip = makeChip(cohort, (c) => {
        const state = store.getState()
        store.setState({ pinnedCohorts: state.pinnedCohorts.filter((existing) => existing.id !== c.id) })
      })
      list.appendChild(chip)
    })
  }

  render()
  store.subscribe(render)
  return { cohortId }
}
