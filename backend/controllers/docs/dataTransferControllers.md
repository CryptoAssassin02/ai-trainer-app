# Data Transfer Controllers Documentation

## Overview
The Data Transfer Controller handles HTTP requests for data export and import operations with comprehensive format support, streaming capabilities, and robust error handling. This controller coordinates between route validation and service layer processing while managing file uploads, response streaming, and temporary file cleanup.

## Controller Module Structure

### Data Transfer Controller Module
**File:** `controllers/data-transfer.js`
**Lines:** 1-316
**Pattern:** Functional controller with service dependencies

#### Dependencies
- `exportService` - Handles data retrieval and format conversion
- `importService` - Manages file parsing and database insertion
- `logger` - Application logging from config/logger
- Node.js core modules: `fs`, `path`
- Custom errors: `ValidationError`, `DatabaseError`, `NotFoundError`

---

## Controller Methods

### exportData Method
**File:** `controllers/data-transfer.js`
**Lines:** 15-135
**Pattern:** Async function with streaming response handling

#### Method Signature
```javascript
async function exportData(req, res, next)
```

#### Input Processing
- **User Authentication**: Extracts `userId` from `req.user.id` and JWT token from Authorization header
- **Request Validation**: Validates `format` and `dataTypes` from request body
- **Format Validation**: Ensures format is one of ['json', 'csv', 'xlsx', 'pdf']
- **Data Types Validation**: Validates against ['profiles', 'workouts', 'workout_logs']

#### Authentication Flow
```javascript
const userId = req.user?.id;
const jwtToken = req.headers.authorization?.split(' ')[1];

if (!userId || !jwtToken) {
  return res.status(401).json({ 
    status: 'error', 
    message: 'Authentication required.' 
  });
}
```

#### Format-Specific Processing
- **JSON Format**: 
  - Direct service call to `exportService.exportJSON()`
  - Immediate JSON response with Content-Type application/json
  - Response body is the actual data object
- **CSV Format**: 
  - Stream creation via `exportService.exportCSV()`
  - Content-Type: text/csv
  - Streaming response with pipe to res
- **XLSX Format**: 
  - Stream creation via `exportService.exportXLSX()`
  - Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  - Streaming response with pipe to res
- **PDF Format**: 
  - Stream creation via `exportService.exportPDF()`
  - Content-Type: application/pdf
  - Streaming response with pipe to res

#### Response Configuration
- **Filename Generation**: `trAIner-export-{timestamp}.{extension}`
- **Download Headers**: Content-Disposition set to attachment with filename
- **Stream Error Handling**: Graceful error handling for streaming operations

#### Error Handling Strategy
- **Pre-stream Validation**: Format and data type validation before service calls
- **Stream Error Management**: Stream error listener prevents response corruption
- **Header Sent Check**: Prevents multiple response attempts
- **Error Classification**: Distinguishes ValidationError, DatabaseError, and generic errors

#### Logging Implementation
```javascript
logger.info(`Exporting ${format} data for user ${userId}, types: ${dataTypes.join(', ')}`);
logger.error(`Error streaming ${format} export: ${error.message}`, { error });
```

#### Response Types
- **Success (JSON)**: Direct JSON response with 200 status
- **Success (Stream)**: File download with appropriate Content-Type
- **400 Error**: Invalid format, missing data types, or validation failures
- **401 Error**: Missing or invalid authentication
- **500 Error**: Service failures or streaming errors

---

### importData Method
**File:** `controllers/data-transfer.js`
**Lines:** 144-316
**Pattern:** Async function with file handling and cleanup

#### Method Signature
```javascript
async function importData(req, res, next)
```

#### File Upload Handling
- **File Validation**: Checks for `req.file` from multer middleware
- **File Type Detection**: Uses MIME type with extension fallback for robustness
- **Temporary File Management**: Tracks `tempFilePath` for cleanup

#### Authentication Flow
Identical to exportData with user ID and JWT token extraction and validation.

#### File Type Detection Logic
```javascript
const isJsonFile = uploadedFile.mimetype === 'application/json' || 
                   uploadedFile.originalname.toLowerCase().endsWith('.json');
const isCsvFile = uploadedFile.mimetype === 'text/csv' || 
                  uploadedFile.originalname.toLowerCase().endsWith('.csv');
const isXlsxFile = uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   uploadedFile.originalname.toLowerCase().endsWith('.xlsx');
```

#### Format-Specific Processing
- **JSON Files**: 
  - Synchronous file read with `fs.readFileSync()`
  - JSON parsing with try-catch error handling
  - Immediate file cleanup after reading
  - Service call: `importService.importJSON(userId, parsedJson, jwtToken)`
- **CSV Files**: 
  - Stream creation with `fs.createReadStream()`
  - Service call: `importService.importCSV(userId, csvStream, jwtToken)`
  - File cleanup after processing
