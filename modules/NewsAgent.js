import https from "https";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Modern Agentic News Service
 * Uses AI agents for intelligent news gathering, analysis, and personalization
 */
export class NewsAgent {
  constructor() {
    this.aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.newsCache = new Map();
    this.userProfile = {
      interests: [],
      readingHistory: [],
      preferredSources: [],
      summaryStyle: "concise" // concise, detailed, analytical
    };
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    // Agentic news strategies
    this.newsAgents = [
      'intelligent_aggregator',    // AI-powered news aggregation
      'rss_analyzer',             // RSS feeds with AI analysis
      'trend_synthesizer',        // AI trend synthesis
      'personalized_curator'      // Personalized content curation
    ];
  }

  /**
   * Main news retrieval with agentic approach
   * @param {string} category - News category
   * @param {string} query - Specific query (optional)
   * @returns {Promise<string>} Curated news content
   */
  async getNews(category = "general", query = null) {
    try {
      const cacheKey = `${category}_${query || 'default'}`;
      
      // Check cache
      if (this.newsCache.has(cacheKey)) {
        const cached = this.newsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.content;
        }
      }

      // Use agentic approach to get news
      const newsContent = await this.executeNewsAgents(category, query);
      
      // Cache the result
      this.newsCache.set(cacheKey, {
        content: newsContent,
        timestamp: Date.now()
      });

      return newsContent;
    } catch (error) {
      console.error("News Agent error:", error);
      return "❌ Unable to fetch news at this time. Please try again later.";
    }
  }

  /**
   * Execute news agents in order of effectiveness
   * @param {string} category - News category
   * @param {string} query - User query
   * @returns {Promise<string>} News content
   */
  async executeNewsAgents(category, query) {
    for (const agent of this.newsAgents) {
      try {
        console.log(`🤖 Executing news agent: ${agent}`);
        
        let result = null;
        switch (agent) {
          case 'intelligent_aggregator':
            result = await this.intelligentAggregator(category, query);
            break;
          case 'rss_analyzer':
            result = await this.rssAnalyzer(category);
            break;
          case 'trend_synthesizer':
            result = await this.trendSynthesizer(category, query);
            break;
          case 'personalized_curator':
            result = await this.personalizedCurator(category, query);
            break;
        }
        
        if (result && result.length > 100) {
          console.log(`✅ Agent ${agent} succeeded`);
          return result;
        }
      } catch (error) {
        console.error(`❌ Agent ${agent} failed:`, error.message);
        continue;
      }
    }
    
    return this.getFallbackNews(category);
  }

  /**
   * Intelligent News Aggregator Agent
   * Uses AI to find and curate the most relevant news
   */
  async intelligentAggregator(category, query) {
    try {
      // First, get raw news data
      const rawNews = await this.fetchReliableRSSFeeds(category);
      
      if (!rawNews || rawNews.length === 0) {
        return null;
      }

      // Use AI to intelligently curate and analyze
      const curatedNews = await this.aiCuration(rawNews, category, query);
      return curatedNews;
    } catch (error) {
      console.error("Intelligent Aggregator error:", error);
      return null;
    }
  }

  /**
   * RSS Analyzer Agent
   * Fetches from reliable RSS sources and provides basic analysis
   */
  async rssAnalyzer(category) {
    try {
      const articles = await this.fetchReliableRSSFeeds(category);
      
      if (!articles || articles.length === 0) {
        return null;
      }

      return this.formatBasicNews(articles, category);
    } catch (error) {
      console.error("RSS Analyzer error:", error);
      return null;
    }
  }

  /**
   * Trend Synthesizer Agent
   * Uses AI to synthesize trending topics and create summaries
   */
  async trendSynthesizer(category, query) {
    try {
      const trendPrompt = `Generate a comprehensive news summary for ${category} category based on current global trends.

Query context: ${query || 'General interest'}
Date: ${new Date().toLocaleDateString()}

Create a news briefing that covers:
1. Major trending topics in ${category}
2. Key developments and their implications
3. Global perspective on current events
4. Expert analysis and context

Format as an engaging news briefing with:
- Clear headlines
- Concise summaries
- Relevant context
- Forward-looking insights

Make it informative yet accessible, as if briefing an informed professional.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are an expert news analyst and journalist. Create engaging, accurate, and insightful news briefings." 
          },
          { role: "user", content: trendPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const synthesis = response.choices[0].message.content;
      
      return `🔍 **AI-Generated News Synthesis - ${category.toUpperCase()}**

${synthesis}

────────────────────────────────

🤖 **AI Analysis** • Generated ${new Date().toLocaleTimeString()}
💡 *This briefing was created using trend analysis and global news patterns*`;

    } catch (error) {
      console.error("Trend Synthesizer error:", error);
      return null;
    }
  }

  /**
   * Personalized Curator Agent
   * Creates personalized news based on user profile and interests
   */
  async personalizedCurator(category, query) {
    try {
      if (this.userProfile.interests.length === 0) {
        return null; // Not enough personalization data
      }

      const personalizedPrompt = `Create a personalized news briefing for a user with these interests:

User Interests: ${this.userProfile.interests.join(', ')}
Preferred Style: ${this.userProfile.summaryStyle}
Category: ${category}
Specific Query: ${query || 'General news'}

Generate news content that:
1. Aligns with user's interests
2. Matches their preferred style
3. Provides relevant insights
4. Suggests related topics they might find interesting

Make it personal and engaging, as if curated by a knowledgeable friend.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are a personalized news curator who understands user preferences and creates tailored content." 
          },
          { role: "user", content: personalizedPrompt }
        ],
        temperature: 0.6,
        max_tokens: 800
      });

      const personalizedContent = response.choices[0].message.content;
      
      return `👤 **Your Personalized News Briefing**

${personalizedContent}

────────────────────────────────

🎯 **Curated for You** • Based on your interests: ${this.userProfile.interests.slice(0, 3).join(', ')}`;

    } catch (error) {
      console.error("Personalized Curator error:", error);
      return null;
    }
  }

  /**
   * AI-powered news curation and analysis
   */
  async aiCuration(articles, category, query) {
    try {
      const curationPrompt = `Analyze and curate these news articles for ${category} category:

ARTICLES:
${articles.slice(0, 15).map((article, index) => 
  `${index + 1}. ${article.title}\n   ${article.description || 'No description'}\n   Source: ${article.source}`
).join('\n\n')}

User Query: ${query || 'General interest'}

Your task:
1. Select the 5 most important and relevant articles
2. Provide intelligent analysis and context
3. Identify key themes and trends
4. Create engaging summaries
5. Add expert insights and implications

Format as a professional news briefing that's both informative and engaging.`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are an expert news analyst. Create intelligent, engaging news briefings with deep insights." 
          },
          { role: "user", content: curationPrompt }
        ],
        temperature: 0.5,
        max_tokens: 1200
      });

      const curatedContent = response.choices[0].message.content;
      
      return `📰 **AI-Curated News - ${category.toUpperCase()}**

${curatedContent}

────────────────────────────────

🤖 **Intelligent Analysis** • Curated from ${articles.length} sources • ${new Date().toLocaleTimeString()}`;

    } catch (error) {
      console.error("AI Curation error:", error);
      return this.formatBasicNews(articles.slice(0, 5), category);
    }
  }

  /**
   * Fetch from reliable RSS sources
   */
  async fetchReliableRSSFeeds(category) {
    const reliableFeeds = {
      general: [
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        'https://www.thehindu.com/feeder/default.rss',
        'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml'
      ],
      technology: [
        'https://feeds.bbci.co.uk/news/technology/rss.xml',
        'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms',
        'https://www.thehindu.com/sci-tech/technology/feeder/default.rss'
      ],
      business: [
        'https://feeds.bbci.co.uk/news/business/rss.xml',
        'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
        'https://www.business-standard.com/rss/home_page_top_stories.rss'
      ],
      science: [
        'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
        'https://www.thehindu.com/sci-tech/science/feeder/default.rss'
      ],
      health: [
        'https://feeds.bbci.co.uk/news/health/rss.xml',
        'https://www.thehindu.com/sci-tech/health/feeder/default.rss'
      ],
      india: [
        'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml',
        'https://www.thehindu.com/feeder/default.rss',
        'https://indianexpress.com/section/india/feed/'
      ]
    };

    const feeds = reliableFeeds[category] || reliableFeeds.general;
    const allArticles = [];

    for (const feedUrl of feeds) {
      try {
        const articles = await this.fetchSingleRSSFeed(feedUrl);
        if (articles && articles.length > 0) {
          allArticles.push(...articles);
        }
      } catch (error) {
        console.error(`RSS fetch failed for ${feedUrl}:`, error.message);
      }
    }

    // Remove duplicates and sort by date
    const uniqueArticles = this.removeDuplicates(allArticles);
    return uniqueArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }

  /**
   * Fetch single RSS feed
   */
  async fetchSingleRSSFeed(url) {
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const articles = this.parseRSSFeed(data, url);
            resolve(articles);
          } catch (error) {
            console.error(`Parse error for ${url}:`, error.message);
            resolve([]);
          }
        });
      }).on('error', (error) => {
        console.error(`Fetch error for ${url}:`, error.message);
        resolve([]);
      });
    });
  }

  /**
   * Parse RSS feed data
   */
  parseRSSFeed(xmlData, sourceUrl) {
    const articles = [];
    const itemMatches = xmlData.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    itemMatches.forEach((item, index) => {
      try {
        const title = this.extractXMLTag(item, 'title');
        const description = this.extractXMLTag(item, 'description');
        const link = this.extractXMLTag(item, 'link');
        const pubDate = this.extractXMLTag(item, 'pubDate');
        const source = this.extractSourceFromURL(sourceUrl);

        if (title && title.length > 10) {
          articles.push({
            id: `${source}_${index}`,
            title: this.cleanText(title),
            description: this.cleanText(description),
            url: link || sourceUrl,
            source: source,
            pubDate: pubDate || new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("RSS parsing error:", error);
      }
    });

    return articles;
  }

  /**
   * Extract XML tag content
   */
  extractXMLTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Clean HTML and text
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract source name from URL
   */
  extractSourceFromURL(url) {
    try {
      const domain = new URL(url).hostname;
      const sourceMap = {
        'feeds.bbci.co.uk': 'BBC',
        'timesofindia.indiatimes.com': 'Times of India',
        'thehindu.com': 'The Hindu',
        'hindustantimes.com': 'Hindustan Times',
        'economictimes.indiatimes.com': 'Economic Times',
        'business-standard.com': 'Business Standard',
        'indianexpress.com': 'Indian Express'
      };
      
      for (const [key, value] of Object.entries(sourceMap)) {
        if (domain.includes(key)) return value;
      }
      
      return domain.replace('www.', '').split('.')[0];
    } catch (error) {
      return 'Unknown Source';
    }
  }

  /**
   * Remove duplicate articles
   */
  removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = article.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Format basic news without AI analysis
   */
  formatBasicNews(articles, category) {
    let formatted = `📰 **${category.toUpperCase()} News Update**\n\n`;
    formatted += `🗞️ Latest stories from reliable sources:\n\n`;

    articles.slice(0, 8).forEach((article, index) => {
      formatted += `**${index + 1}. ${article.title}**\n`;
      if (article.description) {
        formatted += `${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}\n`;
      }
      formatted += `📰 ${article.source} • ${this.getTimeAgo(article.pubDate)}\n\n`;
    });

    formatted += `────────────────────────────────\n\n`;
    formatted += `📱 ${category} news • Updated ${new Date().toLocaleTimeString()}`;

    return formatted;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return 'Just now';
    } catch (error) {
      return 'Recently';
    }
  }

  /**
   * Fallback news when all agents fail
   */
  getFallbackNews(category) {
    return `📰 **${category.toUpperCase()} News**

🔄 **Service Update**
News services are temporarily unavailable. Our news agents are working to restore full functionality.

⏰ **Next Update:** Please try again in a few minutes

🌐 **Alternative:** You can ask me to search for specific topics or try a different news category.

────────────────────────────────

🤖 System Status • ${new Date().toLocaleTimeString()}`;
  }

  /**
   * Search news with intelligent query processing
   */
  async searchNews(query) {
    try {
      console.log(`🔍 Starting intelligent search for: "${query}"`);
      
      // Use AI to expand and optimize the search query
      const expandedSearch = await this.intelligentQueryExpansion(query);
      console.log(`🔧 Expanded query: "${expandedSearch}"`);
      
      // Get articles from multiple categories
      const categories = ['general', 'technology', 'business', 'science'];
      const allArticles = [];
      
      for (const category of categories) {
        console.log(`📰 Fetching ${category} articles...`);
        const articles = await this.fetchReliableRSSFeeds(category);
        if (articles && articles.length > 0) {
          allArticles.push(...articles);
          console.log(`✅ Got ${articles.length} articles from ${category}`);
        }
      }
      
      console.log(`📊 Total articles collected: ${allArticles.length}`);
      
      if (allArticles.length === 0) {
        return `🔍 **Search Results for "${query}"**\n\n❌ Unable to fetch news articles at this time. Please try again later.`;
      }
      
      // Use AI to find relevant articles
      console.log(`🤖 Using AI to find relevant articles...`);
      const relevantArticles = await this.findRelevantArticles(allArticles, expandedSearch);
      
      if (relevantArticles.length === 0) {
        console.log(`❌ No relevant articles found for "${query}"`);
        
        // Try with original query (in case expansion made it worse)
        console.log(`🔄 Retrying with original query...`);
        const fallbackResults = await this.findRelevantArticles(allArticles, query);
        
        if (fallbackResults.length === 0) {
          return `🔍 **Search Results for "${query}"**\n\n❌ No relevant articles found in current news sources.

💡 **This could mean:**
• The topic is very new or not covered yet
• Try broader search terms (e.g., "trade policy" instead of specific details)
• Check if the topic is trending in different regions

🔄 **Suggestions:**
• Try: "trade news", "US policy", "India news"
• Ask for general news: "show me business news"
• Check back later for updated content

────────────────────────────────

📊 Searched ${allArticles.length} articles • ${new Date().toLocaleTimeString()}`;
        }
        
        console.log(`✅ Fallback found ${fallbackResults.length} articles`);
        return this.formatSearchResults(query, fallbackResults);
      }
      
      console.log(`✅ Found ${relevantArticles.length} relevant articles for "${query}"`);
      
      return this.formatSearchResults(query, relevantArticles);
    } catch (error) {
      console.error("News search error:", error);
      return `🔍 **Search Results for "${query}"**\n\n❌ Search temporarily unavailable. Error: ${error.message}\n\nPlease try again in a moment.`;
    }
  }

  /**
   * Intelligent query expansion using AI
   */
  async intelligentQueryExpansion(query) {
    try {
      const expansionPrompt = `Expand this news search query: "${query}"

Examples:
- "Trump tariff" → "Trump tariff trade policy import duties customs China India bilateral commerce trade war economic sanctions Donald"
- "India news" → "India Indian Delhi Mumbai Modi government policy economy politics"
- "AI technology" → "artificial intelligence machine learning automation tech innovation"

For "${query}", provide related search terms that would appear in relevant news articles.
Include: synonyms, related people/places, organizations, broader/narrower concepts.

Respond with ONLY the expanded search terms (no explanations):`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are a search expert. Expand queries with relevant terms only. Be concise." },
          { role: "user", content: expansionPrompt }
        ],
        temperature: 0.2,
        max_tokens: 150
      });

      let expandedQuery = response.choices[0].message.content.trim();
      
      // Clean up the response
      expandedQuery = expandedQuery.replace(/['"]/g, '').trim();
      
      // If expansion failed or is too short, use the original query plus some basic terms
      if (!expandedQuery || expandedQuery.length < query.length) {
        console.log('⚠️ Query expansion failed, using fallback');
        expandedQuery = this.fallbackQueryExpansion(query);
      }
      
      console.log(`� Query expanded: "${query}" → "${expandedQuery}"`);
      return expandedQuery;
    } catch (error) {
      console.error('Query expansion failed:', error);
      return this.fallbackQueryExpansion(query);
    }
  }

  /**
   * Fallback query expansion when AI fails
   */
  fallbackQueryExpansion(query) {
    const queryLower = query.toLowerCase();
    let expanded = query;
    
    // Add related terms based on common patterns
    if (queryLower.includes('trump')) {
      expanded += ' Donald Trump trade policy tariff import export customs';
    }
    if (queryLower.includes('tariff')) {
      expanded += ' trade policy import duty customs tax commerce bilateral';
    }
    if (queryLower.includes('india')) {
      expanded += ' Indian Delhi Mumbai Modi government bilateral relations';
    }
    if (queryLower.includes('china')) {
      expanded += ' Chinese Beijing trade war economic sanctions';
    }
    if (queryLower.includes('trade')) {
      expanded += ' commerce economy export import bilateral agreement';
    }
    
    return expanded;
  }

  /**
   * Find relevant articles using AI-powered analysis
   */
  async findRelevantArticles(articles, searchQuery) {
    try {
      // First do basic filtering to reduce AI processing load
      const queryTerms = searchQuery.toLowerCase().split(/\s+/);
      const basicFiltered = articles.filter(article => {
        const content = `${article.title} ${article.description}`.toLowerCase();
        return queryTerms.some(term => 
          content.includes(term) || 
          content.includes(term.substring(0, 4)) // Partial matches
        );
      });

      // If we have some basic matches, use AI to rank them
      if (basicFiltered.length > 0) {
        return await this.aiRankArticles(basicFiltered, searchQuery);
      }

      // If no basic matches, use AI to find semantic matches
      return await this.aiSemanticSearch(articles.slice(0, 30), searchQuery);
    } catch (error) {
      console.error('AI article finding failed, using fallback:', error);
      return this.basicTextSearch(articles, searchQuery);
    }
  }

  /**
   * Use AI to rank articles by relevance - Fixed version
   */
  async aiRankArticles(articles, searchQuery) {
    try {
      // Pre-filter articles that have some relevance first
      const preFiltered = this.basicTextSearch(articles, searchQuery);
      
      if (preFiltered.length === 0) {
        console.log('❌ No articles found even with basic text search');
        return [];
      }

      console.log(`🤖 AI ranking ${preFiltered.length} pre-filtered articles`);

      // Use a simpler, more reliable prompt with actual content
      const rankingPrompt = `Rank these news articles for relevance to: "${searchQuery}"

ARTICLES:
${preFiltered.slice(0, 6).map((article, index) => 
  `${index + 1}. ${article.title}${article.description ? ` - ${article.description.substring(0, 100)}` : ''}`
).join('\n')}

Task: Return ONLY the numbers of relevant articles.
- If articles mention Trump AND tariffs/trade: highly relevant
- If articles mention only Trump OR only tariffs: somewhat relevant  
- If articles are about other topics: not relevant

Return format: numbers separated by commas (e.g., 1,3,5)
If nothing is relevant, return: 0`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You rank news articles. Return only relevant article numbers as comma-separated list." 
          },
          { role: "user", content: rankingPrompt }
        ],
        temperature: 0,
        max_tokens: 30
      });

      const rankingText = response.choices[0].message.content.trim();
      console.log(`🤖 AI ranking result: "${rankingText}"`);
      
      // Handle different response formats
      if (!rankingText || rankingText === '0' || rankingText.toUpperCase().includes('NONE')) {
        console.log('🚫 AI found no relevant articles');
        // Still return top basic search results instead of nothing
        return preFiltered.slice(0, 3);
      }
      
      // Parse the response more robustly
      const rankings = rankingText
        .split(/[,\s]+/)
        .map(str => parseInt(str.trim()))
        .filter(num => !isNaN(num) && num > 0 && num <= preFiltered.length);
      
      console.log(`🔢 Parsed rankings: ${rankings}`);
      
      if (rankings.length === 0) {
        console.log('⚠️ Could not parse AI response, using basic search results');
        return preFiltered.slice(0, 3);
      }
      
      // Return articles in ranked order
      const rankedArticles = rankings.map(index => preFiltered[index - 1]).filter(article => article);
      
      console.log(`✅ AI ranked ${rankedArticles.length} relevant articles`);
      return rankedArticles;
    } catch (error) {
      console.error('AI ranking failed:', error);
      // Fallback to basic search results
      const basicResults = this.basicTextSearch(articles, searchQuery);
      return basicResults.slice(0, 5);
    }
  }

  /**
   * Use AI for semantic search when basic filtering fails
   */
  async aiSemanticSearch(articles, searchQuery) {
    try {
      const semanticPrompt = `Find articles related to this search query: "${searchQuery}"

ARTICLES:
${articles.map((article, index) => 
  `${index + 1}. ${article.title}\n   ${article.description || 'No description'}`
).join('\n\n')}

Find articles that are semantically related to the query, even if they don't contain exact keywords.
For example:
- "Trump tariff" should match "US trade policy", "China trade war", "import duties"
- "India trade" should match "bilateral commerce", "economic relations"

Return ONLY the numbers of relevant articles (up to 8), like: 2,15,7,23`;

      const response = await this.aiClient.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at finding semantically related news content. Focus on meaning, not just keywords." 
          },
          { role: "user", content: semanticPrompt }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const resultText = response.choices[0].message.content.trim();
      const articleNumbers = resultText.split(/[,\s]+/).map(num => parseInt(num.trim())).filter(num => !isNaN(num) && num > 0 && num <= articles.length);
      
      const semanticMatches = articleNumbers.map(index => articles[index - 1]).filter(article => article);
      
      return semanticMatches.length > 0 ? semanticMatches : this.basicTextSearch(articles, searchQuery);
    } catch (error) {
      console.error('Semantic search failed:', error);
      return this.basicTextSearch(articles, searchQuery);
    }
  }

  /**
   * Enhanced basic text search with better scoring
   */
  basicTextSearch(articles, searchQuery) {
    const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    console.log(`🔍 Basic search terms: ${queryTerms.join(', ')}`);
    
    const scored = articles.map(article => {
      const title = (article.title || '').toLowerCase();
      const description = (article.description || '').toLowerCase();
      const content = `${title} ${description}`;
      let score = 0;
      
      queryTerms.forEach(term => {
        // Exact matches in title get highest score
        if (title.includes(term)) {
          score += 15;
          console.log(`✅ Found "${term}" in title: ${article.title}`);
        }
        // Exact matches in description get medium score  
        if (description.includes(term)) {
          score += 8;
          console.log(`✅ Found "${term}" in description`);
        }
        // Partial matches (for names like "Trump" vs "Donald Trump")
        if (term.length > 4) {
          const partial = term.substring(0, 4);
          if (content.includes(partial)) {
            score += 3;
          }
        }
      });
      
      return { ...article, score };
    });
    
    const relevant = scored
      .filter(article => article.score > 0)
      .sort((a, b) => b.score - a.score);
    
    console.log(`📊 Basic search found ${relevant.length} articles with scores`);
    if (relevant.length > 0) {
      console.log(`🏆 Top result: "${relevant[0].title}" (score: ${relevant[0].score})`);
    }
    
    return relevant.slice(0, 8);
  }

  /**
   * Format search results with intelligent analysis
   */
  formatSearchResults(query, articles) {
    if (articles.length === 0) {
      return `🔍 **Search Results for "${query}"**\n\n❌ No relevant articles found. 

💡 **Suggestions:**
• Try broader terms like "trade policy" instead of specific names
• Search for recent related topics  
• Check different news categories
• Try again in a few minutes for fresh content

────────────────────────────────

🔄 Search completed • ${new Date().toLocaleTimeString()}`;
    }

    let result = `🔍 **Search Results for "${query}"**\n\n`;
    result += `📰 Found ${articles.length} relevant article${articles.length > 1 ? 's' : ''}:\n\n`;

    articles.forEach((article, index) => {
      result += `**${index + 1}. ${article.title}**\n`;
      
      if (article.description) {
        // Highlight search terms in description
        let description = article.description.substring(0, 250);
        if (article.description.length > 250) description += '...';
        result += `${description}\n`;
      }
      
      result += `📰 ${article.source} • ${this.getTimeAgo(article.pubDate)}`;
      
      // Add relevance indicator if available
      if (article.score) {
        const relevanceLevel = article.score > 15 ? '🔥 High' : article.score > 8 ? '⭐ Medium' : '📌 Related';
        result += ` • ${relevanceLevel} relevance`;
      }
      
      result += `\n\n`;
    });

    result += `────────────────────────────────\n\n`;
    result += `💡 **Want more details?** Ask: "Tell me more about [article topic]"\n`;
    result += `🔍 **Refine search:** Try: "${query} latest" or "${query} analysis"\n`;
    result += `📱 Search completed • ${new Date().toLocaleTimeString()}`;

    return result;
  }

  /**
   * Update user interests based on interaction
   */
  updateUserInterests(topic, interaction = 'view') {
    if (!this.userProfile.interests.includes(topic)) {
      this.userProfile.interests.push(topic);
    }
    
    // Keep only recent interests (max 20)
    if (this.userProfile.interests.length > 20) {
      this.userProfile.interests = this.userProfile.interests.slice(-20);
    }
  }

  /**
   * Get personalized news recommendations
   */
  async getRecommendations() {
    if (this.userProfile.interests.length === 0) {
      return "📚 **Getting to Know You**\n\nI'm still learning your interests! Try asking about specific topics to get personalized recommendations.";
    }

    return await this.personalizedCurator('general', 'recommendations based on interests');
  }
}

// Export singleton instance
export const newsAgent = new NewsAgent();
