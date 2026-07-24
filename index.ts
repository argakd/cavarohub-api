import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startTransactionJobs } from "./jobs/transactionJobs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, "./uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = createApp();

app.listen(env.port, () => {

  console.log(`Server listening on http://localhost:${env.port}`);
});

startTransactionJobs();
