/**
 * Agent Capabilities Matrix
 * Defines what each agent can do in the agentic system
 */

export const AGENT_CAPABILITIES = {
  VisionAgent: {
    name: "Vision Agent",
    description: "Captures and preprocesses screen data",
    capabilities: [
      "screen_capture",
      "image_preprocessing", 
      "element_detection",
      "text_extraction",
      "coordinate_mapping"
    ],
    tools: ["ScreenCapture", "ImageProcessor", "ElementDetector"],
    priority: 1,
    fallback: null
  },

  UnderstandingAgent: {
    name: "Understanding Agent", 
    description: "AI-powered scene interpretation",
    capabilities: [
      "scene_analysis",
      "ui_element_recognition",
      "context_understanding",
      "intent_interpretation",
      "semantic_analysis"
    ],
    tools: ["AIAnalyzer", "ContextProcessor"],
    priority: 2,
    fallback: "VisionAgent"
  },

  PlanningAgent: {
    name: "Planning Agent",
    description: "Task decomposition and strategy planning", 
    capabilities: [
      "task_breakdown",
      "action_sequencing",
      "strategy_optimization",
      "fallback_planning",
      "resource_allocation"
    ],
    tools: ["TaskPlanner", "StrategyOptimizer"],
    priority: 3,
    fallback: "UnderstandingAgent"
  },

  ExecutionAgent: {
    name: "Execution Agent",
    description: "Automated action execution",
    capabilities: [
      "mouse_control",
      "keyboard_input", 
      "action_execution",
      "timing_control",
      "error_recovery"
    ],
    tools: ["ActionExecutor", "InputController"],
    priority: 4,
    fallback: "PlanningAgent"
  },

  MonitoringAgent: {
    name: "Monitoring Agent",
    description: "Success verification and feedback",
    capabilities: [
      "success_verification",
      "error_detection",
      "performance_monitoring",
      "feedback_generation",
      "learning_updates"
    ],
    tools: ["SuccessVerifier", "ErrorDetector", "PerformanceMonitor"],
    priority: 5,
    fallback: "ExecutionAgent"
  }
};

export const WORKFLOW_PATTERNS = {
  simple_click: ["VisionAgent", "UnderstandingAgent", "ExecutionAgent", "MonitoringAgent"],
  form_filling: ["VisionAgent", "UnderstandingAgent", "PlanningAgent", "ExecutionAgent", "MonitoringAgent"],
  navigation: ["VisionAgent", "UnderstandingAgent", "PlanningAgent", "ExecutionAgent", "MonitoringAgent"],
  data_extraction: ["VisionAgent", "UnderstandingAgent", "PlanningAgent", "MonitoringAgent"],
  complex_automation: ["VisionAgent", "UnderstandingAgent", "PlanningAgent", "ExecutionAgent", "MonitoringAgent"]
};
