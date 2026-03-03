/**
 * Next.js Instrumentation hook
 * Runs once when the Next.js server starts
 *
 * IMPORTANT: This only runs in Node.js runtime (not Edge)
 * Prisma and other services require Node.js runtime
 */

export const runtime = 'nodejs';

export async function register() {
  // Skip if auto-initialization is disabled
  if (process.env.DISABLE_AUTO_INIT === 'true') {
    console.log('[Startup] Auto-initialization disabled by DISABLE_AUTO_INIT env var');
    return;
  }

  // In development, only initialize if explicitly requested
  // In production, always initialize
  const shouldInit = process.env.NODE_ENV === 'production' || process.env.AUTO_INIT_DEV === 'true';

  if (!shouldInit) {
    console.log('[Startup] Skipping initialization (set AUTO_INIT_DEV=true to enable in development)');
    return;
  }

  // Wait a bit to ensure database and other services are ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('[Startup] Initializing services...');

  try {
    // Check if running in Edge Runtime (Prisma is not compatible)
    const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';

    if (isEdgeRuntime) {
      console.warn('[Startup] Running in Edge Runtime - skipping Prisma-dependent initialization');
      console.warn('[Startup] Search will fall back to database queries');
      console.log('[Startup] Services initialization complete (Edge Runtime mode)');
      return;
    }

    // Initialize Meilisearch index
    const { initializeMeilisearch } = await import('@/services/meilisearch.service');
    const result = await initializeMeilisearch();

    if (result.success) {
      console.log(`[Startup] ✅ Meilisearch index initialized with ${result.indexed} documents`);
    } else {
      console.warn('[Startup] ⚠️ Meilisearch initialization failed:', result.error);
      console.warn('[Startup] Search will fall back to Prisma database');
    }
  } catch (error) {
    // Check if error is related to Edge Runtime
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Edge Runtime') || errorMessage.includes('PrismaClient')) {
      console.warn('[Startup] ⚠️ Prisma initialization failed (Edge Runtime detected)');
      console.warn('[Startup] Search will fall back to database queries');
    } else {
      console.error('[Startup] ❌ Failed to initialize Meilisearch:', error);
      console.warn('[Startup] Search will fall back to Prisma database');
    }
  }

  console.log('[Startup] Services initialization complete');
}
