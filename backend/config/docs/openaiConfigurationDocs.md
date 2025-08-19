# OpenAI Configuration Module Documentation

## Overview
The OpenAI Configuration module provides centralized configuration for AI-powered workout plan generation and adjustment. It manages model selection, pricing, retry logic, and environment-specific settings for the WorkoutGenerationAgent and PlanAdjustmentAgent components.

## Configuration Structure

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-... # OpenAI API key for authentication

# Optional (handled by config defaults)
NODE_ENV=development|test|production # Environment configuration
```

### Configuration Object
```javascript
module.exports = {
  // Model Selection
  defaultChatModel: 'gpt-4o-mini', // Balance cost and capability
  defaultEmbeddingModel: 'text-embedding-3-small',
  
  // Request Defaults
  temperature: 0.7,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  
  // Retry Configuration
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  },
  
  // Rate Limits (informational)
  rateLimits: {
    requestsPerMinute: { default: 60, 'gpt-4o': 60 },
    tokensPerMinute: { default: 60000, 'gpt-4o': 150000 }
  },
  
  // Pricing (per 1M tokens)
  pricing: {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'text-embedding-3-small': { usage: 0.02 }
  },
  
  // Utility Functions
  utils: {
    estimateTokens: Function,
    estimateCost: Function
  }
};
```

### Validation
- **Required Fields:** OPENAI_API_KEY environment variable (except in test environment)
- **Type Checking:** Model availability validation in OpenAI service layer
- **Error on Missing:** No - graceful degradation with warnings

## Configuration Usage

### Used By
- **Services:** 
  - `openai-service.js` - Core OpenAI API integration
- **Agents:**
  - `WorkoutGenerationAgent` - AI workout plan generation (GPT-4o)
  - `PlanAdjustmentAgent` - AI plan modifications (GPT-4o)
  - `AgentMemorySystem` - Embedding generation for memory storage
- **Routes:** All workout management endpoints indirectly via controllers

### Impact on Behavior

#### Model Selection Logic
- **Production:** Uses `gpt-4o-mini` for cost efficiency while maintaining quality
- **Development:** Same as production unless overridden
- **Test:** Uses `gpt-3.5-turbo` for faster, cheaper testing

#### Cost Management
- **Token Estimation:** Rough 4 characters per token approximation
- **Cost Calculation:** Real-time cost estimation based on current OpenAI pricing
- **Budget Tracking:** Utilities for monitoring API costs

#### Performance Optimization
- **Retry Strategy:** Exponential backoff for rate limits and server errors
- **Temperature Control:** 0.7 for balanced creativity and consistency
- **Token Limits:** Configured per agent (3000 for generation, 4096 for adjustment)

### Environment-Specific Differences

#### Development
- **Log Level:** Debug (verbose logging)
- **Model:** Full capability models available
- **Retries:** Standard retry configuration
- **Cost Tracking:** Full cost estimation enabled

#### Test
- **Log Level:** Warn (reduced noise)
- **Model:** `gpt-3.5-turbo` for speed and cost
- **Retries:** Reduced to 1 attempt for faster test completion
- **Cost Tracking:** Disabled pricing checks

#### Production
- **Log Level:** Info (operational logging)
- **Model:** `gpt-4o-mini` for production workloads
- **Retries:** Standard configuration with monitoring
- **Cost Tracking:** Full cost monitoring and alerting

## Model Definitions

### Available Models
```javascript
const MODELS = {
  // Primary Models
  GPT_4o: 'gpt-4o', // Most capable, multi-modal
  GPT_4o_MINI: 'gpt-4o-mini', // Cost-effective default
  GPT_4_TURBO: 'gpt-4-turbo', // Predecessor model
  GPT_3_5_TURBO: 'gpt-3.5-turbo-0125', // Fast, cost-effective
  
  // Embedding Models
  TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
  TEXT_EMBEDDING_ADA_002: 'text-embedding-ada-002'
};
```

### Model Selection Strategy
- **Workout Generation:** `gpt-4o` for complex reasoning and safety validation
- **Plan Adjustment:** `gpt-4o` for nuanced feedback interpretation
- **Memory Embeddings:** `text-embedding-3-small` for cost-effective similarity search
- **Testing:** `gpt-3.5-turbo` for reduced cost and faster execution

## Pricing Configuration

### Current Pricing Structure (per 1M tokens)
- **GPT-4o:** $5.00 input, $15.00 output
- **GPT-4o Mini:** $0.15 input, $0.60 output  
- **GPT-3.5 Turbo:** $0.50 input, $1.50 output
- **Text Embedding 3 Small:** $0.02 usage

### Cost Estimation Utilities

#### Token Estimation
```javascript
// Rough estimation: 4 characters per token
function estimateTokens(inputText) {
  return Math.ceil(inputText.length / 4);
}
```

#### Cost Calculation
```javascript
// Calculates cost based on input/output tokens and model
function estimateCost(inputTokens, outputTokens, model) {
  const prices = pricing[model];
  return (inputTokens / 1000000) * prices.input + 
         (outputTokens / 1000000) * prices.output;
}
```

### Typical Costs for Workout Management
- **Workout Generation:** ~$0.02-0.08 per plan (2000-4000 tokens)
- **Plan Adjustment:** ~$0.015-0.035 per modification (1500-3500 tokens)
- **Research Integration:** ~$0.005-0.015 additional for memory embeddings

## Retry and Error Handling

### Retry Configuration
- **Max Retries:** 3 attempts (1 in test environment)
- **Initial Delay:** 1000ms (100ms in test)
- **Backoff:** Exponential with 2x multiplier
- **Retryable Codes:** 429 (rate limit), 5xx (server errors)

### Error Scenarios
- **Rate Limiting (429):** Automatic retry with exponential backoff
- **Server Errors (5xx):** Retry with logging for monitoring
- **Authentication (401):** Immediate failure with clear error message
- **Invalid Request (400):** No retry, log for debugging

## Integration Considerations

### Frontend Configuration Needs
- **Cost Display:** Real-time cost estimation for user transparency
- **Rate Limiting:** UI feedback for rate limit scenarios
- **Model Capabilities:** Feature availability based on selected models
- **Performance Metrics:** Response time expectations based on model choice

### Dynamic vs Static Configuration
- **Static:** Model definitions, pricing structure, retry logic
- **Dynamic:** Environment variables, model selection based on load
- **Runtime:** Token limits, temperature adjustments for specific use cases

### Security Considerations
- **API Key Protection:** Environment variable storage, never logged
- **Request Logging:** Sanitized logs without sensitive prompt content
- **Cost Controls:** Rate limiting to prevent unexpected charges
- **Access Control:** Model access restricted by environment

## Performance Monitoring

### Key Metrics
- **Token Usage:** Track input/output token consumption
- **Response Times:** Monitor API latency by model and request type
- **Error Rates:** Track retry frequency and failure patterns
- **Cost Tracking:** Real-time cost monitoring and budget alerts

### Optimization Strategies
- **Model Selection:** Balance capability vs. cost based on use case
- **Prompt Engineering:** Optimize prompts for token efficiency
- **Caching:** Avoid redundant API calls through intelligent caching
- **Batch Processing:** Group requests where possible for efficiency

## Memory System Integration

### Embedding Configuration
- **Default Model:** `text-embedding-3-small` for cost efficiency
- **Dimensions:** 1536 dimensions for semantic similarity
- **Use Cases:** User preference storage, workout plan similarity, exercise recommendations

### Memory Performance
- **Embedding Cost:** ~$0.02 per 1M tokens processed
- **Storage Efficiency:** Compressed embeddings for database storage
- **Retrieval Speed:** Optimized similarity search with indexed vectors

## Future Considerations

### Model Evolution
- **New Models:** Easy integration path for new OpenAI model releases
- **Capability Expansion:** Multi-modal support for image-based exercise demonstrations
- **Cost Optimization:** Automatic model selection based on task complexity

### Scaling Considerations
- **Rate Limit Management:** Dynamic adjustment based on account tier
- **Multi-Region:** Support for regional API endpoints for latency optimization
- **Failover Strategy:** Automatic fallback to alternative models during outages