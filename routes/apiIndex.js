
import { Router } from "express";

import userRouter from "./userRoute.js";
import tnaRouter from "./tnaRoute.js";
import auditRouter from "./auditRoute.js";
import dashboardRouter from "./dashboardRoute.js";
import employeeRouter from "./employeeRoute.js";

const apiRoute = Router();

apiRoute.use("/user", userRouter);
apiRoute.use("/employee", employeeRouter);
apiRoute.use("/tnas", tnaRouter);
apiRoute.use("/audit-logs", auditRouter);
apiRoute.use("/dashboard", dashboardRouter);

export default apiRoute;
