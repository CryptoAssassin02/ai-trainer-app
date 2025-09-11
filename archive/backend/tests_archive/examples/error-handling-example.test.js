/**
 * @fileoverview Tests for Error Handling Example
 */

// Mock config and logger
jest.mock('../../config', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock asyncHandler to immediately execute the wrapped function
jest.mock('../../utils/error-handlers', () => {
  const originalModule = jest.requireActual('../../utils/error-handlers');
  
  return {
    ...originalModule,
    asyncHandler: (fn) => async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    }
  };
});

const { exampleController } = require('../../examples/error-handling-example');
const { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  ConcurrencyConflictError,
  InternalError
} = require('../../utils/errors');

// Mock Express response
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Error Handling Example', () => {
  describe('getResourceById', () => {
    it('should return a resource if found', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.getResourceById(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          id: 123,
          name: 'Example Resource'
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should throw ValidationError for invalid ID', async () => {
      const req = { params: { id: 'abc' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.getResourceById(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
    });
    
    it('should throw NotFoundError for non-existent resource', async () => {
      const req = { params: { id: '999' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.getResourceById(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
    });
  });
  
  describe('createResource', () => {
    it('should create a resource with valid data', async () => {
      const req = { body: { name: 'Test Resource', email: 'test@example.com' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.createResource(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Resource created successfully',
        data: expect.objectContaining({
          name: 'Test Resource',
          email: 'test@example.com'
        })
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should throw ValidationError for missing fields', async () => {
      const req = { body: { } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.createResource(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.errors.length).toBe(2); // Both name and email missing
    });
    
    it('should throw ConflictError for duplicate email', async () => {
      const req = { body: { name: 'Test Resource', email: 'conflict@example.com' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.createResource(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.statusCode).toBe(409);
    });
  });
  
  describe('updateResource', () => {
    it('should update a resource with valid data and version', async () => {
      const req = { 
        params: { id: '123' },
        body: { name: 'Updated Resource', email: 'updated@example.com', version: 1 }
      };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.updateResource(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Resource updated successfully',
        data: expect.objectContaining({
          id: 123,
          name: 'Updated Resource',
          email: 'updated@example.com',
          version: 2 // Version incremented by 1
        })
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should throw ConcurrencyConflictError for mismatched version', async () => {
      const req = { 
        params: { id: '123' },
        body: { name: 'Updated Resource', email: 'updated@example.com', version: 2 }
      };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.updateResource(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ConcurrencyConflictError);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('AGENT_CONCURRENCY_ERROR');
    });
  });
  
  describe('deleteResource', () => {
    it('should delete a resource successfully', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.deleteResource(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Resource deleted successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should throw InternalError for failed deletion', async () => {
      const req = { params: { id: '500' } };
      const res = mockResponse();
      const next = jest.fn();
      
      await exampleController.deleteResource(req, res, next);
      
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(InternalError);
      expect(error.statusCode).toBe(500);
    });
  });
}); 