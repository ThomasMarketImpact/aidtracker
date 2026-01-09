/**
 * Fetch with exponential backoff retry logic
 * Used across all data ingestion scripts for resilient API calls
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 4,
  initialDelayMs: 2000,
  maxDelayMs: 16000,
  backoffMultiplier: 2,
  // Retry on server errors and rate limiting
  retryStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry
 * Retries on network errors and specified HTTP status codes
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check if we should retry based on status code
      if (!response.ok && config.retryStatusCodes.includes(response.status)) {
        if (attempt < config.maxRetries) {
          console.log(`    ⚠️ HTTP ${response.status}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${config.maxRetries})...`);
          await sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Network errors - retry
      if (attempt < config.maxRetries) {
        console.log(`    ⚠️ Network error: ${lastError.message}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${config.maxRetries})...`);
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
        continue;
      }
    }
  }

  // All retries exhausted
  throw new Error(`Failed after ${config.maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Fetch JSON with retry logic
 * Combines fetch with retry and JSON parsing
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
