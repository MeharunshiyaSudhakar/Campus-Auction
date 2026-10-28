const cron = require('node-cron');
const AlertService = require('./alertService');

let cronTask = null;

const startUnsoldAlertScheduler = () => {
  // Run once immediately on server startup to catch any listings that became stale while offline
  AlertService.checkAndSendUnsoldAlerts().catch((err) => {
    console.error('[UnsoldAlertScheduler] Initial check error:', err.message);
  });

  // Run every hour: '0 * * * *' (or every 10 minutes in dev: '*/10 * * * *')
  cronTask = cron.schedule('0 * * * *', async () => {
    console.log('[UnsoldAlertScheduler] Running scheduled check for unsold/stale items...');
    try {
      const result = await AlertService.checkAndSendUnsoldAlerts();
      if (result.notificationsCreated > 0) {
        console.log(`[UnsoldAlertScheduler] Created ${result.notificationsCreated} notifications.`);
      }
    } catch (err) {
      console.error('[UnsoldAlertScheduler] Cron job error:', err.message);
    }
  });

  console.log('[UnsoldAlertScheduler] Scheduled job active (runs hourly, threshold: ' + (process.env.UNSOLD_ALERT_DAYS || 3) + ' days).');
};

const stopUnsoldAlertScheduler = () => {
  if (cronTask) {
    cronTask.stop();
  }
};

module.exports = { startUnsoldAlertScheduler, stopUnsoldAlertScheduler };
