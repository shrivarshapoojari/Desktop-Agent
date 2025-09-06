import Groq from "groq-sdk";
import { addTask, getTasks, deleteTask, clearTasks } from "./db.js";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import dotenv from "dotenv";
import notifier from "node-notifier";

const execAsync = promisify(exec);

dotenv.config();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Reminder notification system - Efficient Scheduler Approach
let reminderScheduler = new Map(); // Store scheduled timeouts
let notificationCallback = null;

// Initialize reminder system with scheduler
export function initializeReminderSystem(callback) {
  notificationCallback = callback;
  console.log("🔔 Efficient reminder system initialized");
  
  // Load existing tasks and schedule them immediately
  scheduleExistingReminders();
}

// Schedule all existing reminders when app starts
function scheduleExistingReminders() {
  getTasks((tasks) => {
    tasks.forEach(task => {
      scheduleReminder(task);
    });
    console.log(`📅 Scheduled ${tasks.length} existing reminders`);
  });
}

// Schedule a single reminder - much more efficient than polling
function scheduleReminder(task) {
  const now = new Date();
  const [hours, minutes] = task.time.split(':').map(Number);
  
  // Create target time for today
  const targetTime = new Date();
  targetTime.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, skip it (it's in the past)
  if (targetTime <= now) {
    console.log(`⏰ Reminder for "${task.description}" at ${task.time} has already passed today`);
    return;
  }
  
  const timeUntilReminder = targetTime.getTime() - now.getTime();
  
  console.log(`⏳ Scheduling reminder "${task.description}" in ${Math.round(timeUntilReminder / 1000 / 60)} minutes`);
  
  // Schedule the reminder with setTimeout (much more efficient!)
  const timeoutId = setTimeout(() => {
    triggerReminder(task);
  }, timeUntilReminder);
  
  // Store the timeout ID so we can cancel it if needed
  reminderScheduler.set(task.id, timeoutId);
}

// Trigger a reminder notification
function triggerReminder(task) {
  console.log(`🔔 Triggering reminder: ${task.description} at ${task.time}`);
  
  // Send notification to UI
  if (notificationCallback) {
    notificationCallback(`🔔 **REMINDER ALERT!** 🔔\n\n📋 **Task:** ${task.description}\n🕐 **Time:** ${task.time}\n\n✅ This task will be automatically removed after this notification\n📝 Use "show my tasks" to see remaining reminders`);
  }
  
  // Show Windows system notification
  try {
    notifier.notify({
      title: '🔔 Desktop Agent Reminder',
      message: `${task.description} at ${task.time}`,
      icon: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png',
      sound: true,
      wait: false,
      timeout: 10,
      type: 'info'
    }, (err) => {
      if (err) {
        console.log("Notification failed:", err);
      } else {
        console.log("✅ Windows system notification sent via node-notifier");
      }
    });
  } catch (error) {
    console.log("System notification not available");
  }
  
  // Remove the task from database after notification
  deleteTask(task.id, (deleteResult) => {
    if (deleteResult) {
      console.log(`🗑️ Task ${task.id} automatically deleted after reminder notification`);
    } else {
      console.log(`❌ Failed to delete task ${task.id} after reminder`);
    }
  });
  
  // Remove from scheduler
  reminderScheduler.delete(task.id);
  
  console.log(`✅ Reminder completed and removed: ${task.description}`);
}

// Cancel a scheduled reminder
export function cancelScheduledReminder(taskId) {
  if (reminderScheduler.has(taskId)) {
    clearTimeout(reminderScheduler.get(taskId));
    reminderScheduler.delete(taskId);
    console.log(`❌ Cancelled scheduled reminder for task ${taskId}`);
  }
}

// Stop reminder system (for cleanup)
export function stopReminderSystem() {
  // Clear all scheduled timeouts
  reminderScheduler.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  reminderScheduler.clear();
  console.log("🛑 Efficient reminder system stopped and all schedules cleared");
}

// Check for due reminders
function checkDueReminders() {
  getTasks((tasks) => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    tasks.forEach(task => {
      const reminderKey = `${task.id}-${task.time}`;
       
      // Check if this reminder has already been triggered
      if (task.time === currentTime && !triggeredReminders.has(reminderKey)) {
        // Mark as triggered to prevent duplicate notifications
        triggeredReminders.add(reminderKey);
        console.log("current time",currentTime)
        console.log("task time",task.time)
        // Send notification to UI
        if (notificationCallback) {
          notificationCallback(`🔔 **REMINDER ALERT!** 🔔\n\n📋 **Task:** ${task.description}\n🕐 **Time:** ${task.time}\n\n✅ This task will be automatically removed after this notification\n� Use "show my tasks" to see remaining reminders`);
        }
        
        // Also show Windows system notification
        try {
            console.log("notify")
          notifier.notify({
            title: '🔔 Desktop Agent Reminder',
            message: `${task.description} at ${task.time}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png', // Bell icon
            sound: true, // Play notification sound
            wait: false, // Don't wait for user action
            timeout: 10, // Auto-dismiss after 10 seconds
            type: 'info',
            actions: ['Dismiss', 'Show Tasks'],
            dropdownLabel: 'Options'
          }, (err, response, metadata) => {
            if (err) {
              console.log("Node-notifier failed, trying PowerShell fallback...");
              // Fallback to PowerShell notification
              const toastScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">🔔 Desktop Agent Reminder</text>
            <text id="2">${task.description} at ${task.time}</text>
        </binding>
    </visual>
    <audio src="ms-winsoundevent:Notification.Default" />
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Desktop Agent").Show($toast)
              `.trim();
              
              exec(`powershell -Command "${toastScript}"`, (psError) => {
                if (psError) {
                  console.log("PowerShell notification also failed, using msg command...");
                  exec(`msg %username% "🔔 Desktop Agent Reminder: ${task.description} at ${task.time}"`, (msgError) => {
                    if (msgError) {
                      console.log("All system notifications failed, using app notification only");
                    } else {
                      console.log("✅ Windows msg notification sent");
                    }
                  });
                } else {
                  console.log("✅ Windows PowerShell toast notification sent");
                }
              });
            } else {
              console.log("✅ Windows system notification sent via node-notifier");
              // Handle user actions if they click on the notification
              if (response === 'activate' && metadata.activationValue === 'Show Tasks') {
                console.log("User clicked 'Show Tasks' from notification");
              }
            }
          });
        } catch (error) {
          console.log("System notification not available:", error.message);
        }
        
        console.log(`✅ Reminder notification sent: ${task.description} at ${task.time}`);
        
        // Automatically delete the task from database after notification
        deleteTask(task.id, (deleteResult) => {
          if (deleteResult) {
            console.log(`🗑️ Task ${task.id} automatically deleted after reminder notification`);
          } else {
            console.log(`❌ Failed to delete task ${task.id} after reminder`);
          }
        });
      }
    });
    
    // Clean up old triggered reminders (remove entries older than 2 minutes)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const twoMinutesAgoTime = `${twoMinutesAgo.getHours().toString().padStart(2, '0')}:${twoMinutesAgo.getMinutes().toString().padStart(2, '0')}`;
    
    // Remove old entries from triggeredReminders set
    tasks.forEach(task => {
      const reminderKey = `${task.id}-${task.time}`;
      if (task.time <= twoMinutesAgoTime) {
        triggeredReminders.delete(reminderKey);
      }
    });
  });
}

