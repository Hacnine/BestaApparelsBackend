// routes/index.js
import { Router } from "express";

import userRouter from "./userRoute.js";
import tnaRouter from "./tnaRoute.js";
import auditRouter from "./auditRoute.js";
import dashboardRouter from "./dashboardRoute.js";

const apiRoute = Router();

// Mount all API routes
apiRoute.use("/user", userRouter);
apiRoute.use("/tnas", tnaRouter);
apiRoute.use("/audit-logs", auditRouter);
apiRoute.use("/dashboard", dashboardRouter);

export default apiRoute;
