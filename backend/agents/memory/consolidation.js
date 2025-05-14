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
    const response = await openai.completions.create({
      model: 'text-davinci-003', // Consider GPT-3.5 or 4 if available and preferred
      prompt,
      max_tokens: 250,
      temperature: 0.5,
    });
    
    const summary = response.choices[0]?.text?.trim() || "Summary generation failed.";
    logger.info({ summaryLength: summary.length }, "Consolidated summary created");
    return summary;
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
 * @param {number} options.days = 90 - Age threshold in days for consolidation
 * @param {number} options.maxToConsolidate = 50 - Max memories to consolidate at once
 * @returns {Promise<Object|null>} The consolidated memory record, or null if none created
 */
async function consolidateMemories(dependencies, userId, options = {}) {
  const { supabase, openai, config, logger, validators } = dependencies;
  const { 
    agentType = null,
    days = 90,
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
      maxToConsolidate
    }, "Starting memory consolidation process");
    
    // Calculate the date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const thresholdISO = thresholdDate.toISOString();
    
    // Fetch old, non-archived memories
    let query = supabase
      .from(config.tableName)
      .select('id, content')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .lt('created_at', thresholdISO)
      .order('created_at', { ascending: true }) // Process oldest first
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
    
    if (!oldMemories || oldMemories.length === 0) {
      logger.info({
        userId,
        agentType,
        days
      }, "No memories older than threshold found for consolidation");
      return null; // Nothing to consolidate
    }
    
    // Extract content for summary generation
    const contentsToSummarize = oldMemories.map(m => m.content);
    const memoryIdsToArchive = oldMemories.map(m => m.id);
    
    // Create consolidated summary
    const summary = await createConsolidatedSummary(openai, contentsToSummarize, logger);
    
    // Store the consolidated summary as a new memory
    const consolidatedMemory = await storeMemory(
      supabase, 
      config, 
      logger, 
      validators, 
      userId, 
      agentType || 'system', // Use 'system' if no agentType specified
      summary, 
      {
        type: 'consolidated_summary',
        consolidatedCount: oldMemories.length,
        oldestMemoryDate: oldMemories[0].created_at, // Assuming ordered query
        newestMemoryDate: oldMemories[oldMemories.length - 1].created_at,
        consolidatedAgentType: agentType // Track which agent type was consolidated
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
    
    logger.info({
      userId,
      agentType,
      consolidatedId: consolidatedMemory.id,
      archivedCount: memoryIdsToArchive.length
    }, "Memory consolidation completed successfully");
    
    return consolidatedMemory;
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