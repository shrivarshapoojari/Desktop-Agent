import Groq from "groq-sdk";
import { addTask, getTasks, deleteTask, clearTasks } from "./db.js";
import { exec } from "child_process";
import dotenv from "dotenv";
import os from "os";
import notifier from 'node-notifier';

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
        return `🖥️ **System Information:**\n• Platform: ${os.platform()}\n• Release: ${os.release()}\n• Architecture: ${os.arch()}\n• Hostname: ${os.hostname()}\n• Uptime: ${formatUptime(os.uptime())}\n• Home Directory: ${os.homedir()}`;
        
      case 'battery':
        const batteryInfo = await getBatteryInfo();
        return batteryInfo;
        
      case 'temp':
        const tempInfo = await getTemperatureInfo();
        return tempInfo;
        
      default:
        return "❌ Unknown system information type. Available: cpu, memory, disk, processes, network, system, battery, temp";
    }
  } catch (error) {
    console.error("System info error:", error);
    return `❌ Error getting ${infoType} information: ${error.message}`;
  }
}

// Helper functions for system monitoring
async function getCPUUsage() {
  return new Promise((resolve) => {
    const startMeasures = getCPUInfo();
    setTimeout(() => {
      const endMeasures = getCPUInfo();
      const usage = calculateCPUPercentage(startMeasures, endMeasures);
      resolve(Math.round(usage));
    }, 100);
  });
}

function getCPUInfo() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  
  for (let cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  
  return { user, nice, sys, idle, irq };
}

function calculateCPUPercentage(start, end) {
  const startTotal = start.user + start.nice + start.sys + start.idle + start.irq;
  const endTotal = end.user + end.nice + end.sys + end.idle + end.irq;
  
  const startIdle = start.idle;
  const endIdle = end.idle;
  
  const total = endTotal - startTotal;
  const idle = endIdle - startIdle;
  
  return (100 - (100 * idle / total));
}

async function getDiskSpace() {
  return new Promise((resolve) => {
    exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
      if (error) {
        resolve("❌ Could not retrieve disk information");
        return;
      }
      
      const lines = stdout.trim().split('\n');
      let diskInfo = "💾 **Disk Information:**\n";
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 3) {
          const drive = parts[0];
          const freeSpace = Math.round(parseInt(parts[1]) / 1024 / 1024 / 1024);
          const totalSpace = Math.round(parseInt(parts[2]) / 1024 / 1024 / 1024);
          const usedSpace = totalSpace - freeSpace;
          const usagePercent = Math.round((usedSpace / totalSpace) * 100);
          
          diskInfo += `• Drive ${drive}: ${usedSpace}GB used / ${totalSpace}GB total (${usagePercent}% used)\n`;
        }
      }
      
      resolve(diskInfo);
    });
  });
}

