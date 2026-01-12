# Base Agent Documentation

## Overview

The BaseAgent class serves as the foundation for all AI agent implementations in the system, providing standardized error handling, memory integration, logging utilities, and performance monitoring capabilities. It implements common patterns for processing, validation, retry logic, and safe execution wrappers that ensure consistent behavior across all agent types.

**Location**: `backend/agents/base-agent.js`  
**Dependencies**: `utils/errors`, agent memory system, logger  
**Type**: Abstract base class for all AI agents

## Agent Architecture

### Base Agent Purpose
- **Standardized Processing**: Common interface for all agent implementations
- **Error Handling**: Comprehensive error wrapping and classification  
- **Memory Integration**: Seamless integration with the agent memory system
- **Performance Monitoring**: Built-in timing, logging, and resource tracking
- **Safety Mechanisms**: Retry logic, timeout handling, and validation utilities

### Agent Hierarchy
All concrete agents extend BaseAgent:
- `WorkoutGenerationAgent` - Creates personalized workout plans
- `NutritionAgent` - Generates meal plans and nutrition guidance
- `AnalyticsAgent` - Processes user data for insights
- `ResearchAgent` - Researches exercises and fitness information
- `PlanAdjustmentAgent` - Modifies existing workout plans
- `InsightGeneratorAgent` - Creates AI-powered insights
- `PatternDetectorAgent` - Identifies behavioral patterns

## Agent Configuration

### Initialization
```javascript
const agent = new BaseAgent({
  memorySystem: agentMemorySystemInstance,
  logger: loggerInstance,
  config: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 1.5,
    timeoutLimit: 30000
  }
});
```

### Configuration Options
- **memorySystem**: AgentMemorySystem instance for storing/retrieving memories
- **logger**: Logger instance for structured logging
- **config.maxRetries**: Maximum retry attempts (default: 3)
- **config.initialDelay**: Initial retry delay in milliseconds (default: 1000)
- **config.backoffFactor**: Exponential backoff multiplier (default: 1.5)
- **config.timeoutLimit**: API call timeout in milliseconds (default: 30000)

## Core Agent Methods

### process()
**File:** `base-agent.js`  
**Line:** 24-26  
**Status:** Abstract method - must be implemented by derived classes

#### Implementation Pattern
```javascript
async process(context, options = {}) {
  // 1. Validate input
  // 2. Retrieve relevant memories
  // 3. Perform AI processing
  // 4. Validate output
  // 5. Store results in memory
  // 6. Return structured response
}
```

#### Expected Implementation
- **Input Validation**: Validate context and options parameters
- **Memory Integration**: Use `retrieveMemories()` for context
- **AI Processing**: Make API calls to AI services
- **Output Validation**: Ensure response meets requirements
- **Memory Storage**: Store results using `storeMemory()`

### safeProcess()
**File:** `base-agent.js`  
**Lines:** 32-105  
**Called By:** All agent controllers

#### Input Processing
- **Expected Input:**
  ```javascript
  {
    context: {
      userId: "uuid",
      // Agent-specific context data
    },
    options: {
      // Processing options
    }
  }
  ```
- **Context Required**: User ID and agent-specific data
- **Memory Retrieval**: Automatic memory integration

#### Processing Steps
1. **Input Validation**
   - Validates context structure
   - Logs processing start with metadata

2. **Error Handling Wrapper**
   - Wraps `process()` call in try-catch
   - Provides comprehensive error classification
   - Implements standardized error response format

3. **Error Classification**
   - **AgentError**: Already properly formatted agent errors
   - **ValidationError**: Input validation failures → VALIDATION_ERROR
   - **External Service Errors**: HTTP 5xx responses → EXTERNAL_SERVICE_ERROR
   - **Network Errors**: ECONNREFUSED, ENOTFOUND → EXTERNAL_SERVICE_ERROR
   - **Configuration Errors**: Missing config → CONFIGURATION_ERROR
   - **General Errors**: Unexpected errors → PROCESSING_ERROR

4. **Performance Logging**
   - Logs processing start and end times
   - Records error details with metadata
   - Tracks processing duration

#### Output Variations
- **Success Response:**
  ```javascript
  {
    success: true,
    data: {
      // Agent-specific response data
    }
  }
  ```
- **Error Response:**
  ```javascript
  {
    success: false,
    error: {
      name: "AgentError",
      code: "AGENT_PROCESSING_ERROR",
      message: "Descriptive error message",
      details: { /* Additional error context */ },
      isOperational: true
    }
  }
  ```

#### Error Handling
- **Token Limit Exceeded**: Caught as external service error
- **Invalid Response Format**: Validation error with details
- **Safety Violations**: Processing error with violation details
- **API Errors**: External service error with status code

## Agent Memory System Integration

### Memory Storage

#### storeMemory()
**File:** `base-agent.js`  
**Lines:** 113-185  
**Called By:** All agent implementations

