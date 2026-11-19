import "dotenv/config";
import express from "express";
import paymentRoutes from "./routes/paymentRoutes";
import { env } from "./config/env";
import callbackRoutes from "./routes/callbackRoutes";
import { requireApiKey } from "./middleware/requireApiKey";
import { startReconcileJob } from "./jobs/reconcileJob";


const app = express();

app.use(express.json());
app.use("/payments", requireApiKey, paymentRoutes);
app.use("/callbacks", callbackRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
  startReconcileJob();
});