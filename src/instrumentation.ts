export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDB } = await import('@/db');
    try {
      await initDB();
      console.log('[instrumentation] DB initialized');
    } catch (err) {
      console.error('[instrumentation] DB init failed:', err);
    }
  }
}
