import { MeiliSearch } from "meilisearch";

/**
 * Meilisearch configuration from environment variables
 */
const config = {
  url: process.env.MEILISEARCH_URL || "http://localhost:7700",
  apiKey: process.env.MEILI_MASTER_KEY || undefined,
  indexName: process.env.MEILISEARCH_INDEX_NAME || "archives",
};

/**
 * Meilisearch client singleton instance
 * Lazy initialization to avoid connection issues during build
 */
let clientInstance: MeiliSearch | null = null;

/**
 * Get or create Meilisearch client instance
 */
export function getClient(): MeiliSearch {
  if (!clientInstance) {
    clientInstance = new MeiliSearch({
      host: config.url,
      apiKey: config.apiKey,
    });
  }
  return clientInstance;
}

/**
 * Get Meilisearch index for archives
 */
export async function getIndex() {
  const client = getClient();
  return client.index(config.indexName);
}

/**
 * Check Meilisearch service health
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    const client = getClient();
    await client.health();
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Meilisearch configuration (for testing/debugging)
 */
export function getConfig() {
  return { ...config };
}

/**
 * Reset client instance (useful for testing)
 */
export function resetClient(): void {
  clientInstance = null;
}
