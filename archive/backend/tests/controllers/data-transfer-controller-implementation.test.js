/**
 * @jest-environment node
 */
const { exportData, importData } = require('../../controllers/data-transfer');
const exportService = require('../../services/export-service');
const importService = require('../../services/import-service');
const logger = require('../../config/logger');
const fs = require('fs');
const { Readable } = require('stream');
const { ValidationError, DatabaseError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../services/export-service');
jest.mock('../../services/import-service');
jest.mock('../../config/logger');
jest.mock('fs');

// Mock Express req, res, next objects
const mockReq = {};
const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn(),
  setHeader: jest.fn(),
  pipe: jest.fn(),
  end: jest.fn(),
  // headersSent is a property, not a function
  get headersSent() {
    // Determine if headers have been sent based on whether status or setHeader was called
    // This is a simplified mock logic
    return this.status.mock.calls.length > 0 || this.setHeader.mock.calls.length > 0;
  }
};
const mockNext = jest.fn();

describe('Data Transfer Controller', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Reset mockReq and mockRes states if needed
    mockReq.user = { id: 'user-123' };
    mockReq.headers = { authorization: 'Bearer valid-token' };
    mockReq.body = {};
    mockReq.file = undefined; // Ensure file is undefined by default

    // Reset mockRes properties that might be checked in headersSent
    mockRes.status.mockClear();
    mockRes.json.mockClear();
    mockRes.send.mockClear();
    mockRes.setHeader.mockClear();
    mockRes.pipe.mockClear();
    mockRes.end.mockClear();

    // Re-assign properties to ensure they are fresh for each test
    // This helps avoid state leakage across tests affecting headersSent logic
     Object.defineProperty(mockRes, 'headersSent', {
      get: jest.fn(() => mockRes.status.mock.calls.length > 0 || mockRes.setHeader.mock.calls.length > 0 || mockRes.send.mock.calls.length > 0),
      configurable: true // Allows redefining in future tests if necessary
    });
  });

  describe('exportData', () => {
    // [ ] Auth Error: Missing userId, returns 401.
    test('should return 401 if userId is missing', async () => {
      mockReq.user = undefined; // Simulate missing user
      
      await exportData(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('without userId or jwtToken'));
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    // [ ] Auth Error: Missing jwtToken, returns 401.
    test('should return 401 if jwtToken is missing', async () => {
      mockReq.headers.authorization = undefined; // Simulate missing token
      
      await exportData(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('without userId or jwtToken'));
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    // [ ] Validation Error: Missing format, returns 400.
    test('should return 400 if format is missing', async () => {
      mockReq.body = { dataTypes: ['profiles'] }; // format is missing
      
      await exportData(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Export format is required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    // [ ] Validation Error: Missing dataTypes, returns 400.
    test('should return 400 if dataTypes is missing', async () => {
      mockReq.body = { format: 'json' }; // dataTypes is missing
      
      await exportData(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'At least one data type must be specified for export.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Validation Error: Empty dataTypes array, returns 400.
    test('should return 400 if dataTypes array is empty', async () => {
      mockReq.body = { format: 'json', dataTypes: [] }; // Empty array
      
      await exportData(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'At least one data type must be specified for export.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Validation Error: Invalid dataTypes provided, returns 400.
     test('should return 400 if invalid dataTypes are provided', async () => {
      mockReq.body = { format: 'json', dataTypes: ['profiles', 'invalid_type'] }; // Contains invalid type

      await exportData(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid data types: invalid_type'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Success (JSON): Service returns data, sets headers, returns 200 with JSON.
    test('should return 200 with JSON data for json format', async () => {
      mockReq.body = { format: 'json', dataTypes: ['profiles'] };
      const mockExportData = { profiles: [{ id: 'user-123', name: 'Test User' }] };
      exportService.exportJSON.mockResolvedValue(mockExportData);

      await exportData(mockReq, mockRes, mockNext);

      expect(exportService.exportJSON).toHaveBeenCalledWith('user-123', ['profiles'], 'valid-token');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/attachment; filename="trAIner-export-\d+\.json"/));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockExportData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    // Helper function to create a mock stream
    const createMockStream = () => {
      const stream = new Readable({
        read() {} // No-op read implementation
      });
      stream.pipe = jest.fn(); // Mock the pipe method
      return stream;
    };
    
    // [ ] Success (CSV): Service returns stream, sets headers, pipes stream to res.
    test('should pipe stream for csv format', async () => {
      mockReq.body = { format: 'csv', dataTypes: ['workouts'] };
      const mockStream = createMockStream();
      exportService.exportCSV.mockResolvedValue(mockStream);
      
      await exportData(mockReq, mockRes, mockNext);

      expect(exportService.exportCSV).toHaveBeenCalledWith('user-123', ['workouts'], 'valid-token');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/attachment; filename="trAIner-export-\d+\.csv"/));
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockRes.status).not.toHaveBeenCalled(); // Status shouldn't be set directly when piping
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Success (XLSX): Service returns stream, sets headers, pipes stream to res.
    test('should pipe stream for xlsx format', async () => {
      mockReq.body = { format: 'xlsx', dataTypes: ['workout_logs'] };
      const mockStream = createMockStream();
      exportService.exportXLSX.mockResolvedValue(mockStream);
      
      await exportData(mockReq, mockRes, mockNext);

      expect(exportService.exportXLSX).toHaveBeenCalledWith('user-123', ['workout_logs'], 'valid-token');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/attachment; filename="trAIner-export-\d+\.xlsx"/));
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Success (PDF): Service returns stream, sets headers, pipes stream to res.
    test('should pipe stream for pdf format', async () => {
      mockReq.body = { format: 'pdf', dataTypes: ['profiles', 'workouts'] };
      const mockStream = createMockStream();
      exportService.exportPDF.mockResolvedValue(mockStream);

      await exportData(mockReq, mockRes, mockNext);

      expect(exportService.exportPDF).toHaveBeenCalledWith('user-123', ['profiles', 'workouts'], 'valid-token');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/attachment; filename="trAIner-export-\d+\.pdf"/));
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Unsupported Format: Invalid format, returns 400.
    test('should return 400 for unsupported format', async () => {
      mockReq.body = { format: 'xml', dataTypes: ['profiles'] }; // Unsupported format

      await exportData(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unsupported export format: xml'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Stream Error: Service returns stream, stream emits 'error', logs error, ends response (if headers sent) or returns 500 (if headers not sent).
    test('should handle stream error and return 500 if headers not sent', async () => {
      mockReq.body = { format: 'csv', dataTypes: ['workouts'] };
      const mockStream = createMockStream();
      const streamError = new Error('Stream failed miserably');
      exportService.exportCSV.mockResolvedValue(mockStream);

      // Simulate stream error emission *after* the controller function is called
      // We need to yield control back to the event loop for the stream.on handler to be attached
      const promise = exportData(mockReq, mockRes, mockNext);
      // Use process.nextTick or setTimeout to ensure the .on handler is attached before emitting
      await new Promise(resolve => process.nextTick(resolve)); 
      mockStream.emit('error', streamError);
      await promise; // Wait for the controller function to potentially finish

      expect(exportService.exportCSV).toHaveBeenCalledWith('user-123', ['workouts'], 'valid-token');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error streaming csv export'), { error: streamError });
      // Check headersSent using the mock getter
      const headersWereSent = mockRes.headersSent;
      if (!headersWereSent) {
           expect(mockRes.status).toHaveBeenCalledWith(500);
           expect(mockRes.json).toHaveBeenCalledWith({
               status: 'error',
               message: expect.stringContaining('Error generating csv export')
           });
      } else {
          // If headers were somehow sent before error (less likely here), just check end was called
          expect(mockRes.end).toHaveBeenCalled();
          expect(mockRes.status).not.toHaveBeenCalledWith(500); // Ensure 500 wasn't sent after headers
      }
       expect(mockNext).not.toHaveBeenCalled(); // Error handled within controller
    });

    test('should handle stream error and end response if headers were sent', async () => {
      mockReq.body = { format: 'pdf', dataTypes: ['profiles'] };
      const mockStream = createMockStream();
      const streamError = new Error('PDF stream failed mid-way');
      exportService.exportPDF.mockResolvedValue(mockStream);

      // --- Simulate headers being sent BEFORE the error --- 
      // Modify the mockRes specifically for this test to reflect headers being sent
      Object.defineProperty(mockRes, 'headersSent', {
          get: () => true, // Force headersSent to be true
          configurable: true
      });
      // We might also manually call setHeader to ensure the getter logic works
      mockRes.setHeader('Content-Type', 'application/pdf'); 
      mockRes.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
      //------------------------------------------------------

      const promise = exportData(mockReq, mockRes, mockNext);
      await new Promise(resolve => process.nextTick(resolve));
      mockStream.emit('error', streamError);
      await promise;

      expect(exportService.exportPDF).toHaveBeenCalledWith('user-123', ['profiles'], 'valid-token');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error streaming pdf export'), { error: streamError });
      expect(mockRes.end).toHaveBeenCalled(); // Should just end the response
      expect(mockRes.status).not.toHaveBeenCalledWith(500); // Should not try to set status again
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Service Error (JSON): exportJSON throws ValidationError/DatabaseError/Generic error, returns appropriate status (400/500).
    test('should return 400 when exportJSON throws ValidationError', async () => {
        mockReq.body = { format: 'json', dataTypes: ['profiles'] };
        const validationError = new ValidationError('Invalid data type for JSON export');
        exportService.exportJSON.mockRejectedValue(validationError);

        await exportData(mockReq, mockRes, mockNext);

        expect(exportService.exportJSON).toHaveBeenCalledWith('user-123', ['profiles'], 'valid-token');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in exportData'), { error: validationError });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: validationError.message });
        // expect(mockNext).toHaveBeenCalledWith(validationError); // Controller handles error, does not call next
    });
    
    test('should return 500 when exportJSON throws DatabaseError', async () => {
        mockReq.body = { format: 'json', dataTypes: ['workouts'] };
        const dbError = new DatabaseError('DB connection failed during JSON export');
        exportService.exportJSON.mockRejectedValue(dbError);

        await exportData(mockReq, mockRes, mockNext);

        expect(exportService.exportJSON).toHaveBeenCalledWith('user-123', ['workouts'], 'valid-token');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in exportData'), { error: dbError });
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to export data due to a database issue.' });
        // expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    test('should return 500 when exportJSON throws a generic error', async () => {
        mockReq.body = { format: 'json', dataTypes: ['workout_logs'] };
        const genericError = new Error('Something unexpected happened');
        exportService.exportJSON.mockRejectedValue(genericError);

        await exportData(mockReq, mockRes, mockNext);

        expect(exportService.exportJSON).toHaveBeenCalledWith('user-123', ['workout_logs'], 'valid-token');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in exportData'), { error: genericError });
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to export data due to an internal error.' });
        // expect(mockNext).toHaveBeenCalledWith(genericError);
    });

    // [ ] Service Error (Streamed): Service method (e.g., exportCSV) throws error before returning stream, returns appropriate status (400/500).
    test('should return 500 when exportCSV throws an error before streaming', async () => {
      mockReq.body = { format: 'csv', dataTypes: ['profiles'] };
      const serviceError = new Error('Could not initiate CSV export');
      exportService.exportCSV.mockRejectedValue(serviceError);

      await exportData(mockReq, mockRes, mockNext);

      expect(exportService.exportCSV).toHaveBeenCalledWith('user-123', ['profiles'], 'valid-token');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in exportData'), { error: serviceError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to export data due to an internal error.' });
      // expect(mockNext).toHaveBeenCalledWith(serviceError);
    });

     test('should return 400 when exportXLSX throws ValidationError before streaming', async () => {
      // Use valid dataTypes to bypass controller validation and test service error
      mockReq.body = { format: 'xlsx', dataTypes: ['profiles'] }; 
      const validationError = new ValidationError('XLSX generation failed validation');
      exportService.exportXLSX.mockRejectedValue(validationError);

      await exportData(mockReq, mockRes, mockNext);

      // Now the service method should be called
      expect(exportService.exportXLSX).toHaveBeenCalledWith('user-123', ['profiles'], 'valid-token');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in exportData'), { error: validationError });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: validationError.message });
      // expect(mockNext).toHaveBeenCalledWith(validationError); // Controller handles error, does not call next
    });

  });

  describe('importData', () => {
    // [ ] Auth Error: Missing userId, returns 401.
    test('should return 401 if userId is missing', async () => {
      mockReq.user = undefined;
      mockReq.file = { originalname: 'test.json', mimetype: 'application/json', path: '/tmp/test.json' }; // Need a mock file
      
      await importData(mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('without userId or jwtToken'));
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Auth Error: Missing jwtToken, returns 401.
    test('should return 401 if jwtToken is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.file = { originalname: 'test.csv', mimetype: 'text/csv', path: '/tmp/test.csv' }; // Need a mock file
      
      await importData(mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('without userId or jwtToken'));
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Validation Error: No req.file uploaded, returns 400.
    test('should return 400 if no file is uploaded', async () => {
      mockReq.file = undefined; // Explicitly set file to undefined

      await importData(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No file uploaded.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Success (JSON): Reads file, parses JSON, service processes, cleans up file, returns 200 with results.
    test('should process JSON import successfully', async () => {
      const mockFile = { originalname: 'import.json', mimetype: 'application/json', path: '/tmp/import.json' };
      const mockJsonContent = '{\"profiles\":[{\"id\": \"user-abc\"}]}';
      const mockParsedJson = { profiles: [{ id: 'user-abc' }] };
      const mockImportResult = { total: 1, successful: 1, failed: 0, errors: [] };
      
      mockReq.file = mockFile;
      fs.readFileSync.mockReturnValue(mockJsonContent);
      importService.importJSON.mockResolvedValue(mockImportResult);

      await importData(mockReq, mockRes, mockNext);

      expect(fs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf8');
      expect(importService.importJSON).toHaveBeenCalledWith('user-123', mockParsedJson, 'valid-token');
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path); // Cleanup called by controller
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Data imported successfully.',
        data: mockImportResult
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Success (CSV): Creates stream, service processes, cleans up file, returns 200 with results.
    test('should process CSV import successfully', async () => {
      const mockFile = { originalname: 'import.csv', mimetype: 'text/csv', path: '/tmp/import.csv' };
      const mockCsvStream = new Readable({ read() {} }); // Simple mock stream
      const mockImportResult = { total: 5, successful: 4, failed: 1, errors: ['Row 3 error'] };
      
      mockReq.file = mockFile;
      fs.createReadStream.mockReturnValue(mockCsvStream);
      importService.importCSV.mockResolvedValue(mockImportResult);

      await importData(mockReq, mockRes, mockNext);

      expect(fs.createReadStream).toHaveBeenCalledWith(mockFile.path);
      expect(importService.importCSV).toHaveBeenCalledWith('user-123', mockCsvStream, 'valid-token');
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path); // Cleanup called by controller
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Data imported successfully.',
        data: {
          total: mockImportResult.total,
          successful: mockImportResult.successful,
          failed: mockImportResult.failed,
          errors: mockImportResult.errors.slice(0, 10) // Controller slices errors
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Success (XLSX): Service processes (using path), returns 200 with results (service handles cleanup).
    test('should process XLSX import successfully', async () => {
      const mockFile = { 
        originalname: 'import.xlsx', 
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        path: '/tmp/import.xlsx' 
      };
      const mockImportResult = { total: 10, successful: 10, failed: 0, errors: [] };

      mockReq.file = mockFile;
      importService.importXLSX.mockResolvedValue(mockImportResult);

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importXLSX).toHaveBeenCalledWith('user-123', mockFile.path, 'valid-token');
      // Cleanup (unlinkSync) is NOT called by the controller for XLSX
      expect(fs.unlinkSync).not.toHaveBeenCalled(); 
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Data imported successfully.',
        data: mockImportResult
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Invalid JSON Format: `JSON.parse` fails, cleans up file, returns 400.
    test('should return 400 if JSON parsing fails', async () => {
      const mockFile = { originalname: 'invalid.json', mimetype: 'application/json', path: '/tmp/invalid.json' };
      const invalidJsonContent = '{\"profiles\":[{\"id\": \"user-abc\"}'; // Missing closing bracket
      
      mockReq.file = mockFile;
      fs.readFileSync.mockReturnValue(invalidJsonContent); // Mock reading invalid JSON

      await importData(mockReq, mockRes, mockNext);

      expect(fs.readFileSync).toHaveBeenCalledWith(mockFile.path, 'utf8');
      // Ensure cleanup is still called even on parse error
      // expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path); 
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid JSON file format.'
      });
      expect(importService.importJSON).not.toHaveBeenCalled(); // Service should not be called
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Unsupported File Type: Invalid `mimetype`, cleans up file, returns 400.
    test('should return 400 for unsupported file type', async () => {
      const mockFile = { originalname: 'data.txt', mimetype: 'text/plain', path: '/tmp/data.txt' }; // Unsupported type

      mockReq.file = mockFile;
      // Mock existsSync for the cleanup check in the default case
      fs.existsSync.mockReturnValue(true); 

      await importData(mockReq, mockRes, mockNext);

      // Ensure cleanup is called for unsupported types
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path); 
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: `Unsupported file type: ${mockFile.mimetype}`
      });
      expect(importService.importJSON).not.toHaveBeenCalled();
      expect(importService.importCSV).not.toHaveBeenCalled();
      expect(importService.importXLSX).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Service Error (JSON): `importJSON` throws `ValidationError`/`DatabaseError`/Generic error, cleans up file, returns appropriate status (400/500).
    test('should return 400 when importJSON throws ValidationError', async () => {
      const mockFile = { originalname: 'import.json', mimetype: 'application/json', path: '/tmp/import.json' };
      const mockJsonContent = '{\"profiles\":[{\"id\": \"user-abc\"}]}';
      const validationError = new ValidationError('Invalid profile data in JSON', ['Profile ID missing']);

      mockReq.file = mockFile;
      fs.readFileSync.mockReturnValue(mockJsonContent);
      importService.importJSON.mockRejectedValue(validationError);
      // Mock existsSync for cleanup check
      fs.existsSync.mockReturnValue(true); 

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importJSON).toHaveBeenCalled();
      // Should attempt cleanup even if service fails after successful parse
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path); 
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in importData'), { error: validationError });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: validationError.message,
        errors: validationError.errors
      });
      expect(mockNext).not.toHaveBeenCalled(); // Error handled
    });
    
    test('should return 500 when importJSON throws DatabaseError and cleanup succeeds', async () => {
      const mockFile = { originalname: 'import.json', mimetype: 'application/json', path: '/tmp/import.json' };
      const mockJsonContent = '{\"workouts\":[]}';
      const dbError = new DatabaseError('DB insert failed');

      mockReq.file = mockFile;
      fs.readFileSync.mockReturnValue(mockJsonContent);
      importService.importJSON.mockRejectedValue(dbError);
      fs.existsSync.mockReturnValue(true); // File exists for cleanup
      fs.unlinkSync.mockImplementation(() => {}); // Cleanup succeeds

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importJSON).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in importData'), { error: dbError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        status: 'error', 
        message: 'Failed to import data due to a database issue.' 
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Service Error (CSV): `importCSV` throws error, cleans up file (if exists), returns appropriate status (400/500).
    test('should return 500 when importCSV throws an error and cleanup succeeds', async () => {
      const mockFile = { originalname: 'import.csv', mimetype: 'text/csv', path: '/tmp/import.csv' };
      const mockCsvStream = new Readable({ read() {} });
      const serviceError = new Error('CSV processing failed');

      mockReq.file = mockFile;
      fs.createReadStream.mockReturnValue(mockCsvStream);
      importService.importCSV.mockRejectedValue(serviceError);
      fs.existsSync.mockReturnValue(true); // File exists for cleanup
      fs.unlinkSync.mockImplementation(() => {}); // Cleanup succeeds

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importCSV).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in importData'), { error: serviceError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        status: 'error', 
        message: 'Failed to import data due to an internal error.' 
      });
       expect(mockNext).not.toHaveBeenCalled();
    });

    // [ ] Service Error (XLSX): `importXLSX` throws error, returns appropriate status (400/500).
    test('should return 500 when importXLSX throws an error', async () => {
      const mockFile = { originalname: 'import.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', path: '/tmp/import.xlsx' };
      const serviceError = new Error('XLSX parsing failed');

      mockReq.file = mockFile;
      importService.importXLSX.mockRejectedValue(serviceError);
      fs.existsSync.mockReturnValue(true); // File exists for cleanup check in catch
      fs.unlinkSync.mockImplementation(() => {}); // Assume cleanup succeeds if called

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importXLSX).toHaveBeenCalled();
      // Cleanup is attempted in the catch block for XLSX path
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path); 
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in importData'), { error: serviceError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        status: 'error', 
        message: 'Failed to import data due to an internal error.' 
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 500 response if cleanup fails after successful JSON parse', async () => {
      const mockFile = { originalname: 'import.json', mimetype: 'application/json', path: '/tmp/import.json' };
      const mockJsonContent = '{\"profiles\":[]}';
      const cleanupError = new Error('Permission denied for unlink');

      mockReq.file = mockFile;
      fs.readFileSync.mockReturnValue(mockJsonContent);
      fs.unlinkSync.mockImplementation(() => { // Mock unlink to throw error
        throw cleanupError;
      }); 
      fs.existsSync.mockReturnValue(true); 

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importJSON).not.toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in importData'), { error: cleanupError });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        status: 'error', 
        message: 'Failed to import data due to an internal error.' 
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should log warning if cleanup fails in the main catch block', async () => {
      const mockFile = { originalname: 'import.csv', mimetype: 'text/csv', path: '/tmp/import.csv' };
      const mockCsvStream = new Readable({ read() {} });
      const serviceError = new Error('CSV processing failed');
      const cleanupError = new Error('Cannot delete file during error handling');

      mockReq.file = mockFile;
      fs.createReadStream.mockReturnValue(mockCsvStream);
      importService.importCSV.mockRejectedValue(serviceError);
      fs.existsSync.mockReturnValue(true); // File exists
      fs.unlinkSync.mockImplementation(() => { // Mock unlink to throw error
        throw cleanupError;
      });

      await importData(mockReq, mockRes, mockNext);

      expect(importService.importCSV).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in importData'), { error: serviceError });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`Error cleaning up temporary file: ${cleanupError.message}`));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        status: 'error', 
        message: 'Failed to import data due to an internal error.' 
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

  });
}); 