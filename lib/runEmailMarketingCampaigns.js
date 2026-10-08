import connectDB from '@/lib/mongodb';
import EmailMarketingCampaign from '@/models/EmailMarketingCampaign';
import { getDueCampaignSlots, getResumeCampaignSlots, campaignIsFullyCompleted, nextSendLease } from '@/lib/emailMarketingSchedule';
import { sendEmailMarketingCampaign } from '@/lib/emailMarketingCampaignSend';

/**
 * Process active email marketing campaigns that are due right now.
 * Optional storeId limits the sweep to one seller (used by the dashboard Refresh).
 */
export async function runDueEmailMarketingCampaigns({
  now = new Date(),
  dryRun = false,
  storeId = null,
} = {}) {
  await connectDB();

  const query = { status: 'active' };
  if (storeId) query.storeId = storeId;

  const campaigns = await EmailMarketingCampaign.find(query).limit(100);

  const processed = [];
  let slotsRun = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const campaign of campaigns) {
    const due = [
      ...getDueCampaignSlots(campaign, now),
      ...getResumeCampaignSlots(campaign, now),
    ];
    if (!due.length) continue;

    for (const slot of due) {
      if (dryRun) {
        processed.push({
          campaignId: String(campaign._id),
          name: campaign.name,
          slotKey: slot.slotKey,
          dryRun: true,
          resume: Boolean(slot.resume),
        });
        slotsRun += 1;
        continue;
      }

      const leaseUntil = nextSendLease(now);
      const claimed = slot.resume
        ? await EmailMarketingCampaign.findOneAndUpdate(
          {
            _id: campaign._id,
            status: 'active',
            sentSlots: slot.slotKey,
            finishedSlots: { $ne: slot.slotKey },
            $or: [
              { sendingLeaseUntil: { $exists: false } },
              { sendingLeaseUntil: null },
              { sendingLeaseUntil: { $lte: now } },
            ],
          },
          { $set: { sendingSlotKey: slot.slotKey, sendingLeaseUntil: leaseUntil } },
          { new: true },
        )
        : await EmailMarketingCampaign.findOneAndUpdate(
          {
            _id: campaign._id,
            status: 'active',
            sentSlots: { $ne: slot.slotKey },
          },
          {
            $addToSet: { sentSlots: slot.slotKey },
            $set: { sendingSlotKey: slot.slotKey, sendingLeaseUntil: leaseUntil },
          },
          { new: true },
        );
      if (!claimed) continue;

      try {
        const result = await sendEmailMarketingCampaign(claimed, { slotKey: slot.slotKey });
        const sentCount = Number(result.emailsSent || 0);
        const failedCount = Number(result.emailsFailed || 0);
        const sendBlocked = Boolean(result.blocked || result.error);

        if (sendBlocked && sentCount === 0) {
          await EmailMarketingCampaign.updateOne(
            { _id: campaign._id },
            {
              $pull: { sentSlots: slot.slotKey },
              $set: { sendingSlotKey: '', sendingLeaseUntil: null },
            },
          );
          processed.push({
            campaignId: String(campaign._id),
            name: campaign.name,
            slotKey: slot.slotKey,
            error: result.error || 'Send blocked',
          });
          continue;
        }

        claimed.totalSent = Number(claimed.totalSent || 0) + sentCount;
        claimed.totalFailed = Number(claimed.totalFailed || 0) + failedCount;
        claimed.lastRunAt = new Date();
        claimed.sendingSlotKey = result.finished ? '' : slot.slotKey;
        claimed.sendingLeaseUntil = null;
        if (result.finished) {
          claimed.finishedSlots = Array.from(new Set([...(claimed.finishedSlots || []), slot.slotKey]));
        }
        claimed.runLog = [
          ...(claimed.runLog || []).slice(-40),
          {
            at: new Date(),
            slotKey: slot.slotKey,
            emailsSent: sentCount,
            emailsFailed: failedCount,
          },
        ];

        if (campaignIsFullyCompleted(claimed)) {
          claimed.status = 'completed';
          claimed.stoppedAt = new Date();
        }

        await claimed.save();
        slotsRun += 1;
        emailsSent += sentCount;
        emailsFailed += failedCount;
        processed.push({
          campaignId: String(campaign._id),
          name: campaign.name,
          slotKey: slot.slotKey,
          emailsSent: sentCount,
          emailsFailed: failedCount,
          remaining: result.remaining,
          finished: Boolean(result.finished),
        });
      } catch (error) {
        await EmailMarketingCampaign.updateOne(
          { _id: campaign._id },
          {
            $set: { sendingLeaseUntil: new Date() },
            $push: {
              runLog: {
                $each: [{
                  at: new Date(),
                  slotKey: slot.slotKey,
                  emailsSent: 0,
                  emailsFailed: 0,
                  error: error?.message || 'Send failed',
                }],
                $slice: -40,
              },
            },
          },
        ).catch(() => {});
        processed.push({
          campaignId: String(campaign._id),
          name: campaign.name,
          slotKey: slot.slotKey,
          error: error?.message || 'Send failed',
        });
      }
    }
  }

  return {
    checked: campaigns.length,
    slotsRun,
    emailsSent,
    emailsFailed,
    processed,
  };
}

const MAX_SEND_BATCHES = 400;
const QUEUE_POLL_MS = 20 * 1000;

function queueState() {
  if (!globalThis.__store1920EmailQueue) {
    globalThis.__store1920EmailQueue = { timer: null, running: null };
  }
  return globalThis.__store1920EmailQueue;
}

/**
 * Keep taking the next batch until the queued list is finished.
 * A scheduled time only starts the queue. Closing the dashboard does not stop it.
 */
export function drainEmailMarketingQueue({ storeId = null, maxMs = 0 } = {}) {
  const state = queueState();
  if (state.running) return state.running;

  const job = (async () => {
    const started = Date.now();
    let last = null;
    for (let batch = 0; batch < MAX_SEND_BATCHES; batch += 1) {
      if (maxMs > 0 && Date.now() - started >= maxMs) break;
      last = await runDueEmailMarketingCampaigns({ storeId });
      const rows = last?.processed || [];
      const sentABatch = rows.some((row) => !row.error && (row.emailsSent || row.emailsFailed || row.finished === false));
      const unfinished = rows.some((row) => row.finished === false && !row.error);
      if (!sentABatch || !unfinished) break;
    }
    return last;
  })().catch((error) => {
    console.error('[email-marketing queue]', error);
    return null;
  }).finally(() => {
    if (queueState().running === job) queueState().running = null;
  });

  state.running = job;
  return job;
}

/** Poll the server for due campaigns and keep their queues moving. */
export function ensureEmailMarketingQueue() {
  const state = queueState();
  if (state.timer) return;
  const timer = setInterval(() => {
    drainEmailMarketingQueue().catch((error) => {
      console.error('[email-marketing queue]', error);
    });
  }, QUEUE_POLL_MS);
  timer.unref?.();
  state.timer = timer;
  drainEmailMarketingQueue().catch((error) => {
    console.error('[email-marketing queue]', error);
  });
}

export function startEmailMarketingSendPump(storeId) {
  ensureEmailMarketingQueue();
  return drainEmailMarketingQueue({ storeId: storeId || null });
}
