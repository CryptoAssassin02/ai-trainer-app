const { Readable } = require('stream');
const { exportData, importData } = require('../../controllers/data-transfer');
const exportService = require('../../services/export-service');
const importService = require('../../services/import-service');
const { ValidationError, DatabaseError } = require('../../utils/errors');
const fs = require('fs');

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_KEY = 'mock-supabase-key';

// Mock fs before any imports
jest.mock('fs', () => {
  // Require Readable inside the factory function
  const { Readable } = require('stream'); 
  
  return {
    constants: {
      O_CREAT: 0o100,
      O_TRUNC: 0o1000,
      O_RDWR: 0o2,
      F_OK: 0
    },
    createReadStream: jest.fn().mockImplementation(() => {
      const mockReadStream = new Readable(); // Use imported Readable
      mockReadStream._read = () => {};
      return mockReadStream;
    }),
    readFileSync: jest.fn().mockReturnValue('{"data":{"profiles":[{"id":"test-user-id"}]}}'),
    createWriteStream: jest.fn().mockImplementation(() => {
      const mockWriteStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn((event, listener) => {
          if (event === 'finish') {
            listener();
          }
          return mockWriteStream;
        }),
        once: jest.fn(),
        emit: jest.fn(),
      };
      return mockWriteStream;
    }),
    open: jest.fn((path, flags, mode, cb) => cb(null, 1)),
    close: jest.fn((fd, cb) => cb(null)),
    unlink: jest.fn((path, cb) => cb(null)),
    unlinkSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    promises: {
      access: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined)
    }
  };
});

// Mock dependencies after fs
jest.mock('../../services/export-service');
jest.mock('../../services/import-service');
jest.mock('../../utils/auth-utils', () => ({
  verifyToken: jest.fn().mockImplementation((token) => {
    return { sub: 'test-user-id' };
  }),
  extractTokenFromHeader: jest.fn().mockImplementation((authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid Authorization header');
    }
    return authHeader.split(' ')[1];
  })
}));
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock tmp used by exceljs to avoid requiring actual fs operations
jest.mock('tmp', () => ({
  file: jest.fn((options, callback) => {
    callback(null, '/tmp/mock-file.xlsx', 123, jest.fn());
  }),
  fileSync: jest.fn(() => ({
    name: '/mock/temp/file/path',
    fd: 123,
    removeCallback: jest.fn()
  })),
  dir: jest.fn((options, callback) => {
    callback(null, '/tmp/mock-dir', jest.fn());
  }),
  dirSync: jest.fn(() => ({
    name: '/mock/temp/dir/path',
    removeCallback: jest.fn()
  }))
}));

// Mock path to avoid issues
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn(path => path.split('/').pop()),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn(filePath => {
    const parts = filePath.split('.');
    if (parts.length === 1) return '';
    return '.' + parts.pop();
  }),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Mock any other dependencies that might access fs
jest.mock('exceljs', () => {
  const { Readable } = require('stream');
  
  class MockWorkbook {
    constructor() {
      this.xlsx = {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-xlsx-data'))
      };
      this.csv = {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-csv-data'))
      };
      this.getWorksheet = jest.fn().mockReturnThis();
    }
    
    addWorksheet() {
      return {
        columns: [],
        addRow: jest.fn(),
        getCell: jest.fn().mockReturnValue({
          value: '',
          style: {}
        })
      };
    }
    
    writeToBuffer() {
      return Promise.resolve(Buffer.from('mock-workbook-data'));
    }
  }
  
  return {
    Workbook: MockWorkbook,
    Stream: {
      xlsx: {
        WorkbookWriter: class {
          constructor() {
            this.stream = new Readable();
            this.stream._read = () => {};
            this.addWorksheet = jest.fn().mockReturnValue({
              columns: [],
              addRow: jest.fn().mockReturnThis(),
              commit: jest.fn().mockResolvedValue(true)
            });
            this.commit = jest.fn().mockResolvedValue(true);
          }
        }
      }
    }
  };
});

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const { Readable } = require('stream');
    
    const mockPdfDoc = new Readable();
    mockPdfDoc._read = () => {};
    mockPdfDoc.pipe = jest.fn().mockReturnThis();
    mockPdfDoc.fontSize = jest.fn().mockReturnThis();
    mockPdfDoc.font = jest.fn().mockReturnThis();
    mockPdfDoc.text = jest.fn().mockReturnThis();
    mockPdfDoc.moveDown = jest.fn().mockReturnThis();
    mockPdfDoc.addPage = jest.fn().mockReturnThis();
    mockPdfDoc.end = jest.fn();
    
    return mockPdfDoc;
  });
});

