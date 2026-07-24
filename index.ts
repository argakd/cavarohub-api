import fs from "fs";
import path from "path";
import { createApp } from "./app";
import { env } from "./config/env";
import { startTransactionJobs } from "./jobs/transactionJobs";

const uploadsDir = path.join(__dirname, "./uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = createApp();

app.listen(env.port, () => {

  console.log(`Server listening on http://localhost:${env.port}`);
});

startTransactionJobs();
