import os from "os";
import { exec } from "child_process";

/**
 * System Monitoring Module
 * Provides comprehensive system information and monitoring capabilities
 */
class SystemMonitor {
  /**
   * Get system information based on type
   * @param {string} infoType - Type of information to retrieve
   * @returns {Promise<string>} Formatted system information
   */
  async getSystemInfo(infoType) {
    try {
      switch (infoType) {
        case 'cpu':
          return await this.getCPUInfo();
        case 'memory':
          return this.getMemoryInfo();
        case 'disk':
          return await this.getDiskInfo();
        case 'processes':
          return await this.getProcessInfo();
        case 'network':
          return this.getNetworkInfo();
        case 'system':
          return this.getGeneralSystemInfo();
        case 'battery':
          return await this.getBatteryInfo();
        case 'temp':
          return await this.getTemperatureInfo();
        default:
          return "❌ Unknown system information type. Available: cpu, memory, disk, processes, network, system, battery, temp";
      }
    } catch (error) {
      console.error("System info error:", error);
      return `❌ Error getting ${infoType} information: ${error.message}`;
    }
  }

  /**
   * Get CPU information and usage
   * @returns {Promise<string>} CPU information
   */
  async getCPUInfo() {
    const cpus = os.cpus();
    const cpuUsage = await this.calculateCPUUsage();
    return `💻 **CPU Information:**\n• Model: ${cpus[0].model}\n• Cores: ${cpus.length}\n• Current Usage: ${cpuUsage}%\n• Architecture: ${os.arch()}`;
  }

  /**
   * Get memory information
   * @returns {string} Memory information
   */
  getMemoryInfo() {
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);
    return `🧠 **Memory Information:**\n• Total RAM: ${totalMem} GB\n• Used: ${usedMem} GB (${memUsage}%)\n• Free: ${freeMem} GB\n• Available: ${Math.round(os.freemem() / 1024 / 1024)} MB`;
  }

  /**
   * Get disk space information
   * @returns {Promise<string>} Disk information
   */
  async getDiskInfo() {
    return new Promise((resolve) => {
      exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
        if (error) {
          resolve("❌ Could not retrieve disk information");
          return;
        }
        
        const lines = stdout.trim().split('\n');
        let diskInfo = "💾 **Disk Information:**\n";
        
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].trim().split(/\s+/);
          if (parts.length >= 3) {
            const drive = parts[0];
            const freeSpace = Math.round(parseInt(parts[1]) / 1024 / 1024 / 1024);
            const totalSpace = Math.round(parseInt(parts[2]) / 1024 / 1024 / 1024);
            const usedSpace = totalSpace - freeSpace;
            const usagePercent = Math.round((usedSpace / totalSpace) * 100);
            
            diskInfo += `• Drive ${drive}: ${usedSpace}GB used / ${totalSpace}GB total (${usagePercent}% used)\n`;
          }
        }
        
        resolve(diskInfo);
      });
    });
  }

  /**
   * Get running processes information
   * @returns {Promise<string>} Process information
   */
  async getProcessInfo() {
    return new Promise((resolve) => {
      exec('tasklist /fo csv | findstr /v "Image Name" | head -10', (error, stdout) => {
        if (error) {
          resolve("❌ Could not retrieve process information");
          return;
        }
        
        const lines = stdout.trim().split('\n');
        let processInfo = "⚙️ **Top Running Processes:**\n";
        
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 2) {
            const name = parts[0].replace(/"/g, '');
            const pid = parts[1].replace(/"/g, '');
            processInfo += `• ${name} (PID: ${pid})\n`;
          }
        }
        
        resolve(processInfo);
      });
    });
  }

  /**
   * Get network interface information
   * @returns {string} Network information
   */
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    let networkInfo = "🌐 **Network Information:**\n";
    
    Object.keys(interfaces).forEach((name) => {
      interfaces[name].forEach((networkInterface) => {
        if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
          networkInfo += `• ${name}: ${networkInterface.address} (${networkInterface.mac})\n`;
        }
      });
    });
    
    return networkInfo;
  }

  /**
   * Get general system information
   * @returns {string} System information
   */
  getGeneralSystemInfo() {
    return `🖥️ **System Information:**\n• Platform: ${os.platform()}\n• Release: ${os.release()}\n• Architecture: ${os.arch()}\n• Hostname: ${os.hostname()}\n• Uptime: ${this.formatUptime(os.uptime())}\n• Home Directory: ${os.homedir()}`;
  }

  /**
   * Get battery information (Windows specific)
   * @returns {Promise<string>} Battery information
   */
  async getBatteryInfo() {
    return new Promise((resolve) => {
      exec('wmic path Win32_Battery get BatteryStatus,EstimatedChargeRemaining', (error, stdout) => {
        if (error) {
          resolve("🔋 **Battery Information:** Desktop computer (no battery detected)");
          return;
        }
        
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          const status = parts[0] === '2' ? 'Charging' : parts[0] === '1' ? 'Discharging' : 'Unknown';
          const charge = parts[1] || 'Unknown';
          resolve(`🔋 **Battery Information:**\n• Status: ${status}\n• Charge Remaining: ${charge}%`);
        } else {
          resolve("🔋 **Battery Information:** Desktop computer (no battery detected)");
        }
      });
    });
  }

  /**
   * Get temperature information (Windows specific)
   * @returns {Promise<string>} Temperature information
   */
  async getTemperatureInfo() {
    return new Promise((resolve) => {
      exec('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature', (error, stdout) => {
        if (error) {
          resolve("🌡️ **Temperature Information:** Not available on this system");
          return;
        }
        
        const lines = stdout.trim().split('\n');
        if (lines.length > 1 && lines[1].trim()) {
          const tempKelvin = parseInt(lines[1].trim()) / 10;
          const tempCelsius = Math.round(tempKelvin - 273.15);
          const tempFahrenheit = Math.round((tempCelsius * 9/5) + 32);
          resolve(`🌡️ **Temperature Information:**\n• CPU: ${tempCelsius}°C (${tempFahrenheit}°F)`);
        } else {
          resolve("🌡️ **Temperature Information:** Not available on this system");
        }
      });
    });
  }

  /**
   * Calculate CPU usage percentage
   * @returns {Promise<number>} CPU usage percentage
   */
  async calculateCPUUsage() {
    return new Promise((resolve) => {
      const startMeasures = this.getCPUMeasures();
      setTimeout(() => {
        const endMeasures = this.getCPUMeasures();
        const usage = this.calculateCPUPercentage(startMeasures, endMeasures);
        resolve(Math.round(usage));
      }, 100);
    });
  }

  /**
   * Get CPU time measures
   * @returns {Object} CPU time measures
   */
  getCPUMeasures() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    
    for (let cpu of cpus) {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    }
    
    return { user, nice, sys, idle, irq };
  }

  /**
   * Calculate CPU percentage from measures
   * @param {Object} start - Start CPU measures
   * @param {Object} end - End CPU measures
   * @returns {number} CPU usage percentage
   */
  calculateCPUPercentage(start, end) {
    const startTotal = start.user + start.nice + start.sys + start.idle + start.irq;
    const endTotal = end.user + end.nice + end.sys + end.idle + end.irq;
    
    const startIdle = start.idle;
    const endIdle = end.idle;
    
    const total = endTotal - startTotal;
    const idle = endIdle - startIdle;
    
    return (100 - (100 * idle / total));
  }

  /**
   * Format uptime in human-readable format
   * @param {number} seconds - Uptime in seconds
   * @returns {string} Formatted uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }
}

// Export singleton instance
export const systemMonitor = new SystemMonitor();
