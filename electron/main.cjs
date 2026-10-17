const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

let mainWindow;
let serverProcess;

function startServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
  console.log(`[Electron Main] Spawning backend server from: ${serverPath}`);
  
  // Configure environment variables for the Express backend
  const env = { 
    ...process.env, 
    PORT: '3000', 
    NODE_ENV: 'production' 
  };
  
  // Spawn the child process to run `node dist/server.cjs`
  serverProcess = spawn('node', [serverPath], {
    env,
    stdio: 'inherit' // Inherit stdio to forward Express logs to Electron output
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron Main] Failed to start backend server child process:', err);
  });
}

function checkPort(port, callback) {
  const socket = new net.Socket();
  socket.setTimeout(1000);
  
  socket.on('connect', () => {
    socket.destroy();
    callback(true);
  });
  
  socket.on('error', () => {
    socket.destroy();
    callback(false);
  });
  
  socket.on('timeout', () => {
    socket.destroy();
    callback(false);
  });
  
  socket.connect(port, '127.0.0.1');
}

// Poll port 3000 to ensure the server is fully up and running before loading it
function pollPort(port, interval = 200, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function poll() {
      checkPort(port, (isActive) => {
        if (isActive) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(poll, interval);
        }
      });
    }
    
    poll();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Meeting and Study Room Hub",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron lifecycle hooks
app.whenReady().then(async () => {
  startServer();
  
  try {
    await pollPort(3000);
    createWindow();
  } catch (err) {
    console.error('[Electron Main] Backend server port not active in time:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('[Electron Main] Terminating backend server child process...');
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
