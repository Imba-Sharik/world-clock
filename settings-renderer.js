const { ipcRenderer } = require('electron')
const CITIES = require('./cities-db')
const i18n = require('./i18n')

let config = { cities: [], lang: 'en' }
let activeIndex = -1
let filtered = []

function t() { return i18n[config.lang] || i18n.en }

function cityName(c) {
  return config.lang === 'ru' ? (c.ru || c.en || c.label) : (c.en || c.ru || c.label)
}

function cityLabel(c) {
  return config.lang === 'ru' ? (c.label || c.enLabel) : (c.enLabel || c.label)
}

// --- Apply language to static UI ---
function applyLang() {
  const ui = t().ui
  document.getElementById('hCities').textContent   = ui.cities
  document.getElementById('hAdd').textContent      = ui.add
  document.getElementById('hLang').textContent     = ui.lang
  document.getElementById('hint').textContent      = ui.hint
  document.getElementById('searchInput').placeholder = ui.placeholder

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === config.lang)
  })
}

// --- City list ---
function renderList() {
  const el = document.getElementById('cityList')
  if (!config.cities.length) {
    el.innerHTML = `<div class="empty">${t().ui.empty}</div>`
    return
  }
  el.innerHTML = config.cities.map((c, i) => `
    <div class="city-row">
      <div class="city-row-left">
        <span class="city-badge">${cityLabel(c)}</span>
        <div>
          <div class="city-name">${cityName(c)}</div>
          <div class="city-tz">${c.timezone}</div>
        </div>
      </div>
      <button class="btn-remove" data-i="${i}">×</button>
    </div>
  `).join('')

  el.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      config.cities.splice(Number(btn.dataset.i), 1)
      save()
      renderList()
    })
  })
}

function save() {
  ipcRenderer.send('config-update', config)
}

// --- Search ---
const searchInput = document.getElementById('searchInput')
const suggestionsEl = document.getElementById('suggestions')

function nowIn(timezone) {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false
  })
}

function search(query) {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return CITIES.filter(c =>
    c.ru.toLowerCase().includes(q) || c.en.toLowerCase().includes(q)
  ).slice(0, 5)
}

function renderSuggestions() {
  if (!filtered.length) {
    suggestionsEl.style.display = 'none'
    return
  }

  suggestionsEl.style.display = 'block'
  suggestionsEl.innerHTML = filtered.map((c, i) => `
    <div class="suggestion ${i === activeIndex ? 'active' : ''}" data-i="${i}">
      <div class="suggestion-left">
        <span class="suggestion-badge">${cityLabel(c)}</span>
        <div>
          <div class="suggestion-name">${cityName(c)}</div>
          <div class="suggestion-en">${config.lang === 'ru' ? c.en : c.ru}</div>
        </div>
      </div>
      <span class="suggestion-time">${nowIn(c.timezone)}</span>
    </div>
  `).join('')

  suggestionsEl.querySelectorAll('.suggestion').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault()
      addCity(filtered[Number(el.dataset.i)])
    })
  })
}

function addCity(city) {
  const already = config.cities.find(c => c.timezone === city.timezone && c.label === city.label)
  if (!already) {
    config.cities.push({
      name: city.label, label: city.label, enLabel: city.enLabel,
      ru: city.ru, en: city.en,
      timezone: city.timezone
    })
    save()
    renderList()
  }
  searchInput.value = ''
  filtered = []
  activeIndex = -1
  suggestionsEl.style.display = 'none'
  searchInput.focus()
}

searchInput.addEventListener('input', () => {
  activeIndex = -1
  filtered = search(searchInput.value)
  renderSuggestions()
})

searchInput.addEventListener('keydown', e => {
  if (!filtered.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex = Math.min(activeIndex + 1, filtered.length - 1)
    renderSuggestions()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex = Math.max(activeIndex - 1, 0)
    renderSuggestions()
  } else if (e.key === 'Enter' && activeIndex >= 0) {
    e.preventDefault()
    addCity(filtered[activeIndex])
  } else if (e.key === 'Escape') {
    filtered = []
    activeIndex = -1
    suggestionsEl.style.display = 'none'
  }
})

searchInput.addEventListener('blur', () => {
  setTimeout(() => { suggestionsEl.style.display = 'none' }, 150)
})

// --- Language toggle ---
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.lang === config.lang) return
    config.lang = btn.dataset.lang
    save()
    applyLang()
    renderList()
    if (filtered.length) renderSuggestions()
  })
})

// --- Init ---
ipcRenderer.invoke('config-get').then(cfg => {
  config = {
    lang: cfg.lang || 'en',
    cities: cfg.cities.map(c => {
      const found = CITIES.find(d => d.timezone === c.timezone && (d.ru === c.ru || d.label === c.label))
      return {
        ...c,
        ru:      c.ru      || (found && found.ru)      || c.name,
        en:      c.en      || (found && found.en)      || c.label || c.name,
        label:   c.label   || c.name,
        enLabel: c.enLabel || (found && found.enLabel) || c.label || c.name
      }
    })
  }
  applyLang()
  renderList()
})