// Stop reminder system (for cleanup)
export function stopReminderSystem() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log("Reminder system stopped");
  }
}

// Helper function to parse time formats
function parseTimeFormat(timeString) {
  if (!timeString) return null;
  
  const time = timeString.toLowerCase().trim();
  
  // First, extract time from natural language phrases
  let cleanTime = time;
  
  // Handle phrases like "today at 17:59", "at 3pm", "in 2 hours", etc.
  const naturalPatterns = [
    // "today at HH:MM" or "at HH:MM"
    /(?:today\s+at\s+|at\s+)?(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/,
    // "in X minutes" - convert to actual time
    /in\s+(\d+)\s+minutes?/,
    // "in X hours" - convert to actual time
    /in\s+(\d+)\s+hours?/
  ];
  
  // Handle "in X minutes/hours" conversions
  if (time.includes('in ') && (time.includes('minute') || time.includes('hour'))) {
    const now = new Date();
    
    const minutesMatch = time.match(/in\s+(\d+)\s+minutes?/);
    const hoursMatch = time.match(/in\s+(\d+)\s+hours?/);
    
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      const futureTime = new Date(now.getTime() + minutes * 60000);
      cleanTime = `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`;
    } else if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      const futureTime = new Date(now.getTime() + hours * 3600000);
      cleanTime = `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`;
    }
  } else {
    // Extract time from natural language
    for (const pattern of naturalPatterns) {
      const match = time.match(pattern);
      if (match && match[1]) {
        cleanTime = match[1].trim();
        break;
      }
    }
  }
  
  // Now parse the cleaned time
  const patterns = [
    // 12-hour format with am/pm
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/,
    // 24-hour format
    /^(\d{1,2}):(\d{2})$/,
    // Just hour (assume :00)
    /^(\d{1,2})$/
  ];
  
  for (const pattern of patterns) {
    const match = cleanTime.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      let minutes = parseInt(match[2] || 0);
      
      // Handle am/pm
      if (match[3]) {
        if (match[3] === 'pm' && hours !== 12) hours += 12;
        if (match[3] === 'am' && hours === 12) hours = 0;
      }
      
      // Validate time
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  }
  
  return null; // Return null if no valid time found
}

// System monitoring functions
async function getSystemInfo(infoType) {
  try {
    switch (infoType) {
      case 'cpu':
        const cpus = os.cpus();
        const cpuUsage = await getCPUUsage();
        return `💻 **CPU Information:**\n• Model: ${cpus[0].model}\n• Cores: ${cpus.length}\n• Current Usage: ${cpuUsage}%\n• Architecture: ${os.arch()}`;
        
      case 'memory':
        const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
        const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
        const usedMem = totalMem - freeMem;
        const memUsage = Math.round((usedMem / totalMem) * 100);
        return `🧠 **Memory Information:**\n• Total RAM: ${totalMem} GB\n• Used: ${usedMem} GB (${memUsage}%)\n• Free: ${freeMem} GB\n• Available: ${Math.round(os.freemem() / 1024 / 1024)} MB`;
        
      case 'disk':
        const diskInfo = await getDiskSpace();
        return diskInfo;
        
      case 'processes':
        const processes = await getRunningProcesses();
        return processes;
        
      case 'network':
        const networkInfo = getNetworkInfo();
        return networkInfo;
        
      case 'system':
        const uptime = Math.floor(os.uptime() / 3600);
        const uptimeMin = Math.floor((os.uptime() % 3600) / 60);
        return `🖥️ **System Information:**\n• OS: ${os.type()} ${os.release()}\n• Platform: ${os.platform()}\n• Hostname: ${os.hostname()}\n• Uptime: ${uptime}h ${uptimeMin}m\n• User: ${os.userInfo().username}`;
        
      case 'battery':
        const batteryInfo = await getBatteryInfo();
        return batteryInfo;
        
      case 'temp':
        return `🌡️ **Temperature monitoring requires additional sensors.**\nTry: "check cpu usage" or "show system status"`;
        
      default:
        return `❌ Unknown info type. Try: cpu, memory, disk, processes, network, system, battery`;
    }
  } catch (error) {
    return `❌ Error getting system info: ${error.message}`;
  }
}

