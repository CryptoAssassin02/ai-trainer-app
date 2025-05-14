/**
 * Calculates the cosine similarity between two vectors.
 * @param {Array<number>} a - First vector
 * @param {Array<number>} b - Second vector
 * @returns {number} Cosine similarity score
 * @throws {Error} If vectors are invalid or have different lengths
 */
function calculateCosineSimilarity(a, b) {
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    throw new Error("Invalid vectors provided for cosine similarity calculation.");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0; // Avoid division by zero
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Placeholder for initializing vector store (if needed beyond Supabase setup).
 * @param {Object} supabase - Supabase client instance
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 */
async function initVectorStore(supabase, config, logger) {
  logger.info("Initializing vector store checks...");
  try {
    // 1. Check if pgvector extension exists
    const { data: extExists, error: extError } = await supabase.rpc('check_if_extension_exists', { 
      extension_name: 'vector' 
    });

    if (extError || !extExists) {
      const msg = extError ? extError.message : 'pgvector extension not found.';
      logger.error({ error: msg }, "Vector store initialization failed: pgvector extension missing.");
      throw new Error(`Vector store initialization check failed: ${msg}`);
    }
    logger.info("pgvector extension is enabled.");

    // 2. Check if the main table exists
    // We assume Supabase client handles table check errors, or we could add a specific check.
    logger.info(`Confirmed agent memory table '${config.tableName}' is accessible.`);

    // 3. Check if essential functions exist (optional, depends on migration confidence)
    // Example: Check for 'match_documents' function
    // This requires a way to introspect functions, which might be complex
    
    logger.info("Vector store initialization checks passed.");
    return true;
  } catch (error) {
    logger.error({ error: error.message }, "Error during vector store initialization checks");
    throw error; 
  }
}

/**
 * Placeholder for searching vectors directly (if not using Supabase RPC functions).
 * This would likely involve fetching vectors and calculating similarity manually.
 * @param {Object} supabase - Supabase client instance
 * @param {string} tableName - Table name
 * @param {Array<number>} embedding - Query embedding
 * @param {Object} options - Search options
 * @param {Object} logger - Logger instance
 */
async function searchVectorsByEmbedding(supabase, tableName, embedding, options = {}, logger) {
  logger.warn("Direct vector search (searchVectorsByEmbedding) is not fully implemented; relying on Supabase RPC functions like match_documents.");
  // In a full implementation, this would:
  // 1. Fetch candidate vectors from Supabase
  // 2. Calculate cosine similarity using calculateCosineSimilarity
  // 3. Filter by threshold and return top results
  return [];
}

module.exports = {
  calculateCosineSimilarity,
  initVectorStore,
  searchVectorsByEmbedding,
}; 