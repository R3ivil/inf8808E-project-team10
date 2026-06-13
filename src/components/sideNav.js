const SECTIONS = [
  { id: 'v1', label: 'V1 - Adoption vs trust' },
  { id: 'v2', label: 'V2 - Adoption mix' },
  { id: 'v6', label: 'V6 - Agent readiness' },
  { id: 'v3', label: 'V3 - Perception baseline' },
  { id: 'v4', label: 'V4 - Frustrations' },
  { id: 'v5', label: 'V5 - Human help' },
]

export function mountSideNav(container) {
  if (!container) return
  container.replaceChildren()

  const title = document.createElement('h2')
  title.className = 'side-nav-title'
  title.textContent = 'Sections'
  container.appendChild(title)

  const list = document.createElement('ul')
  list.className = 'side-nav-list'
  container.appendChild(list)

  const linkByHash = new Map()
  SECTIONS.forEach((section) => {
    const li = document.createElement('li')
    const a = document.createElement('a')
    a.href = `#${section.id}`
    a.className = 'side-nav-link'
    a.textContent = section.label
    a.dataset.section = section.id
    li.appendChild(a)
    list.appendChild(li)
    linkByHash.set(section.id, a)
  })

  const setActive = (id) => {
    linkByHash.forEach((link, key) => {
      link.classList.toggle('active', key === id)
    })
  }

  const targets = SECTIONS
    .map((section) => document.getElementById(section.id))
    .filter(Boolean)

  if (!targets.length) return

  let ticking = false
  const updateActive = () => {
    ticking = false
    const controlsBottom = document.getElementById('global-controls')?.getBoundingClientRect().bottom ?? 0
    const activationLine = Math.max(controlsBottom + 72, window.innerHeight * 0.36)
    let active = targets[0]

    targets.forEach((target) => {
      if (target.getBoundingClientRect().top <= activationLine) {
        active = target
      }
    })
    setActive(active.id)
  }

  const requestUpdate = () => {
    if (ticking) return
    ticking = true
    window.requestAnimationFrame(updateActive)
  }

  updateActive()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate)
  window.addEventListener('hashchange', requestUpdate)
}
