import { exec } from "child_process";
import https from "https";
import fs from "fs";
import Groq from "groq-sdk";
// import NewsAPI from "newsapi";
import dotenv from "dotenv";

dotenv.config();

/**
 * Intelligent Weather and News Integration Module
 * Provides AI-powered real-time weather data and intelligent news analysis
 * Features agentic news fetching with multiple fallback strategies
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
    
    // NewsAPI client for reliable news fetching (commented out temporarily)
    // this.newsAPI = new NewsAPI(process.env.NEWS_API_KEY || 'demo_key');
    
    // Agentic news strategies (ordered by reliability)
    this.newsStrategies = [
      // 'newsapi_headlines',    // Most reliable - NewsAPI headlines (temporarily disabled)
      // 'newsapi_search',       // NewsAPI with search (temporarily disabled)
      'rss_feeds_https',      // Working HTTPS RSS feeds only
      'llm_synthesis',        // LLM-powered news synthesis
      'fallback_cached'       // Last resort - cached content
    ];
    this.currentStrategy = 0;
    this.maxRetries = 3;
    
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
📰 **Global News Update**

🔍 **What's Happening Today:**
[Write 2-3 compelling insights about current events in natural language]

**📌 Today's Important Stories:**

**🌟 [Clean, engaging title without technical jargon]**
[Write a natural, engaging summary of why this story matters to people. Focus on impact and significance rather than technical details.]

**🌟 [Next story title]**
[Continue with engaging summaries...]

[Include 4-5 stories maximum]

**💡 What This Means:**
[Natural language explanation of trends and patterns without using words like "analysis" or "scoring"]

**🌍 Around the World:**
[Brief note about different perspectives or regional angles if relevant]

**Questions to Consider:**
• [Thought-provoking question about the stories]
• [Another engaging question]

Write in a conversational, engaging tone as if you're a knowledgeable friend sharing interesting news. Avoid technical terms like "relevance scoring", "analysis", or "curation". Make it feel natural and compelling.`;
  }

  /**
   * Format AI-analyzed news for display
   * @param {string} aiAnalysis - AI analysis result
   * @param {string} category - News category
   * @returns {string} Formatted intelligent news
   */
  formatIntelligentNews(aiAnalysis, category) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Convert markdown-style formatting to clean, readable text
    let formatted = aiAnalysis
      .replace(/###\s*/g, '')  // Remove ### headers
      .replace(/##\s*/g, '')   // Remove ## headers
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markdown but keep text
      .replace(/\*(.*?)\*/g, '$1')      // Remove italic markdown
      .replace(/^\s*[\-\*\+]\s+/gm, '• ')  // Convert markdown bullets to bullet points
      .replace(/^\s*\d+\.\s+/gm, '• ')     // Convert numbered lists to bullets
      .trim();

    // Clean up excessive line breaks and ensure proper spacing
    formatted = formatted
      .replace(/\n{3,}/g, '\n\n')  // Max 2 line breaks
      .replace(/\n\s*\n/g, '\n\n') // Clean up whitespace
      .trim();

    // Add elegant footer without technical jargon
    const categoryDisplay = category === 'india' ? 'Indian' : 
                           category.charAt(0).toUpperCase() + category.slice(1);

    return `${formatted}

────────────────────────────────

📱 ${categoryDisplay} news • Updated ${timestamp}

� Want to explore more? Just ask:
"Tell me more about [any story]" or "What else is happening?"`;
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
   * Agentic news fetching with multiple strategies and fallbacks
   * @param {string} category - News category
   * @returns {Promise<Object>} News data from the most reliable available source
   */
  async fetchNewsData(category) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const strategy = this.newsStrategies[this.currentStrategy];
        console.log(`🔄 Trying news strategy: ${strategy} (attempt ${attempt + 1})`);
        
        let newsData = null;
        
        switch (strategy) {
          // case 'newsapi_headlines':
          //   newsData = await this.fetchNewsAPIHeadlines(category);
          //   break;
            
          // case 'newsapi_search':
          //   newsData = await this.fetchNewsAPISearch(category);
          //   break;
            
          case 'rss_feeds_https':
            newsData = await this.fetchRSSFeeds(category);
            break;
            
          case 'llm_synthesis':
            newsData = await this.fetchLLMSynthesis(category);
            break;
            
          case 'fallback_cached':
            newsData = await this.getFallbackNews(category);
            break;
        }
        
        if (newsData && newsData.length > 0) {
          console.log(`✅ Success with strategy: ${strategy}, got ${newsData.length} articles`);
          return newsData;
        }
        
        // Try next strategy if current one failed
        this.currentStrategy = (this.currentStrategy + 1) % this.newsStrategies.length;
        
      } catch (error) {
        console.error(`❌ Strategy ${this.newsStrategies[this.currentStrategy]} failed:`, error.message);
        this.currentStrategy = (this.currentStrategy + 1) % this.newsStrategies.length;
      }
    }
    
    console.error('🚨 All news strategies failed, returning empty array');
    return [];
  }

  /**
   * Fetch news using NewsAPI - Most reliable strategy (temporarily disabled)
   */
  /*
  async fetchNewsAPIHeadlines(category) {
    try {
      const countryMap = {
        'india': 'in',
        'general': 'us',
        'technology': 'us',
        'business': 'us',
        'science': 'us',
        'health': 'us'
      };
      
      const categoryMap = {
        'general': 'general',
        'technology': 'technology',
        'business': 'business',
        'science': 'science',
        'health': 'health',
        'india': 'general'
      };
      
      const country = countryMap[category] || 'us';
      const newsCategory = categoryMap[category] || 'general';
      
      const response = await this.newsAPI.v2.topHeadlines({
        country: country,
        category: newsCategory,
        pageSize: 20
      });
      
      if (response.status === 'ok' && response.articles) {
        return response.articles.map((article, index) => ({
          id: `newsapi_${index}`,
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          pubDate: article.publishedAt,
          content: article.content
        }));
      }
      
      return null;
    } catch (error) {
      console.error('NewsAPI headlines error:', error.message);
      return null;
    }
  }

  /**
   * Fetch news using NewsAPI search for specific topics (temporarily disabled)
   */
  /*
  async fetchNewsAPISearch(category) {
    try {
      const searchQueries = {
        'india': 'India OR Indian OR Delhi OR Mumbai OR "Narendra Modi"',
        'technology': 'technology OR AI OR artificial intelligence OR software',
        'business': 'business OR economy OR market OR finance',
        'science': 'science OR research OR discovery OR study',
        'health': 'health OR medical OR medicine OR healthcare',
        'general': 'breaking news OR headlines'
      };
      
      const query = searchQueries[category] || searchQueries.general;
      
      const response = await this.newsAPI.v2.everything({
        q: query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 15,
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
      });
      
      if (response.status === 'ok' && response.articles) {
        return response.articles.map((article, index) => ({
          id: `search_${index}`,
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          pubDate: article.publishedAt,
          content: article.content
        }));
      }
      
      return null;
    } catch (error) {
      console.error('NewsAPI search error:', error.message);
      return null;
    }
  }
  */

  /**
   * Fetch from reliable HTTPS RSS feeds only
   */
  async fetchRSSFeeds(category) {
    try {
      // Only reliable HTTPS RSS feeds
      const reliableRssFeeds = {
        general: [
          'https://feeds.bbci.co.uk/news/rss.xml', // BBC World
          'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', // Times of India
          'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml', // Hindustan Times
          'https://www.thehindu.com/feeder/default.rss', // The Hindu
        ],
        technology: [
          'https://feeds.bbci.co.uk/news/technology/rss.xml', // BBC Tech
          'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms', // TOI Tech
          'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', // Hindu Tech
        ],
        business: [
          'https://feeds.bbci.co.uk/news/business/rss.xml', // BBC Business
          'https://economictimes.indiatimes.com/rssfeedstopstories.cms', // Economic Times
          'https://www.business-standard.com/rss/home_page_top_stories.rss', // Business Standard
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
          'https://www.thehindu.com/feeder/default.rss', // The Hindu
          'https://indianexpress.com/section/india/feed/', // Indian Express
        ]
      };

      const feedUrls = reliableRssFeeds[category] || reliableRssFeeds.general;
      
      // Fetch from multiple sources in parallel
      const fetchPromises = feedUrls.map(url => this.fetchSingleRSSFeed(url));
      const results = await Promise.allSettled(fetchPromises);
      
      // Combine successful results
      const allArticles = [];
      let successfulSources = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
          allArticles.push(...result.value);
          successfulSources++;
        } else {
          console.error(`❌ RSS feed failed: ${feedUrls[index]}`);
        }
      });
      
      console.log(`📰 Fetched ${allArticles.length} articles from ${successfulSources} sources for category: ${category}`);
      
      return allArticles.length > 0 ? allArticles : null;
      
    } catch (error) {
      console.error('RSS feeds error:', error);
      return null;
    }
  }

  /**
   * LLM-powered news synthesis as fallback
   */
  async fetchLLMSynthesis(category) {
    try {
      const synthesisPrompt = `You are a news synthesis agent. Generate 5 current, realistic news headlines for the ${category} category for ${new Date().toLocaleDateString()}.

Make them:
- Relevant to current events and trends
- Diverse in geographic coverage (include Indian and international news)
- Factual-sounding but general enough to be plausible
- Include brief descriptions

Format as JSON array:
[
  {
    "title": "headline",
    "description": "brief description",
    "source": "source name"
  }
]`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are a news synthesis agent. Generate realistic news headlines with descriptions." },
          { role: "user", content: synthesisPrompt }
        ],
        temperature: 0.4,
        max_tokens: 800
      });

      const synthesizedNews = JSON.parse(response.choices[0].message.content);
      
      return synthesizedNews.map((item, index) => ({
        id: `llm_${index}`,
        title: item.title,
        description: item.description,
        source: item.source || 'AI Synthesis',
        pubDate: new Date().toISOString(),
        url: '#',
        isSynthesized: true
      }));
      
    } catch (error) {
      console.error('LLM synthesis error:', error);
      return null;
    }
  }

  /**
   * Fallback to cached or minimal news
   */
  async getFallbackNews(category) {
    console.log('🔄 Using fallback news strategy');
    
    // Return basic fallback news
    return [
      {
        id: 'fallback_1',
        title: `${category} News Currently Unavailable`,
        description: 'Unable to fetch latest news at this time. Please try again later.',
        source: 'System',
        pubDate: new Date().toISOString(),
        url: '#'
      }
    ];
  }
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
   * Format news data for display (fallback method)
   * @param {Array} newsData - Raw news data
   * @returns {string} Formatted news information
   */
  formatNewsData(newsData) {
    try {
      if (!newsData || newsData.length === 0) {
        return "No news articles available at the moment. Please try again later.";
      }

      let formatted = "📰 Latest Headlines\n\n";
      
      // Show top 6 articles in a clean format
      const topArticles = newsData.slice(0, 6);
      
      topArticles.forEach((article, index) => {
        const sourceInfo = article.source ? ` • ${article.source}` : '';
        formatted += `🔸 ${article.title}${sourceInfo}\n`;
        
        if (article.description && article.description.length > 10) {
          const shortDesc = article.description.length > 120 ? 
            article.description.substring(0, 120) + '...' : 
            article.description;
          formatted += `   ${shortDesc}\n`;
        }
        formatted += '\n';
      });

      const timestamp = new Date().toLocaleTimeString();
      formatted += `────────────────────────────────\n\n📱 Updated ${timestamp} • Ask me to discuss any story!`;
      
      return formatted;
    } catch (error) {
      return "Unable to format news at the moment. Please try again.";
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
      // Get all available news articles first
      const allArticles = await this.fetchAllNewsArticles();
      
      if (allArticles.length === 0) {
        return `🔍 **News Search Results for "${query}"**\n\nNo news articles available at the moment. Please try again later.`;
      }

      // Use AI to find and analyze relevant articles
      const relevantArticlesPrompt = `You are a news search expert. Find articles most relevant to this query: "${query}"

Here are the available news articles (title and description):
${allArticles.slice(0, 50).map((article, index) => 
  `${index + 1}. ${article.title}\n   ${article.description || 'No description'}`
).join('\n\n')}

Your task:
1. Identify the most relevant articles (up to 8) that match the query
2. Provide a brief analysis of what the user is looking for
3. Format the response in a clean, readable way

Respond with a JSON object in this exact format (no markdown, no code blocks):
{
  "relevantArticles": [1, 3, 5],
  "searchIntent": "brief description of what user wants to know",
  "summary": "concise summary of findings related to the query"
}`;

      const searchResponse = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are a news analysis expert. Always respond with valid JSON only. Do not include markdown code blocks, backticks, or any other text. Just pure JSON." 
          },
          { role: "user", content: relevantArticlesPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      let searchAnalysis;
      try {
        // Clean the response to ensure it's valid JSON
        let responseText = searchResponse.choices[0].message.content.trim();
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/`/g, '');
        
        // Find JSON content between braces
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          responseText = responseText.substring(jsonStart, jsonEnd + 1);
        }
        
        // Parse the JSON
        searchAnalysis = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parsing failed, using fallback search');
        return await this.performTextBasedSearch(query, allArticles);
      }

      // Get the relevant articles
      const relevantArticles = searchAnalysis.relevantArticles
        .map(index => allArticles[index - 1])
        .filter(article => article); // Remove undefined articles

      if (relevantArticles.length === 0) {
        return await this.performTextBasedSearch(query, allArticles);
      }

      // Format the results beautifully
      const formattedResults = this.formatSearchResults(query, relevantArticles, searchAnalysis);
      
      return formattedResults;

    } catch (error) {
      console.error('Intelligent news search error:', error);
      
      // Fallback: perform basic text search
      try {
        const allArticles = await this.fetchAllNewsArticles();
        return await this.performTextBasedSearch(query, allArticles);
      } catch (fallbackError) {
        return `🔍 **News Search Results for "${query}"**\n\nSorry, I'm unable to search news at the moment. Please try again later.`;
      }
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

Provide a friendly, conversational discussion about this topic as if you're talking to a friend who's curious about current events.

Structure your response naturally:
1. Start with a brief, engaging introduction
2. Explain the background and why it matters
3. Share current developments
4. Mention different viewpoints if relevant
5. Discuss what it might mean going forward
6. End with engaging questions or thoughts

Format Requirements:
- Write in a natural, conversational tone
- Use simple paragraphs without technical formatting
- Avoid markdown syntax like **, ##, ###
- Use emojis sparingly and naturally
- Keep it engaging and easy to read
- Don't use words like "analysis" or "insights" - just have a conversation

Make it feel like a knowledgeable friend explaining something interesting over coffee.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are a friendly, knowledgeable person having a casual conversation about current events. Write naturally without technical formatting or jargon." },
          { role: "user", content: discussionPrompt }
        ],
        temperature: 0.6,
        max_tokens: 1000
      });

      const formattedResponse = this.formatDiscussionResponse(response.choices[0].message.content, topic);
      return formattedResponse;

    } catch (error) {
      return `I'd love to chat about "${topic}" with you! Unfortunately, I'm having some technical difficulties right now. Could you tell me what specific aspect interests you most? I can try to share what I know about it.`;
    }
  }

  /**
   * Format discussion response for better readability
   * @param {string} aiResponse - Raw AI response
   * @param {string} topic - Discussion topic
   * @returns {string} Formatted response
   */
  formatDiscussionResponse(aiResponse, topic) {
    // Clean up markdown and technical formatting
    let formatted = aiResponse
      .replace(/###\s*/g, '')
      .replace(/##\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\s*[\-\*\+]\s+/gm, '• ')
      .trim();

    // Add natural header and footer
    const header = `� Let's talk about: ${topic}\n\n`;
    const footer = `\n\n────────────────────────────────\n\n🤔 What do you think about this? Feel free to ask me anything else about ${topic} or request related news!`;

    return header + formatted + footer;
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

  /**
   * Perform text-based search as fallback
   */
  async performTextBasedSearch(query, allArticles) {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(' ').filter(term => term.length > 2);
    
    // Score articles based on keyword matches
    const scoredArticles = allArticles.map(article => {
      const title = (article.title || '').toLowerCase();
      const description = (article.description || '').toLowerCase();
      const content = `${title} ${description}`;
      
      let score = 0;
      queryTerms.forEach(term => {
        const titleMatches = (title.match(new RegExp(term, 'g')) || []).length;
        const descMatches = (description.match(new RegExp(term, 'g')) || []).length;
        score += titleMatches * 3 + descMatches * 2; // Weight title matches higher
      });
      
      return { ...article, relevanceScore: score };
    });
    
    // Get top relevant articles
    const relevantArticles = scoredArticles
      .filter(article => article.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8);
    
    if (relevantArticles.length === 0) {
      return `🔍 **News Search Results for "${query}"**\n\nNo relevant articles found. Try searching with different keywords.`;
    }
    
    // Format results
    let result = `🔍 **News Search Results for "${query}"**\n\n`;
    result += `📰 Found ${relevantArticles.length} relevant articles:\n\n`;
    
    relevantArticles.forEach((article, index) => {
      const timeAgo = this.getTimeAgo(article.pubDate);
      result += `${index + 1}. **${article.title}**\n`;
      if (article.description) {
        result += `   ${article.description.slice(0, 150)}${article.description.length > 150 ? '...' : ''}\n`;
      }
      result += `   📅 ${timeAgo} • 📰 ${article.source}\n\n`;
    });
    
    return result;
  }

  /**
   * Format search results beautifully
   */
  formatSearchResults(query, articles, analysis) {
    let result = `🔍 **News Search Results for "${query}"**\n\n`;
    
    if (analysis.searchIntent) {
      result += `🎯 **What you're looking for:** ${analysis.searchIntent}\n\n`;
    }
    
    if (analysis.summary) {
      result += `📋 **Quick Summary:** ${analysis.summary}\n\n`;
    }
    
    result += `📰 **Top ${articles.length} Relevant Articles:**\n\n`;
    
    articles.forEach((article, index) => {
      const timeAgo = this.getTimeAgo(article.pubDate);
      result += `**${index + 1}. ${article.title}**\n`;
      
      if (article.description) {
        result += `${article.description.slice(0, 200)}${article.description.length > 200 ? '...' : ''}\n`;
      }
      
      result += `📅 ${timeAgo} • 📰 ${article.source}\n\n`;
    });
    
    result += `────────────────────────────────\n\n`;
    result += `💡 **Want more details?** Ask: "Tell me more about [article title]"\n`;
    result += `🔄 **Related search:** Try "${query} latest updates" or "${query} analysis"`;
    
    return result;
  }

  /**
   * Fetch all available news articles from all strategies
   */
  async fetchAllNewsArticles() {
    try {
      // Try to get articles from the most reliable sources first
      let allArticles = await this.fetchNewsAPIHeadlines('general');
      
      if (!allArticles || allArticles.length < 5) {
        // If NewsAPI fails, try RSS feeds
        const rssArticles = await this.fetchRSSFeeds('general');
        if (rssArticles) {
          allArticles = [...(allArticles || []), ...rssArticles];
        }
      }
      
      if (!allArticles || allArticles.length < 3) {
        // Last resort: LLM synthesis
        const llmArticles = await this.fetchLLMSynthesis('general');
        if (llmArticles) {
          allArticles = [...(allArticles || []), ...llmArticles];
        }
      }
      
      // Remove duplicates and ensure we have unique articles
      const uniqueArticles = [];
      const seenTitles = new Set();
      
      (allArticles || []).forEach(article => {
        if (article.title && !seenTitles.has(article.title.toLowerCase())) {
          seenTitles.add(article.title.toLowerCase());
          uniqueArticles.push(article);
        }
      });
      
      return uniqueArticles;
    } catch (error) {
      console.error('Error fetching all news articles:', error);
      return [];
    }
  }
}

// Export singleton instance
export const weatherNewsSystem = new WeatherNewsSystem();
