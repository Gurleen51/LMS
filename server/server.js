import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import connectDB from './configs/mongodb.js';
import connectCloudinary from './configs/cloudinary.js';

import { clerkMiddleware } from '@clerk/express';
import { clerkWebhooks, stripeWebhooks } from './controllers/Webhooks.js';

import educatorRouter from './routes/educatorRoutes.js';
import courseRouter from './routes/courseRoute.js';
import userRouter from './routes/userRoutes.js';

const app = express();

/* =========================
   DATABASE & CLOUDINARY
   ========================= */
await connectDB();
await connectCloudinary();

/* =========================
   CORS (MUST BE FIRST)
   ========================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server, Stripe, Clerk, preflight
      if (!origin) return callback(null, true);

      if (origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }

      // allow localhost for dev
      if (origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      return callback(null, true); // ⬅ TEMP: allow all to unblock you
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());


// handle preflight requests
app.options('*', cors());

/* =========================
   STRIPE WEBHOOK (RAW BODY)
   ========================= */
app.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhooks
);

/* =========================
   CLERK WEBHOOK (RAW BODY)
   ========================= */
app.post(
  '/clerk',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
  clerkWebhooks
);

/* =========================
   NORMAL JSON PARSER
   ========================= */
app.use(express.json({ limit: '5mb' }));

/* =========================
   CLERK AUTH MIDDLEWARE
   ========================= */
app.use(clerkMiddleware());

/* =========================
   ROUTES
   ========================= */
app.get('/', (req, res) => {
  res.send('API Working');
});

app.use('/api/educator', educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);

/* =========================
   SERVER
   ========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
