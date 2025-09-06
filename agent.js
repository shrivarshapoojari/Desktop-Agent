/**
 * Modular Desktop Agent
 * Main orchestrator that brings together all modules for scalable architecture
 */

// Import all modules
import { reminderSystem } from "./modules/ReminderSystem.js";
import { systemMonitor } from "./modules/SystemMonitor.js";
import { quickActions } from "./modules/QuickActions.js";
import { commandParser } from "./modules/CommandParser.js";
import { utils } from "./modules/Utils.js";
import { weatherNewsSystem } from "./modules/WeatherNews.js";
import { getTasks, deleteTask } from "./db.js";
import { exec } from "child_process";

/**
 * Main Agent Class
 * Orchestrates all modules and handles command routing
 */
class DesktopAgent {
  constructor() {
    this.isInitialized = false;
    this.stats = {
      commandsProcessed: 0,
      remindersTriggered: 0,
      systemQueriesHandled: 0,
      quickActionsPerformed: 0,
      startTime: new Date()
    };
  }

  /**
   * Initialize the desktop agent with all modules
   * @param {Function} notificationCallback - Callback for notifications
   */
  initialize(notificationCallback) {
    if (this.isInitialized) {
      console.log("⚠️ Agent already initialized");
      return;
    }

    console.log("🚀 Initializing Modular Desktop Agent...");

    // Initialize reminder system
    reminderSystem.initialize(notificationCallback);

    // Set initialization flag
    this.isInitialized = true;

    console.log("✅ Modular Desktop Agent initialized successfully!");
    console.log("📊 Available modules: ReminderSystem, SystemMonitor, QuickActions, CommandParser, Utils");
  }

  /**
   * Handle incoming commands by routing to appropriate modules
   * @param {string} command - User command
   * @param {Function} callback - Response callback
   */
  async handleCommand(command, callback) {
    if (!this.isInitialized) {
      callback("❌ Agent not initialized. Please restart the application.");
      return;
    }

    try {
      // Update stats
      this.stats.commandsProcessed++;

      // Parse command using AI
      const parsedCommand = await commandParser.processCommand(command);
      
      // Route to appropriate module based on action
      await this.routeCommand(parsedCommand, callback);

    } catch (error) {
      console.error("Command handling error:", error);
      callback("❌ Sorry, I encountered an error processing that command. Please try again.");
    }
  }

  /**
   * Route parsed commands to appropriate modules
   * @param {Object} parsedCommand - Parsed command object
   * @param {Function} callback - Response callback
   */
  async routeCommand(parsedCommand, callback) {
    const { action } = parsedCommand;

    switch (action) {
      case 'add_reminder':
        await this.handleAddReminder(parsedCommand, callback);
        break;
      
      case 'show_tasks':
        this.handleShowTasks(callback);
        break;
      
      case 'clear_tasks':
        this.handleClearTasks(callback);
        break;
      
      case 'delete_task':
        this.handleDeleteTask(parsedCommand, callback);
        break;
      
      case 'system_info':
        await this.handleSystemInfo(parsedCommand, callback);
        break;
      
      case 'quick_action':
        await this.handleQuickAction(parsedCommand, callback);
        break;
      
      case 'weather':
        await this.handleWeather(parsedCommand, callback);
        break;
      
      case 'news':
        await this.handleNews(parsedCommand, callback);
        break;
      
      case 'news_search':
        await this.handleNewsSearch(parsedCommand, callback);
        break;
      
      case 'news_discuss':
        await this.handleNewsDiscussion(parsedCommand, callback);
        break;
      
      case 'news_insights':
        await this.handleNewsInsights(parsedCommand, callback);
        break;
      
      case 'news_recommendations':
        await this.handleNewsRecommendations(parsedCommand, callback);
        break;
      
      case 'news_sentiment':
        await this.handleNewsSentiment(parsedCommand, callback);
        break;
      
      case 'daily_briefing':
        await this.handleDailyBriefing(parsedCommand, callback);
        break;
      
      case 'weather_activity':
        await this.handleWeatherActivity(parsedCommand, callback);
        break;
      
      case 'open_app':
        this.handleOpenApp(parsedCommand, callback);
        break;
      
      case 'search_web':
        this.handleWebSearch(parsedCommand, callback);
        break;
      
      case 'visit_website':
        this.handleVisitWebsite(parsedCommand, callback);
        break;
      
      case 'chat':
        this.handleChat(parsedCommand, callback);
        break;
      
      default:
        callback("🤔 I'm not sure how to handle that command. Try asking me to set reminders, check system info, or perform quick actions!");
    }
  }

