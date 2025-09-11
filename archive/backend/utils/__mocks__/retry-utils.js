// Mock for retry-utils.js
const retryWithBackoff = jest.fn().mockImplementation(async (fn, maxRetries, baseDelay, onRetry, context) => {
    try {
        return await fn();
    } catch (error) {
        // Call onRetry if it exists
        if (onRetry && typeof onRetry === 'function') {
            onRetry(0, error);
        }
        throw error;
    }
});

module.exports = {
    retryWithBackoff
}; 