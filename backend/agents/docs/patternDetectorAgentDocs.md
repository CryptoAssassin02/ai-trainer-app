# Pattern Detector Documentation

## Overview
The PatternDetector is an advanced pattern detection system for fitness analytics that provides sophisticated analysis capabilities to identify meaningful patterns in user fitness data. It combines database-powered intelligence with statistical analysis and fuzzy matching algorithms to detect temporal, performance, exercise preference, behavioral, and statistical patterns that inform AI-driven insights.

**Primary Responsibilities:**
- Detect comprehensive patterns across multiple fitness data domains
- Provide database-powered intelligence using direct database queries and analysis
- Apply sophisticated algorithms for temporal analysis (consistency, frequency, timing)
- Perform exercise preference analysis using fuzzy matching and similarity scoring
- Identify behavioral patterns and statistical correlations in user data
- Support new users with starter patterns when data is limited
- Ensure pattern quality through confidence scoring and significance thresholds

**Agent Purpose:** Specialized pattern detection focused exclusively on identifying meaningful patterns in user fitness data, serving as the foundation for downstream insight generation.

## Agent Configuration

### Initialization
```javascript
const detector = new PatternDetector({
  supabaseClient: supabaseClientInstance,  // Required - Database client for direct data access
  logger: loggerInstance,                  // Required - Structured logging system
  config: {                                // Optional - Detector-specific configuration
    minDataPoints: 3,
    confidenceThreshold: 0.6,
    significanceThreshold: 0.05,
    consistencyWindow: 7,
    trendWindow: 14,
    seasonalityWindow: 30,
    correlationThreshold: 0.3,
    changeThreshold: 0.1,
    similarityThreshold: 0.4,
    fuzzyMatchThreshold: 0.6
  }
});
```

### AI Model Settings
- **Model:** Not applicable (uses database intelligence and statistical algorithms)
- **Temperature:** Not applicable (deterministic pattern detection)
- **Max Tokens:** Not applicable (no AI text generation)
- **System Prompt:** Not applicable (database-driven analysis)

### Configuration Options
- **Min Data Points:** 3 (minimum data required for pattern detection)
- **Confidence Threshold:** 0.6 (minimum confidence for pattern significance)
- **Consistency Window:** 7 days (timeframe for consistency analysis)
- **Trend Window:** 14 days (timeframe for trend detection)
- **Similarity Threshold:** 0.4 (minimum similarity for exercise matching)
- **Fuzzy Match Threshold:** 0.6 (threshold for exercise name fuzzy matching)
- **Statistical Thresholds:** Various thresholds for correlation and change detection

## Agent Methods

### detectPatterns()
**File:** `agents/pattern-detector.js`
**Line:** 42
**Called By:** `analyticsService.getPatternAnalysis()` during pattern analysis phase

#### Input Processing
- **Expected Input:** 
  - `userData` (Object) - Comprehensive user fitness data with overview, trends, adherence
  - `context` (Object) - Analysis context with userId, timeframe, and preferences
- **Context Required:** 
  - Complete user data structure with totalDataPoints calculation
  - Valid context with userId for database queries and timeframe for analysis scope
  - Minimum data points threshold checking for quality assurance
- **Memory Retrieval:** None directly (database queries provide historical context)

#### AI Processing Steps
1. **Data Validation Phase**
   - Validates input data structure and completeness
   - Checks total data points against minimum threshold
   - Determines analysis path (comprehensive vs. starter patterns)

2. **Starter Pattern Generation** (< 3 data points)
   - Generates foundational patterns for new users
   - Focuses on habit formation and goal-setting patterns
   - Provides encouragement and basic fitness principles

3. **Comprehensive Pattern Detection** (≥ 3 data points)
   - **Parallel Analysis Execution:**
     - Temporal patterns (consistency, timing, frequency)
     - Performance patterns (progression, plateaus, regression)
     - Exercise patterns (preferences, variety, muscle groups)
     - Behavioral patterns (adherence, motivation, adaptation)
     - Statistical patterns (correlations, anomalies, trends)

4. **Pattern Quality Assessment**
   - Filters patterns by significance threshold
   - Ranks patterns by importance and confidence
   - Applies quality scoring based on data support and statistical significance

5. **Result Assembly**
   - Combines patterns from all detection domains
   - Applies final ranking and filtering
   - Returns structured pattern array with metadata

#### Output Variations
- **Success Response:**
  ```javascript
  [
    {
      type: string,                    // consistency|performance|preference|timing|etc.
      subtype: string,                 // workout_adherence|muscle_group|day_preference|etc.
      description: string,             // Clear description of detected pattern
      confidence: number,              // 0-1 confidence score based on data quality
      dataPoints: number,              // Number of data points supporting pattern
      timeRange: string,               // Time range where pattern occurs
      significance: string,            // Why this pattern is meaningful for fitness
      metrics: Object                  // Additional metrics and supporting data
    }
  ]
  ```

