import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadImage } from "../controllers/upload.controller.js";

const router = Router();

router.route("/").post(upload.single("file"), uploadImage);

export default router;