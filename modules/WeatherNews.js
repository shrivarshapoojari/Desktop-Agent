import { exec } from "child_process";
import https from "https";
import fs from "fs";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Intelligent Weather and News Integration Module
 * Provides AI-powered real-time weather data and intelligent news analysis
 */
class WeatherNewsSystem {
  constructor() {
    this.weatherCache = null;
    this.newsCache = null;
    this.weatherCacheTime = 0;
    this.newsCacheTime = 0;
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes cache
    
    // AI client for intelligent news processing
    this.aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // User preferences and learning
    this.userPreferences = {
      interests: [],
      readingHistory: [],
      preferredSources: [],
      skipTopics: [],
      summaryStyle: "concise" // concise, detailed, technical
    };
    
    // News intelligence cache
    this.processedNewsCache = new Map();
    this.newsAnalysisCache = new Map();
  }

  /**
   * Get weather information
   * @param {string} location - Location for weather (optional, defaults to auto-detect)
   * @returns {Promise<string>} Weather information
   */
  async getWeather(location = null) {
    try {
      // Check cache first
      if (this.weatherCache && (Date.now() - this.weatherCacheTime < this.cacheExpiry)) {
        return this.weatherCache;
      }

      const weatherData = await this.fetchWeatherData(location);
      
      if (weatherData) {
        const formatted = this.formatWeatherData(weatherData);
        this.weatherCache = formatted;
        this.weatherCacheTime = Date.now();
        return formatted;
      } else {
        return "❌ Could not fetch weather data. Please try again later.";
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
      return "❌ Error fetching weather information.";
    }
  }

  /**
   * Get news headlines with AI-powered analysis and personalization
   * @param {string} category - News category (optional)
   * @param {string} userQuery - Specific user query for personalized results
   * @returns {Promise<string>} Intelligently curated news
   */
  async getNews(category = "general", userQuery = null) {
    try {
      // Check if we have cached personalized results
      const cacheKey = `${category}_${userQuery || 'default'}`;
      if (this.processedNewsCache.has(cacheKey)) {
        const cached = this.processedNewsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.content;
        }
      }

      // Fetch raw news data
      const rawNewsData = await this.fetchNewsData(category);
      
      if (rawNewsData && rawNewsData.length > 0) {
        // AI-powered content analysis and personalization
        const intelligentNews = await this.analyzeAndPersonalizeNews(rawNewsData, category, userQuery);
        
        // Cache the processed results
        this.processedNewsCache.set(cacheKey, {
          content: intelligentNews,
          timestamp: Date.now()
        });
        
        return intelligentNews;
      } else {
        return "❌ Could not fetch news data. Please try again later.";
      }
    } catch (error) {
      console.error("Intelligent news fetch error:", error);
      return "❌ Error fetching and analyzing news information.";
    }
  }