async function getCPUUsage() {
  try {
    const { stdout } = await execAsync('wmic cpu get loadpercentage /value');
    const match = stdout.match(/LoadPercentage=(\d+)/);
    return match ? match[1] : 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

async function getDiskSpace() {
  try {
    const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
    const lines = stdout.split('\n').filter(line => line.trim() && line.includes(':'));
    let diskInfo = '💾 **Disk Space:**\n';
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const drive = parts[0];
        const freeSpace = Math.round(parseInt(parts[1]) / 1024 / 1024 / 1024 * 100) / 100;
        const totalSpace = Math.round(parseInt(parts[2]) / 1024 / 1024 / 1024 * 100) / 100;
        const usedSpace = totalSpace - freeSpace;
        const usage = Math.round((usedSpace / totalSpace) * 100);
        diskInfo += `• Drive ${drive} ${totalSpace} GB (${usage}% used, ${freeSpace} GB free)\n`;
      }
    }
    return diskInfo;
  } catch (error) {
    return '💾 **Disk Space:** Unable to retrieve disk information';
  }
}

async function getRunningProcesses() {
  try {
    const { stdout } = await execAsync('tasklist /fo csv | findstr /v "Image Name" | head -10');
    const lines = stdout.split('\n').filter(line => line.trim());
    let processes = '⚡ **Top Running Processes:**\n';
    
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i];
      if (line.includes(',')) {
        const processName = line.split(',')[0].replace(/"/g, '');
        const pid = line.split(',')[1].replace(/"/g, '');
        processes += `• ${processName} (PID: ${pid})\n`;
      }
    }
    return processes;
  } catch (error) {
    return '⚡ **Processes:** Unable to retrieve process information';
  }
}

function getNetworkInfo() {
  const networkInterfaces = os.networkInterfaces();
  let networkInfo = '🌐 **Network Information:**\n';
  
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkInfo += `• ${name}: ${iface.address}\n`;
      }
    }
  }
  return networkInfo;
}

async function getBatteryInfo() {
  try {
    const { stdout } = await execAsync('wmic path Win32_Battery get BatteryStatus,EstimatedChargeRemaining');
    if (stdout.includes('EstimatedChargeRemaining')) {
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('EstimatedChargeRemaining'));
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const charge = parts[1] || 'N/A';
        return `🔋 **Battery Information:**\n• Charge Remaining: ${charge}%\n• Status: Connected`;
      }
    }
    return '🔋 **Battery Information:**\n• Status: No battery detected (Desktop PC)';
  } catch (error) {
    return '🔋 **Battery Information:**\n• Status: Unable to retrieve battery info';
  }
}

// Quick Action functions
async function executeQuickAction(actionType) {
  try {
    switch (actionType) {
      case 'focus_mode':
        return await setupFocusMode();
        
      case 'break_time':
        return await setupBreakTime();
        
      case 'coding_setup':
        return await setupCodingEnvironment();
        
      case 'study_mode':
        return await setupStudyMode();
        
      case 'gaming_mode':
        return await setupGamingMode();
        
      case 'meeting_mode':
        return await setupMeetingMode();
        
      case 'work_setup':
        return await setupWorkEnvironment();
        
      case 'social_mode':
        return await setupSocialMode();
        
      case 'cleanup':
        return await performCleanup();
        
      case 'shutdown_apps':
        return await shutdownApps();
        
      default:
        return `❌ Unknown quick action. Available actions:\n🎯 focus_mode, ☕ break_time, 💻 coding_setup\n📚 study_mode, 🎮 gaming_mode, 💼 meeting_mode\n🧹 cleanup, 🔌 shutdown_apps`;
    }
  } catch (error) {
    return `❌ Error executing quick action: ${error.message}`;
  }
}

async function setupFocusMode() {
  const actions = [];
  
  // Close distracting apps
  const distractingApps = ['spotify', 'discord', 'whatsapp', 'facebook', 'instagram', 'youtube'];
  for (const app of distractingApps) {
    try {
      await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
      actions.push(`Closed ${app}`);
    } catch (error) {
      // App not running, continue
    }
  }
  
  // Open productivity apps
  try {
    exec('start notepad');
    actions.push('Opened Notepad');
    
    setTimeout(() => exec('start calc'), 500);
    actions.push('Opened Calculator');
    
    // Open a focus website
    setTimeout(() => exec('start https://focus-to-do.com'), 1000);
    actions.push('Opened Focus Timer');
    
  } catch (error) {
    actions.push('Some apps failed to open');
  }
  
  return `🎯 **Focus Mode Activated!**\n\n✅ Actions completed:\n${actions.map(a => `• ${a}`).join('\n')}\n\n💡 Distracting apps closed, productivity tools opened!\n⏰ Consider using a 25-minute focus session.`;
}