- **Variation Patterns:**
  - **New Users (< 3 data points):** Starter patterns focused on habit formation and goal setting
  - **Limited Data (3-10 data points):** Basic consistency and preference patterns
  - **Moderate Data (10-30 data points):** Comprehensive temporal and exercise patterns
  - **Rich Data (30+ data points):** Advanced statistical patterns, correlations, and trend analysis

- **Fallback Responses:**
  - **Database Access Issues:** Basic patterns based on available user data
  - **Analysis Failures:** Starter patterns with reduced confidence scores
  - **Insufficient Data:** Encouraging patterns focused on building data history

#### Error Handling
- **Token Limit Exceeded:** Not applicable (no AI text generation)
- **Invalid Response Format:** Not applicable (deterministic pattern generation)
- **Safety Violations:** Not applicable (fitness patterns are inherently safe)
- **API Errors:** Database connection error handling with graceful degradation

#### Memory Integration
- **Stores:** None directly (database queries provide persistence)
- **Retrieval Pattern:** Direct database queries for historical analysis
- **Vector Storage:** Not implemented (uses relational database analysis)

#### Performance Characteristics
- **Typical Duration:** 1-5 seconds (database query intensive)
- **Token Usage:** 0 tokens (no AI generation)
- **Cost Implications:** Database query costs only (~$0.001 per analysis)

---

### _detectTemporalPatterns()
**File:** `agents/pattern-detector.js`
**Line:** 102
**Called By:** `detectPatterns()` during comprehensive analysis phase

#### Input Processing
- **Expected Input:** User data with temporal information and workout history
- **Context Required:** Workout logs with dates and timing information for temporal analysis
- **Memory Retrieval:** Database queries for workout_logs table with temporal filtering

#### AI Processing Steps
1. **Consistency Analysis**
   - Calculates expected vs. actual workout frequency
   - Analyzes workout adherence patterns over time
   - Generates consistency scores and classifications (excellent/good/moderate/poor)

2. **Timing Pattern Detection**
   - Database queries for workout timing analysis
   - Day-of-week preference detection using statistical analysis
   - Time-of-day pattern identification (future enhancement)

3. **Frequency Analysis**
   - Workout frequency trend detection
   - Consistency window analysis for habit formation assessment
   - Weekly/monthly frequency pattern identification

4. **Seasonal Analysis** (future enhancement)
   - Long-term temporal pattern detection
   - Seasonal variation analysis for advanced users

#### Output Variations
- **Consistency Patterns:** Workout adherence assessment with actionable classifications
- **Timing Patterns:** Day preference and scheduling optimization insights
- **Frequency Patterns:** Training frequency trends and recommendations

#### Error Handling
- **Database Query Failures:** Graceful handling with partial pattern generation
- **Insufficient Data:** Conservative pattern generation with appropriate confidence levels

#### Performance Characteristics
- **Typical Duration:** 500-1500ms (database query dependent)
- **Data Requirements:** Minimum 3 workout logs for meaningful patterns

---

### _detectExercisePatterns()
**File:** `agents/pattern-detector.js`
**Line:** 144
**Called By:** `detectPatterns()` during comprehensive analysis phase

#### Input Processing
- **Expected Input:** User data with exercise logs and workout details
- **Context Required:** Workout logs with exercise information, satisfaction scores, and difficulty ratings
- **Memory Retrieval:** Database queries for workout_logs and exercises tables with fuzzy matching

#### AI Processing Steps
1. **Exercise Preference Analysis**
   - Database queries for exercise frequency analysis
   - Exercise satisfaction correlation analysis
   - Preference pattern identification with statistical confidence

2. **Database-Powered Intelligence**
   - Fuzzy matching against exercise database for muscle group analysis
   - Exercise category preference detection using database classification
   - Equipment usage pattern analysis

3. **Variety and Focus Analysis**
   - Workout variety assessment across different exercise types
   - Muscle group focus pattern detection
   - Exercise progression and adaptation pattern identification

#### Output Variations
- **Preference Patterns:** Top exercises with satisfaction correlations
- **Muscle Group Patterns:** Training focus areas and potential imbalances
- **Variety Patterns:** Exercise diversity assessment and recommendations

#### Error Handling
- **Exercise Matching Failures:** Graceful handling with available exercise data
- **Database Access Issues:** Fallback to basic frequency analysis

#### Performance Characteristics
- **Typical Duration:** 1000-2000ms (database query and fuzzy matching intensive)
- **Success Rate:** ~85% exercise matching success with fuzzy algorithms

---

### _findExerciseInDatabase() & _calculateNameSimilarity()
**File:** `agents/pattern-detector.js`
**Lines:** 482, 537
**Called By:** Exercise pattern detection methods for database intelligence

