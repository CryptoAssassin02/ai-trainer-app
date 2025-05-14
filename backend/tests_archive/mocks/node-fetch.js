// Create a mock for node-fetch
const mockFetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({
      choices: [
        { 
          message: { 
            content: JSON.stringify({ 
              result: 'Test response from Perplexity API' 
            }) 
          }
        }
      ]
    }),
    text: () => Promise.resolve('Test text response from Perplexity API')
  })
);

module.exports = mockFetch; 