```javascript
await this.storeMemory(content, {
  userId: "uuid",
  memoryType: "agent_output",
  contentType: "json",
  planId: "workout-plan-uuid",
  workoutPlanId: "explicit-plan-uuid",
  workoutLogId: "log-uuid",
  tags: ["workout", "generation"],
  importance: 3
});
```

**Memory Types**:
- `agent_output` - Primary agent responses
- `user_feedback` - User feedback on agent outputs
- `execution_log` - Plan execution tracking
- `system_event` - System-level events

**Content Types**:
- `json` - Structured data objects
- `text` - Plain text content
- `execution_data` - Execution logs and metrics

#### storeUserFeedback()
**File:** `base-agent.js`  
**Lines:** 195-223  

```javascript
await this.storeUserFeedback(memoryId, {
  rating: "helpful",
  comment: "Great workout plan, perfect difficulty level"
}, userId);
```

#### storeExecutionLog()
**File:** `base-agent.js`  
**Lines:** 232-266  

```javascript
await this.storeExecutionLog(userId, planId, {
  status: "completed",
  results: { /* execution results */ },
  metrics: { /* performance metrics */ }
});
```

### Memory Retrieval

#### retrieveMemories()
**File:** `base-agent.js`  
**Lines:** 278-398  

```javascript
const memories = await this.retrieveMemories({
  userId: "uuid",
  agentTypes: ["workout", "adjustment"],
  query: "strength training preferences",
  limit: 10,
  threshold: 0.7,
  sortBy: "recency",
  planId: "workout-plan-uuid",
  includeFeedback: true
});
```

**Retrieval Options**:
- **userId**: Required - User to retrieve memories for
- **agentTypes**: Array of agent types to search (default: current agent)
- **query**: Semantic search query (text or structured object)
- **limit**: Maximum memories to return (default: 5)
- **threshold**: Similarity threshold for semantic search (default: 0.7)
- **sortBy**: Sort order - 'recency', 'relevance', 'importance'
- **planId**: Filter by associated workout plan
- **includeFeedback**: Include user feedback in results

**Retrieval Strategies**:
1. **Plan-Based Retrieval**: Direct lookup by plan ID
2. **Semantic Search**: Vector similarity search with embeddings
3. **Metadata Filtering**: Filter by agent type and metadata

#### retrieveLatestMemory()
**File:** `base-agent.js`  
**Lines:** 417-444  

```javascript
const latestMemory = await this.retrieveLatestMemory(
  userId, 
  "agent_output", 
  { planId: "workout-plan-uuid" }
);
```

## Error Handling Patterns

### Error Classification System

#### AgentError Codes
```javascript
const ERROR_CODES = {
  VALIDATION_ERROR: 'AGENT_VALIDATION_ERROR',
  PROCESSING_ERROR: 'AGENT_PROCESSING_ERROR', 
  EXTERNAL_SERVICE_ERROR: 'AGENT_EXTERNAL_SERVICE_ERROR',
  RESOURCE_ERROR: 'AGENT_RESOURCE_ERROR',
  MEMORY_SYSTEM_ERROR: 'AGENT_MEMORY_SYSTEM_ERROR',
  CONFIGURATION_ERROR: 'AGENT_CONFIGURATION_ERROR',
  CONCURRENCY_ERROR: 'AGENT_CONCURRENCY_ERROR'
};
```

#### Error Handling Hierarchy
1. **AgentError**: Pre-formatted agent-specific errors
2. **ValidationError**: Input validation failures
3. **External API Errors**: Service communication failures
4. **Network Errors**: Connection and DNS issues
5. **Configuration Errors**: Missing or invalid configuration
6. **General Errors**: Unexpected system errors

### Error Response Format
```javascript
{
  name: "AgentError",
  code: "AGENT_PROCESSING_ERROR",
  message: "Human-readable error description",
  details: {
    // Additional error context
    statusCode: 500,
    originalCode: "ECONNREFUSED"
  },
  isOperational: true,
  originalError: Error // Reference to original error
}
```

### Logging Integration
```javascript
this.log('error', `Process error: ${agentError.message}`, {
  errorCode: agentError.code,
  details: agentError.details,
  originalStack: agentError.originalError?.stack
});
```

## Performance Monitoring

### Timing Measurements

#### Processing Duration Tracking
```javascript
// Concrete agent implementations
const startTime = Date.now();
// ... AI processing ...
const duration = Date.now() - startTime;
this.log('info', `OpenAI API call completed in ${duration}ms`);
```

#### Memory Operation Timing
```javascript
// Memory storage/retrieval timing
this.log('debug', `Storing memory with metadata`, { 
  agent_type: agentType,
  content_size: content.length,
  user_id: `${userId.substring(0, 8)}...`
});
```

### Resource Monitoring

