/**
 * Server-side OpenAI client
 * This file should ONLY be imported in server-side code (API routes, server components)
 */

import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Get OpenAI client instance for server-side usage only
 * @returns OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
    // Ensure this is only called on the server
    if (typeof window !== 'undefined') {
        throw new Error('getOpenAIClient can only be used on the server side');
    }

    // Create singleton instance
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured in environment variables');
        }

        openaiClient = new OpenAI({
            apiKey,
            // Never allow browser usage for server client
            dangerouslyAllowBrowser: false,
        });
    }

    return openaiClient;
}

/**
 * Server-side function to generate chat completions
 * This should be called from API routes only
 */
export async function generateChatCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options?: Partial<OpenAI.Chat.ChatCompletionCreateParams>
) {
    const client = getOpenAIClient();
    
    return client.chat.completions.create({
        model: options?.model || 'gpt-4',
        messages,
        ...options,
    });
}
