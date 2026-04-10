const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#ffffff',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Settings: speichern & laden
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('load-settings', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) {}
  return null;
});

ipcMain.handle('save-settings', (_, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (e) { return false; }
});

// Datei öffnen Dialog
ipcMain.handle('open-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Dokumente', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'txt', 'docx'] },
      { name: 'Alle Dateien', extensions: ['*'] }
    ]
  });
  if (result.canceled) return [];
  return result.filePaths.map(fp => ({
    path: fp,
    name: path.basename(fp),
    size: fs.statSync(fp).size,
    ext: path.extname(fp).toLowerCase().replace('.', '')
  }));
});

// Ordner auswählen
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Datei lesen (base64 für Bilder, text für txt)
ipcMain.handle('read-file', (_, filePath, mode) => {
  try {
    if (mode === 'base64') {
      return fs.readFileSync(filePath).toString('base64');
    } else if (mode === 'text') {
      return fs.readFileSync(filePath, 'utf-8').slice(0, 3000);
    } else if (mode === 'pdf') {
      // Rohbytes als base64 zurückgeben, Renderer macht PDF-parse per pdf-dist
      return fs.readFileSync(filePath).toString('base64');
    }
  } catch (e) { return null; }
});

// Dokument ablegen (umbenennen + in Zielordner kopieren)
ipcMain.handle('save-document', async (_, { sourcePath, targetDir, newName }) => {
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const dest = path.join(targetDir, newName);
    fs.copyFileSync(sourcePath, dest);
    return { success: true, dest };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Ordner im Explorer öffnen
ipcMain.handle('open-folder', (_, folderPath) => {
  shell.openPath(folderPath);
});

// Datei im Standard-Programm öffnen
ipcMain.handle('open-file', (_, filePath) => {
  shell.openPath(filePath);
});

// Archiv laden/speichern
const archivePath = path.join(app.getPath('userData'), 'archive.json');

ipcMain.handle('load-archive', () => {
  try {
    if (fs.existsSync(archivePath)) {
      return JSON.parse(fs.readFileSync(archivePath, 'utf-8'));
    }
  } catch (e) {}
  return [];
});

ipcMain.handle('save-archive', (_, archive) => {
  try {
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2), 'utf-8');
    return true;
  } catch (e) { return false; }
});

// Dokumente aus Ordner einlesen (Watch-Ordner)
ipcMain.handle('scan-folder', (_, folderPath) => {
  try {
    const entries = fs.readdirSync(folderPath);
    const supported = ['.pdf','.jpg','.jpeg','.png','.txt','.docx'];
    return entries
      .filter(f => supported.includes(path.extname(f).toLowerCase()))
      .map(f => {
        const fp = path.join(folderPath, f);
        return { path: fp, name: f, size: fs.statSync(fp).size, ext: path.extname(f).toLowerCase().replace('.','') };
      });
  } catch (e) { return []; }
});

// Default-Basisordner
ipcMain.handle('get-documents-path', () => {
  return path.join(os.homedir(), 'Dokumente', 'PapierlosesBüro');
});
