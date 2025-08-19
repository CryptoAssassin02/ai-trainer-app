# Research Agent Documentation

## Overview
The ResearchAgent conducts evidence-based fitness research using Perplexity AI to gather scientifically-backed exercise information, techniques, and progressions. It implements comprehensive safety filtering, citation validation, and contraindication checking to ensure research quality and user safety. The agent serves as the foundational research layer for workout generation.

## Agent Configuration

### Initialization
```javascript
const agent = new ResearchAgent({
  perplexityService: perplexityServiceInstance,
  supabaseClient: supabaseRLSClient,
  memorySystem: userScopedMemorySystem,
  logger: loggerInstance,
  config: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 1.5
  }
});
```

### AI Model Settings
- **Service:** Perplexity AI (web-based research)
- **Search Strategy:** Scientific literature prioritization
- **Citation Requirements:** Trusted domain verification
- **Safety Filtering:** Medical contraindication enforcement

### Dependencies
- **Perplexity Service:** For web-based research and citations
- **Supabase Client:** Database access for contraindications and caching
- **Memory System:** Research result caching and retrieval
- **Research Utils:** Data extraction and validation utilities

## Agent Methods

### process()
**File:** `agents/research-agent.js`
**Lines:** 77-400
**Called By:** `workoutController.generateWorkoutPlan()`

#### Input Processing
- **Expected Input:**
  ```javascript
  {
    query: "string", // Research query (optional for some contexts)
    userId: "uuid",
    userProfile: {
      restrictions: ["string", ...],
      fitnessLevel: "beginner|intermediate|advanced",
      equipment: ["string", ...]
    },
    exerciseType: "general|strength|cardio|flexibility",
    goals: ["strength", "muscle_gain", ...],
    useCache: boolean
  }
  ```
- **Context Required:** User profile with medical restrictions, fitness goals
- **Memory Retrieval:** Previous research results for caching optimization

#### AI Processing Steps

1. **Memory Retrieval Phase**
   - Searches for relevant cached research using `retrieveMemories()`
   - Filters by research type and user context
   - Returns cached results if `useCache` is true and recent data exists
   - Logs memory retrieval status and cache hit/miss ratios

2. **Research Query Generation**
   - Constructs specialized search prompts based on exercise type
   - Incorporates user goals and fitness level into queries
   - Adapts query complexity based on user experience level
   - Includes safety context for medical restrictions

3. **Perplexity API Execution**
   - Executes search queries through PerplexityService
   - Implements retry logic for API failures
   - Handles rate limiting and timeout scenarios
   - Processes streaming or batch responses

4. **Data Extraction & Parsing**
   - Extracts exercise data using `parseExercises()`
   - Validates response structure and content quality
   - Separates exercises, techniques, and progressions
   - Handles malformed or incomplete research data

5. **Citation Reliability Assessment**
   - Evaluates source credibility using `TRUSTED_CITATION_DOMAINS`
   - Scores citations based on domain authority and academic standing
   - Flags unreliable sources (blogs, unverified content)
   - Maintains trusted domain whitelist (.edu, .gov, pubmed, examine.com)

6. **Safety Filtering & Contraindication Checking**
   - Applies `INJURY_CONTRAINDICATIONS` mapping
   - Cross-references exercises with user medical conditions
   - Filters high-risk exercises for specific injuries
   - Generates safety warnings for borderline exercises

7. **Result Compilation & Caching**
   - Structures final research output with reliability scores
   - Stores successful research in memory system
   - Tags results for efficient future retrieval
   - Compiles comprehensive statistics and warnings

#### Output Variations
- **Success Response:**
  ```javascript
  {
    success: true,
    exercises: [
      {
        name: "string",
        description: "string",
        muscle_groups: ["string", ...],
        equipment: ["string", ...],
        difficulty: "beginner|intermediate|advanced",
        reliable: boolean,
        warning: "string|null",
        citations: [...],
        contraindications: [...]
      }
    ],
    techniques: [...],
    progressions: [...],
    stats: {
      totalExercises: number,
      filteredOut: number,
      unreliableCount: number
    },
    warnings: ["string", ...],
    errors: ["string", ...]
  }
  ```
- **Variation Patterns:** Results adapt to user experience level, available equipment, medical restrictions
- **Fallback Responses:** Basic exercise lists when advanced research fails, safety-filtered minimal sets

#### Error Handling
- **API Failures:** Returns structured error objects instead of throwing
- **Malformed Data:** Logs parsing errors, returns partial results when possible
- **Citation Issues:** Flags unreliable exercises but includes with warnings
- **Safety Violations:** Removes contraindicated exercises, logs safety filtering

#### Memory Integration
- **Stores:** Research results, citation quality scores, user-specific filtering results
- **Retrieval Pattern:** Recent results prioritized, goal-specific caching
- **Cache Strategy:** TTL-based expiration, user context consideration
- **Performance:** Significant speedup for repeated research patterns

