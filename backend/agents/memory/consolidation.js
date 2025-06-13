const { storeMemory } = require('./storage');
const { retrieveMemory, getMemoriesByAgentType } = require('./retrieval');

/**
 * Creates a summary of multiple memory contents using OpenAI.
 * @param {Object} openai - OpenAI client instance
 * @param {string[]} contents - Array of memory content strings
 * @param {Object} logger - Logger instance
 * @returns {Promise<string>} Consolidated summary
 */
async function createConsolidatedSummary(openai, contents, logger) {
  if (!contents || contents.length === 0) {
    logger.info("No content provided for consolidation.");
    return "No memories to consolidate.";
  }
  
  logger.info({ count: contents.length }, "Creating consolidated memory summary");
  
  const prompt = `Consolidate the following memories into a single, coherent summary:
  
${contents.map((c, i) => `Memory ${i + 1}:\n${c}`).join('\n\n')}
  
Consolidated Summary:`;
  
  try {
    // Use the OpenAI service's generateChatCompletion method
    const summary = await openai.generateChatCompletion([
      {
        role: 'user',
        content: prompt
      }
    ], {
      model: 'gpt-3.5-turbo',
      max_tokens: 250,
      temperature: 0.5,
    });
    
    const result = summary?.trim() || "Summary generation failed.";
    logger.info({ summaryLength: result.length }, "Consolidated summary created");
    return result;
  } catch (error) {
    logger.error({
      error: error.message
    }, "Error creating consolidated summary");
    throw error;
  }
}

/**
 * Archives a set of memory IDs and links them to a consolidated memory.
 * @param {Object} supabase - Supabase client instance
 * @param {string} tableName - Name of the memory table
 * @param {string[]} memoryIds - Array of memory IDs to archive
 * @param {string} consolidatedId - ID of the consolidated memory
 * @param {Object} logger - Logger instance
 * @returns {Promise<number>} Number of archived memories
 */
async function archiveMemories(supabase, tableName, memoryIds, consolidatedId, logger) {
  if (!memoryIds || memoryIds.length === 0) {
    logger.info("No memory IDs provided for archiving.");
    return 0;
  }
  
  logger.info({
    count: memoryIds.length,
    consolidatedId
  }, "Archiving memories");
  
  try {
    const { count, error } = await supabase
      .from(tableName)
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        consolidated_into: consolidatedId
      })
      .in('id', memoryIds);
      
    if (error) {
      logger.error({
        consolidatedId,
        error: error.message
      }, "Archiving memories failed");
      throw new Error(`Archiving memories failed: ${error.message}`);
    }
    
    logger.info({ 
      count: count || 0, 
      consolidatedId 
    }, "Memories archived successfully");
    
    return count || 0;
  } catch (error) {
    logger.error({
      consolidatedId,
      error: error.message
    }, "Error archiving memories");
    throw error;
  }
}

/**
 * Consolidates older memories for a user and agent type.
 * Fetches old memories, generates a summary, stores it, and archives the originals.
 * @param {Object} dependencies - Dependency object containing supabase, openai, config, logger, validators
 * @param {string} userId - User ID
 * @param {Object} options - Consolidation options
 * @param {string} options.agentType - Agent type to consolidate (optional)
 * @param {number} options.days = 90 - Age threshold in days for consolidation (test uses different options)
 * @param {number} options.maxMemories - Max memories to keep (from test)
 * @param {boolean} options.preserveRecent - Whether to preserve recent memories (from test)
 * @param {number} options.maxToConsolidate = 50 - Max memories to consolidate at once
 * @returns {Promise<Object|null>} Consolidation result with counts, or null if none created
 */
