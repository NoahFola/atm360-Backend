import express from 'express';
// Import the new controller functions
import { getAllAtms, createAtm, updateAtm, deleteAtm, getAtmById, getAtmPredictions, getAtmTelemetry, simulateFaults } from '../controllers/atmController.js';


const router = express.Router();


router.get('/', getAllAtms);
router.get('/predictions', getAtmPredictions);
router.get('/telemetry', getAtmTelemetry);
router.post('/simulate/faults', simulateFaults);

router.get('/:id', getAtmById);
router.post('/', createAtm);
router.patch('/:id', updateAtm);
router.delete('/:id', deleteAtm);



export default router;