#### Input Processing
- **Expected Input:** Exercise name strings for fuzzy matching and database lookup
- **Context Required:** Exercise database with standardized exercise names and classifications
- **Memory Retrieval:** Database queries with fuzzy matching and similarity scoring

#### AI Processing Steps
1. **Keyword Extraction**
   - Exercise name parsing and keyword identification
   - Stopword removal and meaningful term extraction
   - Predefined exercise mapping for common variations

2. **Database Fuzzy Matching**
   - Database queries with ILIKE pattern matching
   - Multiple keyword combination strategies
   - Similarity scoring using multiple algorithms

3. **Best Match Selection**
   - Similarity threshold filtering
   - Best match selection based on composite scoring
   - Exercise metadata enhancement with database information

#### Output Variations
- **Exact Match:** Direct database exercise with full metadata
- **Fuzzy Match:** Similar exercise with confidence scoring
- **No Match:** Null return for manual exercise entries

#### Error Handling
- **Database Query Failures:** Graceful null return with logging
- **Invalid Input:** Input validation with safe defaults

#### Performance Characteristics
- **Typical Duration:** 100-500ms per exercise lookup
- **Success Rate:** ~80% matching success for standard exercise names

---

### _generateStarterPatterns()
**File:** `agents/pattern-detector.js`
**Line:** 1001
**Called By:** `detectPatterns()` for new users with limited data

#### Input Processing
- **Expected Input:** User data with minimal or no fitness history
- **Context Required:** Basic user context for personalized starter guidance
- **Memory Retrieval:** None (generates encouraging patterns for new users)

#### AI Processing Steps
1. **New User Recognition**
   - Identifies users with insufficient data for statistical analysis
   - Provides encouraging patterns to build momentum
   - Focuses on foundational fitness principles

2. **Starter Pattern Generation**
   - **Journey Initiation Pattern:** Encourages starting the fitness journey
   - **Consistency Opportunity Pattern:** Emphasizes habit formation
   - **Goal Setting Pattern:** Guides initial goal establishment

3. **Actionable Insight Integration**
   - Each starter pattern includes specific actionable steps
   - Confidence scores appropriately set for encouraging guidance
   - Focus on achievable, foundational fitness practices

#### Output Variations
- **New User Patterns:** 3 foundational patterns for fitness journey initiation
- **Encouraging Messaging:** Positive, motivating pattern descriptions
- **Actionable Guidance:** Specific steps for building initial habits

#### Performance Characteristics
- **Typical Duration:** 50-100ms (simple pattern generation)
- **Consistency:** Always generates 3 starter patterns for new users

## Agent Reasoning Patterns

### Primary Pattern: Database-Powered Intelligence
1. **Direct Data Analysis:** Uses actual database queries to analyze real user behavior patterns
2. **Statistical Validation:** Applies statistical thresholds to ensure pattern significance
3. **Fuzzy Intelligence:** Employs sophisticated matching algorithms for exercise analysis
4. **Multi-Domain Analysis:** Examines temporal, performance, behavioral, and statistical dimensions

### Secondary Pattern: Adaptive Analysis Depth
1. **Data-Driven Scaling:** Analysis depth adjusts based on available data volume
2. **Quality Thresholds:** Maintains quality standards through confidence and significance filtering
3. **Graceful Degradation:** Provides meaningful patterns even with limited data
4. **New User Support:** Recognizes and supports users beginning their fitness journey

### Statistical Analysis Pattern: Evidence-Based Detection
1. **Confidence Scoring:** All patterns include statistical confidence measures
2. **Significance Testing:** Patterns must meet significance thresholds for inclusion
3. **Data Point Validation:** Patterns supported by sufficient data for reliability
4. **Correlation Analysis:** Identifies meaningful relationships in fitness data

## Integration Considerations

### Response Time Expectations
- **New Users (Starter Patterns):** 50-100ms for immediate encouraging feedback
- **Limited Data Analysis:** 500-1500ms for basic pattern detection
- **Comprehensive Analysis:** 1-5 seconds for full multi-domain pattern detection
- **Database-Heavy Operations:** Additional time for complex exercise matching and correlation analysis

### Streaming Support
- **Not Currently Implemented:** Returns complete pattern set after analysis
- **Future Enhancement:** Could stream patterns as each domain completes analysis

### Reasoning Visualization
- **Confidence Metrics:** All patterns include confidence scores for UI visualization
- **Data Support:** Each pattern shows supporting data points for transparency
- **Significance Explanation:** Patterns include significance descriptions for user understanding
- **Statistical Transparency:** Metrics object provides detailed supporting statistics

### Variation Handling
- **Dynamic Pattern Count:** Handle 0-15+ patterns depending on user data richness
- **Confidence-Based Display:** UI should consider confidence scores for pattern prominence
- **Domain Organization:** Patterns can be grouped by type for better user experience
- **New User Experience:** Special handling for encouraging starter patterns
- **Data Quality Indication:** Use confidence scores and data points for quality visualization