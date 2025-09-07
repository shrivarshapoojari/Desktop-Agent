const { ipcRenderer } = require("electron");

// DOM Elements
const inputBox = document.getElementById("inputBox");
const sendBtn = document.getElementById("sendBtn");
const output = document.getElementById("output");
const themeIcon = document.getElementById("theme-icon");

// State Management
let currentTheme = localStorage.getItem('theme') || 'light';
let isProcessing = false;
let messageCount = 0;

// Initialize theme
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcon();

// Event Listeners
sendBtn.addEventListener("click", sendCommand);
inputBox.addEventListener("keypress", handleKeyPress);
inputBox.addEventListener("input", handleInput);

// Handle Enter key and Shift+Enter
function handleKeyPress(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendCommand();
  }
}

// Handle input changes for better UX
function handleInput(e) {
  if (e.target.value.trim()) {
    sendBtn.style.background = 'linear-gradient(45deg, var(--accent-color), var(--success-color))';
  } else {
    sendBtn.style.background = 'linear-gradient(45deg, var(--accent-color), var(--accent-hover))';
  }
}

// Theme toggle function
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateThemeIcon();
  
  // Add a subtle animation
  document.body.style.transition = 'all 0.3s ease';
  setTimeout(() => {
    document.body.style.transition = '';
  }, 300);
}

function updateThemeIcon() {
  const themeText = document.getElementById('theme-text');
  if (currentTheme === 'dark') {
    themeIcon.className = 'fas fa-sun';
    if (themeText) themeText.textContent = 'Light';
  } else {
    themeIcon.className = 'fas fa-moon';
    if (themeText) themeText.textContent = 'Dark';
  }
}

// Set command from examples
function setCommand(command) {
  inputBox.value = command;
  inputBox.focus();
  
  // Add a subtle highlight effect
  inputBox.style.transform = 'scale(1.02)';
  setTimeout(() => {
    inputBox.style.transform = '';
  }, 200);
}

// Enhanced send command function
function sendCommand() {
  const command = inputBox.value.trim();
  if (!command || isProcessing) return;
  
  isProcessing = true;
  messageCount++;
  
  // Update button state
  const originalContent = sendBtn.innerHTML;
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending';
  sendBtn.disabled = true;
  
  // Add user message with animation
  addMessage('user', command);
  
  // Clear input
  inputBox.value = "";
  
  // Add loading message
  const loadingId = addLoadingMessage();
  
  // Send to main process
  ipcRenderer.send("user-command", command);
  
  // Store loading ID for removal
  sendBtn.dataset.loadingId = loadingId;
}

// Add message with enhanced styling
function addMessage(type, content, isLoading = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  if (isLoading) {
    messageDiv.id = `loading-${Date.now()}`;
  }
  
  // Create avatar
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  
  if (type === 'user') {
    avatar.innerHTML = '<i class="fas fa-user"></i>';
  } else if (type === 'agent') {
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
  } else if (type === 'loading') {
    avatar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  // Add message header
  const messageHeader = document.createElement('div');
  messageHeader.className = 'message-header';
  
  if (type === 'user') {
    messageHeader.innerHTML = '<i class="fas fa-user"></i> You';
    messageContent.innerHTML = content.replace(/\n/g, '<br>');
  } else if (type === 'agent') {
    messageHeader.innerHTML = '<i class="fas fa-robot"></i> Agent';
    messageContent.innerHTML = formatAgentResponse(content);
  } else if (type === 'loading') {
    messageHeader.innerHTML = '<i class="fas fa-robot"></i> Agent';
    messageContent.innerHTML = `
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span style="margin-left: 10px;">Processing your request...</span>
    `;
  }
  
  // Create message wrapper
  const messageWrapper = document.createElement('div');
  messageWrapper.style.display = 'flex';
  messageWrapper.style.flexDirection = 'column';
  messageWrapper.style.maxWidth = '75%';
  
  messageWrapper.appendChild(messageHeader);
  messageWrapper.appendChild(messageContent);
  
  // Add avatar and wrapper to message
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageWrapper);
  
  // Add to output with animation
  output.appendChild(messageDiv);
  
  // Trigger animation with stagger
  setTimeout(() => {
    messageDiv.style.animationDelay = '0s';
  }, 100);
  
  // Scroll to bottom smoothly
  scrollToBottom();
  
  return messageDiv.id;
}

