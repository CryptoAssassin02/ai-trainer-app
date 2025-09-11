/**
 * @fileoverview Error Handling Example
 * Demonstrates how to use the enhanced error handling system
 */

const express = require('express');
const router = express.Router();

// Import error handling utilities
const { asyncHandler } = require('../utils/error-handlers');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  ConcurrencyConflictError,
  InternalError
} = require('../utils/errors');

/**
 * Example of a controller using asyncHandler for async error handling
 */
const exampleController = {
  /**
   * Get a resource by ID
   * Demonstrates using asyncHandler with validation and 404 handling
   */
  getResourceById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid ID format', { field: 'id', message: 'ID must be a valid number' });
    }
    
    // Simulate database lookup
    const resource = await simulateDatabaseLookup(id);
    
    // Handle not found
    if (!resource) {
      throw new NotFoundError(`Resource with ID ${id} not found`);
    }
    
    // Success response
    res.status(200).json({
      status: 'success',
      data: resource
    });
  }),
  
  /**
   * Create a new resource
   * Demonstrates handling validation errors and conflicts
   */
  createResource: asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    
    // Validate required fields
    const errors = [];
    if (!name) errors.push({ field: 'name', message: 'Name is required' });
    if (!email) errors.push({ field: 'email', message: 'Email is required' });
    
    // If validation errors exist, throw ValidationError
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
    
    // Check for duplicate (conflict)
    const existingResource = await simulateCheckForDuplicate(email);
    if (existingResource) {
      throw new ConflictError('Resource with this email already exists', { field: 'email' });
    }
    
    // Simulate creating a resource
    const newResource = await simulateCreateResource({ name, email });
    
    // Success response with 201 Created
    res.status(201).json({
      status: 'success',
      message: 'Resource created successfully',
      data: newResource
    });
  }),
  
  /**
   * Update a resource
   * Demonstrates handling concurrency conflicts
   */
  updateResource: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, version } = req.body;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid ID format', { field: 'id', message: 'ID must be a valid number' });
    }
    
    // Simulate checking current version
    const resource = await simulateDatabaseLookup(id);
    
    // Handle not found
    if (!resource) {
      throw new NotFoundError(`Resource with ID ${id} not found`);
    }
    
    // Check for concurrent modification
    if (resource.version !== version) {
      throw new ConcurrencyConflictError(
        'This resource has been modified by another process',
        {
          currentVersion: resource.version,
          providedVersion: version
        }
      );
    }
    
    // Perform update
    const updatedResource = await simulateUpdateResource(id, { name, email, version: version + 1 });
    
    // Success response
    res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      data: updatedResource
    });
  }),
  
  /**
   * Delete a resource
   * Demonstrates handling unexpected errors
   */
  deleteResource: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid ID format', { field: 'id', message: 'ID must be a valid number' });
    }
    
    try {
      // Simulate deletion with potential failure
      const success = await simulateDeleteResource(id);
      
      if (!success) {
        throw new InternalError('Failed to delete resource due to database error');
      }
      
      // Success response
      res.status(200).json({
        status: 'success',
        message: 'Resource deleted successfully'
      });
    } catch (error) {
      // If the error is already an ApiError, rethrow it
      if (error.statusCode) {
        throw error;
      }
      
      // Otherwise, wrap it in an InternalError
      throw new InternalError('An unexpected error occurred during deletion', error.message);
    }
  })
};

// Example route registration
router.get('/resources/:id', exampleController.getResourceById);
router.post('/resources', exampleController.createResource);
router.put('/resources/:id', exampleController.updateResource);
router.delete('/resources/:id', exampleController.deleteResource);

// Simulation functions (these would be replaced with actual database calls)
async function simulateDatabaseLookup(id) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Return null for ID 999 to demonstrate not found error
  if (id === '999') return null;
  
  // Return mock data
  return {
    id: parseInt(id),
    name: 'Example Resource',
    email: 'example@example.com',
    version: 1
  };
}

async function simulateCheckForDuplicate(email) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Always return a conflict for this specific email
  if (email === 'conflict@example.com') {
    return { id: 123, email };
  }
  
  return null;
}

async function simulateCreateResource(data) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return new resource with ID
  return {
    id: Math.floor(Math.random() * 1000),
    ...data,
    version: 1,
    createdAt: new Date().toISOString()
  };
}

async function simulateUpdateResource(id, data) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return updated resource
  return {
    id: parseInt(id),
    ...data,
    updatedAt: new Date().toISOString()
  };
}

async function simulateDeleteResource(id) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Specific ID to simulate error
  if (id === '500') {
    return false;
  }
  
  return true;
}

module.exports = {
  exampleRouter: router,
  exampleController
}; 