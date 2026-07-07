import { Router } from "express";
import { analyzeImage, checkDuplicate, predictTrend} from "../controllers/gemini.controller.js";

const router = Router();

router.route("/analyze").post(analyzeImage);

router.route("/duplicate").post(checkDuplicate);

router.route("/predict").post(predictTrend);

export default router;