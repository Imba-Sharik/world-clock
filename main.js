const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain } = require('electron')
const path = require('path')
const cfg = require('./config')
const i18n = require('./i18n')

let mainWindow = null
let settingsWindow = null
let tray = null
let config = cfg.load()

function createWindow() {
  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize
  const screenHeight = display.bounds.height
  const winWidth = Math.max(160, config.cities.length * 120)

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: 40,
    x: 10,
    y: screenHeight - 44,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
  mainWindow.setAlwaysOnTop(true, 'pop-up-menu')
  mainWindow.on('system-context-menu', e => e.preventDefault())

  mainWindow.on('closed', () => { mainWindow = null })
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  const t = i18n[config.lang] || i18n.en
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 580,
    title: t.window.title,
    frame: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  settingsWindow.loadFile('settings.html')
  settingsWindow.setMenuBarVisibility(false)
  settingsWindow.on('closed', () => { settingsWindow = null })
}

function buildTrayIcon() {
  const size = 16
  const pixels = Buffer.alloc(size * size * 4, 0)
  const cx = 7, cy = 7, r = 7

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4

      if (dist <= r) {
        pixels[i] = 20; pixels[i + 1] = 30; pixels[i + 2] = 60; pixels[i + 3] = 240
      }
      if (dist > r - 1.5 && dist <= r) {
        pixels[i] = 220; pixels[i + 1] = 220; pixels[i + 2] = 255; pixels[i + 3] = 255
      }
      if (dist < r - 1 && Math.abs(dx) <= 0.8 && dy <= 0) {
        pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255
      }
      if (dist < r - 1 && dy >= -0.8 && dy <= 0.8 && dx >= 0) {
        pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255
      }
    }
  }

  return nativeImage.createFromBuffer(pixels, { width: size, height: size })
}

function buildTrayMenu() {
  const t = i18n[config.lang] || i18n.en
  return Menu.buildFromTemplate([
    {
      label: t.tray.showHide,
      click: () => {
        if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
      }
    },
    { label: t.tray.settings, click: () => openSettings() },
    { type: 'separator' },
    { label: t.tray.exit, click: () => app.quit() }
  ])
}

function createTray() {
  const icon = buildTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('World Clock')
  tray.setContextMenu(buildTrayMenu())
  tray.on('double-click', () => openSettings())
}

function reloadWidget() {
  if (!mainWindow) return
  config = cfg.load()
  const winWidth = Math.max(160, config.cities.length * 120)
  const [currentX, currentY] = mainWindow.getPosition()
  const [currentWidth] = mainWindow.getSize()
  // Anchor right edge: left edge moves, right stays fixed
  const newX = currentX + (currentWidth - winWidth)
  mainWindow.setBounds({ x: newX, y: currentY, width: winWidth, height: 40 })
  mainWindow.webContents.send('config-updated', config)
}

// IPC
ipcMain.on('show-context-menu', (_event, pos) => {
  const t = i18n[config.lang] || i18n.en
  const menu = Menu.buildFromTemplate([
    { label: t.menu.settings, click: () => openSettings() },
    { type: 'separator' },
    { label: t.menu.exit, click: () => app.quit() }
  ])
  menu.popup({ x: pos.x, y: pos.y })
})

ipcMain.handle('config-get', () => config)

ipcMain.on('config-update', (event, newConfig) => {
  config = newConfig
  cfg.save(config)
  reloadWidget()
  if (tray) tray.setContextMenu(buildTrayMenu())
  if (settingsWindow) {
    const t = i18n[config.lang] || i18n.en
    settingsWindow.setTitle(t.window.title)
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  // Periodically restore always-on-top in case Windows resets it
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'pop-up-menu')
    }
  }, 1000)
})

app.on('window-all-closed', (e) => e.preventDefault())
app.on('before-quit', () => { if (tray) tray.destroy() })
