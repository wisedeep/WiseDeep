import dotenv from 'dotenv';
dotenv.config();
console.log('GOOGLE_API_KEY loaded:', !!process.env.GOOGLE_API_KEY);

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import counsellorRoutes from './routes/counsellor.js';
import adminRoutes from './routes/admin.js';
import videoCallRoutes from './routes/video-call.js';
import imagekitRoutes from './routes/imagekit.js';
import { setSocketInstance } from './utils/socketUtils.js';
import { setupSocketHandlers } from './utils/socketHandlers.js';

const allowedOrigins = [
  "http://localhost:8083",
  "http://localhost:8084",
  "http://localhost:8085",
  "http://localhost:5173",
  "https://wise-deep.vercel.app",
  "http://wise-deep.vercel.app", // Allow HTTP just in case
  "file://"
];

const app = express();

// Note: Gemini API is now called directly via REST API in routes, no client initialization needed

const server = createServer(app);

// CORS configuration function
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin checks allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Check for Vercel deployments (regex)
    if (origin.match(/^https?:\/\/.*\.vercel\.app$/)) {
      return callback(null, true);
    }

    // Check for localhost (ports can vary)
    if (origin.match(/^http:\/\/localhost:[0-9]+$/)) {
      return callback(null, true);
    }

    // Default: block
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

const io = new Server(server, {
  cors: corsOptions
});

// Initialize socket utility
setSocketInstance(io);
setupSocketHandlers(io);

const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/counsellor', counsellorRoutes);
app.use('/api/video-call', videoCallRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/imagekit', imagekitRoutes);

// WebRTC Signaling Server logic is now in utils/socketHandlers.js

app.get('/', (req, res) => {
  res.json({ message: 'WiseDeep API Server is running' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});