async function setupBreakTime() {
  const actions = [];
  
  try {
    // Open relaxing content
    exec('start https://open.spotify.com');
    actions.push('Opened Spotify for music');
    
    setTimeout(() => exec('start https://www.youtube.com/results?search_query=relaxing+music'), 1000);
    actions.push('Opened relaxing music on YouTube');
    
    // Close work apps (optional)
    const workApps = ['code', 'devenv', 'notepad++'];
    for (const app of workApps) {
      try {
        await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
        actions.push(`Closed ${app}`);
      } catch (error) {
        // App not running, continue
      }
    }
    
  } catch (error) {
    actions.push('Some actions failed');
  }
  
  return `☕ **Break Time Activated!**\n\n✅ Actions completed:\n${actions.map(a => `• ${a}`).join('\n')}\n\n🎵 Enjoy your break! Consider:\n• Stretching for 2-3 minutes\n• Getting some water\n• Looking away from the screen`;
}

async function setupCodingEnvironment() {
  const actions = [];
  
  try {
    // Open coding tools
    exec('start code'); // VS Code
    actions.push('Opened VS Code');
    
    setTimeout(() => exec('start cmd'), 500);
    actions.push('Opened Command Prompt');
    
    setTimeout(() => exec('start https://stackoverflow.com'), 1000);
    actions.push('Opened Stack Overflow');
    
    setTimeout(() => exec('start https://github.com'), 1500);
    actions.push('Opened GitHub');
    
    setTimeout(() => exec('start https://developer.mozilla.org'), 2000);
    actions.push('Opened MDN Docs');
    
  } catch (error) {
    actions.push('Some tools failed to open');
  }
  
  return `💻 **Coding Setup Complete!**\n\n✅ Development environment ready:\n${actions.map(a => `• ${a}`).join('\n')}\n\n🚀 Happy coding! All your dev tools are ready.`;
}

async function setupStudyMode() {
  const actions = [];
  
  try {
    // Close distracting apps
    const distractingApps = ['spotify', 'discord', 'whatsapp'];
    for (const app of distractingApps) {
      try {
        await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
        actions.push(`Closed ${app}`);
      } catch (error) {
        // Continue
      }
    }
    
    // Open study tools
    exec('start notepad');
    actions.push('Opened Notepad for notes');
    
    setTimeout(() => exec('start calc'), 500);
    actions.push('Opened Calculator');
    
    setTimeout(() => exec('start https://www.khanacademy.org'), 1000);
    actions.push('Opened Khan Academy');
    
    setTimeout(() => exec('start https://en.wikipedia.org'), 1500);
    actions.push('Opened Wikipedia');
    
  } catch (error) {
    actions.push('Some actions failed');
  }
  
  return `📚 **Study Mode Activated!**\n\n✅ Study environment ready:\n${actions.map(a => `• ${a}`).join('\n')}\n\n🎓 Focus on learning! Distractions minimized.`;
}

async function setupGamingMode() {
  const actions = [];
  
  try {
    // Close work apps
    const workApps = ['outlook', 'teams', 'slack'];
    for (const app of workApps) {
      try {
        await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
        actions.push(`Closed ${app}`);
      } catch (error) {
        // Continue
      }
    }
    
    // Open gaming platforms
    setTimeout(() => exec('start https://store.steampowered.com'), 500);
    actions.push('Opened Steam Store');
    
    setTimeout(() => exec('start https://discord.com'), 1000);
    actions.push('Opened Discord');
    
    setTimeout(() => exec('start https://www.twitch.tv'), 1500);
    actions.push('Opened Twitch');
    
  } catch (error) {
    actions.push('Some actions failed');
  }
  
  return `🎮 **Gaming Mode Ready!**\n\n✅ Gaming setup complete:\n${actions.map(a => `• ${a}`).join('\n')}\n\n🕹️ Have fun gaming! Work apps closed for distraction-free play.`;
}

async function setupMeetingMode() {
  const actions = [];
  
  try {
    // Close noisy apps
    const noisyApps = ['spotify', 'discord'];
    for (const app of noisyApps) {
      try {
        await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
        actions.push(`Closed ${app}`);
      } catch (error) {
        // Continue
      }
    }
    
    // Open meeting tools
    setTimeout(() => exec('start https://teams.microsoft.com'), 500);
    actions.push('Opened Microsoft Teams');
    
    setTimeout(() => exec('start https://zoom.us'), 1000);
    actions.push('Opened Zoom');
    
    setTimeout(() => exec('start notepad'), 1500);
    actions.push('Opened Notepad for meeting notes');
    
  } catch (error) {
    actions.push('Some actions failed');
  }
  
  return `💼 **Meeting Mode Ready!**\n\n✅ Meeting setup complete:\n${actions.map(a => `• ${a}`).join('\n')}\n\n📞 Ready for your meeting! Distracting apps closed.`;
}

async function setupWorkEnvironment() {
  const actions = [];
  
  try {
    // Open work tools
    setTimeout(() => exec('start https://mail.google.com'), 500);
    actions.push('Opened Gmail');
    
    setTimeout(() => exec('start https://calendar.google.com'), 1000);
    actions.push('Opened Google Calendar');
    
    setTimeout(() => exec('start https://drive.google.com'), 1500);
    actions.push('Opened Google Drive');
    
    setTimeout(() => exec('start notepad'), 2000);
    actions.push('Opened Notepad');
    
    setTimeout(() => exec('start calc'), 2500);
    actions.push('Opened Calculator');
    
  } catch (error) {
    actions.push('Some tools failed to open');
  }
  
  return `💼 **Work Setup Complete!**\n\n✅ Work environment ready:\n${actions.map(a => `• ${a}`).join('\n')}\n\n📊 All work tools are ready. Have a productive day!`;
}

