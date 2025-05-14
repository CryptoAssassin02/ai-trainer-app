const { createEmbedding } = require('./embedding');
const { searchVectorsByEmbedding } = require('./utils'); // Assuming searchVectors is a utility

async function retrieveMemory(supabase, config, logger, validators, memoryId, userId) {
  // Validate inputs
  if (!validators.isValidUUID(memoryId)) {
    throw new Error(`Invalid memoryId format: ${memoryId}`);
  }
  
  if (userId && !validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  try {
    logger.info({ memoryId, userId }, "Retrieving memory");
    
    let query = supabase
      .from(config.tableName)
      .select('*')
      .eq('id', memoryId);
      
    // If userId is provided, restrict to that user
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      logger.error({
        memoryId,
        userId,
        error: error.message
      }, "Memory retrieval failed");
      throw new Error(`Memory retrieval failed: ${error.message}`);
    }
    
    if (!data) {
      logger.info({ memoryId, userId }, "Memory not found");
      return null; // Return null if not found
    }
    
    logger.info({ memoryId, userId }, "Memory retrieved successfully");
    return data;
  } catch (error) {
    logger.error({
      memoryId,
      userId,
      error: error.message
    }, "Error retrieving memory");
    throw error;
  }
}

async function getLatestMemory(supabase, config, logger, validators, userId, agentType) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  if (!validators.isValidAgentType(agentType)) {
    throw new Error(`Invalid agent type: ${agentType}`);
  }
  
  try {
    logger.info({ userId, agentType }, "Retrieving latest memory");
    
    const { data, error } = await supabase
      .from(config.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('agent_type', agentType.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      logger.error({
        userId,
        agentType,
        error: error.message
      }, "Latest memory retrieval failed");
      throw new Error(`Latest memory retrieval failed: ${error.message}`);
    }
    
    logger.info({ 
      userId, 
      agentType, 
      found: !!data 
    }, "Latest memory retrieval completed");
    
    return data || null;
  } catch (error) {
    logger.error({
      userId,
      agentType,
      error: error.message
    }, "Error retrieving latest memory");
    throw error;
  }
}

async function searchSimilarMemories(supabase, openai, config, logger, validators, userId, query, options = {}) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  validators.validateMemoryInput(query);
  
  const { 
    threshold = config.similarityThreshold,
    limit = config.maxResults,
    agentType = null,
    metadataFilter = {},
    includeArchived = false,
    planId = null,  // New option to filter by workout plan ID
    logId = null    // New option to filter by workout log ID
  } = options;
  
  try {
    logger.info({
      userId,
      queryLength: query.length,
      threshold,
      limit,
      agentType,
      metadataFilter,
      includeArchived,
      planId,
      logId
    }, "Searching for similar memories");
    
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(openai, query, config.embeddingModel, logger);
    
    // Use the enhanced Supabase function with plan filtering
    const { data, error } = await supabase.rpc('match_agent_memories', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_user_id: userId,
      filter_plan_id: planId  // Pass plan ID to RPC function
    });
    
    // Filter archived results AFTER the RPC call if needed
    let filteredData = data || [];
    if (!includeArchived) {
        filteredData = filteredData.filter(doc => !doc.is_archived);
    }
    
    // Additional filters for agentType and metadata if provided
    if (agentType) {
        filteredData = filteredData.filter(doc => doc.agent_type === agentType.toLowerCase());
    }
    
    // Filter by log ID if provided
    if (logId && validators.isValidUUID(logId)) {
        filteredData = filteredData.filter(doc => doc.workout_log_id === logId);
    }
    
    if (Object.keys(metadataFilter).length > 0) {
        filteredData = filteredData.filter(doc => 
            Object.entries(metadataFilter).every(([key, value]) => 
                doc.metadata?.[key] === value
            )
        );
    }
    
    if (error) {
      logger.error({
        userId,
        error: error.message
      }, "Similar memories search failed");
      throw new Error(`Similar memories search failed: ${error.message}`);
    }
    
    logger.info({ 
      userId, 
      count: filteredData.length 
    }, "Similar memories search completed");
    
    return filteredData;
  } catch (error) {
    logger.error({
      userId,
      error: error.message
    }, "Error searching similar memories");
    throw error;
  }
}

