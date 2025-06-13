'use strict';

const defaultLogger = require('../config/logger');
const defaultConfig = require('../config/perplexity');

// Fix for node-fetch ES module compatibility with Jest/CommonJS
let defaultFetch;
try {
  // Try to require node-fetch v2 style (CommonJS)
  defaultFetch = require('node-fetch');
} catch (error) {
  // If that fails, try the .default export for v3+
  try {
    defaultFetch = require('node-fetch').default;
  } catch (error2) {
    // Fallback to a mock fetch for testing
    defaultFetch = async () => {
      throw new Error('node-fetch not available - using mock fetch');
    };
  }
}

class PerplexityServiceError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.name = 'PerplexityServiceError';
        this.status = status;
        this.details = details;
    }
}

class PerplexityService {
    constructor(apiKey, config = defaultConfig, logger = defaultLogger, fetchFn = defaultFetch) {
        this.apiKey = apiKey;
        this.config = config;
        this.logger = logger;
        this.fetchFn = fetchFn;
    }

    async search(queryText, callOptions = {}) {
        if (this.config.mock?.enabled) {
            this.logger.warn(`[MOCK] PerplexityService returning mock response for query: ${queryText.substring(0, 50)}...`);
            const mockContent = this.config.mock.mockResponse?.choices?.[0]?.message?.content || "Default mock content";
            return { content: JSON.stringify(mockContent) };
        }

        const url = `${this.config.api.baseUrl}${this.config.api.endpoint}`;
        const headers = {
            ...(this.config.api.headers || {}),
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };

        const body = {
            ...(this.config.bodyDefaults || {}),
            model: callOptions.model || this.config.bodyDefaults?.model || 'sonar-medium-online',
            messages: [
                { role: 'system', content: 'You are an AI assistant specializing in fitness and health research. Provide accurate information and strictly adhere to the requested JSON output format when specified.' },
                { role: 'user', content: queryText },
            ],
            ...(callOptions.maxTokens && { max_tokens: callOptions.maxTokens }),
            ...(callOptions.temperature && { temperature: callOptions.temperature }),
            ...(callOptions.schemaExpected && { response_format: { type: 'json_object' } }),
        };

        const timeout = callOptions.timeout || this.config.api?.timeout || 10000;

        this.logger.info(`Calling Perplexity API (${body.model})`);

        try {
            const response = await this.fetchFn(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                timeout: timeout,
            });

            this.logger.info(`Perplexity API response status: ${response.status}`);

            if (!response.ok) {
                let errorDetails = null;
                try {
                    errorDetails = await response.json();
                    this.logger.error('Perplexity API client error details:', errorDetails);
                } catch (parseError) {
                    this.logger.error('Failed to parse Perplexity API error response body.');
                    try {
                        errorDetails = { message: await response.text() };
                    } catch (textError) {
                        errorDetails = { message: 'Could not read error response body.' };
                    }
                }
                throw new PerplexityServiceError(
                    `Perplexity API client error: ${response.status} ${response.statusText}`,
                    response.status,
                    errorDetails
                );
            }

            const data = await response.json();
            this.logger.info('Perplexity API call successful.');
            this.logger.debug('Perplexity API response data:', JSON.stringify(data).substring(0, 200) + '...');

            if (!data) {
                this.logger.error('Empty response from Perplexity API');
                throw new PerplexityServiceError('Empty response from Perplexity API', response.status, {});
            }

            if (data.choices && data.choices.length > 0) {
                if (data.choices[0].message) return data.choices[0].message;
                if (data.choices[0].text) return { content: data.choices[0].text };
            }
            if (data.response) return { content: data.response };
            if (data.content) return { content: data.content };
            if (typeof data === 'string') return { content: data };

            this.logger.error('Unrecognized response structure from Perplexity API', data);
            if (typeof data === 'object') {
                const possibleContentFields = ['content', 'text', 'answer', 'completion', 'result', 'output'];
                for (const field of possibleContentFields) {
                    if (data[field] && typeof data[field] === 'string') {
                        this.logger.info(`Found content in field "${field}"`);
                        return { content: data[field] };
                    }
                }
                this.logger.warn('Falling back to serializing entire response as content');
                return { content: JSON.stringify(data) };
            }

            throw new PerplexityServiceError('Invalid response structure from Perplexity API', response.status, data);
        } catch (error) {
            if (error instanceof PerplexityServiceError) {
                this.logger.error(`Perplexity API Error: ${error.message}`, { status: error.status, details: error.details });
                throw error;
            } else {
                this.logger.error(`Network or fetch error calling Perplexity API: ${error.message}`, { stack: error.stack });
                throw new PerplexityServiceError(`Network or fetch error: ${error.message}`, null, error);
            }
        }
    }

    async searchQuery(queryText, options = {}) {
        const response = await this.search(queryText, options);

        if (!response) {
            throw new PerplexityServiceError('Null response from Perplexity API', null);
        }

        const content = response.content || response.text || response.answer ||
                        (typeof response === 'string' ? response : null);

        if (!content) {
            this.logger.error('No content found in Perplexity response', response);
            throw new PerplexityServiceError('No content found in Perplexity response', null, response);
        }

        if (options.structuredResponse) {
            try {
                return JSON.parse(content);
            } catch (error) {
                this.logger.error('Failed to parse structured JSON response', { error: error.message, contentReceived: content });
                throw new PerplexityServiceError('Failed to parse structured JSON response', null, { originalError: error, contentReceived: content });
            }
        }

        return content;
    }
}

module.exports = {
  PerplexityService,
  PerplexityServiceError
};