async function setupSocialMode() {
  const actions = [];
  
  try {
    // Open social platforms
    setTimeout(() => exec('start https://www.instagram.com'), 500);
    actions.push('Opened Instagram');
    
    setTimeout(() => exec('start https://www.twitter.com'), 1000);
    actions.push('Opened Twitter');
    
    setTimeout(() => exec('start https://www.facebook.com'), 1500);
    actions.push('Opened Facebook');
    
    setTimeout(() => exec('start https://discord.com'), 2000);
    actions.push('Opened Discord');
    
    setTimeout(() => exec('start https://open.spotify.com'), 2500);
    actions.push('Opened Spotify');
    
  } catch (error) {
    actions.push('Some platforms failed to open');
  }
  
  return `🌟 **Social Mode Activated!**\n\n✅ Social platforms ready:\n${actions.map(a => `• ${a}`).join('\n')}\n\n📱 Stay connected with friends and enjoy social time!`;
}

async function performCleanup() {
  const actions = [];
  
  try {
    // Clear temp files
    await execAsync('del /q %temp%\\* 2>nul');
    actions.push('Cleared temporary files');
    
    // Empty recycle bin (requires confirmation)
    actions.push('Recycle bin cleanup available via Windows');
    
    // Close unnecessary processes (be careful)
    const unnecessaryApps = ['notepad'];
    for (const app of unnecessaryApps) {
      try {
        await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
        actions.push(`Closed unnecessary ${app} instances`);
      } catch (error) {
        // Continue
      }
    }
    
  } catch (error) {
    actions.push('Some cleanup actions failed');
  }
  
  return `🧹 **Cleanup Complete!**\n\n✅ Cleanup actions:\n${actions.map(a => `• ${a}`).join('\n')}\n\n💾 System cleaned up for better performance!`;
}

async function shutdownApps() {
  const actions = [];
  
  try {
    // Close common apps (be selective to avoid system issues)
    const appsToClose = ['notepad', 'calc', 'mspaint'];
    for (const app of appsToClose) {
      try {
        await execAsync(`taskkill /f /im ${app}.exe 2>nul`);
        actions.push(`Closed ${app}`);
      } catch (error) {
        // Continue
      }
    }
    
    // Close browsers (optional - commented out for safety)
    // await execAsync('taskkill /f /im chrome.exe 2>nul');
    // await execAsync('taskkill /f /im firefox.exe 2>nul');
    
  } catch (error) {
    actions.push('Some apps failed to close');
  }
  
  return `🔌 **Apps Shutdown Complete!**\n\n✅ Closed applications:\n${actions.map(a => `• ${a}`).join('\n')}\n\n⚠️ Critical system apps were preserved for safety.`;
}

async function parseCommand(command) {
  try {
    const res = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { 
          role: "system", 
          content: `You are a friendly desktop AI agent. Parse user commands and respond with JSON containing:
          - action: "add_reminder", "show_tasks", "clear_tasks", "delete_task", "open_app", "search_web", "visit_website", "system_info", "quick_action", "chat"
          - task: description for reminders
          - time: time for reminders (format: "HH:MM" or "today at HH:MM")
          - app: application name for DESKTOP apps only (calculator, notepad, paint, browser, etc.)
          - task_id: ID for deleting specific tasks
          - query: search term for web searches
          - search_type: "google", "youtube", "wikipedia", "github", "stackoverflow", "images", "news", "maps" (default: "google")
          - website: website shortcut or URL for direct visits
          - info_type: "cpu", "memory", "disk", "processes", "network", "system", "battery", "temp" for system information
          - action_type: "focus_mode", "break_time", "coding_setup", "study_mode", "gaming_mode", "meeting_mode", "cleanup", "shutdown_apps", "work_setup", "social_mode"
          - message: for casual conversation responses
          
          IMPORTANT DISTINCTIONS:
          - Use "chat" for greetings, casual questions, compliments, or general conversation
          - Use "open_app" ONLY for desktop applications like calculator, notepad, paint, browser
          - Use "visit_website" for websites like gfg, leetcode, youtube, netflix, github, amazon, etc.
          - Use "search_web" when user wants to search for something
          - Use "system_info" for system monitoring requests
          - Use "quick_action" for workflow shortcuts and automation
          
          Examples:
          "hello" -> {"action": "chat", "message": "Hello! How can I help you today?"}
          "how are you" -> {"action": "chat", "message": "I'm doing great! Ready to help you with any tasks."}
          "what can you do" -> {"action": "chat", "message": "I can help you with productivity, system monitoring, web searches, and much more!"}
          "thank you" -> {"action": "chat", "message": "You're welcome! Happy to help anytime."}
          "good morning" -> {"action": "chat", "message": "Good morning! Hope you have a productive day ahead!"}
          "focus mode" -> {"action": "quick_action", "action_type": "focus_mode"}
          "check cpu usage" -> {"action": "system_info", "info_type": "cpu"}
          "open leetcode" -> {"action": "visit_website", "website": "leetcode"}
          "search for javascript" -> {"action": "search_web", "query": "javascript"}
          "remind me to call mom at 3pm" -> {"action": "add_reminder", "task": "call mom", "time": "15:00"}` 
        },
        { role: "user", content: command }
      ],
      temperature: 0.3
    });
    
    console.log("AI Response:", res.choices[0].message.content);
    return res.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw new Error("Failed to process command with AI");
  }
}

