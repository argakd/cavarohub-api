import cron from "node-cron";
import { autoCancelUndecidedTransactions, expireOverdueTransactions } from "../services/transaction.service";

export function startTransactionJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      const expired = await expireOverdueTransactions();
      const canceled = await autoCancelUndecidedTransactions();
      if (expired || canceled) {

        console.log(`[cron] expired=${expired} auto-canceled=${canceled}`);
      }
    } catch (err) {
      console.error("[cron] transaction job failed", err);
    }
  });
}
