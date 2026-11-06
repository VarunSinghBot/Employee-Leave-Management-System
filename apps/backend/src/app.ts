import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

dotenv.config({
    path: "./.env",
    quiet: true,
});

const app = express();

// Behind a reverse proxy (nginx in docker), read the client IP from X-Forwarded-For
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

// Enable this for operation ->
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

// Middlewares
// -----------------------------------------------------------------------------------------------------------------
// Secure HTTP headers
app.use(helmet());
// Middleware for express to get items in JSON format
app.use(express.json({ limit: "16kb" }));
// Middleware for parsing URL-encoded data
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// Serve static files from the "public" folder
app.use(express.static("public"));
// Cookie parser middleware
app.use(cookieParser());

// store auth tokens in cookes to save XSS attacks and set it to HTTP only for other items
// -----------------------------------------------------------------------------------------------------------------

// Routes Import
import authRouter from "./routes/auth.route.js";
import leaveRouter from "./routes/leave.route.js";
import approvalRouter from "./routes/approval.route.js";
import auditRouter from "./routes/audit.route.js";
import { API_PREFIX } from "./constants.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

// Routes Declaration
app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ success: true, message: "ELMS API is healthy", data: { uptime: process.uptime() } });
});
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/leaves`, leaveRouter);
app.use(`${API_PREFIX}/approvals`, approvalRouter);
app.use(`${API_PREFIX}/audit`, auditRouter);

// Unknown routes + central error handler (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