- **XLSX Files**: 
  - File path passing to service
  - Service call: `importService.importXLSX(userId, uploadedFile.path, jwtToken)`
  - Service handles file cleanup

#### File Cleanup Strategy
- **Immediate Cleanup**: JSON files cleaned up immediately after reading
- **Service Cleanup**: XLSX files cleaned up by service
- **Error Cleanup**: Try-catch ensures cleanup even on failures
- **Temp File Tracking**: `tempFilePath` variable tracks files requiring cleanup

#### Result Processing
The controller processes import results with sophisticated response logic:

```javascript
if (result.failed > 0 && result.successful === 0) {
  // All items failed validation - return error status
  return res.status(400).json({
    status: 'error',
    message: 'All data validation failed.',
    data: { total, successful, failed, errors: errors.slice(0, 10) }
  });
} else if (result.failed > 0) {
  // Some items failed, some succeeded - return success with warnings
  return res.status(200).json({
    status: 'success',
    message: `Data imported with ${result.failed} validation failures.`,
    data: { total, successful, failed, errors: errors.slice(0, 10) }
  });
} else {
  // All items succeeded
  return res.status(200).json({
    status: 'success',
    message: 'Data imported successfully.',
    data: { total, successful, failed, errors: errors.slice(0, 10) }
  });
}
```

#### Error Response Strategy
- **All Failed**: 400 status with error message
- **Partial Success**: 200 status with warning message
- **Complete Success**: 200 status with success message
- **Error Limiting**: Only first 10 errors returned to prevent overwhelming response

#### Comprehensive Error Handling
- **File Upload Errors**: Missing file detection
- **JSON Parse Errors**: Invalid JSON format handling
- **Service Errors**: Wrapped in try-catch with classification
- **File System Errors**: Cleanup error handling with warnings
- **Authentication Errors**: JWT validation failures

#### Logging Implementation
```javascript
logger.info(`Processing import for user ${userId}, file: ${uploadedFile.originalname}, type: ${uploadedFile.mimetype}`);
logger.error(`Error in importData: ${error.message}`, { error });
logger.warn(`Error cleaning up temporary file: ${cleanupError.message}`);
```

#### Response Types
- **200 Success**: Complete or partial import success with data summary
- **400 Error**: No file, invalid format, or validation failures
- **401 Error**: Authentication failures
- **500 Error**: Database errors or service failures

---

## Service Integration Patterns

### Export Service Integration
- **Service Method Calls**: Each format has dedicated service method
- **Parameter Passing**: Consistent pattern: `(userId, dataTypes, jwtToken)`
- **Response Handling**: JSON returns data, others return streams
- **Error Propagation**: Service errors bubble up with classification

### Import Service Integration
- **Service Method Calls**: Format-specific methods with different parameter patterns
- **JSON Import**: `importJSON(userId, parsedJson, jwtToken)`
- **CSV Import**: `importCSV(userId, csvStream, jwtToken)`
- **XLSX Import**: `importXLSX(userId, filePath, jwtToken)`
- **Result Processing**: Standardized result object with counts and errors

## Error Classification and Handling

### Error Types Handled
1. **ValidationError**: Request validation failures, invalid formats
2. **DatabaseError**: Service layer database issues
3. **Generic Errors**: Unexpected errors with fallback handling

### Error Response Standardization
All errors follow consistent format:
```javascript
{
  status: 'error',
  message: 'Descriptive error message',
  data: { /* Additional error details when applicable */ }
}
```

### Cleanup on Errors
- **File System Cleanup**: Temporary files cleaned up even on failures
- **Resource Management**: Streams closed properly on errors
- **Memory Management**: Large file processing handled efficiently

## Security Considerations

### Authentication Requirements
- **JWT Token Validation**: Required in Authorization header
- **User Context**: `req.user.id` must be present
- **Token Extraction**: Safe extraction with error handling

### File Security
- **MIME Type Validation**: Handled by route middleware (multer fileFilter)
- **File Size Limits**: 10MB limit enforced by multer
- **Temporary File Security**: Files stored in controlled upload directory
- **Path Traversal Prevention**: Safe file handling practices

### Data Security
- **User Data Isolation**: Only authenticated user's data accessible
- **SQL Injection Prevention**: Parameterized queries through services
- **CSV Formula Injection**: Handled by export service sanitization

## Performance Considerations

### Memory Management
- **Streaming Responses**: Large exports streamed to prevent memory issues
- **File Processing**: Efficient handling without loading entire files
- **Cleanup Strategy**: Immediate cleanup prevents disk space accumulation

### Response Optimization
- **Format-Specific Handling**: Optimized processing per format type
- **Error Limitation**: Maximum 10 errors returned per import
- **Header Management**: Proper Content-Type and download headers

## Integration Notes
- Controller follows standard Express middleware pattern
- Error handling integrates with global error middleware
- Service layer abstraction maintains clean separation of concerns
- Logging follows application-wide logging standards
- Authentication integrates with application auth middleware