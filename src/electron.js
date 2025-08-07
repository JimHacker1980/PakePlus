// 入口代理，兼容开发和打包
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { text } = require('stream/consumers');

function createWindow() {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: width,
    height: height,
    frame: false, // 恢复原生边框和标题栏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../public', 'preload.js'),
    },
    icon: path.join(__dirname, '../public', 'favicon.ico'),
  });

//   win.webContents.openDevTools(); // 生产环境也自动打开开发者工具


  // 判断开发/生产环境，自动加载正确的页面
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：加载 React 本地开发服务器
    // win.loadURL('http://localhost:3000');
    win.loadFile(path.join(__dirname, 'index.html'));
    // win.webContents.openDevTools(); // 开发环境自动打开开发者工具
  } else {
    // 生产环境：加载 build 后的 index.html
    // console.log('Loading production build from:', path.join(__dirname, 'build', 'index.html'));
    win.loadFile(path.join(__dirname, 'index.html'));
  }

  // 窗口控制事件
  ipcMain.on('window:minimize', () => win.minimize());
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on('window:close', () => win.close());

  // 可选：拦截新窗口，外链用默认浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 文件打开
ipcMain.handle('dialog:openFile', async ({filePath}) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return { canceled: false, filePath, content };
});

// 文件保存
ipcMain.handle('dialog:saveFile', async (event, { filePath, content }) => {
  if (!filePath) {
    // 没有路径时直接返回错误，不弹窗
    return { canceled: true, error: 'no_file_path' };
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return { canceled: false, filePath };
});

// 文件重命名
ipcMain.handle('dialog:renameFile', async (event, { oldPath, newPath }) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 文件删除
ipcMain.handle('dialog:deleteFile', async (event, { filePath }) => {
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 递归读取目录，返回树结构
ipcMain.handle('dialog:readDir', async (event, { dirPath }) => {
  function readDirRecursive(currentPath) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    return items.map(item => {
      const abs = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        return {
          name: item.name,
          path: abs,
          isDirectory: true,
          children: readDirRecursive(abs)
        };
      } else {
        return {
          name: item.name,
          path: abs,
          isDirectory: false,
        };
      }
    });
  }
  try {
    const tree = readDirRecursive(dirPath);
    return { success: true, tree };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