  /**
   * Handle adding a new reminder
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleAddReminder(parsedCommand, callback) {
    const { task, time } = parsedCommand;
    
    if (!task || !time) {
      callback("❌ Please specify both task and time for the reminder.");
      return;
    }

    const parsedTime = utils.parseTimeFormat(time);
    if (!parsedTime) {
      callback("❌ Invalid time format. Use formats like '3pm', '15:30', '2:30pm', etc.");
      return;
    }

    try {
      reminderSystem.addReminder(task, parsedTime);
      callback(`✅ Reminder set: "${task}" at ${parsedTime}`);
    } catch (error) {
      callback("❌ Failed to set reminder. Please try again.");
    }
  }

  /**
   * Handle showing all tasks
   * @param {Function} callback - Response callback
   */
  handleShowTasks(callback) {
    getTasks((tasks) => {
      if (tasks.length === 0) {
        callback("📝 No tasks found. You're all caught up!");
      } else {
        const taskList = tasks.map(t => `${t.id}. ${t.description} @ ${t.time}`).join("\n");
        callback(`📋 Your Tasks:\n${taskList}`);
      }
    });
  }

  /**
   * Handle clearing all tasks
   * @param {Function} callback - Response callback
   */
  handleClearTasks(callback) {
    reminderSystem.clearAll();
    callback("🗑️ All tasks cleared and reminders cancelled!");
  }

