import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient } from "../config/redisClient.js";
import logger from "../utils/logger.js";
// import { registerOnlineUserHandlers } from "./onlineUserSocket.js";


export const initialSocketServer = async (server, redis) => {
  const originUrl = process.env.ORIGIN_URL || "http://localhost:3002";
  const io = new Server(server, {
    cors: {
      origin: originUrl,
      credentials: true,
    },
  });

  // Set up Redis adapter
  const pubClient = getRedisClient();
  const subClient = pubClient.duplicate();
  if (!subClient.isOpen) await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  // JWT authentication middleware
  io.use((socket, next) => {
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) return next(new Error("No cookies found"));

    const { access_token: token } = cookie.parse(cookies);
    if (!token) return next(new Error("No token found"));

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) return next(new Error("Invalid token"));
      socket.user = decoded;
      next();
    });
  });

  // Socket.IO event handlers
  io.on("connection", (socket) => {
    logger.info({ id: socket.id }, "🔌 Socket connected");

    // // Register custom handlers
    // registerConversationHandlers(io, socket);
    // registerOnlineUserHandlers(io, socket);
    // registerConversationActiveUsersHandlers(io, socket);
    // registerChatHandlers(io, socket);
    // registerAlertnessHandlers(io, socket);

    // Existing conversation-specific handlers
    socket.on("join:conversation", (conversationId) => {
      socket.join(`conv:${conversationId}`);
      logger.info({ id: socket.id, conversationId }, "Joined conversation");
    });

    socket.on("message:send", ({ conversationId, message }) => {
      io.to(`conv:${conversationId}`).emit("message:new", { conversationId, message });
      logger.info({ conversationId }, "Message sent");
    });

    socket.on("disconnect", (reason) => {
      logger.info({ id: socket.id, reason }, "🔌 Socket disconnected");
    });
  });

  return io;
};