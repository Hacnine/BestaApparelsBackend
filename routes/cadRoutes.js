import express from 'express';
import { createCadApproval, getCadApproval } from '../controllers/cadController.js';
import { createSampleDevelopment } from '../controllers/sampleDevelopementController.js';
import { createFabricBooking, getFabricBooking } from '../controllers/fabricBookingController.js';


const cadRoute = express.Router();
cadRoute.post('/cad-approval', createCadApproval);
cadRoute.get('/cad-approval', getCadApproval);
cadRoute.post('/fabric-booking', createFabricBooking);
cadRoute.get('/fabric-booking', getFabricBooking);
cadRoute.post('/sample-development', createSampleDevelopment);
export default cadRoute;
