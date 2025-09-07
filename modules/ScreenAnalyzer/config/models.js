/**
 * Groq Model Configuration for Screen Analysis
 * Updated with working models (no Llama 3)
 */

export const GROQ_MODELS = {
  // Primary reasoning model for complex planning
  reasoning: "openai/gpt-oss-20b",
  
  // Lightweight model for quick tasks  
  lightweight: "openai/gpt-oss-20b",
  
  // Vision analysis with multimodal capabilities
  vision: "meta-llama/llama-4-maverick-17b-128e-instruct",
  
  // Fallback model
  fallback: "openai/gpt-oss-20b"
};

export const MODEL_CONFIGS = {
  "openai/gpt-oss-20b": {
    maxTokens: 8192,
    temperature: 0.1,
    costPerToken: 0.0002,
    bestFor: ["reasoning", "planning", "complex_analysis", "task_decomposition", "quick_tasks", "simple_queries", "lightweight_processing", "verification", "fallback", "general_purpose"]
  },
  
  "meta-llama/llama-4-maverick-17b-128e-instruct": {
    maxTokens: 8192,
    temperature: 0.1,
    costPerToken: 0.0003,
    bestFor: ["vision", "image_analysis", "screen_understanding", "element_detection", "multimodal_tasks"]
  }
};

export const AGENT_MODEL_MAPPING = {
  VisionAgent: GROQ_MODELS.vision,
  UnderstandingAgent: GROQ_MODELS.vision,
  PlanningAgent: GROQ_MODELS.reasoning,
  ExecutionAgent: GROQ_MODELS.lightweight,
  MonitoringAgent: GROQ_MODELS.lightweight
};

/**
 * Get optimal model for specific task type
 */
export function getModelForTask(taskType) {
  const taskModelMap = {
    'screen_capture': GROQ_MODELS.lightweight,
    'screen_analysis': GROQ_MODELS.vision,
    'element_detection': GROQ_MODELS.vision,
    'action_planning': GROQ_MODELS.reasoning,
    'task_decomposition': GROQ_MODELS.reasoning,
    'quick_decision': GROQ_MODELS.lightweight,
    'verification': GROQ_MODELS.lightweight,
    'fallback': GROQ_MODELS.fallback
  };
  
  return taskModelMap[taskType] || GROQ_MODELS.reasoning;
}

/**
 * Get model configuration details
 */
export function getModelConfig(modelName) {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS["openai/gpt-oss-20b"];
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(modelName, inputTokens, outputTokens = 0) {
  const config = getModelConfig(modelName);
  return (inputTokens + outputTokens) * config.costPerToken;
}