  /**
   * Handle deleting a specific task
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  handleDeleteTask(parsedCommand, callback) {
    const { task_id } = parsedCommand;
    
    if (!task_id) {
      callback("❌ Please specify which task to delete.");
      return;
    }

    try {
      reminderSystem.cancelReminder(task_id);
      deleteTask(task_id);
      callback(`🗑️ Task ${task_id} deleted and reminder cancelled!`);
    } catch (error) {
      callback("❌ Failed to delete task. Please check the task ID.");
    }
  }

  /**
   * Handle system information requests
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleSystemInfo(parsedCommand, callback) {
    const { info_type } = parsedCommand;
    
    if (!info_type) {
      callback("❌ Please specify what system information you want: cpu, memory, disk, processes, network, system, battery, temp");
      return;
    }

    try {
      this.stats.systemQueriesHandled++;
      const info = await systemMonitor.getSystemInfo(info_type);
      callback(info);
    } catch (error) {
      callback(`❌ Failed to get ${info_type} information.`);
    }
  }

  /**
   * Handle quick actions
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleQuickAction(parsedCommand, callback) {
    const { action_type } = parsedCommand;
    
    if (!action_type) {
      callback(quickActions.getAvailableActions());
      return;
    }

    try {
      this.stats.quickActionsPerformed++;
      const result = await quickActions.performAction(action_type);
      callback(result);
    } catch (error) {
      callback(`❌ Failed to perform ${action_type} action.`);
    }
  }

  /**
   * Handle weather requests
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleWeather(parsedCommand, callback) {
    const { location } = parsedCommand;
    
    try {
      const weather = await weatherNewsSystem.getWeather(location);
      callback(weather);
    } catch (error) {
      callback("❌ Failed to get weather information.");
    }
  }

  /**
   * Handle news requests with AI-powered analysis
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleNews(parsedCommand, callback) {
    const { category, query } = parsedCommand;
    
    try {
      const news = await weatherNewsSystem.getNews(category || "general", query);
      callback(news);
    } catch (error) {
      callback("❌ Failed to get intelligent news analysis.");
    }
  }

  /**
   * Handle intelligent news search
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleNewsSearch(parsedCommand, callback) {
    const { query } = parsedCommand;
    
    if (!query) {
      callback("❌ Please specify what news topic you'd like to search for.");
      return;
    }

    try {
      const searchResults = await weatherNewsSystem.searchNews(query);
      callback(searchResults);
    } catch (error) {
      callback("❌ Failed to perform intelligent news search.");
    }
  }

  /**
   * Handle news discussion
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleNewsDiscussion(parsedCommand, callback) {
    const { topic } = parsedCommand;
    
    if (!topic) {
      callback("❌ Please specify what news topic you'd like to discuss.");
      return;
    }

    try {
      const discussion = await weatherNewsSystem.discussNews(topic);
      callback(discussion);
    } catch (error) {
      callback("❌ Failed to start news discussion.");
    }
  }

  /**
   * Handle news learning insights
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleNewsInsights(parsedCommand, callback) {
    const { category } = parsedCommand;
    
    try {
      const insights = await weatherNewsSystem.getNewsLearningInsights(category || "general");
      callback(insights);
    } catch (error) {
      callback("❌ Failed to generate news learning insights.");
    }
  }

  /**
   * Handle personalized news recommendations
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleNewsRecommendations(parsedCommand, callback) {
    try {
      const recommendations = await weatherNewsSystem.getPersonalizedRecommendations();
      callback(recommendations);
    } catch (error) {
      callback("❌ Failed to generate personalized news recommendations.");
    }
  }

  /**
   * Handle news sentiment analysis
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleNewsSentiment(parsedCommand, callback) {
    const { category } = parsedCommand;
    
    try {
      const newsData = await weatherNewsSystem.fetchNewsData(category || "general");
      if (newsData) {
        const sentiment = await weatherNewsSystem.analyzeNewsSentiment(newsData);
        callback(sentiment);
      } else {
        callback("❌ No news data available for sentiment analysis.");
      }
    } catch (error) {
      callback("❌ Failed to analyze news sentiment.");
    }
  }

  /**
   * Handle daily briefing requests
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleDailyBriefing(parsedCommand, callback) {
    const { location, category } = parsedCommand;
    
    try {
      const briefing = await weatherNewsSystem.getDailyBriefing(location, category);
      callback(briefing);
    } catch (error) {
      callback("❌ Failed to generate daily briefing.");
    }
  }

  /**
   * Handle weather activity requests
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  async handleWeatherActivity(parsedCommand, callback) {
    const { activity } = parsedCommand;
    
    if (!activity) {
      callback("❌ Please specify an activity (running, cycling, picnic, etc.)");
      return;
    }

    try {
      const weatherAdvice = await weatherNewsSystem.getWeatherForActivity(activity);
      callback(weatherAdvice);
    } catch (error) {
      callback("❌ Failed to get weather advice for activity.");
    }
  }

  /**
   * Handle opening applications
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  handleOpenApp(parsedCommand, callback) {
    const { app } = parsedCommand;
    
    if (!app) {
      callback("❌ Please specify which app to open.");
      return;
    }

    exec(`start ${app}`, (error) => {
      if (error) {
        callback(`❌ Could not open ${app}. Make sure it's installed.`);
      } else {
        callback(`🚀 Opening ${app}...`);
      }
    });
  }

  /**
   * Handle web searches
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  handleWebSearch(parsedCommand, callback) {
    const { query } = parsedCommand;
    
    if (!query) {
      callback("❌ Please specify what to search for.");
      return;
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    exec(`start ${searchUrl}`, (error) => {
      if (error) {
        callback("❌ Could not open web browser for search.");
      } else {
        callback(`🔍 Searching for "${query}" in your browser...`);
      }
    });
  }

  /**
   * Handle visiting websites
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  handleVisitWebsite(parsedCommand, callback) {
    const { website } = parsedCommand;
    
    if (!website) {
      callback("❌ Please specify which website to visit.");
      return;
    }

    let url = website;
    
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
        callback(`❌ Could not open ${website}.`);
      } else {
        callback(`🌐 Opening ${website}...`);
      }
    });
  }

  /**
   * Handle chat/conversation
   * @param {Object} parsedCommand - Parsed command
   * @param {Function} callback - Response callback
   */
  handleChat(parsedCommand, callback) {
    const { message } = parsedCommand;
    
    if (message) {
      callback(message);
    } else {
      // Fallback friendly responses
      const friendlyResponses = [
        "😊 Hi there! I'm here to help you with tasks, system monitoring, web searches, and much more!",
        "👋 Hello! What can I do for you today?",
        "🤖 Hey! I'm your desktop assistant. Try asking me to check system status or set up your workspace!",
        "✨ Hi! I can help you be more productive. Try 'focus mode' or 'check cpu usage'!",
        "🌟 Hello! I'm here to assist with your daily tasks. What would you like to do?"
      ];
      const randomResponse = utils.getRandomElement(friendlyResponses);
      callback(randomResponse);
    }
  }

