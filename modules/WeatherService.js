import { exec } from "child_process";
import https from "https";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Modular Weather Service
 * Handles all weather-related functionality with intelligent location detection
 */
export class WeatherService {
  constructor() {
    this.weatherCache = null;
    this.weatherCacheTime = 0;
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes cache
  }

  /**
   * Get weather information for a location
   * @param {string} location - Location to get weather for
   * @returns {Promise<string>} Formatted weather information
   */
  async getWeather(location = null) {
    try {
      // Check cache first
      if (this.weatherCache && (Date.now() - this.weatherCacheTime < this.cacheExpiry)) {
        return this.weatherCache;
      }

      // Auto-detect location if not provided
      if (!location) {
        location = await this.detectLocation();
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
   * Auto-detect user location using IP geolocation
   * @returns {Promise<string>} Detected location
   */
  async detectLocation() {
    try {
      const response = await this.makeHttpsRequest('https://ipapi.co/json/');
      const locationData = JSON.parse(response);
      
      if (locationData.city && locationData.region) {
        return `${locationData.city}, ${locationData.region}`;
      } else if (locationData.city) {
        return locationData.city;
      } else {
        return "New York"; // Fallback
      }
    } catch (error) {
      console.error("Location detection error:", error);
      return "New York"; // Fallback
    }
  }

  /**
   * Fetch weather data from wttr.in API
   * @param {string} location - Location to fetch weather for
   * @returns {Promise<Object>} Weather data
   */
  async fetchWeatherData(location) {
    try {
      const encodedLocation = encodeURIComponent(location);
      const url = `https://wttr.in/${encodedLocation}?format=j1`;
      const response = await this.makeHttpsRequest(url);
      return JSON.parse(response);
    } catch (error) {
      console.error("Weather API error:", error);
      return null;
    }
  }

  /**
   * Format weather data for display
   * @param {Object} weatherData - Raw weather data
   * @returns {string} Formatted weather string
   */
  formatWeatherData(weatherData) {
    try {
      const current = weatherData.current_condition[0];
      const location = weatherData.nearest_area[0];
      const today = weatherData.weather[0];

      const locationName = `${location.areaName[0].value}, ${location.region[0].value}`;
      const temperature = `${current.temp_C}°C (${current.temp_F}°F)`;
      const description = current.weatherDesc[0].value;
      const humidity = `${current.humidity}%`;
      const windSpeed = `${current.windspeedKmph} km/h`;
      const feelsLike = `${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`;

      // Weather emoji mapping
      const weatherEmojis = {
        'Sunny': '☀️',
        'Clear': '🌙',
        'Partly cloudy': '⛅',
        'Cloudy': '☁️',
        'Overcast': '☁️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Light rain': '🌦️',
        'Moderate rain': '🌧️',
        'Heavy rain': '⛈️',
        'Snow': '❄️',
        'Thunderstorm': '⛈️'
      };

      const emoji = weatherEmojis[description] || '🌤️';

      return `🌤️ **Weather Update for ${locationName}**

${emoji} **Current Conditions:**
• Temperature: ${temperature}
• Feels like: ${feelsLike}
• Condition: ${description}
• Humidity: ${humidity}
• Wind Speed: ${windSpeed}

📅 **Today's Forecast:**
• High: ${today.maxtempC}°C (${today.maxtempF}°F)
• Low: ${today.mintempC}°C (${today.mintempF}°F)

────────────────────────────────

🌡️ Have a great day! Stay ${current.temp_C > 25 ? 'cool' : 'warm'}!`;

    } catch (error) {
      console.error("Weather formatting error:", error);
      return "❌ Error formatting weather data.";
    }
  }

  /**
   * Make HTTPS request
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} Response data
   */
  makeHttpsRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  /**
   * Get extended weather forecast
   * @param {string} location - Location for forecast
   * @param {number} days - Number of days (default 3)
   * @returns {Promise<string>} Extended forecast
   */
  async getExtendedForecast(location = null, days = 3) {
    try {
      if (!location) {
        location = await this.detectLocation();
      }

      const weatherData = await this.fetchWeatherData(location);
      
      if (!weatherData || !weatherData.weather) {
        return "❌ Could not fetch forecast data.";
      }

      const locationName = `${weatherData.nearest_area[0].areaName[0].value}, ${weatherData.nearest_area[0].region[0].value}`;
      let forecast = `🗓️ **${days}-Day Weather Forecast for ${locationName}**\n\n`;

      for (let i = 0; i < Math.min(days, weatherData.weather.length); i++) {
        const day = weatherData.weather[i];
        const date = new Date(day.date);
        const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
        
        forecast += `**${dayName} (${date.toLocaleDateString()}):**\n`;
        forecast += `• High: ${day.maxtempC}°C (${day.maxtempF}°F)\n`;
        forecast += `• Low: ${day.mintempC}°C (${day.mintempF}°F)\n`;
        forecast += `• Condition: ${day.hourly[4].weatherDesc[0].value}\n`;
        forecast += `• Chance of Rain: ${day.hourly[4].chanceofrain}%\n\n`;
      }

      return forecast;
    } catch (error) {
      console.error("Extended forecast error:", error);
      return "❌ Error fetching extended forecast.";
    }
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
