import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import alertsRoute from './routes/alertsRoute.js';
import atmRoutes from './routes/atmRoutes.js';
import { initializeDatabase } from './db/seed.js';


// Load environment variables (optional, but good practice)
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Initialize the database with seed data
initializeDatabase();

// Middleware to parse JSON bodies
app.use(express.json());


app.use(cors());    


//routes
app.use("/atms", atmRoutes);
app.use("/alerts", alertsRoute);

// A simple GET route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Express + TypeScript!');
});

// Start the server
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});