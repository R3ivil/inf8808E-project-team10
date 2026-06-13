const MIN_N_OPTIONS = [
  { value: 150, label: 'Min valid n: 150' },
  { value: 250, label: 'Min valid n: 250' },
  { value: 500, label: 'Min valid n: 500' },
  { value: 1000, label: 'Min valid n: 1,000' },
]

export function mountGlobalControls(container, store) {
  if (!container) return
  container.replaceChildren()

  const scopeGroup = document.createElement('div')
  scopeGroup.className = 'control-group'

  const scopeLabel = document.createElement('label')
  scopeLabel.textContent = 'Scope'
  scopeGroup.appendChild(scopeLabel)

  const toggle = document.createElement('div')
  toggle.className = 'scope-toggle'
  toggle.setAttribute('role', 'group')
  toggle.setAttribute('aria-label', 'Population scope')

  const roleBtn = document.createElement('button')
  roleBtn.type = 'button'
  roleBtn.dataset.scope = 'Role'
  roleBtn.textContent = 'Role'

  const industryBtn = document.createElement('button')
  industryBtn.type = 'button'
  industryBtn.dataset.scope = 'Industry'
  industryBtn.textContent = 'Industry'

  toggle.appendChild(roleBtn)
  toggle.appendChild(industryBtn)
  scopeGroup.appendChild(toggle)
  container.appendChild(scopeGroup)

  const minGroup = document.createElement('div')
  minGroup.className = 'control-group'

  const minLabel = document.createElement('label')
  minLabel.htmlFor = 'min-valid-n'
  minLabel.textContent = 'Min valid n'
  minGroup.appendChild(minLabel)

  const minSelect = document.createElement('select')
  minSelect.id = 'min-valid-n'
  MIN_N_OPTIONS.forEach((option) => {
    const opt = document.createElement('option')
    opt.value = String(option.value)
    opt.textContent = option.label
    minSelect.appendChild(opt)
  })
  minGroup.appendChild(minSelect)
  container.appendChild(minGroup)

  const resetBtn = document.createElement('button')
  resetBtn.type = 'button'
  resetBtn.className = 'small-button'
  resetBtn.textContent = 'Reset all'
  container.appendChild(resetBtn)

  const summary = document.createElement('p')
  summary.className = 'summary-text'
  container.appendChild(summary)

  function render() {
    const { scope, minValidN, pinnedCohorts } = store.getState()
    roleBtn.classList.toggle('active', scope === 'Role')
    industryBtn.classList.toggle('active', scope === 'Industry')
    if (String(minValidN) !== minSelect.value) minSelect.value = String(minValidN)
    summary.textContent = pinnedCohorts.length
      ? `${pinnedCohorts.length} cohort${pinnedCohorts.length === 1 ? '' : 's'} pinned across charts.`
      : 'Pin a cohort to compare it across V1, V3, and V6.'
  }

  roleBtn.addEventListener('click', () => store.setState({ scope: 'Role' }))
  industryBtn.addEventListener('click', () => store.setState({ scope: 'Industry' }))
  minSelect.addEventListener('change', () => store.setState({ minValidN: Number(minSelect.value) }))
  resetBtn.addEventListener('click', () => store.reset())

  render()
  store.subscribe(render)
}
