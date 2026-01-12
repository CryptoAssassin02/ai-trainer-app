# Analytics Agent Documentation

## Overview
The AnalyticsAgent is the primary AI-powered analytics and insight generation agent for the trAIner application. It orchestrates comprehensive fitness data analysis by coordinating multiple AI services, detecting patterns, and generating personalized insights and recommendations. The agent serves as the central intelligence hub for transforming raw user fitness data into actionable, AI-driven recommendations.

**Primary Responsibilities:**
- Analyze user fitness data patterns using advanced AI processing
- Generate personalized insights and actionable recommendations
- Detect meaningful trends in workout and progress data
- Coordinate with multiple AI services (OpenAI, PatternDetector, InsightGenerator)
- Provide evidence-based feedback for fitness improvement
- Store insights in memory system for future reference and context

## Agent Configuration

### Initialization
```javascript
const agent = new AnalyticsAgent({
  openaiService: openaiServiceInstance,    // Required - OpenAI service for AI processing
  analyticsService: analyticsServiceInstance, // Required - Analytics service for data access
  supabaseClient: supabaseClientInstance,  // Required - Database client for RLS operations  
  memorySystem: memorySystemInstance,      // Required - Memory system for insight storage
  logger: loggerInstance,                  // Required - Structured logging system
  config: {                                // Optional - Agent-specific configuration
    maxTokens: 6000,
    temperature: 0.3,
    model: 'gpt-4o-mini',
    insightCategories: ['performance', 'adherence', 'progression', 'recommendations']
  }
});
```

### AI Model Settings
- **Model:** gpt-4o-mini (cost-effective model optimized for analytics)
- **Temperature:** 0.3 (lower temperature for consistent analytical insights)
- **Max Tokens:** 6000 (sufficient for comprehensive analysis and insights)
- **System Prompt:** Expert fitness analytics AI specializing in pattern detection and trend analysis

### Configuration Options
- **Insight Categories:** ['performance', 'adherence', 'progression', 'recommendations']
- **Pattern Detection:** Temporal, performance, exercise preference, behavioral, statistical
- **Memory Integration:** Stores insights for future context and personalization
- **Error Handling:** Comprehensive fallback mechanisms with graceful degradation

## Agent Methods

### process()
**File:** `agents/analytics-agent.js`
**Line:** 49
**Called By:** `analyticsService.getAIInsights()`, `analyticsService.getGoalPredictions()`

#### Input Processing
- **Expected Input:** Context object with userId, timeframe, focusAreas, jwtToken
- **Context Required:** 
  - `userId` (string, required) - User identifier for analysis
  - `timeframe` (string, required) - Analysis period ('7 days', '30 days', '90 days')
  - `focusAreas` (array, optional) - Specific analysis areas to focus on
  - `jwtToken` (string, required) - JWT token for authenticated data access
  - `startTime` (number, optional) - Processing start timestamp for performance tracking
- **Memory Retrieval:** Previous insights and patterns stored in memory system for context

#### AI Processing Steps
1. **Validation Phase**
   - Validates input context structure and required fields
   - Ensures timeframe format matches allowed values ('7 days', '14 days', '30 days', '90 days')
   - Verifies user authentication and data access permissions

2. **Data Gathering Phase**
   - Parallel collection of user analytics data (overview, trends, adherence)
   - Retrieval of additional context from memory system
   - Calculation of total data points for analysis confidence scoring
   - Assembly of comprehensive user data structure

3. **Pattern Detection Phase**
   - Construction of specialized prompts for AI pattern detection
   - OpenAI API calls using expert fitness analytics system prompts
   - JSON response parsing with fallback extraction for malformed responses
   - Pattern validation and confidence scoring

4. **Insight Generation Phase**
   - Building context-aware prompts combining patterns and user data
   - AI-powered insight generation using OpenAI with coaching expertise prompts
   - Structured response parsing for actionable insights
   - Priority and confidence assignment for each insight

5. **Memory Storage Phase**
   - Storage of generated insights and patterns in memory system
   - Context linking for future analysis sessions
   - User-specific insight history building

6. **Response Assembly Phase**
   - Comprehensive result packaging with metadata
   - Processing time calculation and performance metrics
   - Confidence score calculation based on data quality and pattern strength