#### Performance Characteristics
- **Typical Duration:** 5-15 seconds for new research, 1-3 seconds for cached results
- **API Usage:** 1-3 Perplexity API calls per research session
- **Cost Implications:** ~$0.01-0.05 per research query (Perplexity pricing)
- **Cache Hit Rate:** 60-80% for returning users with similar goals

---

### parseExercises()
**File:** `agents/research-agent.js`
**Lines:** 350-450
**Called By:** `process()` during data extraction phase

#### Input Processing
- **Expected Input:** Raw Perplexity API response with exercise data
- **Data Structure:** JSON or structured text with exercise information
- **Validation:** Ensures required fields (name, description, muscle groups)

#### Processing Steps
1. **Response Format Detection**
   - Identifies JSON vs. structured text responses
   - Handles various Perplexity response formats
   - Implements fallback parsing for edge cases

2. **Exercise Data Extraction**
   - Parses exercise names and descriptions
   - Extracts muscle group targeting information
   - Identifies required equipment and modifications
   - Determines difficulty levels and progressions

3. **Data Normalization**
   - Standardizes exercise names and terminology
   - Validates muscle group classifications
   - Ensures consistent equipment naming
   - Applies difficulty level mapping

---

### evaluateCitationReliability()
**File:** `agents/research-agent.js`
**Lines:** 500-580
**Called By:** `process()` during citation assessment

#### Reliability Assessment Process
1. **Domain Analysis**
   - Checks citation URLs against `TRUSTED_CITATION_DOMAINS`
   - Prioritizes academic and government sources
   - Flags commercial or unverified domains

2. **Source Quality Scoring**
   - Academic journals: High reliability score
   - Government health sites: High reliability score
   - Established fitness platforms: Medium reliability score
   - Blogs and personal sites: Low reliability score

3. **Content Validation**
   - Evaluates citation relevance to exercise claims
   - Checks for scientific methodology references
   - Validates author credentials when available

#### Output Format
```javascript
{
  reliable: boolean,
  score: number, // 0-10 reliability score
  warnings: ["string", ...],
  trustedSources: number,
  totalSources: number
}
```

---

### applySafetyFiltering()
**File:** `agents/research-agent.js`
**Lines:** 650-750
**Called By:** `process()` during safety validation

#### Safety Filtering Process
1. **Medical Condition Mapping**
   - Maps user conditions to exercise restrictions
   - Applies `INJURY_CONTRAINDICATIONS` rules
   - Generates condition-specific warnings

2. **Exercise Risk Assessment**
   - Evaluates exercises against medical restrictions
   - Identifies high-impact movements for joint issues
   - Flags overhead movements for shoulder conditions

3. **Filtering Decisions**
   - Removes clearly contraindicated exercises
   - Marks borderline exercises with warnings
   - Preserves safe exercise alternatives

#### Safety Categories
- **High Risk:** Completely filtered out
- **Medium Risk:** Included with warnings and modifications
- **Low Risk:** Included without restrictions
- **Alternative Suggested:** Provides safer exercise options

---

## Agent Reasoning Patterns

### Evidence-Based Research
- Prioritizes peer-reviewed sources and academic research
- Cross-references multiple sources for exercise validation
- Maintains skepticism toward unsubstantiated claims

### Safety-First Filtering
- Medical conditions take precedence over exercise variety
- Conservative approach to borderline safety cases
- Comprehensive contraindication checking

### Adaptive Query Strategy
- Adjusts research depth based on user experience level
- Modifies queries for equipment availability
- Personalizes research based on stated goals

## Integration Considerations

### Response Time Expectations
- **Fresh Research:** 5-15 seconds for comprehensive queries
- **Cached Results:** 1-3 seconds for recent similar queries
- **Complex Safety Filtering:** 3-8 seconds for extensive medical conditions

### Caching Strategy
- **Hit Rate Optimization:** User-context-aware caching
- **TTL Management:** Research freshness vs. performance balance
- **Memory Usage:** Efficient storage of research results

### Reasoning Visualization
- **Data Structure:** Research quality scores and citation details for UI
- **Safety Indicators:** Clear visualization of safety filtering decisions
- **Source Attribution:** Citation links and reliability indicators

### Variation Handling
- **Experience Adaptation:** Research complexity matches user level
- **Equipment Flexibility:** Results adapt to available equipment
- **Goal Evolution:** Research personalizes as user goals change
- **Medical Updates:** Immediate safety filtering updates

### Quality Assurance
- **Citation Verification:** Ongoing validation of trusted sources
- **Content Accuracy:** Regular review of exercise data quality
- **Safety Updates:** Continuous refinement of contraindication rules
- **Performance Monitoring:** API reliability and response time tracking