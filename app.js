import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import bcrypt from "bcryptjs";
import MySQLStore from "express-mysql-session";
import mysql from "mysql2/promise";

import logger from "./utils/logger.js";
// import { initialSocketServer } from "./sockets/socketindex.js";

import routeIndex from "./routes/routeIndex.js";

const MySQLSessionStore = MySQLStore(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// docker compose up -d
const app = express();
let io;

(async () => {
  try {
    const port = process.env.PORT || 3001;

    // MySQL connection
    const db = await mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Core middlewares
    app.use(helmet());
    // app.use(compression());

    // CORS setup
    const allowedOrigins = [
      "http://localhost:8080",
      "http://192.168.0.98:8080",
      "https://api.yourdomain.com", // production domain
      "https://yourdomain.com"      // if frontend is served from root domain
    ];

    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // In development, allow all origins
        if (process.env.NODE_ENV !== "production") return callback(null, true);
        // In production, restrict to allowed origins
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    }));

    // Always set CORS headers for /uploads (for all HTTP methods and responses)
    app.use("/uploads", (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*"); // Or restrict to your frontend origin
      res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      // For preflight requests
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    });

    // Serve static files with CORS headers
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
      setHeaders: (res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      }
    }));

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Configure MySQL session store
    const sessionStoreOptions = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

    const sessionStore = new MySQLSessionStore(sessionStoreOptions);


    app.use(
      session({
        store: sessionStore,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: "none",
          maxAge: 24 * 60 * 60 * 1000,
        },
        name: "sid",
      })
    );

    // Socket.IO
    const server = http.createServer(app);
    // io = await initialSocketServer(server);

    // Attach io to requests
    app.use((req, _res, next) => {
      req.io = io;
      req.db = db; // attach MySQL pool
      next();
    });

    // API Routes
    app.use("/", routeIndex);

    // Health check
    app.get("/health", (_req, res) => res.status(200).send("OK"));

    // 404 handler
    app.use((_req, res) =>
      res.status(404).json({ success: false, message: "Route not found" })
    );

    // Global error handler
    app.use((err, req, res, _next) => {
      logger.error({ err, url: req.originalUrl }, "Unhandled error");
      res
        .status(err.status || 500)
        .json({ success: false, message: err.message || "Server Error" });
    });

    // Start server
    server.listen(port, "0.0.0.0", () => {
      logger.info(`🚀 Server running at http://0.0.0.0:${port}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => async () => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("Force exiting after 10s");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", shutdown("SIGINT"));
    process.on("SIGTERM", shutdown("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Fatal boot error");
    process.exit(1);
  }
})();

export { app };
