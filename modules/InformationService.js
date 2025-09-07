import { weatherService } from './WeatherService.js';
import { newsAgent } from './NewsAgent.js';
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Unified Information Service
 * Orchestrates weather and news services with intelligent routing
 */
export class InformationService {
  constructor() {
    this.aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.weatherService = weatherService;
    this.newsAgent = newsAgent;
  }

  /**
   * Get weather information
   * @param {string} location - Location for weather
   * @returns {Promise<string>} Weather information
   */
  async getWeather(location = null) {
    return await this.weatherService.getWeather(location);
  }

  /**
   * Get extended weather forecast
   * @param {string} location - Location for forecast
   * @param {number} days - Number of days
   * @returns {Promise<string>} Extended forecast
   */
  async getWeatherForecast(location = null, days = 3) {
    return await this.weatherService.getExtendedForecast(location, days);
  }

  /**
   * Get news with agentic approach
   * @param {string} category - News category
   * @param {string} query - Specific query
   * @returns {Promise<string>} News content
   */
  async getNews(category = "general", query = null) {
    return await this.newsAgent.getNews(category, query);
  }

  /**
   * Search news intelligently
   * @param {string} query - Search query
   * @returns {Promise<string>} Search results
   */
  async searchNews(query) {
    return await this.newsAgent.searchNews(query);
  }

  /**
   * Get personalized news recommendations
   * @returns {Promise<string>} Personalized recommendations
   */
  async getNewsRecommendations() {
    return await this.newsAgent.getRecommendations();
  }

  /**
   * Generate daily briefing with both weather and news
   * @param {string} location - Location for weather
   * @param {string} newsCategory - News category preference
   * @returns {Promise<string>} Daily briefing
   */
  async getDailyBriefing(location = null, newsCategory = "general") {
    try {
      console.log("🌅 Generating intelligent daily briefing...");

      // Get weather and news in parallel
      const [weather, news] = await Promise.all([
        this.weatherService.getWeather(location),
        this.newsAgent.getNews(newsCategory)
      ]);

      // Use AI to create an intelligent briefing
      const briefingPrompt = `Create an intelligent daily briefing combining weather and news information:

WEATHER INFO:
${weather}

NEWS INFO:
${news}

Create a cohesive, engaging daily briefing that:
1. Starts with a friendly greeting
2. Integrates weather and news naturally
3. Highlights key information
4. Provides actionable insights
5. Ends with an encouraging note

Make it personal and conversational, as if briefing someone you care about.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are a personal assistant creating daily briefings. Be warm, informative, and helpful." 
          },
          { role: "user", content: briefingPrompt }
        ],
        temperature: 0.6,
        max_tokens: 1000
      });

      const briefing = response.choices[0].message.content;

      return `🌅 **Your Daily Briefing - ${new Date().toLocaleDateString()}**

${briefing}

────────────────────────────────

🤖 **Intelligent Briefing** • Generated ${new Date().toLocaleTimeString()}
💡 *Powered by AI-driven weather and news analysis*`;

    } catch (error) {
      console.error("Daily briefing error:", error);
      // Fallback to basic briefing
      const weather = await this.weatherService.getWeather(location);
      const news = await this.newsAgent.getNews(newsCategory);
      
      return `🌅 **Daily Briefing - ${new Date().toLocaleDateString()}**

${weather}

${news}

────────────────────────────────

📱 Basic briefing • ${new Date().toLocaleTimeString()}`;
    }
  }

  /**
   * Discuss a topic with intelligent context
   * @param {string} topic - Topic to discuss
   * @returns {Promise<string>} Discussion content
   */
  async discussTopic(topic) {
    try {
      // First, try to get relevant news about the topic
      const relevantNews = await this.newsAgent.searchNews(topic);
      
      const discussionPrompt = `The user wants to discuss this topic: "${topic}"

Here's relevant news context:
${relevantNews}

Provide an engaging, informative discussion about this topic that:
1. Uses the news context to provide current information
2. Offers different perspectives
3. Explains implications and significance
4. Encourages thoughtful consideration
5. Asks follow-up questions to keep the conversation going

Be conversational, insightful, and thought-provoking.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are a knowledgeable conversationalist who provides thoughtful, balanced discussions on current topics." 
          },
          { role: "user", content: discussionPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const discussion = response.choices[0].message.content;

      return `💭 **Let's Discuss: ${topic}**

${discussion}

────────────────────────────────

🗣️ **Topic Discussion** • ${new Date().toLocaleTimeString()}
💡 *What are your thoughts? Feel free to ask follow-up questions!*`;

    } catch (error) {
      console.error("Topic discussion error:", error);
      return `💭 **Discussion: ${topic}**

I'd love to discuss this topic with you! Unfortunately, I'm having trouble accessing current information right now. 

Could you share what specific aspects of "${topic}" you're most interested in discussing? I can provide insights based on general knowledge and help explore different perspectives on this topic.

────────────────────────────────

🗣️ Discussion ready • What would you like to explore?`;
    }
  }

  /**
   * Get insights and analysis on current trends
   * @param {string} domain - Domain for insights (tech, business, science, etc.)
   * @returns {Promise<string>} Trend insights
   */
  async getTrendInsights(domain = "general") {
    try {
      // Get recent news from the domain
      const domainNews = await this.newsAgent.getNews(domain);
      
      const insightsPrompt = `Analyze current trends and provide expert insights for the ${domain} domain:

Current News Context:
${domainNews}

Provide:
1. Key trends and patterns you observe
2. Expert analysis of what these trends mean
3. Potential implications for the future
4. Opportunities and challenges
5. Recommendations for staying informed

Be analytical yet accessible, as if providing consulting insights to a professional.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are a strategic analyst providing expert insights on current trends and their implications." 
          },
          { role: "user", content: insightsPrompt }
        ],
        temperature: 0.5,
        max_tokens: 900
      });

      const insights = response.choices[0].message.content;

      return `📊 **Trend Insights: ${domain.toUpperCase()}**

${insights}

────────────────────────────────

🧠 **Strategic Analysis** • ${new Date().toLocaleTimeString()}
📈 *Stay ahead of the curve with intelligent trend analysis*`;

    } catch (error) {
      console.error("Trend insights error:", error);
      return `📊 **Trend Insights: ${domain.toUpperCase()}**

Trend analysis is temporarily unavailable. However, I can still help you explore specific topics or questions you have about current developments in ${domain}.

What particular aspect would you like to discuss?

────────────────────────────────

🧠 Analysis ready • Ask me anything!`;
    }
  }

  /**
   * Update user preferences and interests
   * @param {string} interest - New interest to track
   * @param {string} type - Type of interaction
   */
  updateUserProfile(interest, type = 'view') {
    this.newsAgent.updateUserInterests(interest, type);
  }

  /**
   * Get service status and capabilities
   * @returns {string} Service status
   */
  getServiceStatus() {
    return `🤖 **Information Service Status**

**Weather Service:** ✅ Active
• Real-time weather data
• Location auto-detection
• Extended forecasts
• Intelligent formatting

**News Agent:** ✅ Active  
• AI-powered curation
• Multi-source aggregation
• Intelligent search
• Personalized recommendations

**AI Capabilities:** ✅ Active
• Daily briefings
• Topic discussions
• Trend analysis
• Smart routing

**Available Commands:**
• Weather: "weather", "forecast"
• News: "news", "search news", "recommendations"  
• Insights: "daily briefing", "discuss [topic]", "trends"

────────────────────────────────

🚀 **All Systems Operational** • ${new Date().toLocaleTimeString()}`;
  }
}

// Export singleton instance
export const informationService = new InformationService();
