# Data Transfer Routes Documentation

## Overview
Data Transfer routes provide secure export and import capabilities for user fitness data with comprehensive format support, file validation, and security measures. These routes handle data export in multiple formats (JSON, CSV, XLSX, PDF) and import with validation, sanitization, and batch processing capabilities.

## Route Definitions

### POST /v1/data-transfer/export
**File:** `routes/data-transfer.js`
**Line:** 135
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, environment-aware (exportLimiter)
  - Production: 5 requests per hour
  - Test: 100 requests per minute
- **Middleware Applied:** [authenticate, exportLimiter, validate(exportSchema)]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/dataTransfer/data-transfer_export.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** 
  - `format` (required) - Values: 'json', 'csv', 'xlsx', 'pdf'
  - `dataTypes` (required array, min 1) - Values: 'profiles', 'workouts', 'workout_logs'

#### Handler Mapping
- **Controller Method:** `dataTransferController.exportData()`
- **Response Format:** Varies by format - JSON response or streamed file download

#### Export Format Details
- **JSON Format**: Direct JSON response with Content-Type application/json
- **CSV Format**: Streamed response with CSV sanitization for formula injection prevention
- **XLSX Format**: Streamed Excel workbook with Content-Type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- **PDF Format**: Streamed PDF document with Content-Type application/pdf

#### File Download Configuration
- **Filename Pattern**: `trAIner-export-{timestamp}.{extension}`
- **Content-Disposition**: `attachment; filename="{filename}"`
- **Streaming**: Used for CSV, XLSX, and PDF formats for memory efficiency

#### Error Routes
- **400:** Invalid format parameter or data types validation failure
- **401:** Missing or invalid JWT token in Authorization header
- **429:** Rate limit exceeded (5 requests/hour in production)
- **500:** Export generation failure, streaming errors, or database issues

---

### POST /v1/data-transfer/import
**File:** `routes/data-transfer.js`
**Line:** 143
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, environment-aware (importLimiter)
  - Production: 3 requests per hour
  - Test: 100 requests per minute
- **Middleware Applied:** [authenticate, importLimiter, upload.single('file'), handleMulterError]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/dataTransfer/data-transfer_import.yaml`

#### File Upload Configuration
- **Upload Middleware:** Multer with disk storage
- **File Size Limit:** 10MB (10 * 1024 * 1024 bytes)
- **Upload Directory:** `backend/uploads` (auto-created if not exists)
- **Filename Generation:** `{timestamp}-{random}.{extension}`

#### Supported File Types
- **JSON Files**: 
  - MIME Type: application/json
  - Extension Fallback: .json
- **CSV Files**: 
  - MIME Type: text/csv
  - Extension Fallback: .csv
- **Excel Files**: 
  - MIME Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  - Extension Fallback: .xlsx

#### File Validation (fileFilter)
- **Accepted MIME Types:** 'text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
- **Rejection Handling:** Custom error for unsupported file types
- **Security:** File type verification with both MIME type and extension checking

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** Multipart file upload with single 'file' field

#### Handler Mapping
- **Controller Method:** `dataTransferController.importData()`
- **Response Format:** JSON with import results including success/failure counts

#### Import Processing Flow
1. **File Type Detection**: Uses MIME type with extension fallback
2. **Temporary File Management**: Automatic cleanup after processing
3. **Format-Specific Processing**:
   - JSON: In-memory parsing with validation
   - CSV: Stream-based processing
   - XLSX: File path-based processing
4. **Result Aggregation**: Success/failure counting with error collection

#### Error Handling (handleMulterError)
- **LIMIT_FILE_SIZE**: 400 response with "File size exceeds the 10MB limit"
- **Multer Errors**: 400 response with descriptive error message
- **File Filter Rejection**: 400 response with unsupported file type message

#### Error Routes
- **400:** No file uploaded, file size exceeded, unsupported file type, invalid JSON format, or all data validation failed
- **401:** Missing or invalid JWT token in Authorization header
- **429:** Rate limit exceeded (3 requests/hour in production)
- **500:** Import processing failure, database errors, or file system issues

---

## Route Precedence Notes
- Data transfer routes are mounted at root level (`/`) in the main router (line 79 in routes/index.js)
- Routes have full paths defined (`/data-transfer/export`, `/data-transfer/import`)
- No route conflicts with other modules due to unique `/data-transfer` prefix
- Rate limiting is environment-aware (disabled in test, restricted in production)

## Security Features
- **Authentication**: JWT Bearer token required for all operations
- **User Data Isolation**: Only authenticated user's data is accessible
- **File Upload Security**: MIME type validation and size limits
- **CSV Sanitization**: Formula injection prevention in exported CSV files
- **Audit Logging**: All export operations are logged for security auditing
- **Temporary File Cleanup**: Automatic cleanup of uploaded files after processing

## Performance Optimizations
- **Streaming Responses**: CSV, XLSX, and PDF exports use streaming for large datasets
- **Memory Management**: Files processed without loading entire content into memory
- **Batch Processing**: Import operations handle large datasets in manageable chunks
- **Error Limitation**: Only first 10 errors reported per import to prevent overwhelming responses

## Rate Limiting Strategy
- **Export Operations**: More permissive (5/hour) due to read-only nature
- **Import Operations**: More restrictive (3/hour) due to database write operations
- **User-Based Limiting**: Uses user ID when available, falls back to IP address
- **Test Environment**: Rate limiting disabled for integration testing

## File Storage Management
- **Upload Directory**: `backend/uploads` with automatic creation
- **Unique Filenames**: Timestamp + random number prevents conflicts
- **Cleanup Strategy**: Immediate cleanup after processing to prevent disk space accumulation
- **Error Recovery**: Cleanup performed even if processing fails

## Integration Notes
- Routes use standard authentication middleware from auth.js
- Validation middleware from validation.js with custom Joi schemas
- Error handling follows application-wide error response patterns
- All operations require JWT tokens in Authorization header: `Bearer <token>`
- CORS and security headers applied through global middleware stack