async function getMemoriesByAgentType(supabase, config, logger, validators, userId, agentType, options = {}) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  if (!validators.isValidAgentType(agentType)) {
    throw new Error(`Invalid agent type: ${agentType}`);
  }
  
  const { 
    limit = config.maxResults,
    offset = 0,
    sortBy = 'created_at',
    sortDirection = 'desc',
    includeArchived = false,
    metadataFilter = {},
    planId = null,  // New option for filtering by plan ID
    logId = null    // New option for filtering by log ID
  } = options;
  
  try {
    logger.info({
      userId,
      agentType,
      limit,
      offset,
      sortBy,
      sortDirection,
      includeArchived,
      metadataFilter,
      planId,
      logId
    }, "Retrieving memories by agent type");
    
    let query = supabase
      .from(config.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('agent_type', agentType.toLowerCase());
      
    // Apply plan ID filter if provided
    if (planId && validators.isValidUUID(planId)) {
      query = query.eq('workout_plan_id', planId);
    }
    
    // Apply log ID filter if provided
    if (logId && validators.isValidUUID(logId)) {
      query = query.eq('workout_log_id', logId);
    }
      
    // Apply metadata filter if provided
    if (Object.keys(metadataFilter).length > 0) {
      query = query.match(metadataFilter);
    }
    
    // Filter archived unless explicitly included
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) {
      logger.error({
        userId,
        agentType,
        error: error.message
      }, "Retrieval by agent type failed");
      throw new Error(`Retrieval by agent type failed: ${error.message}`);
    }
    
    logger.info({ 
      userId, 
      agentType, 
      count: data?.length || 0 
    }, "Retrieval by agent type completed");
    
    return data || [];
  } catch (error) {
    logger.error({
      userId,
      agentType,
      error: error.message
    }, "Error retrieving memories by agent type");
    throw error;
  }
}

async function getMemoriesByMetadata(supabase, config, logger, validators, userId, metadataFilter = {}, options = {}) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  if (typeof metadataFilter !== 'object' || metadataFilter === null) {
      throw new Error('metadataFilter must be an object');
  }

  const { 
    limit = config.maxResults,
    offset = 0,
    sortBy = 'created_at',
    sortDirection = 'desc',
    includeArchived = false,
    agentType = null, // Optional agent type filter
    planId = null,    // New option for filtering by plan ID
    logId = null      // New option for filtering by log ID
  } = options;
  
  try {
    logger.info({
      userId,
      metadataFilter,
      limit,
      offset,
      sortBy,
      sortDirection,
      includeArchived,
      agentType,
      planId,
      logId
    }, "Retrieving memories by metadata");
    
    // Use the updated Supabase function with plan and log filtering
    const { data, error } = await supabase.rpc('filter_agent_memories', {
      user_id_param: userId,
      metadata_filter: metadataFilter,
      agent_type_param: agentType,
      plan_id_param: planId,
      log_id_param: logId,
      include_archived: includeArchived,
      limit_param: limit,
      offset_param: offset,
      sort_by_param: sortBy,
      sort_direction_param: sortDirection,
    });

    if (error) {
      logger.error({
        userId,
        metadataFilter,
        error: error.message
      }, "Retrieval by metadata failed");
      throw new Error(`Retrieval by metadata failed: ${error.message}`);
    }
    
    logger.info({ 
      userId, 
      metadataFilter, 
      count: data?.length || 0 
    }, "Retrieval by metadata completed");
    
    return data || [];
  } catch (error) {
    logger.error({
      userId,
      metadataFilter,
      error: error.message
    }, "Error retrieving memories by metadata");
    throw error;
  }
}

async function getMemoriesByWorkoutPlan(supabase, config, logger, validators, userId, planId, options = {}) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  if (!validators.isValidUUID(planId)) {
    throw new Error(`Invalid planId format: ${planId}`);
  }

  const { 
    limit = config.maxResults,
    offset = 0,
    sortBy = 'created_at',
    sortDirection = 'desc',
    includeArchived = false,
    agentType = null // Optional agent type filter
  } = options;
  
  try {
    logger.info({
      userId,
      planId,
      limit,
      offset,
      sortBy,
      sortDirection,
      includeArchived,
      agentType
    }, "Retrieving memories by workout plan");
    
    let query = supabase
      .from(config.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('workout_plan_id', planId);
      
    // Apply agent type filter if provided
    if (agentType) {
      query = query.eq('agent_type', agentType.toLowerCase());
    }
    
    // Filter archived unless explicitly included
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) {
      logger.error({
        userId,
        planId,
        error: error.message
      }, "Retrieval by workout plan failed");
      throw new Error(`Retrieval by workout plan failed: ${error.message}`);
    }
    
    logger.info({ 
      userId, 
      planId, 
      count: data?.length || 0 
    }, "Retrieval by workout plan completed");
    
    return data || [];
  } catch (error) {
    logger.error({
      userId,
      planId,
      error: error.message
    }, "Error retrieving memories by workout plan");
    throw error;
  }
}

module.exports = {
  retrieveMemory,
  getLatestMemory,
  searchSimilarMemories,
  getMemoriesByAgentType,
  getMemoriesByMetadata,
  getMemoriesByWorkoutPlan
}; 