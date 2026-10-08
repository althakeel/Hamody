export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { ensureEmailMarketingQueue } = await import('@/lib/runEmailMarketingCampaigns');
  ensureEmailMarketingQueue();
}
