import { Router } from "express";
import { handleStkCallback } from "../controllers/callbackController";

const router = Router();

router.post("/stk/:token", handleStkCallback);

export default router;