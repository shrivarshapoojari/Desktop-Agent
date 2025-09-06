import { exec } from "child_process";
import https from "https";
import fs from "fs";

/**
 * Weather and News Integration Module
 * Provides real-time weather data and news updates
 */
class WeatherNewsSystem {
  constructor() {
    this.weatherCache = null;
    this.newsCache = null;
    this.weatherCacheTime = 0;
    this.newsCacheTime = 0;
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes cache
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
   * Get news headlines
   * @param {string} category - News category (optional)
   * @returns {Promise<string>} News headlines
   */
  async getNews(category = "general") {
    try {
      // Check cache first
      if (this.newsCache && (Date.now() - this.newsCacheTime < this.cacheExpiry)) {
        return this.newsCache;
      }

      const newsData = await this.fetchNewsData(category);
      
      if (newsData) {
        const formatted = this.formatNewsData(newsData);
        this.newsCache = formatted;
        this.newsCacheTime = Date.now();
        return formatted;
      } else {
        return "❌ Could not fetch news data. Please try again later.";
      }
    } catch (error) {
      console.error("News fetch error:", error);
      return "❌ Error fetching news information.";
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
   * Fetch news data from free news service
   * @param {string} category - News category
   * @returns {Promise<Object>} News data
   */
  async fetchNewsData(category) {
    return new Promise((resolve) => {
      try {
        // Use NewsAPI free tier or fallback to RSS feeds
        const rssFeeds = {
          general: 'https://feeds.bbci.co.uk/news/rss.xml',
          technology: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
          business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
          science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
          health: 'https://feeds.bbci.co.uk/news/health/rss.xml'
        };

        const feedUrl = rssFeeds[category] || rssFeeds.general;
        
        https.get(feedUrl, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const newsData = this.parseRSSFeed(data);
              resolve(newsData);
            } catch (error) {
              console.error("News parse error:", error);
              resolve(null);
            }
          });
        }).on('error', (error) => {
          console.error("News request error:", error);
          resolve(null);
        });
      } catch (error) {
        console.error("News fetch error:", error);
        resolve(null);
      }
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
   * Parse RSS feed to extract news articles
   * @param {string} rssData - Raw RSS XML data
   * @returns {Array} Parsed news articles
   */
  parseRSSFeed(rssData) {
    try {
      const articles = [];
      
      // Simple XML parsing for RSS items
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const titleRegex = /<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i;
      const descRegex = /<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/i;
      const linkRegex = /<link[^>]*>(.*?)<\/link>/i;
      const pubDateRegex = /<pubDate[^>]*>(.*?)<\/pubDate>/i;

      let match;
      while ((match = itemRegex.exec(rssData)) !== null) {
        const itemContent = match[1];
        
        const titleMatch = titleRegex.exec(itemContent);
        const descMatch = descRegex.exec(itemContent);
        const linkMatch = linkRegex.exec(itemContent);
        const dateMatch = pubDateRegex.exec(itemContent);

        if (titleMatch) {
          articles.push({
            title: titleMatch[1].trim(),
            description: descMatch ? descMatch[1].trim() : '',
            link: linkMatch ? linkMatch[1].trim() : '',
            pubDate: dateMatch ? dateMatch[1].trim() : ''
          });
        }
      }

      return articles;
    } catch (error) {
      console.error("RSS parsing error:", error);
      return [];
    }
  }

  /**
   * Get combined weather and news briefing
   * @param {string} location - Location for weather
   * @param {string} newsCategory - News category
   * @returns {Promise<string>} Combined briefing
   */
  async getDailyBriefing(location = null, newsCategory = "general") {
    try {
      const weather = await this.getWeather(location);
      const news = await this.getNews(newsCategory);

      return `🌅 **Daily Briefing - ${new Date().toLocaleDateString()}**\n\n${weather}\n\n${news}`;
    } catch (error) {
      return "❌ Error generating daily briefing";
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
