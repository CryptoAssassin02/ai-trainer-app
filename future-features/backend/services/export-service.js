/**
 * @fileoverview Export Service
 * Handles data retrieval and format conversion for data exports
 */

const { createClient } = require('@supabase/supabase-js');
const fastCsv = require('fast-csv');
const { Readable, PassThrough } = require('stream');
const logger = require('../config/logger');
const { DatabaseError, NotFoundError } = require('../utils/errors');
// Use the proper service pattern like other successful services
const { getSupabaseClientWithToken } = require('./supabase');
// Require ExcelJS at the top level
const ExcelJS = require('exceljs');

/**
 * Fetch user data based on dataTypes
 * @param {string} userId - User ID
 * @param {Array<string>} dataTypes - Array of data types to export ['profiles', 'workouts', 'workout_logs']
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} User data organized by type
 */
async function fetchUserData(userId, dataTypes, supabase) {
  logger.debug(`Fetching user data for export: ${dataTypes.join(', ')}`);
  const result = {};

  try {
    // Process requested data types
    const fetchPromises = dataTypes.map(async (type) => {
      switch (type) {
        case 'profiles':
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId);
            
          if (profileError) throw new DatabaseError(`Error fetching profile data: ${profileError.message}`);
          result.profiles = profileData || [];
          break;
          
        case 'workouts':
          const { data: workoutData, error: workoutError } = await supabase
            .from('workout_plans')
            .select('*')
            .eq('user_id', userId);
            
          if (workoutError) throw new DatabaseError(`Error fetching workout data: ${workoutError.message}`);
          result.workouts = workoutData || [];
          break;
          
        case 'workout_logs':
          const { data: logData, error: logError } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('user_id', userId);
            
          if (logError) throw new DatabaseError(`Error fetching workout log data: ${logError.message}`);
          result.workout_logs = logData || [];
          break;
          
        default:
          logger.warn(`Unknown data type requested for export: ${type}`);
      }
    });

    await Promise.all(fetchPromises);
    logger.info(`Successfully fetched user data for export: ${Object.keys(result).join(', ')}`);
    return result;
  } catch (error) {
    logger.error(`Error fetching user data for export: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Sanitize a string for CSV to prevent formula injection
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeForCsv(value) {
  if (typeof value !== 'string') return value;
  // Prefixing with single quote if value starts with =, +, -, @, or tab/newline
  if (/^[=+\-@\t\r\n]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Process object values recursively to handle nested structures
 * @param {Object} obj - Object to process
 * @returns {Object} Processed object with sanitized values
 */
function processObjectForExport(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => processObjectForExport(item));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (typeof value === 'object') {
      if (key === 'plan_data' || key === 'tags' || key === 'goals' || key === 'equipment_required' || key === 'ai_reasoning' || key === 'fitness_goals' || key === 'equipment') {
        // Store these fields as stringified JSON (except medical_conditions which stays as JSONB array)
        result[key] = JSON.stringify(value);
      } else if (key === 'medical_conditions') {
        // Keep medical_conditions as array for JSONB compatibility
        result[key] = value;
      } else {
        result[key] = processObjectForExport(value);
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Generate JSON export
 * @param {string} userId - User ID
 * @param {Array<string>} dataTypes - Array of data types to export
 * @param {string} jwtToken - JWT token for authentication
 * @param {function} fetchFn - Function to fetch user data (for testing/DI).
 * @returns {Promise<Object>} JSON data
 */
async function exportJSON(userId, dataTypes, jwtToken, fetchFn = fetchUserData) {
  logger.info(`Generating JSON export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
  
  if (!jwtToken) {
    logger.error('JWT token is missing for export operation.');
    throw new Error('Authentication token is required.');
  }
  
  // Use the proper service pattern for getting Supabase client
  const supabase = getSupabaseClientWithToken(jwtToken);
  
  try {
    // Use the injected fetch function
    const userData = await fetchFn(userId, dataTypes, supabase);
    return {
      exportDate: new Date().toISOString(),
      userId,
      data: userData
    };
  } catch (error) {
    logger.error(`Error generating JSON export: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generate CSV export with streaming
 * @param {string} userId - User ID
 * @param {Array<string>} dataTypes - Array of data types to export
 * @param {string} jwtToken - JWT token for authentication
 * @param {function} fetchFn - Function to fetch user data.
 * @returns {Promise<stream.Readable>} CSV stream
 */
async function exportCSV(userId, dataTypes, jwtToken, fetchFn = fetchUserData) {
  logger.info(`Generating CSV export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
  
  if (!jwtToken) {
    logger.error('JWT token is missing for CSV export operation.');
    throw new Error('Authentication token is required.');
  }
  
  const supabase = getSupabaseClientWithToken(jwtToken);
  
  // Wrap stream processing in a promise to handle async errors
  return new Promise(async (resolve, reject) => {
      try {
        const userData = await fetchFn(userId, dataTypes, supabase);
        
        const dataStream = new Readable({ objectMode: true });
        dataStream._read = () => {}; 
        const csvStream = fastCsv.format({ headers: true });
        const passThroughStream = new PassThrough();

        // Handle errors on the streams
        let streamError = null;
        const onError = (err) => {
            if (!streamError) { // Prevent multiple rejections
                streamError = err;
                logger.error(`Error during CSV stream processing: ${err.message}`, { error: err });
                // Reject the main promise
                reject(err); 
                // Destroy streams if possible
                dataStream.destroy(err);
                csvStream.destroy(err);
                passThroughStream.destroy(err);
            }
        };

        dataStream.on('error', onError);
        csvStream.on('error', onError);
        passThroughStream.on('error', onError); // Also listen on the final stream

        // Pipe csvStream to passThroughStream first
        csvStream.pipe(passThroughStream);
        
        // Pipe dataStream to csvStream
        dataStream.pipe(csvStream);

        // Process data and push to dataStream
        let rowsAdded = 0;
        for (const type of dataTypes) {
          if (!userData[type] || userData[type].length === 0) continue;
          
          // Process each data item and add to stream
          userData[type].forEach(row => {
            const flatRow = processObjectForExport(row);
            // Add data type as a column for identification
            flatRow.data_type = type;
            // Sanitize all values for CSV
            Object.keys(flatRow).forEach(key => { 
              flatRow[key] = sanitizeForCsv(flatRow[key]); 
            });
            dataStream.push(flatRow);
            rowsAdded++;
          });
        }
        
        // End the source data stream
        dataStream.push(null);
        
        // Resolve with the passThroughStream *once the source is fully processed*
        // We listen for 'finish' on csvStream as data flows dataStream -> csvStream -> passThroughStream
        csvStream.on('finish', () => {
            if (!streamError) { // Only resolve if no error occurred
                logger.info(`CSV export generated successfully with ${rowsAdded} rows`);
                resolve(passThroughStream); 
            }
        });

      } catch (error) {
        // Catch synchronous errors (e.g., from fetchFn or setup)
        logger.error(`Error generating CSV export: ${error.message}`, { error });
        reject(error);
      }
  });
}

/**
 * Generate Excel (XLSX) export with streaming
 * @param {string} userId - User ID
 * @param {Array<string>} dataTypes - Array of data types to export
 * @param {string} jwtToken - JWT token for authentication
 * @param {function} [fetchFn=fetchUserData] - Function to fetch user data (for DI).
 * @returns {Promise<stream.Readable>} XLSX stream
 */
async function exportXLSX(userId, dataTypes, jwtToken, fetchFn = fetchUserData) {
  logger.info(`Generating XLSX export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
  
  if (!jwtToken) {
    logger.error('JWT token is missing for XLSX export operation.');
    throw new Error('Authentication token is required.');
  }
  
  const supabase = getSupabaseClientWithToken(jwtToken);
  
  try {
    // Use the injected fetch function
    const userData = await fetchFn(userId, dataTypes, supabase);
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'trAIner App';
    workbook.lastModifiedBy = 'trAIner App';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add a worksheet for each data type
    for (const type of dataTypes) {
      if (!userData[type] || userData[type].length === 0) continue;
      
      // Create worksheet
      const worksheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1));
      
      // Process the data
      const processedData = userData[type].map(row => processObjectForExport(row));
      
      // Get column headers from first row
      const headers = Object.keys(processedData[0] || {});
      
      // Add headers to worksheet
      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: Math.max(header.length, 10) // Minimum width of 10
      }));
      
      // Add rows to worksheet
      processedData.forEach(row => {
        worksheet.addRow(row);
      });
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF333333' }
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    }
    
    // Create a PassThrough stream (both readable and writable)
    const stream = new PassThrough();
    
    // Write workbook to stream
    workbook.xlsx.write(stream)
      .then(() => {
        logger.info('XLSX export generated successfully');
        stream.end(); // Properly end the stream
      })
      .catch(error => {
        logger.error(`Error writing XLSX to stream: ${error.message}`, { error });
        stream.emit('error', error);
      });
    
    return stream;
  } catch (error) {
    logger.error(`Error generating XLSX export: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Generate PDF export with streaming
 * @param {string} userId - User ID
 * @param {Array<string>} dataTypes - Array of data types to export
 * @param {string} jwtToken - JWT token for authentication
 * @param {function} [fetchFn=fetchUserData] - Function to fetch user data (for DI).
 * @returns {Promise<stream.Readable>} PDF stream
 */
async function exportPDF(userId, dataTypes, jwtToken, fetchFn = fetchUserData) {
  // Require PDFDocument inside the function
  const PDFDocument = require('pdfkit');
  logger.info(`Generating PDF export for user: ${userId}, data types: ${dataTypes.join(', ')}`);
  
  if (!jwtToken) {
    logger.error('JWT token is missing for PDF export operation.');
    throw new Error('Authentication token is required.');
  }
  
  const supabase = getSupabaseClientWithToken(jwtToken);
  
  try {
    // Use the injected fetch function
    const userData = await fetchFn(userId, dataTypes, supabase);
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set up document metadata
    doc.info.Title = 'trAIner Data Export';
    doc.info.Author = 'trAIner App';
    
    // Add title and export info
    doc.fontSize(25).text('trAIner Data Export', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Export Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    // Process each data type
    for (const type of dataTypes) {
      if (!userData[type] || userData[type].length === 0) continue;
      
      // Add section title
      doc.moveDown();
      doc.fontSize(16).text(`${type.charAt(0).toUpperCase() + type.slice(1)}`, { underline: true });
      doc.moveDown();
      
      // Process each item in this data type
      userData[type].forEach((item, index) => {
        // Process the item for display
        const processedItem = processObjectForExport(item);
        
        // Add a header for this item if there are multiple
        if (userData[type].length > 1) {
          doc.fontSize(14).text(`Item ${index + 1}:`, { underline: true });
          doc.moveDown(0.5);
        }
        
        // Add each field
        Object.entries(processedItem).forEach(([key, value]) => {
          const displayValue = value === null ? 'N/A' : 
                               typeof value === 'object' ? JSON.stringify(value) : 
                               String(value);
          
          doc.fontSize(12).text(`${key}: ${displayValue}`, { 
            continued: false,
            width: 500
          });
        });
        
        // Add space between items
        if (index < userData[type].length - 1) {
          doc.moveDown();
        }
      });
      
      // Add page break between sections if not the last section
      if (type !== dataTypes[dataTypes.length - 1]) {
        doc.addPage();
      }
    }
    
    // End the document
    doc.end();
    
    logger.info('PDF export generated successfully');
    return doc;
  } catch (error) {
    logger.error(`Error generating PDF export: ${error.message}`, { error });
    throw error;
  }
}

module.exports = {
  exportJSON,
  exportCSV,
  exportXLSX,
  exportPDF,
  fetchUserData
}; 