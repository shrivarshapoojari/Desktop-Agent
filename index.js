import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { handleCommand, initializeReminderSystem } from "./agent_efficient.js";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(process.cwd(), "renderer.js"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile("index.html");
  
  // Initialize reminder system after window is ready
  mainWindow.webContents.once('did-finish-load', () => {
    initializeReminderSystem((notification) => {
      // Send reminder notifications to the renderer
      console.log("📨 Sending notification to renderer:", notification);
      mainWindow.webContents.send("agent-response", notification);
    });
  });
}

app.whenReady().then(createWindow);

ipcMain.on("user-command", async (event, command) => {
  handleCommand(command, (response) => {
    event.reply("agent-response", response);
  });
});
