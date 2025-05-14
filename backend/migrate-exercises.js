const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const JSONStream = require('JSONStream');
const { Writable } = require('stream');

// Ensure the path to .env is correct relative to where the script is run
// If run from the root: require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// If run from backend: require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Use the service role key for admin access to bypass RLS
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BATCH_SIZE = 100; // Process 100 exercises per batch - adjust as needed
const exercisesFilePath = path.resolve(__dirname, 'data/exercises.json');
const logger = require('./config/logger'); // Use the shared logger

async function migrateExercises() {
  logger.info(`Starting exercise migration from ${exercisesFilePath}`);
  let exerciseBuffer = [];
  let totalProcessed = 0;
  let totalMigrated = 0;
  let totalFailed = 0;

  const fileStream = fs.createReadStream(exercisesFilePath, { encoding: 'utf8' });
  // Assuming the JSON is an array of objects: [*]
  const jsonStream = JSONStream.parse('*'); 

  const processingStream = new Writable({
    objectMode: true, // Expect objects from JSONStream
    async write(exercise, encoding, callback) {
      try {
        // Map the exercise data to the expected Supabase table schema
        const formattedExercise = {
          // Ensure column names match your Supabase table
          exercise_name: exercise.name?.toLowerCase() || null,
          force_type: exercise.force || null, // Example column name
          level: exercise.level || null,
          mechanic: exercise.mechanic || null,
          equipment: exercise.equipment || null,
          primary_muscles: exercise.primaryMuscles || [],
          secondary_muscles: exercise.secondaryMuscles || [],
          instructions: exercise.instructions || [],
          category: exercise.category || null,
          image_urls: exercise.images?.map(img => `/images/${img}`) || [], // Example: Construct path
          external_id: exercise.id || null // Store the original ID if needed
        };

        // Basic validation (optional but recommended)
        if (!formattedExercise.exercise_name) {
           logger.warn(`Skipping exercise due to missing name: ${JSON.stringify(exercise).substring(0,100)}`);
           return callback(); // Skip this record
        }

        exerciseBuffer.push(formattedExercise);
        totalProcessed++;

        if (exerciseBuffer.length >= BATCH_SIZE) {
          logger.info(`Processing batch of ${exerciseBuffer.length} exercises (Total processed: ${totalProcessed})...`);
          const currentBatch = [...exerciseBuffer]; // Copy buffer
          exerciseBuffer = []; // Clear buffer for next batch
          const { data, error } = await supabase
             .from('exercises') // Ensure this table name is correct
             .upsert(currentBatch, { onConflict: 'exercise_name' }); // Ensure 'exercise_name' is your unique constraint column

          if (error) {
            logger.error(`Error migrating batch: ${error.message}`, { details: error.details });
            totalFailed += currentBatch.length;
            // Decide how to handle batch errors: skip, retry, stop? 
            // For simplicity, we log and continue here.
          } else {
            logger.info(`Successfully migrated batch. Records affected (approx): ${data ? data.length : currentBatch.length}`);
            totalMigrated += currentBatch.length; // Assuming upsert affects all in batch on success
          }
        }
        callback(); // Signal that processing for this chunk is done
      } catch (streamError) {
        logger.error(`Error processing exercise chunk: ${streamError.message}`, { stack: streamError.stack });
        callback(streamError); // Pass error to end the stream
      }
    },
    async final(callback) {
         // Process any remaining exercises in the buffer
         if (exerciseBuffer.length > 0) {
           logger.info(`Processing final batch of ${exerciseBuffer.length} exercises...`);
           const { data, error } = await supabase
             .from('exercises')
             .upsert(exerciseBuffer, { onConflict: 'exercise_name' });

           if (error) {
             logger.error(`Error migrating final batch: ${error.message}`, { details: error.details });
             totalFailed += exerciseBuffer.length;
           } else {
             logger.info(`Successfully migrated final batch. Records affected (approx): ${data ? data.length : exerciseBuffer.length}`);
             totalMigrated += exerciseBuffer.length;
           }
         }
         logger.info('--- Migration Summary ---');
         logger.info(`Total Exercises Processed: ${totalProcessed}`);
         logger.info(`Total Exercises Migrated (approx): ${totalMigrated}`);
         logger.info(`Total Exercises Failed (approx): ${totalFailed}`);
         logger.info('--- Migration Complete ---');
         callback(); // Signal end of stream processing
    }
  });

  // Pipe the streams together
  fileStream.pipe(jsonStream).pipe(processingStream)
    .on('finish', () => {
      logger.info('File stream finished.');
    })
    .on('error', (error) => {
      logger.error(`Migration failed during streaming: ${error.message}`);
    });
}

migrateExercises().catch(err => {
    logger.error(`Unhandled error during migration script execution: ${err.message}`, { stack: err.stack });
});