async function consolidateMemories(dependencies, userId, options = {}) {
  const { supabase, openai, config, logger, validators } = dependencies;
  const { 
    agentType = null,
    days = 90,
    maxMemories = null, // New option from test
    preserveRecent = false, // New option from test
    maxToConsolidate = 50
  } = options;
  
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  if (agentType && !validators.isValidAgentType(agentType)) {
    throw new Error(`Invalid agent type: ${agentType}`);
  }
  
  try {
    logger.info({
      userId,
      agentType,
      days,
      maxMemories,
      preserveRecent,
      maxToConsolidate
    }, "Starting memory consolidation process");
    
    // Get all memories for counting
    let countQuery = supabase
      .from(config.tableName)
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_archived', false);
      
    if (agentType) {
      countQuery = countQuery.eq('agent_type', agentType.toLowerCase());
    }
    
    const { count: originalCount, error: countError } = await countQuery;
    
    if (countError) {
      logger.error({
        userId,
        agentType,
        error: countError.message
      }, "Consolidation failed: Error counting memories");
      throw new Error(`Consolidation failed: ${countError.message}`);
    }
    
    if (!originalCount || originalCount === 0) {
      logger.info({
        userId,
        agentType
      }, "No memories found for consolidation");
      return {
        originalCount: 0,
        consolidatedCount: 0,
        memoryReduction: 0
      };
    }
    
    // Determine which memories to consolidate
    let memoriesToConsolidate = [];
    
    if (maxMemories && originalCount > maxMemories) {
      // Test scenario: consolidate excess memories, keeping most recent if preserveRecent is true
      // We need to consolidate enough memories so that final count = maxMemories
      // Final count = (originalCount - consolidatedMemories + 1 summary) should equal maxMemories
      // So: consolidatedMemories = originalCount - maxMemories + 1
      const memoriesToConsolidateCount = originalCount - maxMemories + 1;
      const consolidateCount = Math.min(memoriesToConsolidateCount, maxToConsolidate);
      
      let query = supabase
        .from(config.tableName)
        .select('id, content, created_at')
        .eq('user_id', userId)
        .eq('is_archived', false);
        
      if (agentType) {
        query = query.eq('agent_type', agentType.toLowerCase());
      }
      
      // If preserveRecent, get oldest memories; otherwise get any excess
      query = query.order('created_at', { ascending: !preserveRecent })
        .limit(consolidateCount);
      
      const { data: memories, error: fetchError } = await query;
      
      if (fetchError) {
        logger.error({
          userId,
          agentType,
          error: fetchError.message
        }, "Consolidation failed: Error fetching memories to consolidate");
        throw new Error(`Consolidation failed: ${fetchError.message}`);
      }
      
      memoriesToConsolidate = memories || [];
    } else {
      // Original scenario: consolidate old memories based on days threshold
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);
      const thresholdISO = thresholdDate.toISOString();
      
      let query = supabase
        .from(config.tableName)
        .select('id, content, created_at')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .lt('created_at', thresholdISO)
        .order('created_at', { ascending: true })
        .limit(maxToConsolidate);
        
      if (agentType) {
        query = query.eq('agent_type', agentType.toLowerCase());
      }
      
      const { data: oldMemories, error: fetchError } = await query;
      
      if (fetchError) {
        logger.error({
          userId,
          agentType,
          error: fetchError.message
        }, "Consolidation failed: Error fetching old memories");
        throw new Error(`Consolidation failed: ${fetchError.message}`);
      }
      
      memoriesToConsolidate = oldMemories || [];
    }
    
    if (memoriesToConsolidate.length === 0) {
      logger.info({
        userId,
        agentType,
        originalCount
      }, "No memories qualify for consolidation");
      return {
        originalCount,
        consolidatedCount: originalCount,
        memoryReduction: 0
      };
    }
    
    // Extract content for summary generation
    const contentsToSummarize = memoriesToConsolidate.map(m => m.content);
    const memoryIdsToArchive = memoriesToConsolidate.map(m => m.id);
    
    // Create consolidated summary
    const summary = await createConsolidatedSummary(openai, contentsToSummarize, logger);
    
    // Store the consolidated summary as a new memory
    const consolidatedMemory = await storeMemory(
      supabase,           // supabase
      openai,             // openai (was incorrectly config before)
      config,             // config  
      logger,             // logger
      validators,         // validators
      userId,             // userId
      agentType || 'system', // agentType
      summary,            // content
      {                   // metadata
        type: 'consolidated_summary',
        consolidatedCount: memoriesToConsolidate.length,
        oldestMemoryDate: memoriesToConsolidate[0]?.created_at,
        newestMemoryDate: memoriesToConsolidate[memoriesToConsolidate.length - 1]?.created_at,
        consolidatedAgentType: agentType
      }
    );
    
    if (!consolidatedMemory) {
      logger.error({
        userId,
        agentType,
      }, "Consolidation failed: Could not store the summary memory");
      throw new Error("Consolidation failed: Summary storage error");
    }
    
    // Archive the original memories, linking them to the consolidated one
    await archiveMemories(supabase, config.tableName, memoryIdsToArchive, consolidatedMemory.id, logger);
    
    // Calculate final counts
    const consolidatedCount = originalCount - memoriesToConsolidate.length + 1; // Remove old + add 1 summary
    const memoryReduction = originalCount - consolidatedCount;
    
    logger.info({
      userId,
      agentType,
      consolidatedId: consolidatedMemory.id,
      originalCount,
      consolidatedCount,
      memoryReduction
    }, "Memory consolidation completed successfully");
    
    // Return the expected format for tests
    return {
      originalCount,
      consolidatedCount,
      memoryReduction
    };
  } catch (error) {
    logger.error({
      userId,
      agentType,
      error: error.message
    }, "Error during memory consolidation");
    throw error;
  }
}

/**
 * Prunes (permanently deletes) very old memories for a user.
 * Typically runs after consolidation.
 * @param {Object} dependencies - Dependency object
 * @param {string} userId - User ID
 * @param {number} days = 180 - Age threshold in days for pruning
 * @returns {Promise<number>} Number of pruned memories
 */
async function pruneOldMemories(dependencies, userId, days = 180) {
  const { supabase, config, logger, validators } = dependencies;
  
  // Validate input
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  try {
    logger.info({ userId, days }, "Starting memory pruning process");
    
    // Calculate the date threshold for pruning (older than consolidation)
    const pruneThresholdDate = new Date();
    pruneThresholdDate.setDate(pruneThresholdDate.getDate() - days);
    const pruneThresholdISO = pruneThresholdDate.toISOString();
    
    // Delete memories that are archived AND older than the prune threshold
    const { count, error } = await supabase
      .from(config.tableName)
      .delete()
      .eq('user_id', userId)
      .eq('is_archived', true)
      .lt('archived_at', pruneThresholdISO); // Prune based on archive time
      
    if (error) {
      logger.error({
        userId,
        error: error.message
      }, "Memory pruning failed");
      throw new Error(`Memory pruning failed: ${error.message}`);
    }
    
    logger.info({ 
      userId, 
      count: count || 0 
    }, "Memory pruning completed successfully");
    
    return count || 0;
  } catch (error) {
    logger.error({
      userId,
      error: error.message
    }, "Error during memory pruning");
    throw error;
  }
}

module.exports = {
  consolidateMemories,
  pruneOldMemories,
  // Internal helpers exported for potential testing, but not typically used directly
  createConsolidatedSummary,
  archiveMemories, 
}; 