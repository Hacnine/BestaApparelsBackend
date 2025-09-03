import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";99
import cookieParser from "cookie-parser";
import compression from "compression";
import session from "express-session";
import { RedisStore } from "connect-redis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";

import { PrismaClient } from "@prisma/client";
import { connectRedisClient } from "./config/redisClient.js"; 
import logger from "./utils/logger.js";
import { initialSocketServer } from "./sockets/socketindex.js";

// Routes
import userRouter from "./routes/userRoute.js";
import tnaRouter from "./routes/tnaRoute.js";
import auditRouter from "./routes/auditRoute.js";
import dashboardRouter from "./routes/dashboardRoute.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let io; // socket.io server instance

(async () => {
  try {
    const port = process.env.PORT || 3001;

    // Prisma client
    const prisma = new PrismaClient();

    // Connect Redis
    const redisClient = await connectRedisClient();

    // Core middlewares
    app.use(helmet());
    // app.use(compression());

    const originUrl = process.env.ORIGIN_URL || "http://localhost:8080";
    app.use(cors({ origin: originUrl, credentials: true }));

    app.use("/images", express.static(path.join(process.cwd(), "public/images")));
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Redis session store
    app.use(
      session({
        store: new RedisStore({ client: redisClient, prefix: "besta:sess:" }),
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
    io = await initialSocketServer(server, redisClient);

    // Attach io to requests
    app.use((req, _res, next) => {
      req.io = io;
      req.prisma = prisma; // attach Prisma client too
      next();
    });


  // API Routes
  app.use("/api/users", userRouter);
  app.use("/api/tnas", tnaRouter);
  app.use("/api/audit-logs", auditRouter);
  app.use("/api/dashboard", dashboardRouter);

    // Health check
    app.get("/health", (_req, res) => res.status(200).send("OK"));

    // 404 handler
    app.use((_req, res) =>
      res.status(404).json({ success: false, message: "Route not found" })
    );

    // Global error handler
    app.use((err, req, res, _next) => {
      logger.error({ err, url: req.originalUrl }, "Unhandled error");
      res.status(err.status || 500).json({ success: false, message: err.message || "Server Error" });
    });


    // Start server
    server.listen(port, () => logger.info(`Server running on port ${port}`));

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

export { app, io };
