import Groq from "groq-sdk";
import dotenv from "dotenv";
import ScreenCapture from "../tools/ScreenCapture.js";
import { getModelForTask, getModelConfig } from "../config/models.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the main project directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Vision Agent - Agentic Screen Capture and Analysis
 * Responsible for capturing, preprocessing, and initial analysis of screen content
 */
export class VisionAgent {
  constructor() {
    // Ensure we have the API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is required in .env file");
    }
    
    this.aiClient = new Groq({ apiKey });
    this.screenCapture = new ScreenCapture();
    this.agentId = "VisionAgent";
    this.capabilities = [
      "screen_capture",
      "image_preprocessing", 
      "element_detection",
      "text_extraction",
      "coordinate_mapping"
    ];
    this.status = "ready";
    this.lastCapture = null;
  }

  /**
   * Main execution method for Vision Agent
   */
  async execute(task) {
    console.log(`🔍 ${this.agentId} executing task: ${task.type}`);
    
    try {
      this.status = "working";
      
      switch (task.type) {
        case 'capture_screen':
          return await this.captureAndAnalyze(task);
        case 'analyze_region':
          return await this.analyzeRegion(task);
        case 'detect_elements':
          return await this.detectElements(task);
        case 'extract_text':
          return await this.extractText(task);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      console.error(`❌ ${this.agentId} failed:`, error);
      this.status = "error";
      return {
        success: false,
        agent: this.agentId,
        error: error.message,
        timestamp: Date.now()
      };
    } finally {
      this.status = "ready";
    }
  }

  /**
   * Capture screen and perform initial AI analysis
   */
  async captureAndAnalyze(task) {
    console.log("📸 Capturing screen...");
    
    // Capture screenshot
    const captureResult = await this.screenCapture.captureFullScreen();
    
    if (!captureResult.success) {
      throw new Error(`Screenshot failed: ${captureResult.error}`);
    }

    console.log(`✅ Screenshot captured: ${captureResult.filename}`);
    this.lastCapture = captureResult;

    // Convert to base64 for AI analysis
    const base64Image = await this.screenCapture.imageToBase64(captureResult.filepath);
    
    if (!base64Image) {
      throw new Error("Failed to convert image to base64");
    }

    // Perform AI analysis
    const analysis = await this.analyzeScreenWithAI(base64Image, task.query);

    return {
      success: true,
      agent: this.agentId,
      capture: captureResult,
      analysis: analysis,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze specific region of screen
   */
  async analyzeRegion(task) {
    const { x, y, width, height } = task.region;
    console.log(`🔍 Analyzing region: ${x},${y} ${width}x${height}`);
    
    const captureResult = await this.screenCapture.captureRegion(x, y, width, height);
    
    if (!captureResult.success) {
      throw new Error(`Region capture failed: ${captureResult.error}`);
    }

    const base64Image = await this.screenCapture.imageToBase64(captureResult.filepath);
    const analysis = await this.analyzeScreenWithAI(base64Image, task.query);

    return {
      success: true,
      agent: this.agentId,
      capture: captureResult,
      analysis: analysis,
      timestamp: Date.now()
    };
  }

  /**
   * Detect UI elements on screen
   */
  async detectElements(task) {
    if (!this.lastCapture) {
      // Capture screen first
      const captureResult = await this.captureAndAnalyze({ type: 'capture_screen', query: 'detect elements' });
      if (!captureResult.success) {
        return captureResult;
      }
    }

    const base64Image = await this.screenCapture.imageToBase64(this.lastCapture.filepath);
    
    const elements = await this.detectUIElements(base64Image, task.elementTypes);

    return {
      success: true,
      agent: this.agentId,
      elements: elements,
      capture: this.lastCapture,
      timestamp: Date.now()
    };
  }

  /**
   * Extract text from screen using AI OCR
   */
  async extractText(task) {
    if (!this.lastCapture) {
      const captureResult = await this.captureAndAnalyze({ type: 'capture_screen', query: 'extract text' });
      if (!captureResult.success) {
        return captureResult;
      }
    }

    const base64Image = await this.screenCapture.imageToBase64(this.lastCapture.filepath);
    const extractedText = await this.performOCR(base64Image);

    return {
      success: true,
      agent: this.agentId,
      extractedText: extractedText,
      capture: this.lastCapture,
      timestamp: Date.now()
    };
  }

  /**
   * AI-powered screen analysis using Groq vision model
   */
  async analyzeScreenWithAI(base64Image, query = "Analyze this screen") {
    const model = getModelForTask('screen_analysis');
    const config = getModelConfig(model);

    try {
      const response = await this.aiClient.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are an expert screen analyzer. Describe what you see on the screen in detail, including UI elements, text, buttons, forms, and their approximate locations. Be specific about clickable elements and their positions."
          },
          {
            role: "user",
            content: [
              { type: "text", text: query },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:image/png;base64,${base64Image}` 
                } 
              }
            ]
          }
        ],
        temperature: config.temperature,
        max_tokens: Math.min(config.maxTokens, 2000)
      });

      const analysis = response.choices[0].message.content;
      
      return {
        description: analysis,
        model: model,
        confidence: this.calculateConfidence(analysis),
        elements: this.parseElementsFromDescription(analysis)
      };
    } catch (error) {
      console.error("AI screen analysis failed:", error);
      
      // Fallback to basic analysis
      return {
        description: "AI analysis failed. Image captured successfully but could not be analyzed.",
        model: "fallback",
        confidence: 0.1,
        elements: [],
        error: error.message
      };
    }
  }

  /**
   * Detect specific UI elements
   */
  async detectUIElements(base64Image, elementTypes = ['button', 'input', 'link', 'form']) {
    const model = getModelForTask('element_detection');
    
    try {
      const response = await this.aiClient.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a UI element detector. Find and describe the locations of these elements: ${elementTypes.join(', ')}. 
            For each element, provide: type, text/label, approximate coordinates, and clickability.
            Format response as JSON array with: {"type": "button", "text": "Submit", "x": 100, "y": 200, "width": 80, "height": 30, "clickable": true}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Detect these UI elements: ${elementTypes.join(', ')}` },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:image/png;base64,${base64Image}` 
                } 
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const elementText = response.choices[0].message.content;
      return this.parseElementsFromJSON(elementText);
    } catch (error) {
      console.error("Element detection failed:", error);
      return [];
    }
  }

  /**
   * Perform OCR text extraction
   */
  async performOCR(base64Image) {
    const model = getModelForTask('screen_analysis');
    
    try {
      const response = await this.aiClient.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are an OCR system. Extract ALL text visible in the image. Preserve formatting and structure as much as possible."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image:" },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:image/png;base64,${base64Image}` 
                } 
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 2000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("OCR failed:", error);
      return "OCR extraction failed";
    }
  }

  /**
   * Parse elements from AI description
   */
  parseElementsFromDescription(description) {
    const elements = [];
    
    // Look for common UI element patterns in the description
    const patterns = [
      { type: 'button', regex: /button[s]?\s+(?:labeled\s+)?"([^"]+)"/gi },
      { type: 'link', regex: /link[s]?\s+(?:labeled\s+)?"([^"]+)"/gi },
      { type: 'input', regex: /input[s]?\s+(?:field[s]?\s+)?(?:labeled\s+)?"([^"]+)"/gi },
      { type: 'text', regex: /text[s]?\s+"([^"]+)"/gi },
      { type: 'menu', regex: /menu[s]?\s+(?:labeled\s+)?"([^"]+)"/gi }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(description)) !== null) {
        elements.push({
          type: pattern.type,
          text: match[1],
          confidence: 0.7
        });
      }
    });

    return elements;
  }

  /**
   * Calculate confidence based on analysis quality
   */
  calculateConfidence(analysis) {
    if (!analysis || analysis.length < 50) return 0.2;
    
    const indicators = [
      /button/i, /click/i, /input/i, /form/i, /menu/i, 
      /text/i, /image/i, /link/i, /navigation/i, /interface/i
    ];
    
    const matches = indicators.filter(indicator => indicator.test(analysis)).length;
    return Math.min(0.9, 0.3 + (matches * 0.1));
  }

  /**
   * Parse elements from JSON response
   */
  parseElementsFromJSON(elementText) {
    try {
      // Try to extract JSON from response
      const jsonMatch = elementText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to basic parsing
      return [];
    } catch (error) {
      console.error("Failed to parse elements JSON:", error);
      return [];
    }
  }

  /**
   * Calculate confidence score based on analysis
   */
  calculateConfidence(analysis) {
    if (!analysis || analysis.length < 50) return 0.2;
    if (analysis.includes("AI analysis failed")) return 0.1;
    
    const indicators = [
      analysis.includes("button"),
      analysis.includes("input"), 
      analysis.includes("form"),
      analysis.includes("text"),
      analysis.includes("located"),
      analysis.includes("coordinates")
    ];
    
    return indicators.filter(Boolean).length / indicators.length;
  }

  /**
   * Get agent status and capabilities
   */
  getStatus() {
    return {
      agentId: this.agentId,
      status: this.status,
      capabilities: this.capabilities,
      lastCapture: this.lastCapture ? {
        timestamp: this.lastCapture.timestamp,
        filename: this.lastCapture.filename
      } : null
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.screenCapture.cleanup(1); // Clean up screenshots older than 1 hour
  }
}

export default VisionAgent;
