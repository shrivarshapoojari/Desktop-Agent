import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Command Parser Module
 * Handles AI-powered command parsing and natural language processing
 */
class CommandParser {
  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.conversationHistory = [];
    this.maxHistoryLength = 10; // Keep last 10 interactions for context
  }

  /**
   * Parse user command using AI
   * @param {string} command - User command to parse
   * @returns {Promise<Object>} Parsed command object
   */
  async parseCommand(command) {
    try {
      const response = await this.client.chat.completions.create({
        model:  "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: this.getSystemPrompt()
          },
          ...this.getRecentHistory(),
          { role: "user", content: command }
        ],
        temperature: 0.1,
        max_tokens: 500
      });
      
      const parsed = response.choices[0].message.content;
      console.log("AI Response:", parsed);
      
      // Add to conversation history
      this.addToHistory('user', command);
      this.addToHistory('assistant', parsed);
      
      return JSON.parse(parsed);
    } catch (error) {
      console.error("Error calling Groq API:", error);
      throw new Error("Failed to process command with AI");
    }
  }

  /**
   * Get system prompt for AI command parsing
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    return `You are a desktop AI agent. Parse user commands and respond with JSON containing:
    - action: "add_reminder", "show_tasks", "clear_tasks", "delete_task", "open_app", "search_web", "visit_website", "system_info", "quick_action", "weather", "news", "news_search", "news_discuss", "news_insights", "news_recommendations", "news_sentiment", "daily_briefing", "weather_activity", "screen_analysis", "analyze_screen", "see_screen", "what_on_screen", "chat"
    - task: description for reminders
    - time: time for reminders (convert to HH:MM format, e.g., "3pm" -> "15:00")
    - task_id: ID for deleting specific tasks
    - app: application name for opening apps
    - query: search query for web searches, news searches, or screen analysis
    - website: website shortcut or URL for direct visits
    - info_type: "cpu", "memory", "disk", "processes", "network", "system", "battery", "temp" for system information
    - action_type: "focus_mode", "break_time", "coding_setup", "study_mode", "gaming_mode", "meeting_mode", "cleanup", "shutdown_apps", "work_setup", "social_mode"
    - location: city/location for weather (optional, will auto-detect if not provided)
    - category: news category - "general", "technology", "business", "science", "health", "india"
    - topic: topic for news discussion
    - activity: activity type for weather advice - "running", "cycling", "picnic", etc.
    - message: for casual conversation responses or screen analysis queries
    
    IMPORTANT DISTINCTIONS:
    - Use "chat" for greetings, casual questions, compliments, or general conversation
    - Use "screen_analysis"/"analyze_screen"/"see_screen"/"what_on_screen" for screen analysis requests like "what's on my screen?", "analyze my screen", "see what's displayed", "click the blue button", "find all buttons", "extract text from screen"
    - Use "open_app" ONLY for desktop applications like calculator, notepad, paint, browser
    - Use "visit_website" for websites like gfg, leetcode, youtube, netflix, github, amazon, etc.
    - Use "search_web" when user wants to search for something on the web
    - Use "system_info" for system monitoring requests
    - Use "quick_action" for workflow shortcuts and automation
    - Use "weather" for weather information requests
    - Use "news" for general news headlines with AI analysis
    - Use "news_search" for specific news topic searches
    - Use "news_discuss" when user wants to discuss or understand a news topic
    - Use "news_insights" for learning opportunities from current events
    - Use "news_recommendations" for personalized news suggestions
    - Use "news_sentiment" for emotional analysis of current news
    - Use "daily_briefing" for combined weather and news summary
    - Use "weather_activity" for activity-specific weather advice
    
    Examples:
    "hello" -> {"action": "chat", "message": "Hello! How can I help you today?"}
    "how are you" -> {"action": "chat", "message": "I'm doing great! Ready to help you with any tasks."}
    "what's on my screen?" -> {"action": "screen_analysis", "query": "what's on my screen?"}
    "analyze my screen" -> {"action": "screen_analysis", "query": "analyze my screen"}
    "can you see my screen?" -> {"action": "screen_analysis", "query": "can you see my screen?"}
    "what is on the screen?" -> {"action": "screen_analysis", "query": "what is on the screen?"}
    "describe what's displayed" -> {"action": "screen_analysis", "query": "describe what's displayed"}
    "find all buttons on screen" -> {"action": "screen_analysis", "query": "find all buttons on screen"}
    "click the blue button" -> {"action": "screen_analysis", "query": "click the blue button"}
    "extract text from screen" -> {"action": "screen_analysis", "query": "extract text from screen"}
    "what's the weather" -> {"action": "weather"}
    "weather in London" -> {"action": "weather", "location": "London"}
    "show me news" -> {"action": "news"}
    "search news about AI" -> {"action": "news_search", "query": "AI"}
    "discuss climate change news" -> {"action": "news_discuss", "topic": "climate change"}
    "what can I learn from current events" -> {"action": "news_insights"}
    "recommend news for me" -> {"action": "news_recommendations"}
    "how is the news mood today" -> {"action": "news_sentiment"}
    "tech news" -> {"action": "news", "category": "technology"}
    "india news" -> {"action": "news", "category": "india"}
    "business news from india" -> {"action": "news", "category": "business"}
    "daily briefing" -> {"action": "daily_briefing"}
    "weather for running" -> {"action": "weather_activity", "activity": "running"}
    "focus mode" -> {"action": "quick_action", "action_type": "focus_mode"}
    "check cpu usage" -> {"action": "system_info", "info_type": "cpu"}
    "remind me to call mom at 3pm" -> {"action": "add_reminder", "task": "call mom", "time": "15:00"}`;
  }

  /**
   * Add interaction to conversation history
   * @param {string} role - Role (user/assistant)
   * @param {string} content - Message content
   */
  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });
    
    // Keep only recent history
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
    }
  }

  /**
   * Get recent conversation history for context
   * @returns {Array} Recent conversation messages
   */
  getRecentHistory() {
    // Return last few interactions for context (excluding system messages)
    return this.conversationHistory.slice(-6);
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log("Conversation history cleared");
  }

  /**
   * Get conversation statistics
   * @returns {Object} Conversation statistics
   */
  getStats() {
    const userMessages = this.conversationHistory.filter(msg => msg.role === 'user').length;
    const assistantMessages = this.conversationHistory.filter(msg => msg.role === 'assistant').length;
    
    return {
      totalInteractions: this.conversationHistory.length,
      userMessages,
      assistantMessages,
      historyLength: this.conversationHistory.length
    };
  }

  /**
   * Analyze command intent without full parsing
   * @param {string} command - Command to analyze
   * @returns {string} Detected intent
   */
  analyzeIntent(command) {
    const lowerCommand = command.toLowerCase().trim();
    
    // Quick intent detection patterns
    const intentPatterns = {
      reminder: /remind|reminder|alert|notify/,
      task: /task|todo|show.*task/,
      system: /cpu|memory|disk|process|network|system|battery|temp|performance/,
      app: /open|launch|start.*app|calculator|notepad|paint/,
      web: /search|google|find|look.*up/,
      website: /youtube|github|netflix|amazon|facebook|twitter|reddit/,
      action: /focus|break|study|gaming|meeting|cleanup|work|social/,
      chat: /hello|hi|hey|thanks|thank you|how are you|good morning|good evening/
    };

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(lowerCommand)) {
        return intent;
      }
    }

    return 'unknown';
  }

  /**
   * Validate parsed command structure
   * @param {Object} parsed - Parsed command object
   * @returns {boolean} True if valid structure
   */
  validateCommand(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    if (!parsed.action) return false;

    const validActions = [
      'add_reminder', 'show_tasks', 'clear_tasks', 'delete_task',
      'open_app', 'search_web', 'visit_website', 'system_info',
      'quick_action', 'weather', 'news', 'news_search', 'news_discuss', 
      'news_insights', 'news_recommendations', 'news_sentiment',
      'daily_briefing', 'weather_activity', 'screen_analysis', 
      'analyze_screen', 'see_screen', 'what_on_screen', 'chat'
    ];

    return validActions.includes(parsed.action);
  }

  /**
   * Get command suggestions based on partial input
   * @param {string} partial - Partial command input
   * @returns {Array} Array of command suggestions
   */
  getSuggestions(partial) {
    const suggestions = [
      "remind me to call mom at 3pm",
      "show my tasks",
      "what's the weather",
      "show me news",
      "tech news",
      "daily briefing",
      "weather for running",
      "check cpu usage",
      "open calculator",
      "search for recipes",
      "visit youtube",
      "focus mode",
      "break time",
      "study mode",
      "gaming mode",
      "check memory usage",
      "open notepad",
      "clear all tasks"
    ];

    if (!partial || partial.length < 2) {
      return suggestions.slice(0, 5);
    }

    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(partial.toLowerCase())
    );

    return filtered.slice(0, 5);
  }

  /**
   * Handle parsing errors gracefully
   * @param {string} command - Original command
   * @param {Error} error - Error that occurred
   * @returns {Object} Fallback command object
   */
  handleParsingError(command, error) {
    console.error("Command parsing error:", error);
    
    // Return a chat fallback for unknown commands
    return {
      action: "chat",
      message: "I'm sorry, I didn't understand that command. Could you please rephrase it or try one of these: 'remind me to...', 'show my tasks', 'check cpu usage', 'open calculator', or just say hello!"
    };
  }

  /**
   * Process command with error handling and validation
   * @param {string} command - User command
   * @returns {Promise<Object>} Processed command object
   */
  async processCommand(command) {
    try {
      if (!command || command.trim().length === 0) {
        return {
          action: "chat",
          message: "Hello! How can I help you today?"
        };
      }

      const parsed = await this.parseCommand(command);
      
      if (this.validateCommand(parsed)) {
        return parsed;
      } else {
        console.warn("Invalid command structure:", parsed);
        return this.handleParsingError(command, new Error("Invalid command structure"));
      }
    } catch (error) {
      return this.handleParsingError(command, error);
    }
  }
}

// Export singleton instance
export const commandParser = new CommandParser();