export async function handleCommand(command, callback) {
  try {
    const parsed = await parseCommand(command);
    const data = JSON.parse(parsed);

    if (data.action === "add_reminder") {
      if (data.task && data.time) {
        const parsedTime = parseTimeFormat(data.time);
        if (parsedTime) {
          // Add to database
          addTask(data.task, parsedTime);
          
          // Schedule the reminder immediately using the efficient scheduler
          const tempTask = { 
            id: Date.now(), // Temporary ID for scheduling
            description: data.task, 
            time: parsedTime 
          };
          scheduleReminder(tempTask);
          
          callback(`✅ Reminder set: "${data.task}" at ${parsedTime}`);
        } else {
          callback("❌ Invalid time format. Use formats like '3pm', '15:30', '2:30pm', etc.");
        }
      } else {
        callback("❌ Please specify both task and time for the reminder.");
      }
    } else if (data.action === "show_tasks") {
      getTasks((tasks) => {
        if (tasks.length === 0) {
          callback("📝 No tasks found. You're all caught up!");
        } else {
          const taskList = tasks.map(t => `${t.id}. ${t.description} @ ${t.time}`).join("\n");
          callback(`📋 Your Tasks:\n${taskList}`);
        }
      });
    } else if (data.action === "clear_tasks") {
      clearTasks();
      callback("🗑️ All tasks cleared!");
    } else if (data.action === "delete_task") {
      if (data.task_id) {
        deleteTask(data.task_id);
        callback(`🗑️ Task ${data.task_id} deleted!`);
      } else {
        callback("❌ Please specify which task to delete.");
      }
    } else if (data.action === "chat") {
      // Handle casual conversation
      if (data.message) {
        callback(data.message);
      } else {
        // Fallback friendly responses
        const friendlyResponses = [
          "😊 Hi there! I'm here to help you with tasks, system monitoring, web searches, and more!",
          "👋 Hello! What can I do for you today?",
          "🤖 Hey! I'm your desktop assistant. Try asking me to check system status or set up your workspace!",
          "✨ Hi! I can help you be more productive. Try 'focus mode' or 'check cpu usage'!",
          "🌟 Hello! I'm here to assist with your daily tasks. What would you like to do?"
        ];
        const randomResponse = friendlyResponses[Math.floor(Math.random() * friendlyResponses.length)];
        callback(randomResponse);
      }
    } else if (data.action === "open_app") {
      if (data.app) {
        const appName = data.app.toLowerCase();
        
        // ONLY reliable Windows built-in desktop apps
        const builtInApps = {
          'calculator': 'calc',
          'notepad': 'notepad',
          'paint': 'mspaint',
          'browser': 'msedge',
          'edge': 'msedge',
          'file explorer': 'explorer',
          'explorer': 'explorer',
          'task manager': 'taskmgr',
          'control panel': 'control',
          'cmd': 'cmd',
          'powershell': 'powershell',
          'settings': 'ms-settings:'
        };
        
        // Only handle known desktop apps
        if (builtInApps[appName]) {
          exec(`start ${builtInApps[appName]}`, (error) => {
            if (!error) {
              callback(`🚀 Opening ${data.app}...`);
            } else {
              callback(`❌ Could not open ${data.app}. Try: calculator, notepad, paint, file explorer, settings`);
            }
          });
        } else {
          // If it's not a known desktop app, suggest it might be a website
          callback(`❌ "${data.app}" is not a recognized desktop app.\n\n🖥️ **Desktop Apps:** calculator, notepad, paint, browser, file explorer\n🌐 **For websites, try:** "visit ${data.app}" or "go to ${data.app}"`);
        }
      } else {
        callback("❌ Please specify which app to open.");
      }
    } else if (data.action === "search_web") {
      if (data.query) {
        const query = data.query.trim();
        const searchType = data.search_type || "google";
        
        // Build search URLs for different search engines and services
        const searchUrls = {
          google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
          github: `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`,
          stackoverflow: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
          images: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
          news: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
          maps: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
          reddit: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
          twitter: `https://twitter.com/search?q=${encodeURIComponent(query)}`,
          amazon: `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
          linkedin: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`
        };
        
        const searchUrl = searchUrls[searchType] || searchUrls.google;
        const searchNames = {
          google: "Google",
          youtube: "YouTube", 
          wikipedia: "Wikipedia",
          github: "GitHub",
          stackoverflow: "Stack Overflow",
          images: "Google Images",
          news: "Google News",
          maps: "Google Maps",
          reddit: "Reddit",
          twitter: "Twitter",
          amazon: "Amazon",
          linkedin: "LinkedIn"
        };
        
        const searchName = searchNames[searchType] || "Google";
        
        // Enhanced browser detection and launching
        function tryBrowser(browserCmd, browserName, callback) {
          exec(`${browserCmd} "${searchUrl}"`, (error) => {
            if (!error) {
              callback(`🔍 Searching ${searchName} for "${query}" in ${browserName}...`);
            } else {
              return false;
            }
          });
          return true;
        }
        
        // Try multiple browsers in order of preference
        const browsers = [
          { cmd: 'start chrome', name: 'Chrome' },
          { cmd: 'start firefox', name: 'Firefox' },
          { cmd: 'start msedge', name: 'Edge' },
          { cmd: 'start brave', name: 'Brave' },
          { cmd: 'start opera', name: 'Opera' }
        ];
        
        let browserFound = false;
        let browserIndex = 0;
        
        function tryNextBrowser() {
          if (browserIndex >= browsers.length) {
            // Fallback to default browser
            exec(`start "${searchUrl}"`, (error) => {
              if (!error) {
                callback(`🔍 Searching ${searchName} for "${query}" in your default browser...`);
              } else {
                callback(`❌ Could not open any browser for search. Please check your browser installation.\n\n🔗 Search URL: ${searchUrl}`);
              }
            });
            return;
          }
          
          const browser = browsers[browserIndex];
          exec(`${browser.cmd} "${searchUrl}"`, (error) => {
            if (!error) {
              callback(`🔍 Searching ${searchName} for "${query}" in ${browser.name}...`);
              browserFound = true;
            } else {
              browserIndex++;
              setTimeout(tryNextBrowser, 100); // Small delay before trying next browser
            }
          });
        }
        
        tryNextBrowser();
        
        // Add search suggestions based on query type
        setTimeout(() => {
          if (browserFound) return;
          
          let suggestion = "";
          if (query.includes("error") || query.includes("bug")) {
            suggestion = "\n💡 Tip: Try 'stackoverflow " + query + "' for coding help!";
          } else if (query.includes("tutorial") || query.includes("how to")) {
            suggestion = "\n💡 Tip: Try 'youtube " + query + "' for video tutorials!";
          } else if (query.includes("definition") || query.includes("what is")) {
            suggestion = "\n💡 Tip: Try 'wikipedia " + query + "' for detailed info!";
          }
          
          if (suggestion && !browserFound) {
            callback(callback.toString().includes("❌") ? callback + suggestion : "");
          }
        }, 2000);
        
      } else {
        callback(`❌ Please specify what you want to search for.\n\n🔍 **Search Examples:**\n• "search for python tutorials"\n• "youtube react course"\n• "github awesome lists"\n• "wikipedia artificial intelligence"\n• "stackoverflow javascript error"\n• "images of mountains"\n• "news about technology"`);
      }
    } else if (data.action === "visit_website") {
      if (data.website) {
        const site = data.website.toLowerCase();
        
        // Popular website shortcuts
        const websites = {
          // Coding & Development
          'gfg': 'https://www.geeksforgeeks.org',
          'geeksforgeeks': 'https://www.geeksforgeeks.org',
          'leetcode': 'https://leetcode.com',
          'hackerrank': 'https://www.hackerrank.com',
          'codechef': 'https://www.codechef.com',
          'codeforces': 'https://codeforces.com',
          'github': 'https://github.com',
          'stackoverflow': 'https://stackoverflow.com',
          'w3schools': 'https://www.w3schools.com',
          'mdn': 'https://developer.mozilla.org',
          'devto': 'https://dev.to',
          
          // Entertainment & Social
          'youtube': 'https://www.youtube.com',
          'netflix': 'https://www.netflix.com',
          'instagram': 'https://www.instagram.com',
          'facebook': 'https://www.facebook.com',
          'twitter': 'https://www.twitter.com',
          'reddit': 'https://www.reddit.com',
          'linkedin': 'https://www.linkedin.com',
          'discord': 'https://discord.com',
          'spotify': 'https://open.spotify.com',
          
          // Shopping & Services
          'amazon': 'https://www.amazon.com',
          'flipkart': 'https://www.flipkart.com',
          'myntra': 'https://www.myntra.com',
          'swiggy': 'https://www.swiggy.com',
          'zomato': 'https://www.zomato.com',
          'uber': 'https://www.uber.com',
          'ola': 'https://www.olacabs.com',
          
          // News & Information
          'wikipedia': 'https://www.wikipedia.org',
          'google': 'https://www.google.com',
          'gmail': 'https://mail.google.com',
          'drive': 'https://drive.google.com',
          'docs': 'https://docs.google.com',
          'sheets': 'https://sheets.google.com',
          'calendar': 'https://calendar.google.com',
          
          // Education
          'coursera': 'https://www.coursera.org',
          'udemy': 'https://www.udemy.com',
          'edx': 'https://www.edx.org',
          'khan': 'https://www.khanacademy.org',
          'duolingo': 'https://www.duolingo.com',
          
          // Tools & Utilities
          'canva': 'https://www.canva.com',
          'figma': 'https://www.figma.com',
          'notion': 'https://www.notion.so',
          'trello': 'https://trello.com',
          'slack': 'https://slack.com'
        };
        
        // Check if it's a known website shortcut
        let targetUrl = websites[site];
        
        // If not found, check if it's already a URL
        if (!targetUrl) {
          if (site.startsWith('http://') || site.startsWith('https://')) {
            targetUrl = data.website;
          } else if (site.includes('.')) {
            // Assume it's a domain name
            targetUrl = `https://${data.website}`;
          } else {
            // Unknown shortcut, provide suggestions
            callback(`❌ Unknown website "${data.website}". Try these shortcuts:\n\n💻 **Coding:** gfg, leetcode, github, stackoverflow\n🎥 **Entertainment:** youtube, netflix, spotify\n🛒 **Shopping:** amazon, flipkart, myntra\n📚 **Learning:** coursera, udemy, khan\n🔧 **Tools:** gmail, drive, notion, figma\n\nOr use full URL like: "visit https://example.com"`);
            return;
          }
        }
        
        // Enhanced browser detection for website visits
        function tryBrowserForWebsite(browserCmd, browserName) {
          exec(`${browserCmd} "${targetUrl}"`, (error) => {
            if (!error) {
              const siteName = Object.keys(websites).find(key => websites[key] === targetUrl) || data.website;
              callback(`🌐 Opening ${siteName.toUpperCase()} in ${browserName}...`);
            } else {
              return false;
            }
          });
          return true;
        }
        
        // Try multiple browsers for better success rate
        const browsers = [
          { cmd: 'start chrome', name: 'Chrome' },
          { cmd: 'start firefox', name: 'Firefox' },
          { cmd: 'start msedge', name: 'Edge' },
          { cmd: 'start brave', name: 'Brave' }
        ];
        
        let browserIndex = 0;
        let success = false;
        
        function tryNextBrowserForSite() {
          if (browserIndex >= browsers.length) {
            // Final fallback to default browser
            exec(`start "${targetUrl}"`, (error) => {
              if (!error) {
                const siteName = Object.keys(websites).find(key => websites[key] === targetUrl) || data.website;
                callback(`🌐 Opening ${siteName.toUpperCase()} in your default browser...`);
              } else {
                callback(`❌ Could not open browser to visit ${data.website}.\n\n🔗 URL: ${targetUrl}\n\n💡 Try installing Chrome, Firefox, or Edge.`);
              }
            });
            return;
          }
          
          const browser = browsers[browserIndex];
          exec(`${browser.cmd} "${targetUrl}"`, (error) => {
            if (!error) {
              const siteName = Object.keys(websites).find(key => websites[key] === targetUrl) || data.website;
              callback(`🌐 Opening ${siteName.toUpperCase()} in ${browser.name}...`);
              success = true;
            } else {
              browserIndex++;
              setTimeout(tryNextBrowserForSite, 100);
            }
          });
        }
        
        tryNextBrowserForSite();
        
      } else {
        callback(`❌ Please specify which website to visit.\n\n🌐 **Popular Sites:**\n• "open gfg" / "visit leetcode"\n• "go to youtube" / "open netflix"\n• "visit amazon" / "open gmail"\n• "go to github" / "open stackoverflow"\n\nOr use: "visit https://example.com"`);
      }
    } else if (data.action === "system_info") {
      if (data.info_type) {
        callback(`🔍 Gathering ${data.info_type} information...`);
        
        // Get system information asynchronously
        getSystemInfo(data.info_type).then(info => {
          // Send a follow-up response with the system info
          setTimeout(() => {
            callback(info);
          }, 500);
        }).catch(error => {
          callback(`❌ Error getting system information: ${error.message}`);
        });
      } else {
        callback(`🖥️ **System Monitoring Available:**\n\n💻 **Hardware:**\n• "check cpu usage"\n• "show memory usage"\n• "check disk space"\n• "battery status"\n\n⚡ **System:**\n• "show running processes"\n• "system status"\n• "network info"\n\n🎯 **Quick Commands:**\n• "cpu" / "memory" / "disk" / "processes"`);
      }
    } else if (data.action === "quick_action") {
      if (data.action_type) {
        callback(`⚡ Executing ${data.action_type.replace('_', ' ')}...`);
        
        // Execute quick action asynchronously
        executeQuickAction(data.action_type).then(result => {
          // Send a follow-up response with the results
          setTimeout(() => {
            callback(result);
          }, 1000);
        }).catch(error => {
          callback(`❌ Error executing quick action: ${error.message}`);
        });
      } else {
        callback(`⚡ **Quick Actions Available:**\n\n🎯 **Productivity:**\n• "focus mode" - Close distractions, open productivity tools\n• "study mode" - Setup study environment\n• "work setup" - Open work tools (Gmail, Calendar, Drive)\n\n💻 **Development:**\n• "coding setup" - Open VS Code, GitHub, Stack Overflow\n\n🎮 **Entertainment:**\n• "break time" - Open music, close work apps\n• "gaming mode" - Setup gaming environment\n• "social mode" - Open social platforms\n\n💼 **Professional:**\n• "meeting mode" - Close distractions, open meeting tools\n\n🧹 **Maintenance:**\n• "cleanup" - Clear temp files, optimize system\n• "close all apps" - Shutdown unnecessary applications\n\n💡 Try: "focus mode", "coding setup", or "break time"`);
      }
    } else {
      // Friendly fallback for unrecognized commands
      const helpfulMessages = [
        "😊 I'd love to help! Here are some things I can do:",
        "🤖 Not sure about that one, but I can help you with:",
        "✨ Let me show you what I can do for you:",
        "🌟 I'm here to assist! Try one of these commands:",
        "💡 I can help you be more productive! Here are my abilities:"
      ];
      
      const randomIntro = helpfulMessages[Math.floor(Math.random() * helpfulMessages.length)];
      
      callback(`${randomIntro}

🎯 **Quick Actions** (Click from sidebar!)
• "focus mode" - Get in the zone
• "coding setup" - Open dev tools
• "break time" - Relax and unwind

🔍 **Smart Search**
• "search for [anything]"
• "youtube [topic]" 
• "visit leetcode"

📝 **Task Management**
• "remind me to [task] at [time]"
• "show my tasks"

🖥️ **System Monitoring**
• "check cpu usage"
• "show memory usage"
• "running processes"

� **Just Chat!**
• Say hello, ask how I'm doing, or just chat casually!

💡 **Tip:** Try clicking any command from the Quick Actions sidebar!`);
    }
  } catch (err) {
    console.error("Command handling error:", err);
    
    // Friendly error messages
    const errorMessages = [
      "😅 Oops! I had a little hiccup understanding that. Could you try rephrasing?",
      "🤔 Hmm, something went wrong on my end. Mind trying that again?",
      "💫 I got a bit confused there! Could you rephrase your request?",
      "🔄 Let me try that again - could you repeat your command?",
      "✨ Sorry about that! I'm still learning. Try asking in a different way!"
    ];
    
    const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    callback(randomError);
  }
}
