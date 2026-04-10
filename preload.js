const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadSettings:    ()           => ipcRenderer.invoke('load-settings'),
  saveSettings:    (s)          => ipcRenderer.invoke('save-settings', s),
  openFiles:       ()           => ipcRenderer.invoke('open-files'),
  selectFolder:    ()           => ipcRenderer.invoke('select-folder'),
  readFile:        (p, mode)    => ipcRenderer.invoke('read-file', p, mode),
  saveDocument:    (opts)       => ipcRenderer.invoke('save-document', opts),
  openFolder:      (p)          => ipcRenderer.invoke('open-folder', p),
  openFile:        (p)          => ipcRenderer.invoke('open-file', p),
  loadArchive:     ()           => ipcRenderer.invoke('load-archive'),
  saveArchive:     (a)          => ipcRenderer.invoke('save-archive', a),
  scanFolder:      (p)          => ipcRenderer.invoke('scan-folder', p),
  getDocumentsPath:()           => ipcRenderer.invoke('get-documents-path'),
});
