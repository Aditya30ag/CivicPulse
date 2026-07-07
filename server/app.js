import express from "express";
import cors from "cors";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

// CORS Configuration
app.use(
    cors({
        origin: "*",
    })
);

// Built-in Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Civic Pulse API is running",
    });
});

// API Routes
import uploadRoutes from "./routes/upload.route.js";
import geminiRoutes from "./routes/gemini.route.js";

app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/gemini", geminiRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;