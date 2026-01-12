const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./config/logger');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const directories = [
  'https://exrx.net/Lists/ExList/ChestWt',
  'https://exrx.net/Lists/ExList/BackWt',
  'https://exrx.net/Lists/ExList/ShouldWt',
  'https://exrx.net/Lists/ExList/ArmWt',
  'https://exrx.net/Lists/ExList/ForeArmWt',
  'https://exrx.net/Lists/ExList/ThighWt',
  'https://exrx.net/Lists/ExList/HamWt',
  'https://exrx.net/Lists/ExList/CalfWt',
  'https://exrx.net/Lists/ExList/WaistWt',
  'https://exrx.net/Lists/ExList/NeckWt',
  'https://exrx.net/Lists/ExList/HipWt'
];

// Add delay function to prevent rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry mechanism for network failures
async function withRetry(fn, retries = 3, delayMs = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    logger.warn(`Retrying operation after failure: ${error.message}`);
    await delay(delayMs);
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

// Format relative URLs correctly
function formatVideoUrl(url) {
  if (!url) return null;
  
  // Check if the URL is already absolute
  if (url.startsWith('http')) return url;
  
  // Handle various relative URL formats
  if (url.startsWith('/')) {
    return `https://exrx.net${url}`;
  } else {
    return `https://exrx.net/${url}`;
  }
}

(async () => {
  try {
    logger.info('Starting ExRx content enhancement for exercises');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    let allExercises = [];
    let directoryCount = 0;

    // First pass: collect all exercises from directories
    for (const dir of directories) {
      directoryCount++;
      logger.info(`Processing directory ${directoryCount}/${directories.length}: ${dir}`);
      
      await withRetry(async () => {
        await page.goto(dir, { waitUntil: 'networkidle2', timeout: 60000 });
        
        const exercises = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.col-sm-6 ul li a'))
            .map(a => ({ name: a.innerText.trim(), url: a.href }));
        });
        
        logger.info(`Found ${exercises.length} exercises in directory`);
        allExercises = allExercises.concat(exercises);
      });
      
      // Add a delay between directory requests to avoid rate limiting
      await delay(2000);
    }

    logger.info(`Found ${allExercises.length} total exercises across all directories`);
    
    // Process all exercises
    const exerciseLimit = allExercises.length;
    allExercises = allExercises.slice(0, exerciseLimit);
    
    logger.info(`Will process ${allExercises.length} exercises (limit: ${exerciseLimit})`);
    
    // Statistics tracking
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    let startTime = Date.now();

    // Second pass: visit each exercise page and extract data
    for (let i = 0; i < allExercises.length; i++) {
      const exercise = allExercises[i];
      logger.info(`Processing exercise ${i+1}/${allExercises.length}: ${exercise.name}`);
      
      try {
        await withRetry(async () => {
          await page.goto(exercise.url, { waitUntil: 'networkidle2', timeout: 60000 });
          
          // Extract description and video
          const data = await page.evaluate(() => {
            const description = document.querySelector('#description')?.innerText || null;
            const videoUrl = document.querySelector('video source')?.src || null;
            return { description, videoUrl };
          });
          
          // Skip if no useful data found
          if (!data.description && !data.videoUrl) {
            logger.warn(`No useful data found for ${exercise.name}, skipping`);
            skippedCount++;
            return;
          }
          
          // Prepare update data - only include fields that have values
          const updateData = {
            exercise_name: exercise.name.toLowerCase()
          };
          
          if (data.description) {
            updateData.description = data.description;
          }
          
          if (data.videoUrl) {
            updateData.tutorial_link = formatVideoUrl(data.videoUrl);
          }
          
          // Upsert to Supabase
          const { error } = await supabase
            .from('exercises')
            .upsert(updateData, { onConflict: 'exercise_name' });

          if (error) {
            throw new Error(`Error upserting ${exercise.name}: ${error.message}`);
          }
          
          logger.info(`Successfully enhanced: ${exercise.name}`);
          successCount++;
        });
      } catch (err) {
        logger.error(`Failed to process ${exercise.name}: ${err.message}`);
        failureCount++;
      }
      
      // Calculate and log progress
      if ((i + 1) % 10 === 0 || i === allExercises.length - 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = (elapsed / (i + 1)) * (allExercises.length - i - 1);
        logger.info(`Progress: ${i+1}/${allExercises.length} (${Math.round((i+1)/allExercises.length*100)}%)`);
        logger.info(`Estimated time remaining: ${Math.round(remaining/60)} minutes ${Math.round(remaining%60)} seconds`);
      }
      
      // Add a delay between requests to avoid rate limiting
      await delay(1500);
    }

    // Log summary statistics
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    logger.info('===== ENHANCEMENT COMPLETE =====');
    logger.info(`Total exercises processed: ${allExercises.length}`);
    logger.info(`Successfully enhanced: ${successCount}`);
    logger.info(`Failed: ${failureCount}`);
    logger.info(`Skipped (no data): ${skippedCount}`);
    logger.info(`Total time: ${Math.floor(totalTime/60)} minutes ${totalTime%60} seconds`);
    
    await browser.close();
    
  } catch (err) {
    logger.error(`Scraping process failed: ${err.message}`);
    if (err.stack) logger.error(err.stack);
  }
})();