const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filePath) => ipcRenderer.invoke('dialog:openFile',{filePath}),
  saveFile: (filePath, content) => ipcRenderer.invoke('dialog:saveFile', { filePath, content }),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('dialog:renameFile', { oldPath, newPath }),
  deleteFile: (filePath) => ipcRenderer.invoke('dialog:deleteFile', { filePath }),
  readDir: (dirPath) => ipcRenderer.invoke('dialog:readDir', { dirPath }).then(res => {
    if (res.success) return res.tree;
    throw new Error(res.error || '读取目录失败');
  }),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  // 新增：页面查找相关API
  send: (event, text, options) => ipcRenderer.send('find-in-page',{text, options}),
  clear: (event) => ipcRenderer.send('stop-find-in-page'),
})

// 预留：如需与主进程通信可在此暴露API
// 目前保持空实现，保证 contextIsolation:true 时页面正常
