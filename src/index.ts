import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables (optional, but good practice)
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());


app.use(cors);

// A simple GET route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Express + TypeScript!');
});

// Start the server
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});