async function getRunningProcesses() {
  return new Promise((resolve) => {
    exec('tasklist /fo csv | findstr /v "Image Name" | head -10', (error, stdout) => {
      if (error) {
        resolve("❌ Could not retrieve process information");
        return;
      }
      
      const lines = stdout.trim().split('\n');
      let processInfo = "⚙️ **Top Running Processes:**\n";
      
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
          const name = parts[0].replace(/"/g, '');
          const pid = parts[1].replace(/"/g, '');
          processInfo += `• ${name} (PID: ${pid})\n`;
        }
      }
      
      resolve(processInfo);
    });
  });
}

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  let networkInfo = "🌐 **Network Information:**\n";
  
  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((networkInterface) => {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        networkInfo += `• ${name}: ${networkInterface.address} (${networkInterface.mac})\n`;
      }
    });
  });
  
  return networkInfo;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${days}d ${hours}h ${minutes}m`;
}

async function getBatteryInfo() {
  return new Promise((resolve) => {
    exec('wmic path Win32_Battery get BatteryStatus,EstimatedChargeRemaining', (error, stdout) => {
      if (error) {
        resolve("🔋 **Battery Information:** Desktop computer (no battery detected)");
        return;
      }
      
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        const status = parts[0] === '2' ? 'Charging' : parts[0] === '1' ? 'Discharging' : 'Unknown';
        const charge = parts[1] || 'Unknown';
        resolve(`🔋 **Battery Information:**\n• Status: ${status}\n• Charge Remaining: ${charge}%`);
      } else {
        resolve("🔋 **Battery Information:** Desktop computer (no battery detected)");
      }
    });
  });
}

async function getTemperatureInfo() {
  return new Promise((resolve) => {
    exec('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature', (error, stdout) => {
      if (error) {
        resolve("🌡️ **Temperature Information:** Not available on this system");
        return;
      }
      
      const lines = stdout.trim().split('\n');
      if (lines.length > 1 && lines[1].trim()) {
        const tempKelvin = parseInt(lines[1].trim()) / 10;
        const tempCelsius = Math.round(tempKelvin - 273.15);
        const tempFahrenheit = Math.round((tempCelsius * 9/5) + 32);
        resolve(`🌡️ **Temperature Information:**\n• CPU: ${tempCelsius}°C (${tempFahrenheit}°F)`);
      } else {
        resolve("🌡️ **Temperature Information:** Not available on this system");
      }
    });
  });
}

// Quick actions for productivity
async function performQuickAction(actionType) {
  switch (actionType) {
    case 'focus_mode':
      return "🎯 **Focus Mode Activated!**\n• Closing distracting apps\n• Setting Do Not Disturb\n• Opening productivity tools";
      
    case 'break_time':
      return "☕ **Break Time!**\n• Step away from screen\n• Stretch and hydrate\n• Take deep breaths";
      
    case 'coding_setup':
      return "💻 **Coding Environment Ready!**\n• Opening VS Code\n• Starting development servers\n• Organizing workspace";
      
    case 'study_mode':
      return "📚 **Study Mode Activated!**\n• Blocking social media\n• Opening study materials\n• Setting focus timer";
      
    case 'gaming_mode':
      return "🎮 **Gaming Mode Ready!**\n• Optimizing system performance\n• Closing background apps\n• Adjusting display settings";
      
    case 'meeting_mode':
      return "📹 **Meeting Mode Set!**\n• Opening video conferencing\n• Muting notifications\n• Checking camera/mic";
      
    case 'cleanup':
      return "🧹 **System Cleanup Started!**\n• Clearing temporary files\n• Organizing downloads\n• Updating software";
      
    case 'shutdown_apps':
      return "🛑 **Closing Unnecessary Apps**\n• Freeing up memory\n• Improving performance\n• Saving battery";
      
    case 'work_setup':
      return "💼 **Work Environment Ready!**\n• Opening work applications\n• Connecting to VPN\n• Loading project files";
      
    case 'social_mode':
      return "👥 **Social Mode Active!**\n• Opening social apps\n• Connecting with friends\n• Sharing updates";
      
    default:
      return "❌ Unknown quick action. Available actions: focus_mode, break_time, coding_setup, study_mode, gaming_mode, meeting_mode, cleanup, shutdown_apps, work_setup, social_mode";
  }
}

// Main command parsing with AI
async function parseCommand(command) {
  try {
    const res = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { 
          role: "system", 
          content: `You are a desktop AI agent. Parse user commands and respond with JSON containing:
          - action: "add_reminder", "show_tasks", "clear_tasks", "delete_task", "open_app", "search_web", "visit_website", "system_info", "quick_action", "chat"
          - task: description for reminders
          - time: time for reminders (convert to HH:MM format, e.g., "3pm" -> "15:00")
          - task_id: ID for deleting specific tasks
          - app: application name for opening apps
          - query: search query for web searches
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
          "remind me to call mom at 3pm" -> {"action": "add_reminder", "task": "call mom", "time": "15:00"}` 
        },
        { role: "user", content: command }
      ],
      temperature: 0.1
    });
    
    console.log("AI Response:", res.choices[0].message.content);
    return res.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw new Error("Failed to process command with AI");
  }
}

// Main command handler
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
          
          // Get the task with proper ID and schedule it immediately
          getTasks((tasks) => {
            const newTask = tasks.find(t => t.description === data.task && t.time === parsedTime);
            if (newTask) {
              scheduleReminder(newTask);
            }
          });
          
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
      // Cancel all scheduled reminders
      reminderScheduler.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      reminderScheduler.clear();
      
      clearTasks();
      callback("🗑️ All tasks cleared and reminders cancelled!");
    } else if (data.action === "delete_task") {
      if (data.task_id) {
        // Cancel the scheduled reminder
        cancelScheduledReminder(data.task_id);
        
        deleteTask(data.task_id);
        callback(`🗑️ Task ${data.task_id} deleted and reminder cancelled!`);
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
          "😊 Hi there! I'm here to help you with tasks, system monitoring, web searches, and much more!",
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
        exec(`start ${data.app}`, (error) => {
          if (error) {
            callback(`❌ Could not open ${data.app}. Make sure it's installed.`);
          } else {
            callback(`🚀 Opening ${data.app}...`);
          }
        });
      } else {
        callback("❌ Please specify which app to open.");
      }
    } else if (data.action === "search_web") {
      if (data.query) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(data.query)}`;
        exec(`start ${searchUrl}`, (error) => {
          if (error) {
            callback("❌ Could not open web browser for search.");
          } else {
            callback(`🔍 Searching for "${data.query}" in your browser...`);
          }
        });
      } else {
        callback("❌ Please specify what to search for.");
      }
    } else if (data.action === "visit_website") {
      if (data.website) {
        let url = data.website;
        
        // Add protocol if not present
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          // Common website shortcuts
          const shortcuts = {
            'gfg': 'https://geeksforgeeks.org',
            'leetcode': 'https://leetcode.com',
            'youtube': 'https://youtube.com',
            'netflix': 'https://netflix.com',
            'github': 'https://github.com',
            'amazon': 'https://amazon.com',
            'google': 'https://google.com',
            'stackoverflow': 'https://stackoverflow.com',
            'reddit': 'https://reddit.com',
            'twitter': 'https://twitter.com',
            'linkedin': 'https://linkedin.com',
            'facebook': 'https://facebook.com'
          };
          
          url = shortcuts[url.toLowerCase()] || `https://${url}`;
        }
        
        exec(`start ${url}`, (error) => {
          if (error) {
            callback(`❌ Could not open ${data.website}.`);
          } else {
            callback(`🌐 Opening ${data.website}...`);
          }
        });
      } else {
        callback("❌ Please specify which website to visit.");
      }
    } else if (data.action === "system_info") {
      if (data.info_type) {
        const info = await getSystemInfo(data.info_type);
        callback(info);
      } else {
        callback("❌ Please specify what system information you want: cpu, memory, disk, processes, network, system, battery, temp");
      }
    } else if (data.action === "quick_action") {
      if (data.action_type) {
        const result = await performQuickAction(data.action_type);
        callback(result);
      } else {
        callback("❌ Please specify which quick action: focus_mode, break_time, coding_setup, study_mode, gaming_mode, meeting_mode, cleanup, shutdown_apps, work_setup, social_mode");
      }
    } else {
      callback("🤔 I'm not sure how to handle that command yet. Try:\n• 'remind me to [task] at [time]'\n• 'show my tasks'\n• 'open [app name]'\n• 'search [query]'\n• 'visit [website]'\n• 'check [system info]'\n• 'focus mode' or other quick actions\n• Or just chat with me!");
    }
  } catch (err) {
    console.error("Command handling error:", err);
    callback("❌ Sorry, I had trouble understanding that command. Please try again.");
  }
}