#### Output Variations
- **Success Response:**
  ```javascript
  {
    status: 'success',
    data: {
      insights: Array<{
        id: string,
        category: 'PERFORMANCE'|'ADHERENCE'|'PROGRESSION'|'RECOMMENDATIONS',
        title: string,
        description: string,
        actionable_steps: Array<string>,
        priority: 'high'|'medium'|'low',
        confidence: number, // 0-1
        supporting_data: string
      }>,
      patterns: Array<{
        type: string,
        description: string,
        confidence: number,
        dataPoints: number,
        timeRange: string,
        significance: string
      }>,
      metadata: {
        timeframe: string,
        analysisDate: string,
        dataPoints: number,
        confidenceScore: number
      }
    },
    agentType: 'analytics',
    processingTime: number
  }
  ```

- **Variation Patterns:** 
  - **New Users (< 3 data points):** Generates starter patterns and foundational recommendations
  - **Experienced Users:** Comprehensive analysis with performance trends and progression insights  
  - **Limited Data:** Focuses on adherence patterns and habit formation
  - **Rich Data:** Advanced statistical patterns and correlation analysis

- **Fallback Responses:** 
  - **AI Service Failure:** Basic pattern detection with rule-based insights
  - **Data Access Issues:** General fitness recommendations based on timeframe
  - **Parsing Failures:** Partial insight extraction with reduced confidence scores

#### Error Handling
- **Token Limit Exceeded:** AgentError with ERROR_CODES.QUOTA_EXCEEDED, user-friendly message for retry
- **Invalid Response Format:** Graceful degradation with partial insight extraction
- **Safety Violations:** Not applicable (fitness analytics content is inherently safe)
- **API Errors:** Comprehensive OpenAI error mapping:
  - Quota issues → QUOTA_EXCEEDED error with retry guidance
  - Billing issues → CONFIGURATION_ERROR with billing setup message
  - Rate limiting → Exponential backoff and user notification
  - Generic failures → PROCESSING_ERROR with fallback insights

#### Memory Integration
- **Stores:** Complete insight objects, detected patterns, analysis metadata, user context
- **Retrieval Pattern:** Previous insights inform current analysis for continuity and personalization
- **Vector Storage:** Not implemented (uses structured JSON storage in memory system)

#### Performance Characteristics
- **Typical Duration:** 3-15 seconds (varies by data complexity and AI processing)
- **Token Usage:** 1000-4000 tokens per analysis (prompt + response)
- **Cost Implications:** ~$0.001-$0.005 per analysis using gpt-4o-mini

---

### _validateAnalysisContext()
**File:** `agents/analytics-agent.js`
**Line:** 102
**Called By:** `process()` method during validation phase

#### Input Processing
- **Expected Input:** Context object requiring validation
- **Context Required:** userId and timeframe fields for basic validation
- **Memory Retrieval:** None (validation method)

#### AI Processing Steps
1. **Field Validation**
   - Verifies userId presence and format
   - Validates timeframe presence and format
   - Checks against allowed timeframe values

#### Output Variations
- **Success Response:** Method completes without return value
- **Validation Failure:** Throws AgentError with specific validation message

#### Error Handling
- **Missing Fields:** AgentError with ERROR_CODES.VALIDATION_ERROR
- **Invalid Format:** Descriptive error messages for correction guidance

---

### _gatherUserData()
**File:** `agents/analytics-agent.js`
**Line:** 125
**Called By:** `process()` method during data gathering phase

#### Input Processing
- **Expected Input:** Analysis context with userId and timeframe
- **Context Required:** Valid JWT token for authenticated data access
- **Memory Retrieval:** Additional context data from memory system

#### AI Processing Steps
1. **Parallel Data Collection**
   - Simultaneous calls to analyticsService for overview, trends, and adherence data
   - Additional context gathering from memory and user preferences
   - Data point calculation for confidence scoring

2. **Data Assembly**
   - Comprehensive user data structure creation
   - Total data points calculation for analysis quality assessment
   - Timestamp recording for analysis tracking

#### Output Variations
- **Success Response:** Comprehensive userData object with metrics and context
- **Data Access Failure:** AgentError with DATA_ACCESS_ERROR code

