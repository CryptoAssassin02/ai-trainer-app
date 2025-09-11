const { createEmbedding } = require('../../../agents/memory/embedding');

describe('createEmbedding', () => {
  let mockOpenAI;
  let mockLogger;

  beforeEach(() => {
    mockOpenAI = {
      embeddings: {
        create: jest.fn(),
      },
    };
    mockLogger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null and log a warning if content is empty', async () => {
    const content = '';
    const model = 'text-embedding-ada-002';

    const result = await createEmbedding(mockOpenAI, content, model, mockLogger);

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to create embedding for empty content.');
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
  });

  test('should return null and log a warning if content is null', async () => {
    const content = null;
    const model = 'text-embedding-ada-002';

    const result = await createEmbedding(mockOpenAI, content, model, mockLogger);

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to create embedding for empty content.');
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
  });

  test('should return null and log a warning if content is undefined', async () => {
    const content = undefined;
    const model = 'text-embedding-ada-002';

    const result = await createEmbedding(mockOpenAI, content, model, mockLogger);

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to create embedding for empty content.');
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
  });

  test('should create and return an embedding for valid content', async () => {
    const content = 'This is test content.';
    const model = 'text-embedding-ada-002';
    const mockEmbedding = [0.1, 0.2, 0.3];
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: mockEmbedding }],
    });

    const result = await createEmbedding(mockOpenAI, content, model, mockLogger);

    expect(result).toEqual(mockEmbedding);
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({ model, input: content });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { model, contentLength: content.length },
      'Creating embedding'
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      { model, dimensions: mockEmbedding.length },
      'Embedding created successfully'
    );
  });

  test('should throw an error and log if OpenAI API call fails', async () => {
    const content = 'This is test content.';
    const model = 'text-embedding-ada-002';
    const errorMessage = 'OpenAI API Error';
    mockOpenAI.embeddings.create.mockRejectedValue(new Error(errorMessage));

    await expect(createEmbedding(mockOpenAI, content, model, mockLogger)).rejects.toThrow(errorMessage);

    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({ model, input: content });
    expect(mockLogger.error).toHaveBeenCalledWith(
      { model, error: errorMessage },
      'Error creating embedding'
    );
  });

  test('should throw an error and log if OpenAI API response has no data', async () => {
    const content = 'This is test content.';
    const model = 'text-embedding-ada-002';
    mockOpenAI.embeddings.create.mockResolvedValue({}); // No data field

    await expect(createEmbedding(mockOpenAI, content, model, mockLogger)).rejects.toThrow(
      'Embedding generation failed: No embedding returned'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      { model, error: 'Embedding generation failed: No embedding returned' },
      'Error creating embedding'
    ); // This will fail as the error is thrown before this specific log
  });

  test('should throw an error and log if OpenAI API response data is empty', async () => {
    const content = 'This is test content.';
    const model = 'text-embedding-ada-002';
    mockOpenAI.embeddings.create.mockResolvedValue({ data: [] }); // Empty data array

    await expect(createEmbedding(mockOpenAI, content, model, mockLogger)).rejects.toThrow(
      'Embedding generation failed: No embedding returned'
    );
     expect(mockLogger.error).toHaveBeenCalledWith(
      { model, error: 'Embedding generation failed: No embedding returned' },
      'Error creating embedding'
    ); // This will fail as the error is thrown before this specific log
  });

  test('should throw an error and log if OpenAI API response data item has no embedding', async () => {
    const content = 'This is test content.';
    const model = 'text-embedding-ada-002';
    mockOpenAI.embeddings.create.mockResolvedValue({ data: [{ /* no embedding property */ }] });

    await expect(createEmbedding(mockOpenAI, content, model, mockLogger)).rejects.toThrow(
      'Embedding generation failed: No embedding returned'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      { model, error: 'Embedding generation failed: No embedding returned' },
      'Error creating embedding'
    );
  });
}); 