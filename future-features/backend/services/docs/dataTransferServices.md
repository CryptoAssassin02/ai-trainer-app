# Data Transfer Services Documentation

## Overview
Data Transfer services provide the core functionality for exporting and importing user fitness data with comprehensive format support, data validation, and security measures. These services handle data retrieval, format conversion, file parsing, database operations, and maintain data integrity through validation and sanitization.

## Service Architecture

### Export Service (`backend/services/export-service.js`)
**File:** `services/export-service.js`
**Lines:** 1-431
**Pattern:** Functional service with format-specific export methods

#### Dependencies
- `@supabase/supabase-js` - Database client creation
- `fast-csv` - CSV processing and streaming
- `exceljs` - Excel workbook generation
- `stream` (Readable, PassThrough) - Stream processing
- `supabase` service - Authenticated client retrieval
- Custom utilities: logger, error classes

#### Core Functionality
- **Data Retrieval**: Secure user data fetching with RLS compliance
- **Format Conversion**: Multi-format export (JSON, CSV, XLSX, PDF)
- **Stream Processing**: Memory-efficient large dataset handling
- **Data Sanitization**: CSV formula injection prevention
- **Error Handling**: Comprehensive error classification and recovery

---

### Import Service (`backend/services/import-service.js`)
**File:** `services/import-service.js`
**Lines:** 1-751
**Pattern:** Functional service with format-specific import methods

#### Dependencies
- `@supabase/supabase-js` - Database client creation
- `papaparse` - CSV parsing
- `exceljs` - Excel file reading
- `joi` - Data validation schemas
- Node.js core: `fs`, `stream`
- Custom utilities: logger, error classes

#### Core Functionality
- **File Parsing**: Multi-format file processing (JSON, CSV, XLSX)
- **Data Validation**: Joi schema validation for data integrity
- **Batch Processing**: Efficient large dataset insertion
- **Foreign Key Management**: Auto-linking and orphaned record handling
- **Error Reporting**: Detailed validation and processing error tracking

---

## Export Service Methods

### fetchUserData Method
**Function:** `fetchUserData(userId, dataTypes, supabase)`
**Lines:** 19-67
**Purpose:** Secure data retrieval for export operations

#### Parameters
- `userId` (string): Authenticated user identifier
- `dataTypes` (Array<string>): Data types to fetch ['profiles', 'workouts', 'workout_logs']
- `supabase` (Object): Authenticated Supabase client

#### Data Type Processing
```javascript
switch (type) {
  case 'profiles':
    // Fetches from 'user_profiles' table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId);
      
  case 'workouts':
    // Fetches from 'workout_plans' table
    const { data: workoutData, error: workoutError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId);
      
  case 'workout_logs':
    // Fetches from 'workout_logs' table
    const { data: logData, error: logError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId);
}
```

#### Return Format
```javascript
{
  profiles: [...],      // User profile records
  workouts: [...],      // Workout plan records
  workout_logs: [...]   // Workout log records
}
```

#### Error Handling
- **DatabaseError**: Thrown for any Supabase query failures
- **Logging**: Info level for successful operations, error level for failures
- **Promise.all**: Concurrent processing of multiple data types

---

### exportJSON Method
**Function:** `exportJSON(userId, dataTypes, jwtToken)`
**Purpose:** Export data as JSON object with user metadata

#### Processing Flow
1. **Client Initialization**: `getSupabaseClientWithToken(jwtToken)`
2. **Data Fetching**: `fetchUserData(userId, dataTypes, supabase)`
3. **Response Formatting**: Adds export metadata and user ID
4. **Return**: Direct JavaScript object (not stringified)

#### Response Structure
```javascript
{
  exportDate: "2024-01-15T10:30:00.000Z",
  userId: "uuid-string",
  data: {
    profiles: [...],
    workouts: [...],
    workout_logs: [...]
  }
}
```

---

### exportCSV Method
**Function:** `exportCSV(userId, dataTypes, jwtToken)`
**Purpose:** Generate CSV stream with sanitization

#### Processing Flow
1. **Data Retrieval**: Fetch user data using `fetchUserData()`
2. **Data Flattening**: Convert nested objects to flat CSV structure
3. **Sanitization**: Apply `sanitizeForCsv()` to prevent formula injection
4. **Stream Creation**: Use `fast-csv` with `PassThrough` stream

