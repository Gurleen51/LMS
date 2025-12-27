import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks, stripeWebhooks } from './controllers/Webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'

// Initialize Express
const app = express()

// Connect to Database
await connectDB()
await connectCloudinary()

app.use(cors())

app.use(
    express.json({
        verify: (req, res, buf) => {
            if (req.originalUrl.startsWith('/clerk')) {
                req.rawBody = buf.toString();
            }
        },
        limit: '5mb', 
    })
);

app.use(clerkMiddleware())

// Routes
app.get('/', (req, res)=> res.send("API Working"))
app.post('/clerk', clerkWebhooks) 
app.use('/api/educator', educatorRouter)
app.use('/api/course', courseRouter)
app.use('/api/user', userRouter)
app.post('/stripe', express.raw({ type: 'application/json'}), stripeWebhooks)

// Port
const PORT = process.env.port || 5000

app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
})