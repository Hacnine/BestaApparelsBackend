import express from 'express';
import { createCadApproval } from '../controllers/cadController.js';
import { createSampleDevelopment } from '../controllers/sampleDevelopementController.js';


const cadRoute = express.Router();
cadRoute.post('/cad-approval', createCadApproval);
cadRoute.post('/sample-development', createSampleDevelopment);
export default cadRoute;
