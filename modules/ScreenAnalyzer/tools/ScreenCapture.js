import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Cross-platform Screen Capture Tool
 * Uses native OS commands instead of problematic native modules
 */
export class ScreenCapture {
  constructor() {
    this.platform = process.platform;
    this.screenshotDir = path.join(process.cwd(), 'temp', 'screenshots');
    this.ensureDirectoryExists();
  }

  /**
   * Ensure screenshot directory exists
   */
  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create screenshot directory:', error);
    }
  }

  /**
   * Capture full screen screenshot
   */
  async captureFullScreen() {
    const timestamp = Date.now();
    const filename = `screenshot_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    try {
      switch (this.platform) {
        case 'win32':
          await this.captureWindows(filepath);
          break;
        case 'darwin':
          await this.captureMacOS(filepath);
          break;
        case 'linux':
          await this.captureLinux(filepath);
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      return {
        success: true,
        filepath,
        filename,
        timestamp,
        size: await this.getFileSize(filepath)
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Capture specific region of screen
   */
  async captureRegion(x, y, width, height) {
    const timestamp = Date.now();
    const filename = `region_${x}_${y}_${width}_${height}_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    try {
      switch (this.platform) {
        case 'win32':
          await this.captureWindowsRegion(filepath, x, y, width, height);
          break;
        case 'darwin':
          await this.captureMacOSRegion(filepath, x, y, width, height);
          break;
        case 'linux':
          await this.captureLinuxRegion(filepath, x, y, width, height);
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      return {
        success: true,
        filepath,
        filename,
        timestamp,
        region: { x, y, width, height },
        size: await this.getFileSize(filepath)
      };
    } catch (error) {
      console.error('Region capture failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Windows screenshot using PowerShell
   */
  async captureWindows(filepath) {
    const powershellScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $bitmap.Save('${filepath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bitmap.Dispose()
    `;

    const command = `powershell -Command "${powershellScript.replace(/\n/g, '; ')}"`;
    await execAsync(command);
  }

  /**
   * Windows region screenshot using PowerShell
   */
  async captureWindowsRegion(filepath, x, y, width, height) {
    const powershellScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $bitmap = New-Object System.Drawing.Bitmap ${width}, ${height}
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen(${x}, ${y}, 0, 0, $bitmap.Size)
      $bitmap.Save('${filepath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bitmap.Dispose()
    `;

    const command = `powershell -Command "${powershellScript.replace(/\n/g, '; ')}"`;
    await execAsync(command);
  }

  /**
   * macOS screenshot using screencapture
   */
  async captureMacOS(filepath) {
    await execAsync(`screencapture "${filepath}"`);
  }

  /**
   * macOS region screenshot
   */
  async captureMacOSRegion(filepath, x, y, width, height) {
    await execAsync(`screencapture -R ${x},${y},${width},${height} "${filepath}"`);
  }

  /**
   * Linux screenshot using gnome-screenshot or scrot
   */
  async captureLinux(filepath) {
    try {
      // Try gnome-screenshot first
      await execAsync(`gnome-screenshot -f "${filepath}"`);
    } catch (error) {
      try {
        // Fallback to scrot
        await execAsync(`scrot "${filepath}"`);
      } catch (error2) {
        try {
          // Fallback to import (ImageMagick)
          await execAsync(`import -window root "${filepath}"`);
        } catch (error3) {
          throw new Error('No screenshot tool found on Linux. Install gnome-screenshot, scrot, or ImageMagick.');
        }
      }
    }
  }

  /**
   * Linux region screenshot
   */
  async captureLinuxRegion(filepath, x, y, width, height) {
    try {
      await execAsync(`gnome-screenshot -a -f "${filepath}"`);
    } catch (error) {
      try {
        await execAsync(`scrot -a ${x},${y},${width},${height} "${filepath}"`);
      } catch (error2) {
        await execAsync(`import -window root -crop ${width}x${height}+${x}+${y} "${filepath}"`);
      }
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Convert image to base64 for AI analysis
   */
  async imageToBase64(filepath) {
    try {
      const imageBuffer = await fs.readFile(filepath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      return null;
    }
  }

  /**
   * Clean up old screenshots
   */
  async cleanup(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.screenshotDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

      for (const file of files) {
        const filepath = path.join(this.screenshotDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filepath);
          console.log(`Cleaned up old screenshot: ${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Get screen dimensions (Windows only for now)
   */
  async getScreenDimensions() {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync('powershell -Command "[System.Windows.Forms.Screen]::PrimaryScreen.Bounds | Select-Object Width, Height | ConvertTo-Json"');
        return JSON.parse(stdout);
      }
      
      // Default fallback
      return { Width: 1920, Height: 1080 };
    } catch (error) {
      console.error('Failed to get screen dimensions:', error);
      return { Width: 1920, Height: 1080 };
    }
  }
}

export default ScreenCapture;