#### CSV Sanitization
```javascript
function sanitizeForCsv(value) {
  if (typeof value !== 'string') return value;
  // Prefix with single quote if value starts with =, +, -, @, or tab/newline
  if (/^[=+\-@\t\r\n]/.test(value)) {
    return `'${value}`;
  }
  return value;
}
```

#### Stream Configuration
- **Transform**: `processObjectForExport()` for nested object handling
- **Headers**: Automatic header generation from object keys
- **Format**: Standard CSV with comma separation

---

### exportXLSX Method
**Function:** `exportXLSX(userId, dataTypes, jwtToken)`
**Purpose:** Generate Excel workbook stream with multiple sheets

#### Workbook Structure
- **Sheet per Data Type**: Separate worksheet for each data type
- **Headers**: First row contains column headers
- **Data Rows**: Flattened object data in subsequent rows
- **Styling**: Basic Excel formatting for readability

#### Processing Flow
1. **Workbook Creation**: `new ExcelJS.Workbook()`
2. **Data Processing**: Flatten and sanitize data per data type
3. **Sheet Creation**: Add worksheet for each data type
4. **Stream Generation**: Write workbook to `PassThrough` stream

---

### exportPDF Method
**Function:** `exportPDF(userId, dataTypes, jwtToken)`
**Purpose:** Generate PDF document stream

#### PDF Generation
- **Library**: Uses PDF generation library (implementation varies)
- **Layout**: Structured document with headers and data tables
- **Formatting**: Professional layout with proper spacing
- **Content**: Includes export metadata and formatted data

---

## Import Service Methods

### getSupabaseClient Method
**Function:** `getSupabaseClient(jwtToken)`
**Lines:** 23-40
**Purpose:** Initialize authenticated Supabase client for RLS compliance

#### Client Configuration
```javascript
return createClient(supabaseUrl, supabaseKey, {
  global: { headers: { Authorization: `Bearer ${jwtToken}` } }
});
```

#### Validation
- **Environment Variables**: Validates SUPABASE_URL and SUPABASE_ANON_KEY
- **JWT Token**: Ensures token is provided for authentication
- **Error Handling**: Throws descriptive errors for missing configuration

---

### getValidationSchema Method
**Function:** `getValidationSchema(dataType)`
**Lines:** 43-100
**Purpose:** Return Joi validation schema for specific data types

#### Schema Definitions
- **Profiles Schema**: 
  - Required: `user_id` (UUID)
  - Optional: `name`, `height`, `weight`, `age`, `gender`, `experience_level`
  - Arrays: `fitness_goals`, `equipment`, `medical_conditions`
  - Enums: `gender` (male/female/other), `unit_preference` (metric/imperial)

- **Workouts Schema**:
  - Required: `user_id` (UUID), `name`, `plan_data` (object)
  - Optional: `description`, `ai_generated`, `status`, `difficulty_level`
  - Arrays: `tags`, `goals`, `equipment_required`
  - Object: `ai_reasoning`

- **Workout Logs Schema**:
  - Required: `user_id` (UUID)
  - Optional: `log_id`, `plan_id`, `date`, `completed`
  - Strings: `exercises_completed`, `notes`, `feedback`
  - Numbers: `overall_difficulty`, `energy_level`, `satisfaction` (1-10 range)

#### Validation Features
- **UUID Validation**: Ensures proper UUID format for IDs
- **Range Validation**: Numeric ranges for ratings and measurements
- **Enum Validation**: Restricted values for categorical fields
- **Null Handling**: Allows null values for optional fields

---

### processJsonFields Method
**Function:** `processJsonFields(item, operation)`
**Purpose:** Handle JSON field conversion between string and object formats

#### Operations
- **'stringify'**: Convert objects to JSON strings for database storage
- **'parse'**: Convert JSON strings to objects for processing

#### Field Processing
```javascript
const jsonFields = {
  profiles: ['fitness_goals', 'equipment', 'medical_conditions'],
  workouts: ['plan_data', 'ai_reasoning', 'tags', 'goals', 'equipment_required'],
  workout_logs: ['exercises_completed']
};
```

#### Error Handling
- **JSON Parse Errors**: Graceful handling of malformed JSON strings
- **Type Validation**: Ensures proper data types before conversion
- **Fallback Values**: Default values for failed conversions

---

### importJSON Method
**Function:** `importJSON(userId, jsonData, jwtToken)`
**Purpose:** Process and import JSON data with validation

#### Processing Flow
1. **Client Initialization**: Create authenticated Supabase client
2. **Data Structure Validation**: Ensure JSON has expected structure
3. **Processing Order**: Profiles → Workouts → Workout Logs (dependency order)
4. **Validation**: Apply Joi schemas to each record
5. **User ID Injection**: Add userId to all records before validation
6. **Batch Insertion**: Process records in batches for efficiency

#### Data Processing Order
```javascript
const processingOrder = ['profiles', 'workouts', 'workout_logs'];
```
This order ensures foreign key dependencies are satisfied.

#### User ID Injection
```javascript
if (dataType !== 'profiles') {
  processedItem.user_id = userId; // Add before validation
}
```

---

### importCSV Method
**Function:** `importCSV(userId, csvStream, jwtToken)`
**Purpose:** Parse CSV stream and import data with type detection

#### CSV Processing
- **Parser**: Uses `Papa.parse()` with stream processing
- **Header Detection**: Automatic header row detection
- **Type Detection**: Attempts to determine data type from headers
- **Validation**: Applies appropriate schema based on detected type

#### Stream Configuration
```javascript
const parseStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
  header: true,
  skipEmptyLines: true,
  transform: (value) => value.trim()
});
```

#### Data Type Detection
Analyzes CSV headers to determine data type:
- **Profile indicators**: 'name', 'height', 'weight', 'age'
- **Workout indicators**: 'plan_data', 'exercises', 'difficulty'
- **Log indicators**: 'date', 'completed', 'overall_difficulty'

---

### importXLSX Method
**Function:** `importXLSX(userId, filePath, jwtToken)`
**Purpose:** Process Excel workbook with multiple sheet support

#### Workbook Processing
1. **File Reading**: `workbook.xlsx.readFile(filePath)`
2. **Sheet Iteration**: Process each worksheet separately
3. **Data Extraction**: Convert worksheet rows to objects
4. **Type Detection**: Determine data type per sheet
5. **Validation**: Apply schemas to extracted data

#### Sheet Processing
```javascript
workbook.eachSheet((worksheet, sheetId) => {
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Process headers
    } else {
      // Process data rows
    }
  });
});
```

#### File Cleanup
- **Automatic Cleanup**: Deletes file after processing
- **Error Cleanup**: Ensures cleanup even on processing failures

---

## Data Validation and Processing

### Validation Pipeline
1. **Schema Application**: Joi validation for data structure
2. **User ID Validation**: Ensures proper user association
3. **Foreign Key Checking**: Validates relationships between tables
4. **Data Sanitization**: Cleans and formats data for storage

### Auto-linking Logic
**Purpose**: Handle orphaned workout logs without valid plan_id

```javascript
if (!item.plan_id) {
  // Auto-link to user's most recent workout plan
  const { data: recentPlan } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (recentPlan) item.plan_id = recentPlan.id;
}
```

### Batch Processing
- **Batch Size**: 100 records per batch for optimal performance
- **Transaction Handling**: Each batch processed in separate transaction
- **Error Isolation**: Failed batches don't affect successful ones

## Error Handling and Recovery

### Error Classification
1. **Validation Errors**: Joi schema validation failures
2. **Database Errors**: Supabase operation failures
3. **File Processing Errors**: Parse or read failures
4. **Authentication Errors**: JWT or user validation failures

### Error Reporting Structure
```javascript
{
  total: 150,           // Total records processed
  successful: 140,      // Successfully imported
  failed: 10,          // Failed validation/insertion
  errors: [            // Array of error messages
    "Validation error for profiles: User ID must be a valid UUID",
    "Missing required field: name"
  ]
}
```

### Recovery Strategies
- **Partial Success**: Import continues even with some failures
- **Error Limiting**: Maximum error collection to prevent memory issues
- **Cleanup on Failure**: Temporary files cleaned up regardless of outcome
- **Rollback Prevention**: Successful imports not rolled back due to later failures

## Security Measures

### Data Isolation
- **RLS Compliance**: All queries filtered by authenticated user
- **JWT Validation**: Token required for all database operations
- **User Context**: UserId validated against JWT token claims

### Input Sanitization
- **CSV Formula Injection**: Prevention through sanitizeForCsv()
- **File Path Traversal**: Safe file handling practices
- **JSON Injection**: Proper parsing and validation

### File Security
- **Upload Directory**: Controlled temporary file storage
- **File Size Limits**: Enforced at multiple levels
- **MIME Type Validation**: File type verification
- **Automatic Cleanup**: Prevents file system accumulation

## Performance Optimizations

### Memory Management
- **Streaming**: Large file processing without full memory loading
- **Batch Processing**: Prevents memory overflow on large imports
- **Immediate Cleanup**: Files cleaned up immediately after processing

### Database Efficiency
- **Concurrent Fetching**: Parallel data type retrieval for exports
- **Batch Insertions**: Grouped database operations for imports
- **Connection Reuse**: Single client instance per operation

### Format-Specific Optimizations
- **JSON**: Direct object return without serialization
- **CSV**: Stream-based processing with sanitization
- **XLSX**: Workbook streaming for large datasets
- **PDF**: Optimized layout and content generation

## Integration Patterns

### Service Integration
- Export and import services work independently
- Shared utilities for common operations
- Consistent error handling patterns
- Standardized authentication requirements

### Controller Integration
- Controllers handle HTTP specifics (file uploads, streaming)
- Services focus on business logic and data processing
- Error boundaries maintained between layers
- Clean separation of concerns

### Database Integration
- RLS policies ensure data security
- Foreign key relationships maintained
- Transaction boundaries for data integrity
- Consistent query patterns across operations