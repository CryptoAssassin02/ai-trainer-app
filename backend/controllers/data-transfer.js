/**
 * @fileoverview Data Transfer Controller
 * Handles HTTP requests for data export and import operations
 */

const exportService = require('../services/export-service');
const importService = require('../services/import-service');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const { ValidationError, DatabaseError, NotFoundError } = require('../utils/errors');

/**
 * Process export requests and stream results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function exportData(req, res, next) {
  try {
    const userId = req.user?.id;
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    if (!userId || !jwtToken) {
      logger.warn('exportData called without userId or jwtToken in request context.');
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required.' 
      });
    }
    
    const { format, dataTypes } = req.body;
    
    if (!format) {
      return res.status(400).json({
        status: 'error',
        message: 'Export format is required.'
      });
    }
    
    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one data type must be specified for export.'
      });
    }
    
    // Validate data types
    const validDataTypes = ['profiles', 'workouts', 'workout_logs'];
    const invalidTypes = dataTypes.filter(type => !validDataTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid data types: ${invalidTypes.join(', ')}`
      });
    }
    
    logger.info(`Exporting ${format} data for user ${userId}, types: ${dataTypes.join(', ')}`);
    
    // Set filename based on format and timestamp
    const timestamp = Date.now();
    let filename = `trAIner-export-${timestamp}`;
    let stream;
    
    // Process based on format
    switch (format.toLowerCase()) {
      case 'json':
        const data = await exportService.exportJSON(userId, dataTypes, jwtToken);
        res.setHeader('Content-Type', 'application/json');
        filename += '.json';
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).json(data);
        
      case 'csv':
        stream = await exportService.exportCSV(userId, dataTypes, jwtToken);
        res.setHeader('Content-Type', 'text/csv');
        filename += '.csv';
        break;
        
      case 'xlsx':
        stream = await exportService.exportXLSX(userId, dataTypes, jwtToken);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        filename += '.xlsx';
        break;
        
      case 'pdf':
        stream = await exportService.exportPDF(userId, dataTypes, jwtToken);
        res.setHeader('Content-Type', 'application/pdf');
        filename += '.pdf';
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported export format: ${format}`
        });
    }
    
    // Set download headers for streaming formats
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream response and handle errors
    stream.on('error', (error) => {
      logger.error(`Error streaming ${format} export: ${error.message}`, { error });
      // If headers not sent yet, send error response
      if (!res.headersSent) {
        return res.status(500).json({
          status: 'error',
          message: `Error generating ${format} export: ${error.message}`
        });
      }
      // Otherwise, just end the response
      res.end();
    });
    
    stream.pipe(res);
    
  } catch (error) {
    logger.error(`Error in exportData: ${error.message}`, { error });
    
    // Only send response if headers not sent yet
    if (!res.headersSent) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ 
          status: 'error', 
          message: error.message 
        });
      } else if (error instanceof DatabaseError) {
        return res.status(500).json({ 
          status: 'error', 
          message: 'Failed to export data due to a database issue.' 
        });
      } else {
        return res.status(500).json({ 
          status: 'error', 
          message: 'Failed to export data due to an internal error.' 
        });
      }
    }
    
    next(error);
  }
}

/**
 * Handle file uploads and process imports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function importData(req, res, next) {
  let tempFilePath = null;
  
  try {
    const userId = req.user?.id;
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    if (!userId || !jwtToken) {
      logger.warn('importData called without userId or jwtToken in request context.');
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required.' 
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded.'
      });
    }
    
    const uploadedFile = req.file;
    logger.info(`Processing import for user ${userId}, file: ${uploadedFile.originalname}, type: ${uploadedFile.mimetype}`);
    
    let result;
    
    // Process based on file type
    switch (uploadedFile.mimetype) {
      case 'application/json':
        // Read JSON file content
        const jsonContent = fs.readFileSync(uploadedFile.path, 'utf8');
        let parsedJson;
        
        try {
          parsedJson = JSON.parse(jsonContent);
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid JSON file format.'
          });
        }
        
        // Clean up the temporary file
        fs.unlinkSync(uploadedFile.path);
        
        // Process the JSON data
        result = await importService.importJSON(userId, parsedJson, jwtToken);
        break;
        
      case 'text/csv':
        // Create read stream for CSV file
        const csvStream = fs.createReadStream(uploadedFile.path);
        tempFilePath = uploadedFile.path;
        
        // Process the CSV data
        result = await importService.importCSV(userId, csvStream, jwtToken);
        
        // Clean up the temporary file
        fs.unlinkSync(uploadedFile.path);
        tempFilePath = null;
        break;
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        // Pass the file path to XLSX importer
        tempFilePath = uploadedFile.path;
        
        // Process the XLSX data (file will be deleted by the service)
        result = await importService.importXLSX(userId, uploadedFile.path, jwtToken);
        tempFilePath = null;
        break;
        
      default:
        // Clean up the temporary file
        fs.unlinkSync(uploadedFile.path);
        
        return res.status(400).json({
          status: 'error',
          message: `Unsupported file type: ${uploadedFile.mimetype}`
        });
    }
    
    // Return success response with import results
    return res.status(200).json({
      status: 'success',
      message: 'Data imported successfully.',
      data: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        errors: result.errors.slice(0, 10) // Limit number of returned errors
      }
    });
    
  } catch (error) {
    logger.error(`Error in importData: ${error.message}`, { error });
    
    // Clean up temporary file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        logger.warn(`Error cleaning up temporary file: ${cleanupError.message}`);
      }
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        status: 'error', 
        message: error.message,
        errors: error.errors || [error.message]
      });
    } else if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to import data due to a database issue.' 
      });
    } else {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to import data due to an internal error.' 
      });
    }
  }
}

module.exports = {
  exportData,
  importData
}; 