#### Error Handling
- **Service Unavailable:** Graceful degradation with partial data where possible
- **Authentication Issues:** Clear error messaging for token refresh
- **Database Errors:** Detailed logging with fallback to cached data when available

#### Performance Characteristics
- **Typical Duration:** 500-2000ms (parallel service calls)
- **Data Volume:** Varies by user activity (0-1000+ data points)

---

### _detectPatterns() & _generateInsights()
**File:** `agents/analytics-agent.js`
**Lines:** 168, 205
**Called By:** `process()` method during AI analysis phases

#### Input Processing
- **Expected Input:** User data and analysis context
- **Context Required:** Comprehensive user data with sufficient information for AI analysis
- **Memory Retrieval:** Previous patterns and insights for context continuity

#### AI Processing Steps
1. **Prompt Construction**
   - Dynamic prompt building based on data availability and user context
   - Different prompt strategies for new users vs. experienced users
   - Context-aware focus area integration

2. **AI Model Interaction**
   - OpenAI API calls with expert system prompts
   - Structured response format enforcement
   - Token management and response length optimization

3. **Response Processing**
   - JSON parsing with fallback extraction mechanisms
   - Validation of insight and pattern structure
   - Confidence scoring and quality assessment

#### Output Variations
- **Rich Data Analysis:** Detailed patterns and comprehensive insights
- **New User Analysis:** Starter patterns focused on habit formation
- **Partial Data:** Conservative insights with appropriate confidence levels

#### Error Handling
- **JSON Parsing Failures:** Partial extraction with regex patterns
- **Incomplete Responses:** Graceful completion of truncated AI responses
- **Invalid Structure:** Validation and correction of malformed insights

#### Memory Integration
- **Stores:** Complete analysis results, patterns, and insights
- **Retrieval Pattern:** Context-aware analysis building on previous sessions

#### Performance Characteristics
- **Typical Duration:** 2-10 seconds per method (AI processing intensive)
- **Token Usage:** 1500-3000 tokens per AI call
- **Cost Implications:** Primary cost driver for agent operation

## Agent Reasoning Patterns

### Primary Pattern: Comprehensive Fitness Analysis
1. **Data-Driven Assessment:** Analyzes actual user data to identify real patterns
2. **Progressive Recommendations:** Tailors advice based on user experience level and data availability
3. **Evidence-Based Insights:** All recommendations supported by specific data patterns
4. **Actionable Outputs:** Every insight includes concrete, implementable steps

### Secondary Pattern: Adaptive Intelligence
1. **New User Support:** Recognizes limited data scenarios and provides appropriate starter guidance
2. **Experienced User Analysis:** Leverages rich data for sophisticated trend analysis and predictions
3. **Contextual Continuity:** Uses memory system to build on previous analyses

### Error Handling Pattern: Graceful Degradation
1. **AI Service Failures:** Falls back to rule-based pattern detection
2. **Data Limitations:** Adjusts analysis depth based on available information
3. **Parsing Issues:** Extracts partial insights rather than complete failure

## Integration Considerations

### Response Time Expectations
- **New Users (Limited Data):** 2-5 seconds for starter analysis
- **Standard Analysis:** 5-10 seconds for comprehensive insights
- **Rich Data Analysis:** 10-15 seconds for advanced pattern detection
- **UI Loading States:** Implement progressive loading with status updates

### Streaming Support
- **Not Currently Implemented:** Full response returned after complete processing
- **Future Enhancement:** Could support streaming for individual insights as they're generated

### Reasoning Visualization
- **Pattern Evidence:** Each pattern includes supporting data references
- **Confidence Metrics:** All insights include confidence scores for UI visualization
- **Data Quality Indicators:** Metadata includes data quality assessment
- **Processing Transparency:** Response includes processing time and analysis depth indicators

### Variation Handling
- **Frontend Adaptation:** UI should handle varying insight counts (2-15 insights typical)
- **Priority Display:** Implement priority-based display ordering (high > medium > low)
- **Category Organization:** Group insights by category for better user experience
- **Confidence Filtering:** Consider showing/hiding insights based on confidence thresholds
- **Progressive Enhancement:** Show basic insights immediately, enhance with detailed analysis