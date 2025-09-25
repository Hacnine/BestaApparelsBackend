import express from 'express';
import { createCadApproval, getCadApproval, updateCadDesign, deleteCadDesign } from '../controllers/cadController.js';
import { createSampleDevelopment, getSampleDevelopment } from '../controllers/sampleDevelopementController.js';
import { createFabricBooking, getFabricBooking } from '../controllers/fabricBookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';


const cadRoute = express.Router();
cadRoute.use(requireAuth)
cadRoute.post('/cad-approval', createCadApproval);
cadRoute.get('/cad-approval', getCadApproval);
cadRoute.post('/fabric-booking', createFabricBooking);
cadRoute.get('/fabric-booking', getFabricBooking);
cadRoute.post('/sample-development', createSampleDevelopment);
cadRoute.get('/get-sample-development', getSampleDevelopment);
cadRoute.patch('/update-cad-design/:id', updateCadDesign);
cadRoute.delete('/cad-approval/:id', deleteCadDesign);
export default cadRoute;
