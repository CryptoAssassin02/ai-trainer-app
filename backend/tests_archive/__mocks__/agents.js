// Create mock implementations for all agent classes
const mockProcess = jest.fn();

// Set up WorkoutGenerationAgent mock
const WorkoutGenerationAgent = {
  process: jest.fn()
};

// Set up PlanAdjustmentAgent mock
const PlanAdjustmentAgent = {
  process: jest.fn()
};

// Set up ResearchAgent mock
const ResearchAgent = {
  process: jest.fn()
};

// Set up NutritionAgent mock
const NutritionAgent = {
  process: jest.fn()
};

// Set up BaseAgent mock
const BaseAgent = {
  process: jest.fn()
};

// Add helper methods to each mock
[WorkoutGenerationAgent, PlanAdjustmentAgent, ResearchAgent, NutritionAgent, BaseAgent].forEach(agent => {
  agent.process.mockResolvedValue = jest.fn().mockImplementation(value => {
    agent.process.mockImplementation(() => Promise.resolve(value));
    return agent.process;
  });
  
  agent.process.mockRejectedValue = jest.fn().mockImplementation(error => {
    agent.process.mockImplementation(() => Promise.reject(error));
    return agent.process;
  });
});

// Export all mocked agents
module.exports = {
  WorkoutGenerationAgent,
  PlanAdjustmentAgent,
  ResearchAgent,
  NutritionAgent,
  BaseAgent
}; 