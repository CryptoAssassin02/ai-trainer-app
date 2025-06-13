/**
 * Creates a vector embedding for given content using OpenAI.
 * @param {Object} openai - OpenAI service instance (our custom OpenAIService)
 * @param {string} content - Text content to embed
 * @param {string} model - Embedding model name
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array<number>>} Embedding vector
 */
async function createEmbedding(openai, content, model, logger) {
  if (!content) {
    logger.warn("Attempted to create embedding for empty content.");
    return null; // Or handle as appropriate
  }
  
  try {
    logger.info({ model, contentLength: content.length }, "Creating embedding");
    
    // Use our OpenAIService's generateEmbedding method instead of direct client access
    const embedding = await openai.generateEmbedding(content, { model });
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Embedding generation failed: No valid embedding returned");
    }
    
    logger.info({ model, dimensions: embedding.length }, "Embedding created successfully");
    return embedding;
  } catch (error) {
    logger.error({
      model,
      error: error.message
    }, "Error creating embedding");
    throw error;
  }
}

module.exports = {
  createEmbedding,
}; 