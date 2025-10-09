import { Router } from "express";

import userRouter from "./userRoute.js";
import tnaRouter from "./tnaRoute.js";
import auditRouter from "./auditRoute.js";
import dashboardRouter from "./dashboardRoute.js";
import employeeRouter from "./employeeRoute.js";
import merchandiserRoute from "./merchandiserRoute.js";
import cadRoute from "./cadRoutes.js";
import sampleDevelopmentRoute from "./sampleDevelopementRoutes.js";
import fabricBookingRoute from "./fabricBookingRoute.js";
import dhlTrackingRoute from "./dHLTrackingRoute.js";
import buyerRouter from "./buyerRoutes.js";
import costSheetRoutes from "./costSheetRoutes.js";

const apiRoute = Router();

apiRoute.use("/user", userRouter);
apiRoute.use("/employee", employeeRouter);
apiRoute.use("/tnas", tnaRouter);
apiRoute.use("/audit-logs", auditRouter);
apiRoute.use("/dashboard", dashboardRouter);
apiRoute.use("/merchandiser", merchandiserRoute);
apiRoute.use("/cad", cadRoute);
apiRoute.use("/sample-developments", sampleDevelopmentRoute);
apiRoute.use("/fabric-booking", fabricBookingRoute);
apiRoute.use("/dhl-tracking", dhlTrackingRoute);
apiRoute.use("/buyers", buyerRouter);
apiRoute.use("/cost-sheets", costSheetRoutes);

export default apiRoute;
