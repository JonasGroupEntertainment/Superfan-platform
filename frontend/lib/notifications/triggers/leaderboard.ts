import { sendNotification } from "../send";

/**
 * Notify a fan that another fan just overtook them on the leaderboard.
 * Used when today's rank is worse than yesterday's.
 */
export async function notifyOvertaken(opts: {
  fanId: string;
  artistName: string;
  newRank: number;
}): Promise<void> {
  try {
    await sendNotification({
      fanId: opts.fanId,
      type: "leaderboard",
      payload: {
        title: `You dropped to #${opts.newRank} on ${opts.artistName}`,
        body: "Someone just passed you — earn more points to climb back up!",
        url: `/community`,
        tag: `leaderboard_overtaken:${opts.fanId}`,
      },
    });
  } catch (err) {
    console.warn("notifyOvertaken failed (non-blocking):", err);
  }
}

/**
 * Notify a fan that they have reached #1 on an artist leaderboard.
 */
export async function notifyFirstPlace(opts: {
  fanId: string;
  artistName: string;
}): Promise<void> {
  try {
    await sendNotification({
      fanId: opts.fanId,
      type: "leaderboard",
      payload: {
        title: `You're #1 on ${opts.artistName}! 🥇`,
        body: "Keep it up to hold the top spot through the end of the month.",
        url: `/community`,
        tag: `leaderboard_first_place:${opts.fanId}`,
      },
    });
  } catch (err) {
    console.warn("notifyFirstPlace failed (non-blocking):", err);
  }
}

/**
 * Month-end nudge: remind fans still on the leaderboard how many days
 * are left so they can make a final push.
 */
export async function notifyMonthEndNudge(opts: {
  fanId: string;
  artistName: string;
  rank: number;
  daysLeft: number;
}): Promise<void> {
  try {
    await sendNotification({
      fanId: opts.fanId,
      type: "leaderboard",
      payload: {
        title: `${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"} left on ${opts.artistName}`,
        body: `You're at #${opts.rank} — final push to lock in your spot before the month resets!`,
        url: `/community`,
        tag: `leaderboard_month_nudge:${opts.fanId}`,
      },
    });
  } catch (err) {
    console.warn("notifyMonthEndNudge failed (non-blocking):", err);
  }
}
