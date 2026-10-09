export async function registerNodeInstrumentation() {
  const { ensureEmailMarketingQueue } = await import('@/lib/runEmailMarketingCampaigns');
  ensureEmailMarketingQueue();
}
