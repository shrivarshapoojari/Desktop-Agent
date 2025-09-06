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
          - action: "add_reminder", "show_tasks", "clear_tasks", "delete_task", "open_app", "search_web", "visit_website", "unknown"
          - task: description for reminders
          - time: time for reminders (format: "HH:MM" or "today at HH:MM")
          - app: application name for DESKTOP apps only (calculator, notepad, paint, browser, etc.)
          - task_id: ID for deleting specific tasks
          - query: search term for web searches
          - search_type: "google", "youtube", "wikipedia", "github", "stackoverflow", "images", "news", "maps" (default: "google")
          - website: website shortcut or URL for direct visits
          
          IMPORTANT DISTINCTION:
          - Use "open_app" ONLY for desktop applications like calculator, notepad, paint, browser
          - Use "visit_website" for websites like gfg, leetcode, youtube, netflix, github, amazon, etc.
          - Use "search_web" when user wants to search for something
          
          Examples:
          "open calculator" -> {"action": "open_app", "app": "calculator"}
          "open notepad" -> {"action": "open_app", "app": "notepad"}
          "open browser" -> {"action": "open_app", "app": "browser"}
          
          "open gfg" -> {"action": "visit_website", "website": "gfg"}
          "visit leetcode" -> {"action": "visit_website", "website": "leetcode"}
          "open leetcode" -> {"action": "visit_website", "website": "leetcode"}
          "go to github" -> {"action": "visit_website", "website": "github"}
          "open netflix" -> {"action": "visit_website", "website": "netflix"}
          "visit amazon" -> {"action": "visit_website", "website": "amazon"}
          "open youtube" -> {"action": "visit_website", "website": "youtube"}
          
          "search for javascript tutorials" -> {"action": "search_web", "query": "javascript tutorials"}
          "youtube javascript tutorials" -> {"action": "search_web", "query": "javascript tutorials", "search_type": "youtube"}
          
          "remind me to call mom at 3pm" -> {"action": "add_reminder", "task": "call mom", "time": "15:00"}
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
    } else {
      callback("🤔 I'm not sure how to handle that command yet. Try:\n\n📝 **Tasks:**\n• 'remind me to [task] at [time]'\n• 'show my tasks' / 'clear all tasks'\n\n🔍 **Search:**\n• 'search for [anything]'\n• 'youtube [topic]' / 'wikipedia [topic]'\n• 'github [project]' / 'stackoverflow [problem]'\n\n🌐 **Visit Websites:**\n• 'open gfg' / 'visit leetcode'\n• 'go to youtube' / 'open netflix'\n• 'visit amazon' / 'open gmail'\n\n🚀 **Apps:**\n• 'open calculator' / 'open notepad'");
    }
  } catch (err) {
    console.error("Command handling error:", err);
    callback("❌ Sorry, I had trouble understanding that command. Please try again.");
  }
}
