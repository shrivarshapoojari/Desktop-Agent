import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { handleCommand } from "./agent.js";

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(process.cwd(), "renderer.js"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

ipcMain.on("user-command", async (event, command) => {
  handleCommand(command, (response) => {
    event.reply("agent-response", response);
  });
});