describe('Data Transfer Controller', () => {
  // Setup mock request and response
  let req, res, next;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request
    req = {
      user: { id: 'test-user-id' },
      headers: { authorization: 'Bearer mock-jwt-token' },
      body: { format: 'json', dataTypes: ['profiles', 'workouts', 'workout_logs'] }
    };
    
    // Setup mock response
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn()
    };
    
    // Setup mock next function
    next = jest.fn();
    
    // Setup mock readable stream with pipe method
    const mockStream = new Readable();
    mockStream._read = () => {};
    mockStream.pipe = jest.fn().mockReturnThis();
    mockStream.on = jest.fn().mockImplementation((event, callback) => {
      return mockStream;
    });
    
    // Setup mock service responses
    exportService.exportJSON.mockResolvedValue({ data: 'mock-json-data' });
    exportService.exportCSV.mockResolvedValue(mockStream);
    exportService.exportXLSX.mockResolvedValue(mockStream);
    exportService.exportPDF.mockResolvedValue(mockStream);
    
    importService.importJSON.mockResolvedValue({
      total: 10,
      successful: 8,
      failed: 2,
      errors: ['Test error 1', 'Test error 2']
    });
    importService.importCSV.mockResolvedValue({
      total: 10,
      successful: 8,
      failed: 2,
      errors: ['Test error 1', 'Test error 2']
    });
    importService.importXLSX.mockResolvedValue({
      total: 10,
      successful: 8,
      failed: 2,
      errors: ['Test error 1', 'Test error 2']
    });
  });
  
  describe('exportData', () => {
    it('should respond with JSON data for JSON format', async () => {
      // Call the controller
      await exportData(req, res, next);
      
      // Verify service was called with correct parameters
      expect(exportService.exportJSON).toHaveBeenCalledWith(
        'test-user-id',
        ['profiles', 'workouts', 'workout_logs'],
        'mock-jwt-token'
      );
      
      // Verify response headers
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="trAIner-export-'));
      
      // Verify response status and body
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: 'mock-json-data' });
    });
    
    it('should stream response for CSV format', async () => {
      // Set request format to CSV
      req.body.format = 'csv';
      
      // Get reference to the mock stream before the call
      const mockStream = exportService.exportCSV.mock.results[0]?.value || 
        new Readable({
          read() {}
        });
      mockStream.pipe = jest.fn().mockReturnThis();
      exportService.exportCSV.mockResolvedValue(mockStream);
      
      // Call the controller
      await exportData(req, res, next);
      
      // Verify service was called with correct parameters
      expect(exportService.exportCSV).toHaveBeenCalledWith(
        'test-user-id',
        ['profiles', 'workouts', 'workout_logs'],
        'mock-jwt-token'
      );
      
      // Verify response headers
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="trAIner-export-'));
      
      // Verify the pipe was called on the response (don't try to access it from the mock result)
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });
    
    it('should handle authentication errors', async () => {
      // Remove user ID
      req.user = null;
      
      // Call the controller
      await exportData(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });
    });
    
    it('should handle missing format errors', async () => {
      // Remove format
      req.body.format = null;
      
      // Call the controller
      await exportData(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Export format is required.'
      });
    });
    
    it('should handle unsupported format errors', async () => {
      // Set unsupported format
      req.body.format = 'unsupported';
      
      // Call the controller
      await exportData(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unsupported export format: unsupported'
      });
    });
    
    it('should handle service errors', async () => {
      // Mock service error
      exportService.exportJSON.mockRejectedValue(new DatabaseError('Database error'));
      
      // Call the controller
      await exportData(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to export data due to a database issue.'
      });
    });
  });
  
  describe('importData', () => {
    beforeEach(() => {
      // Setup mock file
      req.file = {
        path: '/tmp/upload/test-file.json',
        originalname: 'test-file.json',
        mimetype: 'application/json'
      };
    });
    
    it('should handle JSON file imports', async () => {
      // Mock file content
      fs.readFileSync.mockReturnValue('{"data":{"profiles":[{"id":"test-user-id"}]}}');
      
      // Call the controller
      await importData(req, res, next);
      
      // Verify service was called with correct parameters
      expect(importService.importJSON).toHaveBeenCalledWith(
        'test-user-id',
        { data: { profiles: [{ id: 'test-user-id' }] } },
        'mock-jwt-token'
      );
      
      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/upload/test-file.json');
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Data imported successfully.',
        data: {
          total: 10,
          successful: 8,
          failed: 2,
          errors: ['Test error 1', 'Test error 2']
        }
      });
    });
    
    it('should handle CSV file imports', async () => {
      // Set file to CSV
      req.file.mimetype = 'text/csv';
      
      // Mock stream
      const mockStream = new Readable();
      fs.createReadStream.mockReturnValue(mockStream);
      
      // Call the controller
      await importData(req, res, next);
      
      // Verify service was called with correct parameters
      expect(importService.importCSV).toHaveBeenCalledWith(
        'test-user-id',
        mockStream,
        'mock-jwt-token'
      );
      
      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/upload/test-file.json');
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Data imported successfully.',
        data: {
          total: 10,
          successful: 8,
          failed: 2,
          errors: ['Test error 1', 'Test error 2']
        }
      });
    });
    
    it('should handle XLSX file imports', async () => {
      // Set file to XLSX
      req.file.mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      // Call the controller
      await importData(req, res, next);
      
      // Verify service was called with correct parameters
      expect(importService.importXLSX).toHaveBeenCalledWith(
        'test-user-id',
        '/tmp/upload/test-file.json',
        'mock-jwt-token'
      );
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Data imported successfully.',
        data: {
          total: 10,
          successful: 8,
          failed: 2,
          errors: ['Test error 1', 'Test error 2']
        }
      });
    });
    
    it('should handle invalid JSON file errors', async () => {
      // Mock invalid JSON, but when trying to parse it, JSON.parse should throw
      fs.readFileSync.mockReturnValue('invalid json');
      
      // Use the actual implementation which should throw on invalid JSON
      const originalJsonParse = JSON.parse;
      JSON.parse = jest.fn().mockImplementation(() => {
        throw new SyntaxError('Unexpected token i in JSON at position 0');
      });
      
      // Call the controller
      await importData(req, res, next);
      
      // Restore original JSON.parse
      JSON.parse = originalJsonParse;
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid JSON file format.'
      });
    });
    
    it('should handle unsupported file type errors', async () => {
      // Set unsupported mimetype
      req.file.mimetype = 'text/plain';
      
      // Call the controller
      await importData(req, res, next);
      
      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/upload/test-file.json');
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unsupported file type: text/plain'
      });
    });
    
    it('should handle missing file errors', async () => {
      // Remove file
      req.file = null;
      
      // Call the controller
      await importData(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No file uploaded.'
      });
    });
    
    it('should handle service errors', async () => {
      // Mock file content
      fs.readFileSync.mockReturnValue('{"data":{"profiles":[{"id":"test-user-id"}]}}');
      
      // Mock service error with the correct structure
      const validationError = new ValidationError('Validation failed');
      validationError.errors = ['Validation failed'];
      importService.importJSON.mockRejectedValue(validationError);
      
      // Call the controller
      await importData(req, res, next);
      
      // Verify error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: ['Validation failed']
      });
    });
  });
}); 