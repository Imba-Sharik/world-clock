const { app } = require('electron')
const fs = require('fs')
const path = require('path')

const configPath = path.join(app.getPath('userData'), 'clock-config.json')

const defaults = {
  lang: 'en',
  cities: [
    { name: 'МСК', label: 'МСК', enLabel: 'MSK', ru: 'Москва', en: 'Moscow',  timezone: 'Europe/Moscow' },
    { name: 'ЯКТ', label: 'ЯКТ', enLabel: 'YKT', ru: 'Якутск', en: 'Yakutsk', timezone: 'Asia/Yakutsk' }
  ]
}

function load() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaults))
}

function save(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

module.exports = { load, save }
