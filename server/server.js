import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import connectCloudinary from './configs/cloudinary.js';
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhooks, stripeWebhooks } from './controllers/Webhooks.js';

const app = express();

await connectDB();
await connectCloudinary();

//STRIPE WEBHOOK (RAW BODY)
app.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhooks
);

//CLERK WEBHOOK (RAW BODY)
app.post(
  '/clerk',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
  clerkWebhooks
);

//NORMAL MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(clerkMiddleware());

//ROUTES
app.get('/', (req, res) => res.send('API Working'));
app.use('/api/educator', educatorRouter);
app.use('/api/course', courseRouter);
app.use('/api/user', userRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