#### Token Usage Tracking
```javascript
// In concrete agents
generation_time_ms: Date.now() - startTime,
token_usage: response.usage || null,
model_used: this.config.model || 'gpt-4o'
```

#### Memory Usage Patterns
```javascript
this.log('info', `Retrieved ${memories.length} memories`, {
  query_type: planId ? 'plan_based' : (query ? 'semantic' : 'metadata'),
  agent_types: agentTypes,
  result_count: memories.length
});
```

### Performance Characteristics

#### Typical Performance Ranges
- **Memory Storage**: 50-200ms depending on content size
- **Memory Retrieval**: 100-500ms for semantic search
- **AI Processing**: 2-30 seconds depending on complexity
- **Error Handling**: <10ms for error classification and logging

#### Cost Implications
- **Memory Operations**: Minimal database queries
- **Semantic Search**: OpenAI embedding API costs (~$0.0001 per 1K tokens)
- **AI Processing**: Model-dependent (GPT-4: ~$0.06 per 1K tokens)

## Utility Methods

### validate()
**File:** `base-agent.js`  
**Lines:** 464-471  

```javascript
this.validate(input, validator, "Custom error message");
```

### retryWithBackoff()
**File:** `base-agent.js`  
**Lines:** 480-508  

```javascript
const result = await this.retryWithBackoff(async () => {
  return await expensiveOperation();
}, {
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 1.5
});
```

### log()
**File:** `base-agent.js`  
**Lines:** 450-462  

```javascript
this.log('info', 'Processing started', { 
  userId: userId.substring(0, 8),
  agentType: this.name 
});
```

## Agent Reasoning Patterns

### ReAct Pattern (Reasoning and Acting)
Most agents implement the ReAct pattern for iterative reasoning:

```javascript
for (let iteration = 1; iteration <= maxIterations; iteration++) {
  // Thought: Analyze current state and plan next action
  this.log('debug', `ReAct Iteration ${iteration}: Planning action`);
  
  // Action: Execute planned operation (API call, data processing)
  const result = await this.performAction(context);
  
  // Observation: Analyze results and determine if satisfactory
  const isComplete = this.validateResult(result);
  
  if (isComplete) break;
}
```

### Chain-of-Thought Processing
Agents use structured reasoning in prompts:
1. **Context Analysis**: Understanding user state and goals
2. **Research Integration**: Incorporating external knowledge
3. **Safety Assessment**: Evaluating constraints and restrictions
4. **Solution Generation**: Creating appropriate responses
5. **Quality Validation**: Ensuring output meets standards

### Memory-Informed Decision Making
Agents leverage historical context:
1. **Preference Learning**: User feedback and past choices
2. **Pattern Recognition**: Behavioral and performance patterns
3. **Continuous Improvement**: Learning from user interactions
4. **Personalization**: Adapting to individual user needs

## Integration Considerations

### Response Time Expectations
- **Fast Operations** (< 2 seconds): Memory retrieval, validation
- **Standard Operations** (2-10 seconds): Simple AI processing
- **Complex Operations** (10-30 seconds): Multi-step reasoning, research integration
- **Long Operations** (30+ seconds): Comprehensive analysis, large context processing

### Streaming Support
Base agent supports streaming through concrete implementations:
```javascript
// In concrete agents
const stream = await this.openaiService.createChatCompletionStream({
  // streaming configuration
});
```

### Reasoning Visualization
Base agent stores reasoning data for UI visualization:
```javascript
await this.storeMemory({
  plan: workoutPlan,
  reasoning: {
    thoughts: iterativeThoughts,
    actions: actionsPerformed,
    observations: validationResults
  },
  metadata: processingMetadata
}, memoryMetadata);
```

### Variation Handling
Frontend should handle various response states:
- **Processing**: Agent is actively working
- **Thinking**: Agent is in reasoning phase
- **Complete**: Agent has finished successfully
- **Failed**: Agent encountered an error
- **Retry**: Agent is retrying failed operation

### Error Recovery Strategies
1. **Automatic Retry**: Built-in exponential backoff
2. **Graceful Degradation**: Fallback responses when AI fails
3. **User Notification**: Clear error messages for user action
4. **Context Preservation**: Maintain state across retry attempts

## Best Practices

### Memory Management
- Store meaningful outputs with appropriate metadata
- Use semantic tags for better retrieval
- Include user feedback for continuous improvement
- Implement proper memory cleanup strategies

### Error Handling
- Always use `safeProcess()` wrapper in controllers
- Provide context-specific error messages
- Log errors with sufficient debugging information
- Implement appropriate retry strategies

### Performance Optimization
- Monitor and log processing times
- Use appropriate timeout values
- Implement efficient memory retrieval patterns
- Cache frequently accessed data

### Security Considerations
- Validate all inputs before processing
- Sanitize user-provided content
- Implement proper access controls
- Log security-relevant events