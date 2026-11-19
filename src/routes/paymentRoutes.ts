import { Router } from "express";
import {
  initiatePayment,
  getPaymentStatus,
  reconcilePaymentStatus,
} from "../controllers/paymentController";

const router = Router();

router.post("/", initiatePayment);
router.get("/:id", getPaymentStatus);
router.post("/:id/reconcile", reconcilePaymentStatus);

export default router;