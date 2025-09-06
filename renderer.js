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
    messageContent.textContent = content;
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
  // Handle different types of responses
  if (response.includes('✅') || response.includes('🎯') || response.includes('💻')) {
    // Success/action responses
    return `<div class="response-success">${response}</div>`;
  } else if (response.includes('❌') || response.includes('Error')) {
    // Error responses
    return `<div class="response-error">${response}</div>`;
  } else if (response.includes('🔍') || response.includes('Processing')) {
    // Processing responses
    return `<div class="response-processing">${response}</div>`;
  } else {
    // Regular responses
    return response;
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
  
  // Add agent response
  addMessage('agent', response);
  
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
    padding: 12px 16px;
    color: var(--text-primary);
    font-size: 0.9rem;
    z-index: 1001;
    animation: slideInRight 0.3s ease-out;
    box-shadow: var(--shadow);
  `;
  
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  const color = type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--accent-color)';
  
  statusDiv.innerHTML = `
    <i class="fas fa-${icon}" style="color: ${color}; margin-right: 8px;"></i>
    ${message}
  `;
  
  document.body.appendChild(statusDiv);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    statusDiv.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      statusDiv.remove();
    }, 300);
  }, 3000);
}

// Add CSS animations for status feedback
const statusStyles = document.createElement('style');
statusStyles.textContent = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideOutRight {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100px); }
  }
  
  .response-success {
    border-left: 4px solid var(--success-color);
    padding-left: 15px;
    background: rgba(72, 187, 120, 0.1);
    border-radius: 0 8px 8px 0;
    margin: 5px 0;
  }
  
  .response-error {
    border-left: 4px solid var(--error-color);
    padding-left: 15px;
    background: rgba(245, 101, 101, 0.1);
    border-radius: 0 8px 8px 0;
    margin: 5px 0;
  }
  
  .response-processing {
    border-left: 4px solid var(--warning-color);
    padding-left: 15px;
    background: rgba(237, 137, 54, 0.1);
    border-radius: 0 8px 8px 0;
    margin: 5px 0;
  }
`;
document.head.appendChild(statusStyles);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K to focus input
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    inputBox.focus();
    inputBox.select();
  }
  
  // Ctrl/Cmd + D to toggle theme
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    toggleTheme();
  }
  
  // Escape to clear input
  if (e.key === 'Escape') {
    inputBox.value = '';
    inputBox.blur();
  }
});

// Welcome message on first load
if (messageCount === 0) {
  setTimeout(() => {
    addMessage('agent', '👋 Welcome to Desktop Agent! I\'m here to help you with productivity, system monitoring, web searches, and more. Try one of the commands below or ask me anything!');
  }, 1000);
}

// Add typing sound effect
function playTypingSound() {
  // Create a subtle click sound using Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

// Add typing sound to input
inputBox.addEventListener('keydown', () => {
  if (Math.random() > 0.7) { // Random typing sounds
    try {
      playTypingSound();
    } catch (e) {
      // Fallback if audio context fails
    }
  }
});

// Add particle effect on send
function createParticleEffect(element) {
  for (let i = 0; i < 10; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--accent-color);
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
    `;
    
    const rect = element.getBoundingClientRect();
    particle.style.left = rect.left + rect.width / 2 + 'px';
    particle.style.top = rect.top + rect.height / 2 + 'px';
    
    document.body.appendChild(particle);
    
    const angle = (Math.PI * 2 * i) / 10;
    const velocity = 50 + Math.random() * 50;
    
    particle.animate([
      { 
        transform: 'translate(0, 0) scale(1)',
        opacity: 1 
      },
      { 
        transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
        opacity: 0 
      }
    ], {
      duration: 800,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)'
    }).onfinish = () => particle.remove();
  }
}

// Enhanced send button click
const originalSendCommand = sendCommand;
sendCommand = function() {
  createParticleEffect(sendBtn);
  originalSendCommand();
};

// Add easter egg - Konami code
let konamiCode = [];
const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

document.addEventListener('keydown', (e) => {
  konamiCode.push(e.code);
  konamiCode = konamiCode.slice(-10);
  
  if (konamiCode.join(',') === konami.join(',')) {
    // Easter egg activated!
    document.body.style.animation = 'rainbow 2s infinite';
    showStatusFeedback('🎉 Easter egg activated! You found the secret!', 'success');
    
    setTimeout(() => {
      document.body.style.animation = '';
    }, 4000);
  }
});

// Add rainbow animation for easter egg
const rainbowStyle = document.createElement('style');
rainbowStyle.textContent = `
  @keyframes rainbow {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
`;
document.head.appendChild(rainbowStyle);

// Make functions available globally
window.toggleTheme = toggleTheme;
window.setCommand = setCommand;
