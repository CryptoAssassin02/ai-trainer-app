const { createEmbedding } = require('./embedding');

async function storeMemory(supabase, openai, config, logger, validators, userId, agentType, content, metadata = {}) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  if (!validators.isValidAgentType(agentType)) {
    throw new Error(`Invalid agent type: ${agentType}`);
  }
  
  validators.validateMemoryInput(content);
  
  try {
    logger.info({
      userId,
      agentType,
      contentType: typeof content
    }, "Storing memory");
    
    // Normalize content to string for storage
    const contentString = typeof content === 'object' 
      ? JSON.stringify(content) 
      : content;
    
    // Generate embedding for semantic search
    const embedding = await createEmbedding(openai, contentString, config.embeddingModel, logger);
    
    // Extract workout plan and log IDs from metadata if present
    const workoutPlanId = metadata.planId || metadata.workout_plan_id || metadata.workoutPlanId || null;
    const workoutLogId = metadata.logId || metadata.workout_log_id || metadata.workoutLogId || null;
    
    // Extract type from metadata for database column (required field)
    const memoryType = metadata.type || 'memory'; // Default to 'memory' if not specified
    
    // Prepare record for insertion
    const memoryRecord = {
      user_id: userId,
      agent_type: agentType.toLowerCase(),
      type: memoryType, // Set the required type field
      content: contentString,
      embedding,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      is_archived: false,
      // Add explicit relationship columns if IDs are present and valid
      workout_plan_id: workoutPlanId && validators.isValidUUID(workoutPlanId) ? workoutPlanId : null,
      workout_log_id: workoutLogId && validators.isValidUUID(workoutLogId) ? workoutLogId : null
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from(config.tableName)
      .insert(memoryRecord)
      .select();
    
    if (error) {
      logger.error({
        userId,
        agentType,
        error: error.message
      }, "Memory storage failed");
      throw new Error(`Memory storage failed: ${error.message}`);
    }
    
    logger.info({
      userId,
      agentType,
      memoryId: data?.[0]?.id,
      workoutPlanId: memoryRecord.workout_plan_id,
      workoutLogId: memoryRecord.workout_log_id
    }, "Memory stored successfully");
    
    return data?.[0] || null;
  } catch (error) {
    logger.error({
      userId,
      agentType,
      error: error.message
    }, "Error storing memory");
    throw error;
  }
}

async function storeAgentResult(supabase, openai, config, logger, validators, userId, agentType, result) {
  logger.info({
    userId,
    agentType
  }, "Storing agent result");
  
  return storeMemory(supabase, openai, config, logger, validators, userId, agentType, result, { 
    type: 'agent_result',
    timestamp: new Date().toISOString()
  });
}

async function storeUserFeedback(supabase, config, logger, validators, userId, memoryId, feedback) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  if (!validators.isValidUUID(memoryId)) {
    throw new Error(`Invalid memoryId format: ${memoryId}`);
  }
  
  validators.validateMemoryInput(feedback);
  
  try {
    logger.info({
      userId,
      memoryId,
      feedbackType: typeof feedback
    }, "Storing user feedback");
    
    // Check if the original memory exists
    const { data: originalMemory, error: fetchError } = await supabase
      .from(config.tableName)
      .select('id, workout_plan_id, workout_log_id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (fetchError || !originalMemory) {
      const msg = fetchError ? fetchError.message : 'Original memory not found';
      logger.error({
        userId,
        memoryId,
        error: msg
      }, "Feedback storage failed: Original memory lookup error");
      throw new Error(`Feedback storage failed: ${msg}`);
    }
    
    // Store feedback as a separate memory linked to the original
    const feedbackContent = typeof feedback === 'object' 
      ? JSON.stringify(feedback) 
      : feedback;
      
    const feedbackRecord = {
      user_id: userId,
      agent_type: 'system', // Feedback is system-related
      type: 'user_feedback', // Set the required type field
      content: feedbackContent,
      metadata: {
        type: 'user_feedback',
        relatedMemoryId: memoryId,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_archived: false,
      // Preserve relationships to workout entities from original memory
      workout_plan_id: originalMemory.workout_plan_id,
      workout_log_id: originalMemory.workout_log_id
    };
    
    const { data, error } = await supabase
      .from(config.tableName)
      .insert(feedbackRecord)
      .select();
      
    if (error) {
      logger.error({
        userId,
        memoryId,
        error: error.message
      }, "Feedback storage failed");
      throw new Error(`Feedback storage failed: ${error.message}`);
    }
    
    logger.info({
      userId,
      memoryId,
      feedbackId: data?.[0]?.id
    }, "User feedback stored successfully");
    
    return data?.[0] || null;
  } catch (error) {
    logger.error({
      userId,
      memoryId,
      error: error.message
    }, "Error storing user feedback");
    throw error;
  }
}

async function storeSystemEvent(supabase, config, logger, validators, userId, eventType, eventData) {
  // Validate inputs
  if (!validators.isValidUUID(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }
  
  validators.validateMemoryInput(eventType); // Reuse for event type
  
  try {
    logger.info({
      userId,
      eventType
    }, "Storing system event");
    
    const eventContent = typeof eventData === 'object' 
      ? JSON.stringify(eventData) 
      : eventData;
      
    const eventRecord = {
      user_id: userId,
      agent_type: 'system', // System events
      type: 'system_event', // Set the required type field
      content: eventContent,
      metadata: {
        type: 'system_event',
        eventType,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_archived: false
    };
    
    const { data, error } = await supabase
      .from(config.tableName)
      .insert(eventRecord)
      .select();
      
    if (error) {
      logger.error({
        userId,
        eventType,
        error: error.message
      }, "System event storage failed");
      throw new Error(`System event storage failed: ${error.message}`);
    }
    
    logger.info({
      userId,
      eventType,
      eventId: data?.[0]?.id
    }, "System event stored successfully");
    
    return data?.[0] || null;
  } catch (error) {
    logger.error({
      userId,
      eventType,
      error: error.message
    }, "Error storing system event");
    throw error;
  }
}

module.exports = {
  storeMemory,
  storeAgentResult,
  storeUserFeedback,
  storeSystemEvent,
}; 