  /**
   * AI-powered news analysis and personalization
   * @param {Array} rawNews - Raw news articles
   * @param {string} category - News category
   * @param {string} userQuery - User's specific query
   * @returns {Promise<string>} Analyzed and personalized news
   */
  async analyzeAndPersonalizeNews(rawNews, category, userQuery) {
    try {
      // Prepare articles for AI analysis
      const articlesForAnalysis = rawNews.slice(0, 15).map((article, index) => ({
        id: index + 1,
        title: article.title,
        description: article.description,
        link: article.link,
        pubDate: article.pubDate
      }));

      // Create AI prompt for intelligent news analysis
      const analysisPrompt = this.createNewsAnalysisPrompt(articlesForAnalysis, category, userQuery);

      // Get AI analysis
      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are an intelligent news analyst. Analyze news articles and provide personalized, insightful summaries with relevance scoring and intelligent curation."
          },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const aiAnalysis = response.choices[0].message.content;
      
      // Update user interests based on the query
      if (userQuery) {
        this.updateUserInterests(userQuery, category);
      }

      return this.formatIntelligentNews(aiAnalysis, category);

    } catch (error) {
      console.error("AI news analysis error:", error);
      // Fallback to basic formatting if AI fails
      return this.formatNewsData(rawNews);
    }
  }

  /**
   * Create AI prompt for news analysis
   * @param {Array} articles - Articles to analyze
   * @param {string} category - News category
   * @param {string} userQuery - User query
   * @returns {string} AI prompt
   */
  createNewsAnalysisPrompt(articles, category, userQuery) {
    const userInterests = this.getUserInterestsString();
    const currentDate = new Date().toLocaleDateString();

    return `Analyze these ${category} news articles from ${currentDate} gathered from global sources including Indian, UK, US, and international media:

ARTICLES TO ANALYZE:
${articles.map(article => `
ID: ${article.id}
TITLE: ${article.title}
DESCRIPTION: ${article.description}
SOURCE: ${article.source || 'Unknown'}
PUBLISHED: ${article.pubDate}
---`).join('\n')}

USER CONTEXT:
- Query: ${userQuery || 'General news interest'}
- Past interests: ${userInterests}
- Category: ${category}

ANALYSIS REQUIREMENTS:
1. RELEVANCE SCORING: Score each article 1-10 based on importance and user relevance
2. CONTENT ANALYSIS: Identify key themes, impact, and significance
3. PERSONALIZATION: Prioritize based on user's past interests and current query
4. INTELLIGENT CURATION: Select top 5 most relevant articles
5. INSIGHT GENERATION: Provide context, connections between stories, and implications
6. SENTIMENT ANALYSIS: Note tone and emotional context where relevant
7. GLOBAL PERSPECTIVE: Consider diverse viewpoints from different regions

OUTPUT FORMAT:
🧠 **AI-Curated Global News Analysis**

**Key Insights:**
[Provide 2-3 key insights about current events and trends]

**Top Stories (Ranked by Relevance):**

**1. [Title] (Relevance: X/10) - Source: [Source]**
📝 **Analysis:** [AI insight about why this matters]
🔗 **Impact:** [Who this affects and how]
🎯 **Personal Relevance:** [Why this might interest the user]
📊 **Context:** [Background or connection to other events]

[Continue for top 5 stories...]

**Trend Analysis:**
[Identify patterns or emerging themes across the stories]

**Global Perspective:**
[Note different regional viewpoints or coverage angles]

**Follow-up Suggestions:**
[Suggest related topics or questions the user might want to explore]

Make the analysis conversational, insightful, and tailored to the user's interests while highlighting the diversity of sources.`;
  }

  /**
   * Format AI-analyzed news for display
   * @param {string} aiAnalysis - AI analysis result
   * @param {string} category - News category
   * @returns {string} Formatted intelligent news
   */
  formatIntelligentNews(aiAnalysis, category) {
    const timestamp = new Date().toLocaleTimeString();
    
    return `${aiAnalysis}

---
📊 **Analysis Summary:**
• Content analyzed by AI for relevance and significance
• Personalized based on your interests and reading patterns
• Category: ${category.charAt(0).toUpperCase() + category.slice(1)}

*Last analyzed: ${timestamp}*

💡 **Want to explore further?** Ask me:
• "Tell me more about [story title]"
• "What's the impact of [event]?"
• "Show me related news about [topic]"
• "Explain why this matters"`;
  }

  /**
   * Update user interests based on queries and interactions
   * @param {string} query - User query
   * @param {string} category - News category
   */
  updateUserInterests(query, category) {
    // Extract keywords and topics from user query
    const keywords = this.extractKeywords(query.toLowerCase());
    
    // Update interests with decay (recent interests weighted more)
    keywords.forEach(keyword => {
      const existing = this.userPreferences.interests.find(interest => interest.topic === keyword);
      if (existing) {
        existing.weight = Math.min(existing.weight + 0.1, 1.0);
        existing.lastSeen = Date.now();
      } else {
        this.userPreferences.interests.push({
          topic: keyword,
          weight: 0.3,
          category: category,
          lastSeen: Date.now()
        });
      }
    });

    // Keep only top 20 interests to prevent memory bloat
    this.userPreferences.interests = this.userPreferences.interests
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20);

    // Add to reading history
    this.userPreferences.readingHistory.push({
      query: query,
      category: category,
      timestamp: Date.now()
    });

    // Keep only last 50 reading history entries
    if (this.userPreferences.readingHistory.length > 50) {
      this.userPreferences.readingHistory = this.userPreferences.readingHistory.slice(-50);
    }
  }

  /**
   * Extract keywords from user query
   * @param {string} query - User query
   * @returns {Array} Extracted keywords
   */
  extractKeywords(query) {
    // Simple keyword extraction (could be enhanced with NLP)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'show', 'me', 'get', 'news', 'latest'];
    
    return query
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Keep top 5 keywords
  }

  /**
   * Get user interests as string for AI context
   * @returns {string} User interests summary
   */
  getUserInterestsString() {
    if (this.userPreferences.interests.length === 0) {
      return "No established interests yet";
    }

    return this.userPreferences.interests
      .slice(0, 10)
      .map(interest => `${interest.topic} (weight: ${interest.weight.toFixed(1)})`)
      .join(', ');
  }

  /**
   * Get personalized news recommendations
   * @returns {Promise<string>} Personalized recommendations
   */
  async getPersonalizedRecommendations() {
    try {
      if (this.userPreferences.interests.length === 0) {
        return "📚 **Getting to Know You**\n\nI'm still learning your interests! Try asking me about specific topics like:\n• 'Show me tech news about AI'\n• 'Business news about startups'\n• 'Science news about climate'\n\nThe more you interact, the better I'll understand your preferences!";
      }

      const topInterests = this.userPreferences.interests.slice(0, 5);
      const recommendations = await Promise.all([
        this.getNews("technology", topInterests[0]?.topic),
        this.getNews("business", topInterests[1]?.topic),
        this.getNews("science", topInterests[2]?.topic)
      ]);

      return `🎯 **Personalized News Recommendations**

Based on your interests: ${topInterests.map(i => i.topic).join(', ')}

${recommendations.join('\n\n---\n\n')}

💡 **Tip:** Your recommendations get better as I learn your preferences!`;

    } catch (error) {
      return "❌ Error generating personalized recommendations.";
    }
  }

  /**
   * Analyze news sentiment and provide emotional context
   * @param {Array} articles - News articles
   * @returns {Promise<string>} Sentiment analysis
   */
  async analyzeNewsSentiment(articles) {
    try {
      const sentimentPrompt = `Analyze the overall emotional tone and sentiment of these news headlines:

${articles.slice(0, 10).map(article => `• ${article.title}`).join('\n')}

Provide:
1. Overall sentiment (positive/negative/neutral with percentage)
2. Emotional themes (hope, concern, excitement, etc.)
3. Mood impact assessment
4. Suggestions for emotional balance if news is overwhelming

Keep it brief and helpful.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are an emotional intelligence assistant analyzing news sentiment." },
          { role: "user", content: sentimentPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return `🎭 **News Sentiment Analysis**\n\n${response.choices[0].message.content}`;

    } catch (error) {
      return "❌ Error analyzing news sentiment.";
    }
  }

  /**
   * Fetch weather data from free weather service
   * @param {string} location - Location for weather
   * @returns {Promise<Object>} Weather data
   */
  async fetchWeatherData(location) {
    return new Promise(async (resolve) => {
      try {
        // First, get location if not provided
        if (!location) {
          location = await this.detectLocation();
        }

        // Use wttr.in free weather service
        const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
        
        https.get(url, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const weatherData = JSON.parse(data);
              resolve(weatherData);
            } catch (error) {
              console.error("Weather JSON parse error:", error);
              resolve(null);
            }
          });
        }).on('error', (error) => {
          console.error("Weather request error:", error);
          resolve(null);
        });
      } catch (error) {
        console.error("Weather fetch error:", error);
        resolve(null);
      }
    });
  }

  /**
   * Fetch news data from multiple global sources
   * @param {string} category - News category
   * @returns {Promise<Object>} News data from multiple sources
   */
  async fetchNewsData(category) {
    try {
      // Multiple RSS feeds from different regions and sources
      const globalRssFeeds = {
        general: [
          'https://feeds.bbci.co.uk/news/rss.xml', // BBC World
          'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', // Times of India
          'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml', // Hindustan Times
          'http://rss.cnn.com/rss/edition.rss', // CNN International
          'https://feeds.reuters.com/reuters/topNews', // Reuters
          'http://feeds.feedburner.com/ndtvnews-top-stories', // NDTV
          'https://www.thehindu.com/feeder/default.rss', // The Hindu
        ],
        technology: [
          'https://feeds.bbci.co.uk/news/technology/rss.xml', // BBC Tech
          'http://rss.cnn.com/rss/edition_technology.rss', // CNN Tech
          'https://feeds.feedburner.com/oreilly/radar', // O'Reilly Tech
          'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms', // TOI Tech
          'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', // Hindu Tech
          'https://feeds.feedburner.com/ndtvprofit-tech', // NDTV Tech
        ],
        business: [
          'https://feeds.bbci.co.uk/news/business/rss.xml', // BBC Business
          'http://rss.cnn.com/rss/money_latest.rss', // CNN Business
          'https://feeds.reuters.com/reuters/businessNews', // Reuters Business
          'https://economictimes.indiatimes.com/rssfeedstopstories.cms', // Economic Times
          'https://www.business-standard.com/rss/home_page_top_stories.rss', // Business Standard
          'https://feeds.feedburner.com/ndtvprofit-latest', // NDTV Profit
        ],
        science: [
          'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', // BBC Science
          'https://www.thehindu.com/sci-tech/science/feeder/default.rss', // Hindu Science
          'https://timesofindia.indiatimes.com/rssfeeds/3908999.cms', // TOI Science
        ],
        health: [
          'https://feeds.bbci.co.uk/news/health/rss.xml', // BBC Health
          'https://www.thehindu.com/sci-tech/health/feeder/default.rss', // Hindu Health
          'https://timesofindia.indiatimes.com/rssfeeds/3908901.cms', // TOI Health
        ],
        india: [
          'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', // Times of India
          'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml', // Hindustan Times
          'http://feeds.feedburner.com/ndtvnews-top-stories', // NDTV
          'https://www.thehindu.com/feeder/default.rss', // The Hindu
          'https://indianexpress.com/section/india/feed/', // Indian Express
          'https://feeds.feedburner.com/NDTV-LatestNews', // NDTV Latest
        ]
      };

      const feedUrls = globalRssFeeds[category] || globalRssFeeds.general;
      
      // Fetch from multiple sources in parallel
      const newsPromises = feedUrls.map(url => this.fetchSingleRSSFeed(url));
      const newsResults = await Promise.allSettled(newsPromises);
      
      // Combine all successful results
      let allArticles = [];
      newsResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allArticles = allArticles.concat(result.value);
        }
      });

      // Remove duplicates and sort by date
      const uniqueArticles = this.removeDuplicateNews(allArticles);
      const sortedArticles = uniqueArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      
      console.log(`📰 Fetched ${sortedArticles.length} articles from ${feedUrls.length} sources for category: ${category}`);
      
      return sortedArticles.slice(0, 30); // Return top 30 most recent articles
      
    } catch (error) {
      console.error("Multi-source news fetch error:", error);
      return null;
    }
  }

  /**
   * Fetch single RSS feed
   * @param {string} url - RSS feed URL
   * @returns {Promise<Array>} Articles from the feed
   */
  async fetchSingleRSSFeed(url) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 10000); // 10 second timeout per feed

      try {
        https.get(url, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const newsData = this.parseRSSFeed(data);
              resolve(newsData);
            } catch (error) {
              console.error(`Parse error for ${url}:`, error.message);
              resolve(null);
            }
          });
        }).on('error', (error) => {
          clearTimeout(timeout);
          console.error(`Request error for ${url}:`, error.message);
          resolve(null);
        });
      } catch (error) {
        clearTimeout(timeout);
        console.error(`Fetch error for ${url}:`, error.message);
        resolve(null);
      }
    });
  }

  /**
   * Remove duplicate news articles
   * @param {Array} articles - Array of articles
   * @returns {Array} Unique articles
   */
  removeDuplicateNews(articles) {
    const seen = new Set();
    return articles.filter(article => {
      // Create a simple fingerprint based on title
      const fingerprint = article.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .slice(0, 5)
        .join(' ');
      
      if (seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    });
  }

  /**
   * Detect user's location
   * @returns {Promise<string>} Detected location
   */
  async detectLocation() {
    return new Promise((resolve) => {
      // Try to get location from IP geolocation (free service)
      https.get('https://ipapi.co/json/', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const locationData = JSON.parse(data);
            const location = `${locationData.city}, ${locationData.country_name}`;
            resolve(location);
          } catch (error) {
            // Fallback to a default location
            resolve("New York, USA");
          }
        });
      }).on('error', () => {
        resolve("New York, USA");
      });
    });
  }

  /**
   * Format weather data for display
   * @param {Object} weatherData - Raw weather data
   * @returns {string} Formatted weather information
   */
  formatWeatherData(weatherData) {
    try {
      const current = weatherData.current_condition[0];
      const location = weatherData.nearest_area[0];
      const today = weatherData.weather[0];

      const locationName = `${location.areaName[0].value}, ${location.country[0].value}`;
      const temp = current.temp_C;
      const feelsLike = current.FeelsLikeC;
      const humidity = current.humidity;
      const description = current.weatherDesc[0].value;
      const windSpeed = current.windspeedKmph;
      const windDir = current.winddir16Point;
      const visibility = current.visibility;
      
      const maxTemp = today.maxtempC;
      const minTemp = today.mintempC;

      return `🌤️ **Weather for ${locationName}**

**Current Conditions:**
🌡️ Temperature: ${temp}°C (feels like ${feelsLike}°C)
☁️ Condition: ${description}
💨 Wind: ${windSpeed} km/h ${windDir}
💧 Humidity: ${humidity}%
👁️ Visibility: ${visibility} km

**Today's Forecast:**
📈 High: ${maxTemp}°C
📉 Low: ${minTemp}°C

*Last updated: ${new Date().toLocaleTimeString()}*`;

    } catch (error) {
      return "❌ Error formatting weather data";
    }
  }

  /**
   * Format news data for display
   * @param {Array} newsData - Raw news data
   * @returns {string} Formatted news information
   */
  formatNewsData(newsData) {
    try {
      if (!newsData || newsData.length === 0) {
        return "❌ No news articles available";
      }

      let formatted = "📰 **Latest News Headlines**\n\n";
      
      // Show top 5 articles
      const topArticles = newsData.slice(0, 5);
      
      topArticles.forEach((article, index) => {
        formatted += `**${index + 1}.** ${article.title}\n`;
        if (article.description) {
          formatted += `   📝 ${article.description.substring(0, 100)}...\n`;
        }
        formatted += `   🔗 ${article.link}\n\n`;
      });

      formatted += `*Last updated: ${new Date().toLocaleTimeString()}*`;
      
      return formatted;
    } catch (error) {
      return "❌ Error formatting news data";
    }
  }

  /**
   * Parse RSS feed to extract news articles (Enhanced for multiple formats)
   * @param {string} rssData - Raw RSS XML data
   * @returns {Array} Parsed news articles
   */
  parseRSSFeed(rssData) {
    try {
      const articles = [];
      
      // Multiple regex patterns for different RSS formats
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi; // For Atom feeds
      
      // Title patterns
      const titleRegex1 = /<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i;
      const titleRegex2 = /<title[^>]*>(.*?)<\/title>/i;
      
      // Description patterns
      const descRegex1 = /<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/i;
      const descRegex2 = /<description[^>]*>(.*?)<\/description>/i;
      const summaryRegex = /<summary[^>]*><!\[CDATA\[(.*?)\]\]><\/summary>/i;
      const contentRegex = /<content[^>]*><!\[CDATA\[(.*?)\]\]><\/content>/i;
      
      // Link patterns
      const linkRegex1 = /<link[^>]*>(.*?)<\/link>/i;
      const linkRegex2 = /<link[^>]*href=["'](.*?)["'][^>]*\/?>/i;
      const guidRegex = /<guid[^>]*>(.*?)<\/guid>/i;
      
      // Date patterns
      const pubDateRegex = /<pubDate[^>]*>(.*?)<\/pubDate>/i;
      const publishedRegex = /<published[^>]*>(.*?)<\/published>/i;
      const updatedRegex = /<updated[^>]*>(.*?)<\/updated>/i;

      // Function to extract and clean text
      const extractText = (content, patterns) => {
        for (const pattern of patterns) {
          const match = pattern.exec(content);
          if (match) {
            return this.cleanHtmlText(match[1]);
          }
        }
        return '';
      };

      // Parse RSS items
      let match;
      while ((match = itemRegex.exec(rssData)) !== null) {
        const itemContent = match[1];
        
        const title = extractText(itemContent, [titleRegex1, titleRegex2]);
        const description = extractText(itemContent, [descRegex1, descRegex2, summaryRegex, contentRegex]);
        const link = extractText(itemContent, [linkRegex2, linkRegex1, guidRegex]);
        const pubDate = extractText(itemContent, [pubDateRegex, publishedRegex, updatedRegex]);

        if (title && title.trim()) {
          articles.push({
            title: title.trim(),
            description: description.trim(),
            link: link.trim(),
            pubDate: pubDate.trim() || new Date().toISOString(),
            source: this.extractSourceFromLink(link)
          });
        }
      }

      // Parse Atom entries if no RSS items found
      if (articles.length === 0) {
        while ((match = entryRegex.exec(rssData)) !== null) {
          const entryContent = match[1];
          
          const title = extractText(entryContent, [titleRegex1, titleRegex2]);
          const description = extractText(entryContent, [summaryRegex, contentRegex, descRegex1, descRegex2]);
          const link = extractText(entryContent, [linkRegex2, linkRegex1]);
          const pubDate = extractText(entryContent, [updatedRegex, publishedRegex, pubDateRegex]);

          if (title && title.trim()) {
            articles.push({
              title: title.trim(),
              description: description.trim(),
              link: link.trim(),
              pubDate: pubDate.trim() || new Date().toISOString(),
              source: this.extractSourceFromLink(link)
            });
          }
        }
      }

      return articles;
    } catch (error) {
      console.error("RSS parsing error:", error);
      return [];
    }
  }

  /**
   * Clean HTML text and decode entities
   * @param {string} text - Raw HTML text
   * @returns {string} Cleaned text
   */
  cleanHtmlText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract source name from article link
   * @param {string} link - Article link
   * @returns {string} Source name
   */
  extractSourceFromLink(link) {
    try {
      const url = new URL(link);
      const hostname = url.hostname.toLowerCase();
      
      const sourceMap = {
        'timesofindia.indiatimes.com': 'Times of India',
        'hindustantimes.com': 'Hindustan Times',
        'thehindu.com': 'The Hindu',
        'ndtv.com': 'NDTV',
        'indianexpress.com': 'Indian Express',
        'economictimes.indiatimes.com': 'Economic Times',
        'business-standard.com': 'Business Standard',
        'bbc.co.uk': 'BBC',
        'bbc.com': 'BBC',
        'cnn.com': 'CNN',
        'reuters.com': 'Reuters',
        'feedburner.com': 'Google News'
      };

      for (const [domain, name] of Object.entries(sourceMap)) {
        if (hostname.includes(domain)) {
          return name;
        }
      }

      return hostname.replace('www.', '').split('.')[0].toUpperCase();
    } catch (error) {
      return 'Unknown Source';
    }
  }

  /**
   * Get combined weather and news briefing with AI insights
   * @param {string} location - Location for weather
   * @param {string} newsCategory - News category
   * @returns {Promise<string>} Intelligent combined briefing
   */
  async getDailyBriefing(location = null, newsCategory = "general") {
    try {
      const weather = await this.getWeather(location);
      const news = await this.getNews(newsCategory);
      
      // Create AI-powered briefing that connects weather and news
      const briefingPrompt = `Create an intelligent daily briefing that connects weather and news information:

WEATHER INFO:
${weather}

NEWS INFO:
${news}

Create a cohesive briefing that:
1. Summarizes the key weather and news highlights
2. Identifies any connections between weather and news (economic impact, travel, events, etc.)
3. Provides personalized recommendations for the day
4. Suggests activities or precautions based on both weather and current events

Keep it concise but insightful, focusing on actionable information.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are an intelligent assistant creating personalized daily briefings." },
          { role: "user", content: briefingPrompt }
        ],
        temperature: 0.4,
        max_tokens: 800
      });

      return `🌅 **AI-Powered Daily Briefing - ${new Date().toLocaleDateString()}**\n\n${response.choices[0].message.content}`;
    } catch (error) {
      // Fallback to basic briefing if AI fails
      const weather = await this.getWeather(location);
      const news = await this.getNews(newsCategory);
      return `🌅 **Daily Briefing - ${new Date().toLocaleDateString()}**\n\n${weather}\n\n${news}`;
    }
  }

  /**
   * Intelligent news search with context understanding
   * @param {string} query - User's search query
   * @returns {Promise<string>} Contextual search results
   */
  async searchNews(query) {
    try {
      // Determine best category and expand query using AI
      const queryAnalysisPrompt = `Analyze this news search query and help optimize it:

USER QUERY: "${query}"

Provide:
1. Best news category to search (technology, business, science, health, general)
2. Expanded search terms and related keywords
3. Predicted user intent (breaking news, background info, analysis, trends, etc.)
4. Suggested follow-up questions

Format as JSON:
{
  "category": "...",
  "expandedQuery": "...",
  "intent": "...",
  "followUpQuestions": ["...", "..."]
}`;

      const analysisResponse = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are a search optimization specialist. Respond only with valid JSON." },
          { role: "user", content: queryAnalysisPrompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      });

      const searchAnalysis = JSON.parse(analysisResponse.choices[0].message.content);
      
      // Search news with optimized parameters
      const searchResults = await this.getNews(searchAnalysis.category, searchAnalysis.expandedQuery);
      
      return `🔍 **Intelligent News Search Results**

**Your Query:** "${query}"
**Search Intent:** ${searchAnalysis.intent}

${searchResults}

**💡 Follow-up Questions:**
${searchAnalysis.followUpQuestions.map(q => `• ${q}`).join('\n')}`;

    } catch (error) {
      console.error("Intelligent news search error:", error);
      // Fallback to basic search
      return await this.getNews("general", query);
    }
  }

  /**
   * News discussion and explanation
   * @param {string} topic - Topic to discuss
   * @returns {Promise<string>} AI-powered discussion
   */
  async discussNews(topic) {
    try {
      const discussionPrompt = `The user wants to discuss this news topic: "${topic}"

Based on current events and general knowledge, provide:
1. Background context and why this topic is significant
2. Different perspectives or viewpoints on the issue
3. Potential implications and future developments
4. Questions to help the user think deeper about the topic
5. Related topics they might find interesting

Make it conversational and educational, encouraging critical thinking.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are a knowledgeable discussion partner helping users understand and analyze current events." },
          { role: "user", content: discussionPrompt }
        ],
        temperature: 0.5,
        max_tokens: 800
      });

      return `🗣️ **News Discussion: ${topic}**\n\n${response.choices[0].message.content}`;

    } catch (error) {
      return `❌ I'd love to discuss "${topic}" with you, but I'm having trouble accessing my analysis capabilities right now. Could you be more specific about what aspect interests you most?`;
    }
  }

  /**
   * Get news learning insights - what can we learn from current events
   * @param {string} category - News category
   * @returns {Promise<string>} Learning insights
   */
  async getNewsLearningInsights(category = "general") {
    try {
      const news = await this.fetchNewsData(category);
      if (!news || news.length === 0) {
        return "❌ No news available for learning insights.";
      }

      const insightsPrompt = `Analyze these current news stories and extract learning opportunities:

${news.slice(0, 10).map(article => `• ${article.title}: ${article.description}`).join('\n')}

Provide:
1. Key lessons we can learn from these events
2. Historical patterns or parallels
3. Skills or knowledge that would be valuable given these trends
4. How individuals can prepare or adapt to these developments
5. Questions these events raise about the future

Focus on actionable insights and personal development opportunities.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are an educational analyst helping people learn from current events." },
          { role: "user", content: insightsPrompt }
        ],
        temperature: 0.4,
        max_tokens: 700
      });

      return `🎓 **Learning Insights from Current Events**\n\n${response.choices[0].message.content}`;

    } catch (error) {
      return "❌ Error generating learning insights from current events.";
    }
  }

  /**
   * Clear cache (force refresh)
   */
  clearCache() {
    this.weatherCache = null;
    this.newsCache = null;
    this.weatherCacheTime = 0;
    this.newsCacheTime = 0;
  }

  /**
   * Get available news categories
   * @returns {string} Available categories
   */
  getAvailableCategories() {
    return `📰 **Available News Categories:**
• general - General news
• technology - Tech news
• business - Business news
• science - Science & environment
• health - Health news

Usage: "get tech news" or "show business news"`;
  }

  /**
   * Get weather for specific activities
   * @param {string} activity - Activity type
   * @returns {Promise<string>} Activity-specific weather advice
   */
  async getWeatherForActivity(activity) {
    const weather = await this.getWeather();
    
    if (weather.includes("❌")) {
      return weather;
    }

    // Extract temperature and conditions from weather data
    const tempMatch = weather.match(/Temperature: (\d+)°C/);
    const conditionMatch = weather.match(/Condition: ([^\\n]+)/);
    
    const temp = tempMatch ? parseInt(tempMatch[1]) : 20;
    const condition = conditionMatch ? conditionMatch[1].toLowerCase() : '';

    let advice = weather + "\n\n🎯 **Activity Advice:**\n";

    switch (activity.toLowerCase()) {
      case 'running':
      case 'jogging':
        if (temp < 5) advice += "🥶 Too cold for outdoor running. Consider indoor exercise.";
        else if (temp > 30) advice += "🔥 Very hot! Run early morning or evening.";
        else if (condition.includes('rain')) advice += "🌧️ Rainy weather. Consider indoor alternatives.";
        else advice += "✅ Good weather for running! Stay hydrated.";
        break;
      
      case 'cycling':
        if (condition.includes('rain')) advice += "🌧️ Not ideal for cycling due to rain.";
        else if (condition.includes('wind')) advice += "💨 Windy conditions. Be careful on the bike.";
        else advice += "🚴‍♂️ Great weather for cycling!";
        break;
      
      case 'picnic':
        if (condition.includes('rain')) advice += "🌧️ Not suitable for picnic due to rain.";
        else if (temp < 15) advice += "🧥 A bit chilly for picnic. Bring warm clothes.";
        else advice += "🧺 Perfect weather for a picnic!";
        break;
      
      default:
        advice += "🌤️ Check the conditions above for your activity planning.";
    }

    return advice;
  }
}

// Export singleton instance
export const weatherNewsSystem = new WeatherNewsSystem();
