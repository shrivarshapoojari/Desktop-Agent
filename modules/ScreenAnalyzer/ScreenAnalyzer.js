import dotenv from "dotenv";
import VisionAgent from "./agents/VisionAgent.js";
import { AGENT_CAPABILITIES, WORKFLOW_PATTERNS } from "./config/capabilities.js";
import { getModelForTask } from "./config/models.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the main project directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Agentic Screen Analysis System
 * Main orchestrator that coordinates multiple AI agents for intelligent screen automation
 */
export class ScreenAnalyzer {
  constructor() {
    // Verify API key is available
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is required in .env file");
    }
    
    this.agents = {
      vision: new VisionAgent()
    };
    
    this.activeWorkflow = null;
    this.taskHistory = [];
    this.systemStatus = "ready";
    
    console.log("🤖 Agentic Screen Analyzer initialized");
  }

  /**
   * Main entry point for screen analysis tasks
   */
  async analyzeScreen(query, options = {}) {
    console.log(`🔍 Starting screen analysis: "${query}"`);
    
    try {
      this.systemStatus = "analyzing";
      
      // Determine task type and workflow
      const taskType = this.classifyTask(query);
      const workflow = this.selectWorkflow(taskType);
      
      console.log(`📋 Task type: ${taskType}, Workflow: ${workflow.join(' → ')}`);
      
      // Execute workflow
      const result = await this.executeWorkflow(workflow, {
        query,
        taskType,
        ...options
      });
      
      // Store task history
      this.taskHistory.push({
        query,
        taskType,
        workflow,
        result,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      console.error("❌ Screen analysis failed:", error);
      return {
        success: false,
        error: error.message,
        agent: "ScreenAnalyzer",
        timestamp: Date.now()
      };
    } finally {
      this.systemStatus = "ready";
    }
  }

  /**
   * Capture and describe what's on screen
   */
  async describeScreen() {
    const result = await this.agents.vision.execute({
      type: 'capture_screen',
      query: 'Describe everything visible on this screen in detail'
    });
    
    if (result.success) {
      return {
        success: true,
        description: result.analysis.description,
        elements: result.analysis.elements,
        screenshot: result.capture.filename,
        confidence: result.analysis.confidence
      };
    }
    
    return result;
  }

  /**
   * Find specific UI elements
   */
  async findElements(elementDescription) {
    const result = await this.agents.vision.execute({
      type: 'detect_elements',
      elementTypes: ['button', 'input', 'link', 'form', 'text'],
      query: `Find elements matching: ${elementDescription}`
    });
    
    if (result.success) {
      const matchingElements = result.elements.filter(element => 
        element.text && element.text.toLowerCase().includes(elementDescription.toLowerCase())
      );
      
      return {
        success: true,
        elements: matchingElements,
        allElements: result.elements,
        screenshot: result.capture.filename
      };
    }
    
    return result;
  }

  /**
   * Extract all text from screen
   */
  async extractText() {
    const result = await this.agents.vision.execute({
      type: 'extract_text'
    });
    
    if (result.success) {
      return {
        success: true,
        text: result.extractedText,
        screenshot: result.capture.filename
      };
    }
    
    return result;
  }

  /**
   * Take a screenshot and return path
   */
  async takeScreenshot() {
    const result = await this.agents.vision.captureAndAnalyze({
      type: 'capture_screen',
      query: 'Take screenshot'
    });
    
    if (result.success) {
      return {
        success: true,
        filepath: result.capture.filepath,
        filename: result.capture.filename,
        size: result.capture.size
      };
    }
    
    return result;
  }

  /**
   * Classify task type based on user query
   */
  classifyTask(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('click') || queryLower.includes('press')) {
      return 'simple_click';
    }
    
    if (queryLower.includes('fill') || queryLower.includes('form') || queryLower.includes('enter')) {
      return 'form_filling';
    }
    
    if (queryLower.includes('navigate') || queryLower.includes('go to') || queryLower.includes('open')) {
      return 'navigation';
    }
    
    if (queryLower.includes('extract') || queryLower.includes('get') || queryLower.includes('find')) {
      return 'data_extraction';
    }
    
    if (queryLower.includes('automate') || queryLower.includes('workflow')) {
      return 'complex_automation';
    }
    
    // Default to data extraction for analysis tasks
    return 'data_extraction';
  }

  /**
   * Select appropriate workflow based on task type
   */
  selectWorkflow(taskType) {
    return WORKFLOW_PATTERNS[taskType] || WORKFLOW_PATTERNS.data_extraction;
  }

  /**
   * Execute workflow with available agents
   */
  async executeWorkflow(workflow, task) {
    console.log(`🔄 Executing workflow: ${workflow.join(' → ')}`);
    
    let currentResult = null;
    const workflowResults = [];
    
    for (const agentName of workflow) {
      const agentKey = agentName.toLowerCase().replace('agent', '');
      const agent = this.agents[agentKey];
      
      if (!agent) {
        console.log(`⚠️ Agent ${agentName} not yet implemented, skipping...`);
        continue;
      }
      
      try {
        console.log(`🤖 Executing ${agentName}...`);
        
        // Adapt task for specific agent
        const agentTask = this.adaptTaskForAgent(agentName, task, currentResult);
        const result = await agent.execute(agentTask);
        
        workflowResults.push({
          agent: agentName,
          result: result,
          timestamp: Date.now()
        });
        
        currentResult = result;
        
        if (!result.success) {
          console.log(`❌ ${agentName} failed, stopping workflow`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ ${agentName} error:`, error);
        workflowResults.push({
          agent: agentName,
          result: { success: false, error: error.message },
          timestamp: Date.now()
        });
        break;
      }
    }
    
    return {
      success: currentResult?.success || false,
      workflow: workflow,
      results: workflowResults,
      finalResult: currentResult,
      task: task
    };
  }

  /**
   * Adapt generic task for specific agent
   */
  adaptTaskForAgent(agentName, task, previousResult) {
    switch (agentName) {
      case 'VisionAgent':
        return {
          type: 'capture_screen',
          query: task.query
        };
        
      case 'UnderstandingAgent':
        return {
          type: 'analyze_scene',
          query: task.query,
          screenshot: previousResult?.capture
        };
        
      case 'PlanningAgent':
        return {
          type: 'plan_actions',
          query: task.query,
          analysis: previousResult?.analysis
        };
        
      case 'ExecutionAgent':
        return {
          type: 'execute_actions',
          plan: previousResult?.plan
        };
        
      case 'MonitoringAgent':
        return {
          type: 'verify_success',
          originalTask: task,
          executionResult: previousResult
        };
        
      default:
        return task;
    }
  }

  /**
   * Get system status and capabilities
   */
  getStatus() {
    return {
      systemStatus: this.systemStatus,
      availableAgents: Object.keys(this.agents),
      agentStatus: Object.fromEntries(
        Object.entries(this.agents).map(([name, agent]) => [
          name, 
          agent.getStatus ? agent.getStatus() : { status: 'unknown' }
        ])
      ),
      taskHistory: this.taskHistory.slice(-5), // Last 5 tasks
      capabilities: Object.keys(AGENT_CAPABILITIES)
    };
  }

  /**
   * Add new agent to the system
   */
  addAgent(name, agent) {
    this.agents[name] = agent;
    console.log(`✅ Added ${name} agent to system`);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    for (const [name, agent] of Object.entries(this.agents)) {
      if (agent.cleanup) {
        await agent.cleanup();
        console.log(`🧹 Cleaned up ${name} agent`);
      }
    }
  }
}

// Export singleton instance
export const screenAnalyzer = new ScreenAnalyzer();
export default ScreenAnalyzer;