const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow;
let serverPort;

// Dynamically find a free port to avoid conflicts
function findFreePort(startPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

async function startApp() {
  // Find a free port
  serverPort = await findFreePort(3000);
  
  // Set environment variables for the Express backend
  process.env.PORT = serverPort.toString();
  process.env.NODE_ENV = 'production';
  
  // Start the Express backend server directly inside the main process
  try {
    const serverPath = path.join(__dirname, 'dist', 'server.cjs');
    console.log(`[Electron Main] Loading backend server from: ${serverPath}`);
    require(serverPath);
    console.log(`[Electron Main] Backend server listening dynamically on port ${serverPort}`);
  } catch (err) {
    console.error('[Electron Main] Failed to start backend server:', err);
  }

  // Create the Electron window
  createWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Meeting and Study Room Hub",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the backend server URL
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start app lifecycle
app.whenReady().then(() => {
  startApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
