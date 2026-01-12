const { calculateCosineSimilarity, initVectorStore, searchVectorsByEmbedding } = require('../../../agents/memory/utils');
const { SupabaseClient } = require('@supabase/supabase-js'); // Used for type hinting

describe('Memory Utils', () => {
  let mockSupabase;
  let mockConfig; // Will be a simple object
  let mockLogger; // Will be a simple object with jest.fn()

  beforeEach(() => {
    // Mock Supabase client with rpc method
    mockSupabase = {
      rpc: jest.fn(),
    };
    // Create mock config object
    mockConfig = {
      tableName: 'agent_memory_test', // Use a test table name
      embeddingModel: 'text-embedding-ada-002',
    };
    // Create mock logger object
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(), // Ensure debug is mocked if used
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCosineSimilarity', () => {
    test('should throw error for invalid vector a', () => {
      expect(() => calculateCosineSimilarity(null, [1, 2])).toThrow('Invalid vectors provided for cosine similarity calculation.');
      expect(() => calculateCosineSimilarity(undefined, [1, 2])).toThrow('Invalid vectors provided for cosine similarity calculation.');
      expect(() => calculateCosineSimilarity({}, [1, 2])).toThrow('Invalid vectors provided for cosine similarity calculation.');
    });

    test('should throw error for invalid vector b', () => {
      expect(() => calculateCosineSimilarity([1, 2], null)).toThrow('Invalid vectors provided for cosine similarity calculation.');
      expect(() => calculateCosineSimilarity([1, 2], undefined)).toThrow('Invalid vectors provided for cosine similarity calculation.');
      expect(() => calculateCosineSimilarity([1, 2], {})).toThrow('Invalid vectors provided for cosine similarity calculation.');
    });

    test('should throw error for vectors of different lengths', () => {
      expect(() => calculateCosineSimilarity([1, 2], [1, 2, 3])).toThrow('Invalid vectors provided for cosine similarity calculation.');
    });

    test('should throw error for zero-length vectors', () => {
      expect(() => calculateCosineSimilarity([], [])).toThrow('Invalid vectors provided for cosine similarity calculation.');
    });

    test('should return 0 if magnitude of a is zero', () => {
      expect(calculateCosineSimilarity([0, 0], [1, 1])).toBe(0);
    });

    test('should return 0 if magnitude of b is zero', () => {
      expect(calculateCosineSimilarity([1, 1], [0, 0])).toBe(0);
    });

    test('should return 0 if both magnitudes are zero', () => {
      expect(calculateCosineSimilarity([0, 0], [0, 0])).toBe(0);
    });

    test('should return 1 for identical vectors', () => {
      expect(calculateCosineSimilarity([1, 1], [1, 1])).toBeCloseTo(1);
      expect(calculateCosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
      expect(calculateCosineSimilarity([-1, -2], [-1, -2])).toBeCloseTo(1);
    });

    test('should return 0 for orthogonal vectors', () => {
      expect(calculateCosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
      expect(calculateCosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
    });

    test('should return -1 for opposite vectors', () => {
      expect(calculateCosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1);
      expect(calculateCosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1);
    });

    test('should return correct similarity for general case', () => {
      const v1 = [1, 2, 3];
      const v2 = [4, 5, 6];
      // dotProduct = 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      // magnitudeA = sqrt(1^2 + 2^2 + 3^2) = sqrt(1 + 4 + 9) = sqrt(14)
      // magnitudeB = sqrt(4^2 + 5^2 + 6^2) = sqrt(16 + 25 + 36) = sqrt(77)
      // similarity = 32 / (sqrt(14) * sqrt(77)) = 32 / sqrt(1078)
      // sqrt(1078) approx 32.8329
      // similarity approx 32 / 32.8329 = 0.9746
      expect(calculateCosineSimilarity(v1, v2)).toBeCloseTo(0.9746, 4);

      const v3 = [3, 4, 0]; // Example from Wikipedia
      const v4 = [4, 3, 0];
      // dot = 12 + 12 + 0 = 24
      // magA = sqrt(9+16) = 5
      // magB = sqrt(16+9) = 5
      // sim = 24 / (5*5) = 24 / 25 = 0.96
      expect(calculateCosineSimilarity(v3, v4)).toBeCloseTo(0.96);
    });
  });

  describe('initVectorStore', () => {
    test('should return true and log success when extension exists', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await initVectorStore(mockSupabase, mockConfig, mockLogger);

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_if_extension_exists', { extension_name: 'vector' });
      expect(mockLogger.info).toHaveBeenCalledWith("Initializing vector store checks...");
      expect(mockLogger.info).toHaveBeenCalledWith("pgvector extension is enabled.");
      expect(mockLogger.info).toHaveBeenCalledWith("Confirmed agent memory table 'agent_memory_test' is accessible."); // Uses mockConfig.tableName
      expect(mockLogger.info).toHaveBeenCalledWith("Vector store initialization checks passed.");
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should throw error and log failure when RPC call returns an error', async () => {
      const rpcError = new Error('RPC fail');
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: rpcError });

      await expect(initVectorStore(mockSupabase, mockConfig, mockLogger))
        .rejects.toThrow('Vector store initialization check failed: RPC fail');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_if_extension_exists', { extension_name: 'vector' });
      expect(mockLogger.info).toHaveBeenCalledWith("Initializing vector store checks...");
      expect(mockLogger.error).toHaveBeenCalledWith({ error: 'RPC fail' }, "Vector store initialization failed: pgvector extension missing.");
      expect(mockLogger.error).toHaveBeenCalledWith({ error: 'Vector store initialization check failed: RPC fail' }, "Error during vector store initialization checks");
      expect(mockLogger.info).not.toHaveBeenCalledWith("pgvector extension is enabled.");
      expect(mockLogger.info).not.toHaveBeenCalledWith("Vector store initialization checks passed.");
    });

    test('should throw error and log failure when extension does not exist', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null });

      await expect(initVectorStore(mockSupabase, mockConfig, mockLogger))
        .rejects.toThrow('Vector store initialization check failed: pgvector extension not found.');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_if_extension_exists', { extension_name: 'vector' });
      expect(mockLogger.info).toHaveBeenCalledWith("Initializing vector store checks...");
      expect(mockLogger.error).toHaveBeenCalledWith({ error: 'pgvector extension not found.' }, "Vector store initialization failed: pgvector extension missing.");
      expect(mockLogger.error).toHaveBeenCalledWith({ error: 'Vector store initialization check failed: pgvector extension not found.' }, "Error during vector store initialization checks");
      expect(mockLogger.info).not.toHaveBeenCalledWith("pgvector extension is enabled.");
      expect(mockLogger.info).not.toHaveBeenCalledWith("Vector store initialization checks passed.");
    });

    test('should handle and re-throw errors occurring within the try block', async () => {
      const internalError = new Error('Something failed inside');
      // Make the RPC call succeed, but force logger to fail
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
      mockLogger.info.mockImplementation((msg) => {
        if (msg.includes('Confirmed agent memory table')) {
          throw internalError;
        }
      });

      await expect(initVectorStore(mockSupabase, mockConfig, mockLogger))
        .rejects.toThrow(internalError);

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Initializing vector store checks...");
      expect(mockLogger.info).toHaveBeenCalledWith("pgvector extension is enabled.");
      // Error happens during the next info log
      expect(mockLogger.error).toHaveBeenCalledWith({ error: internalError.message }, "Error during vector store initialization checks");
      expect(mockLogger.info).not.toHaveBeenCalledWith("Vector store initialization checks passed.");
    });
  });

  describe('searchVectorsByEmbedding', () => {
    test('should log a warning and return an empty array', async () => {
      const mockEmbedding = [0.1, 0.2];
      const mockOptions = { limit: 10 };

      const result = await searchVectorsByEmbedding(mockSupabase, mockConfig.tableName, mockEmbedding, mockOptions, mockLogger);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith("Direct vector search (searchVectorsByEmbedding) is not fully implemented; relying on Supabase RPC functions like match_documents.");
      // Ensure no other interactions happened (e.g., no supabase calls)
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });
  });
}); 