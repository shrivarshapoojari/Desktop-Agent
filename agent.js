import Groq from "groq-sdk";
import { addTask, getTasks, deleteTask, clearTasks } from "./db.js";
import { exec } from "child_process";
import dotenv from "dotenv";

dotenv.config();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseCommand(command) {
  try {
    const res = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { 
          role: "system", 
          content: `You are a desktop AI agent. Parse user commands and respond with JSON containing:
          - action: "add_reminder", "show_tasks", "clear_tasks", "delete_task", "open_app", "search_web", "unknown"
          - task: description for reminders
          - time: time for reminders (format: "HH:MM" or "today at HH:MM")
          - app: application name for opening apps (calculator, notepad, paint, browser, etc.)
          - task_id: ID for deleting specific tasks
          - query: search term for web searches
          - search_type: "google", "youtube", "wikipedia", "github", "stackoverflow", "images", "news", "maps" (default: "google")
          
          Examples:
          "remind me to call mom at 3pm" -> {"action": "add_reminder", "task": "call mom", "time": "15:00"}
          "search for javascript tutorials" -> {"action": "search_web", "query": "javascript tutorials", "search_type": "google"}
          "youtube javascript tutorials" -> {"action": "search_web", "query": "javascript tutorials", "search_type": "youtube"}
          "wikipedia albert einstein" -> {"action": "search_web", "query": "albert einstein", "search_type": "wikipedia"}
          "github react components" -> {"action": "search_web", "query": "react components", "search_type": "github"}
          "stackoverflow error handling" -> {"action": "search_web", "query": "error handling", "search_type": "stackoverflow"}
          "search images of cats" -> {"action": "search_web", "query": "cats", "search_type": "images"}
          "news about AI" -> {"action": "search_web", "query": "AI", "search_type": "news"}
          "maps to central park" -> {"action": "search_web", "query": "central park", "search_type": "maps"}
          "clear all tasks" -> {"action": "clear_tasks"}` 
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

export async function handleCommand(command, callback) {
  try {
    const parsed = await parseCommand(command);
    const data = JSON.parse(parsed);

    if (data.action === "add_reminder") {
      if (data.task && data.time) {
        addTask(data.task, data.time);
        callback(`✅ Reminder set: "${data.task}" at ${data.time}`);
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
    } else if (data.action === "open_app") {
      if (data.app) {
        const appName = data.app.toLowerCase();
        
        // Reliable Windows built-in apps
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
        
        // Try built-in apps first
        if (builtInApps[appName]) {
          exec(`start ${builtInApps[appName]}`, (error) => {
            if (!error) {
              callback(`🚀 Opening ${data.app}...`);
            } else {
              callback(`❌ Could not open ${data.app}. Try: calculator, notepad, paint, file explorer, settings`);
            }
          });
          return;
        }
        
        // For third-party apps, try to find them
        if (appName === 'whatsapp') {
          // Multiple ways to try WhatsApp
          exec(`powershell -command "Start-Process 'WhatsApp'"`, (error1) => {
            if (!error1) {
              callback(`🚀 Opening WhatsApp...`);
            } else {
              exec(`start whatsapp:`, (error2) => {
                if (!error2) {
                  callback(`🚀 Opening WhatsApp...`);
                } else {
                  callback(`❌ WhatsApp not found. Please install WhatsApp from Microsoft Store or visit web.whatsapp.com in your browser.`);
                }
              });
            }
          });
          return;
        }
        
        if (appName === 'chrome') {
          exec(`start chrome`, (error) => {
            if (!error) {
              callback(`🚀 Opening Chrome...`);
            } else {
              callback(`❌ Chrome not found. Try 'open browser' for Edge instead.`);
            }
          });
          return;
        }
        
        if (appName === 'spotify') {
          exec(`start spotify:`, (error) => {
            if (!error) {
              callback(`🚀 Opening Spotify...`);
            } else {
              callback(`❌ Spotify not found. Please install Spotify from Microsoft Store.`);
            }
          });
          return;
        }
        
        // Generic fallback for any other app
        exec(`start ${data.app}`, (error) => {
          if (!error) {
            callback(`🚀 Opening ${data.app}...`);
          } else {
            callback(`❌ Could not open ${data.app}.\n\n✅ **Built-in apps that always work:**\n🧮 calculator, 📝 notepad, 🎨 paint\n🌐 browser, 📁 file explorer, ⚙️ settings\n\n💡 **For other apps:** Make sure they're installed first!`);
          }
        });
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
    } else {
      callback("🤔 I'm not sure how to handle that command yet. Try:\n\n📝 **Tasks:**\n• 'remind me to [task] at [time]'\n• 'show my tasks' / 'clear all tasks'\n\n🔍 **Search:**\n• 'search for [anything]'\n• 'youtube [topic]' / 'wikipedia [topic]'\n• 'github [project]' / 'stackoverflow [problem]'\n• 'images of [subject]' / 'news about [topic]'\n\n🚀 **Apps:**\n• 'open calculator' / 'open notepad'\n• 'open browser' / 'open file explorer'");
    }
  } catch (err) {
    console.error("Command handling error:", err);
    callback("❌ Sorry, I had trouble understanding that command. Please try again.");
  }
}
