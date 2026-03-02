const { ipcRenderer } = require('electron')

window.addEventListener('contextmenu', e => {
  e.preventDefault()
  ipcRenderer.send('show-context-menu', { x: e.screenX, y: e.screenY })
})

function formatTime(timezone) {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function cityLabel(c, lang) {
  return lang === 'ru' ? (c.label || c.enLabel || c.name) : (c.enLabel || c.label || c.name)
}

function renderCities(cities, lang) {
  const wrapper = document.getElementById('clockWrapper')
  wrapper.innerHTML = cities.map((c, i) => `
    ${i > 0 ? '<div class="divider"></div>' : ''}
    <div class="block">
      <span class="city">${cityLabel(c, lang)}</span>
      <span class="time" data-tz="${c.timezone}">--:--</span>
    </div>
  `).join('')
}

function updateTimes() {
  document.querySelectorAll('.time[data-tz]').forEach(el => {
    el.textContent = formatTime(el.dataset.tz)
  })
}

let config = { cities: [], lang: 'en' }

ipcRenderer.invoke('config-get').then(cfg => {
  config = cfg
  renderCities(config.cities, config.lang)
  updateTimes()
})

ipcRenderer.on('config-updated', (event, cfg) => {
  config = cfg
  renderCities(config.cities, config.lang)
  updateTimes()
})

setInterval(updateTimes, 1000)
