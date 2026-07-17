import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  recordEncounter,
  updateEncounter,
  getPatientHistory,
} from "../controllers/consultation.controller.js";
import {
  recordConsultationSchema,
  updateConsultationSchema,
  queryHistorySchema,
} from "../validators/consultation.validator.js";

const router = Router();

// Record a new clinical encounter/consultation
router.post("/", validate(recordConsultationSchema), recordEncounter);

// Update details of a consultation
router.patch("/:id", validate(updateConsultationSchema), updateEncounter);

// Retrieve previous consultations history for a patient
router.get("/patient/:patientId", validate(queryHistorySchema), getPatientHistory);

export default router;
