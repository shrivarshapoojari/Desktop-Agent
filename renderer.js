const { ipcRenderer } = require("electron");

const inputBox = document.getElementById("inputBox");
const sendBtn = document.getElementById("sendBtn");
const output = document.getElementById("output");

// Send command when button is clicked
sendBtn.addEventListener("click", sendCommand);

// Send command when Enter is pressed
inputBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendCommand();
  }
});

function sendCommand() {
  const command = inputBox.value.trim();
  if (command) {
    // Show user's command
    output.innerHTML += `<div style="color: #0066cc; margin: 10px 0;"><strong>You:</strong> ${command}</div>`;
    
    // Clear input and show loading
    inputBox.value = "";
    output.innerHTML += `<div style="color: #666; margin: 5px 0;"><em>Processing...</em></div>`;
    
    // Send to main process
    ipcRenderer.send("user-command", command);
  }
}

// Receive response from agent
ipcRenderer.on("agent-response", (event, response) => {
  // Remove loading message
  const loadingElements = output.querySelectorAll("em");
  if (loadingElements.length > 0) {
    loadingElements[loadingElements.length - 1].parentElement.remove();
  }
  
  // Add agent response
  output.innerHTML += `<div style="color: #006600; margin: 10px 0; padding: 10px; background: #f0f8f0; border-radius: 5px;"><strong>Agent:</strong> ${response}</div>`;
  
  // Scroll to bottom
  output.scrollTop = output.scrollHeight;
});