// Add loading message
function addLoadingMessage() {
  return addMessage('loading', '', true);
}

// Format agent response with better styling
function formatAgentResponse(response) {
  // Convert markdown-style formatting
  let formatted = response;
  
  // Handle bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Handle line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Handle different types of responses
  if (response.includes('✅') || response.includes('🎯') || response.includes('💻')) {
    return `<div class="response-success">${formatted}</div>`;
  } else if (response.includes('❌') || response.includes('Error')) {
    return `<div class="response-error">${formatted}</div>`;
  } else if (response.includes('🔍') || response.includes('Processing')) {
    return `<div class="response-processing">${formatted}</div>`;
  } else {
    return formatted;
  }
}

// Smooth scroll to bottom
function scrollToBottom() {
  requestAnimationFrame(() => {
    output.scrollTop = output.scrollHeight;
  });
}

// Enhanced response handler
ipcRenderer.on("agent-response", (event, response) => {
  console.log("📨 Received response in renderer:", response);
  
  isProcessing = false;
  
  // Remove loading message
  const loadingId = sendBtn.dataset.loadingId;
  if (loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
      loadingElement.style.animation = 'messageSlide 0.3s ease-out reverse';
      setTimeout(() => {
        loadingElement.remove();
      }, 300);
    }
  }
  
  // Reset button state
  sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
  sendBtn.disabled = false;
  
  // Check if this is a reminder notification (contains "REMINDER ALERT")
  if (response.includes("REMINDER ALERT")) {
    // Add special styling for reminder notifications
    addMessage('agent', response);
    
    // Show a more prominent notification
    showReminderAlert(response);
  } else {
    // Add regular agent response
    addMessage('agent', response);
  }
  
  // Focus back to input
  inputBox.focus();
  
  // Add subtle success feedback
  showStatusFeedback('Response received', 'success');
});

// Status feedback system
function showStatusFeedback(message, type = 'info') {
  const statusDiv = document.createElement('div');
  statusDiv.className = 'status-feedback';
  statusDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    padding: 12px 20px;
    color: var(--text-color);
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  if (type === 'success') {
    statusDiv.style.borderColor = 'var(--success-color)';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.1)';
  } else if (type === 'error') {
    statusDiv.style.borderColor = 'var(--error-color)';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.1)';
  }
  
  statusDiv.textContent = message;
  document.body.appendChild(statusDiv);
  
  // Trigger animation
  requestAnimationFrame(() => {
    statusDiv.style.transform = 'translateX(0)';
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    statusDiv.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 300);
  }, 3000);
}

// Special reminder alert system
function showReminderAlert(reminderText) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
    animation: overlayFadeIn 0.3s ease;
  `;
  
  // Create alert box
  const alertBox = document.createElement('div');
  alertBox.style.cssText = `
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 2px solid var(--accent-color);
    border-radius: 20px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    color: var(--text-color);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: alertSlideIn 0.4s ease;
    position: relative;
  `;
  
  // Create content
  alertBox.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 20px;">🔔</div>
    <h2 style="color: var(--accent-color); margin: 0 0 20px 0; font-size: 24px;">Reminder Alert!</h2>
    <div style="white-space: pre-line; line-height: 1.6; margin-bottom: 30px; font-size: 16px;">${reminderText.replace(/\*\*/g, '')}</div>
    <button id="reminder-ok" style="
      background: linear-gradient(45deg, var(--accent-color), var(--success-color));
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    ">Got it!</button>
  `;
  
  overlay.appendChild(alertBox);
  document.body.appendChild(overlay);
  
  // Handle close
  const okButton = alertBox.querySelector('#reminder-ok');
  okButton.addEventListener('click', () => {
    overlay.style.animation = 'overlayFadeOut 0.3s ease';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  });
  
  // Add animations to head if not already added
  if (!document.querySelector('#reminder-animations')) {
    const style = document.createElement('style');
    style.id = 'reminder-animations';
    style.textContent = `
      @keyframes overlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes overlayFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes alertSlideIn {
        from { 
          opacity: 0;
          transform: translateY(-50px) scale(0.8);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
