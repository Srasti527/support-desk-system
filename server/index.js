import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// Allow the frontend (running on a different port) to talk to this backend
app.use(cors());

// Allow the server to understand JSON data sent in requests
app.use(express.json());

// -------------------------------------------------------
// Health-check route
// Visit http://localhost:5000/api/health in your browser
// to confirm the backend is running.
// -------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Support Desk backend is running!',
    timestamp: new Date().toISOString(),
  });
});

// Start the server and listen for requests on PORT 5000
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