  /**
   * Get agent statistics and status
   * @returns {Object} Agent statistics
   */
  getStats() {
    const uptime = new Date() - this.stats.startTime;
    const parserStats = commandParser.getStats();
    
    return {
      ...this.stats,
      uptime: utils.formatDuration(uptime / 1000),
      isInitialized: this.isInitialized,
      modules: {
        reminderSystem: "active",
        systemMonitor: "active", 
        quickActions: "active",
        commandParser: "active",
        utils: "active"
      },
      conversation: parserStats
    };
  }

  /**
   * Shutdown the agent gracefully
   */
  shutdown() {
    console.log("🛑 Shutting down Desktop Agent...");
    
    // Stop reminder system
    reminderSystem.stop();
    
    // Clear command parser history
    commandParser.clearHistory();
    
    // Reset stats
    this.stats = {
      commandsProcessed: 0,
      remindersTriggered: 0,
      systemQueriesHandled: 0,
      quickActionsPerformed: 0,
      startTime: new Date()
    };
    
    this.isInitialized = false;
    
    console.log("✅ Desktop Agent shutdown complete");
  }

  /**
   * Get help information
   * @returns {string} Help text
   */
  getHelp() {
    return `🤖 **Desktop Agent Help**

**Reminders:**
• "remind me to [task] at [time]" - Set a reminder
• "show my tasks" - View all reminders
• "delete task [id]" - Remove a specific reminder
• "clear all tasks" - Remove all reminders

**Weather & News:**
• "what's the weather" - Current weather (auto-detects location)
• "weather in [city]" - Weather for specific location
• "show news" - AI-curated global news headlines
• "india news" - Latest news from Indian sources
• "tech news" - Technology news with analysis
• "business news" - Business updates with insights
• "search news about [topic]" - Intelligent news search
• "discuss [news topic]" - Deep dive into news topics
• "recommend news for me" - Personalized news suggestions
• "what can I learn from current events" - Learning insights
• "how is the news mood today" - Sentiment analysis
• "daily briefing" - Combined weather and news with AI insights
• "weather for running" - Activity-specific weather advice

**System Monitoring:**
• "check cpu usage" - View CPU information
• "check memory" - View memory usage
• "check disk space" - View disk information
• "show running processes" - View active processes
• "check network" - View network interfaces
• "check battery" - View battery status (laptops)

**Quick Actions:**
• "focus mode" - Eliminate distractions
• "break time" - Take a healthy break
• "study mode" - Optimize for learning
• "gaming mode" - Enhance performance
• "work setup" - Professional workspace
• "cleanup" - Clean system files

**Applications & Web:**
• "open [app]" - Launch applications
• "search [query]" - Web search
• "visit [website]" - Open websites

**Conversation:**
• Just chat naturally! I can respond to greetings and casual conversation.

Example: "remind me to call mom at 3pm", "what's the weather", or "show tech news"`;
  }
}

// Create and export singleton instance
const desktopAgent = new DesktopAgent();

// Export main functions for compatibility with existing code
export function initializeReminderSystem(callback) {
  desktopAgent.initialize(callback);
}

export async function handleCommand(command, callback) {
  await desktopAgent.handleCommand(command, callback);
}

export function stopReminderSystem() {
  desktopAgent.shutdown();
}

// Export agent instance for advanced usage
export { desktopAgent };

// Export individual modules for direct access if needed
export {
  reminderSystem,
  systemMonitor,
  quickActions,
  commandParser,
  utils,
  weatherNewsSystem
};
