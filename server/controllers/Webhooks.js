import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

// API Controller Function to manage Clerk User with Database
export const clerkWebhooks = async (req, res) => {
    try {
        // Ensure you are using the raw body for signature verification
        const bodyToVerify = req.rawBody ? req.rawBody : JSON.stringify(req.body);
        
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        await whook.verify(bodyToVerify, {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        });

        const { data, type } = req.body;

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name} ${data.last_name}`,
                    imageUrl: data.image_url || data.profile_image_url || null, 
                };
                
                await User.create(userData);
                console.log(`CLERK WEBHOOK: User created: ${data.id}`);
                break;
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name} ${data.last_name}`,
                    imageUrl: data.image_url || data.profile_image_url || null, 
                };
                
                await User.findByIdAndUpdate(data.id, userData);
                console.log(`CLERK WEBHOOK: User updated: ${data.id}`);
                break;
            }

            case 'user.deleted': {
                await User.findByIdAndDelete(data.id);
                console.log(`CLERK WEBHOOK: User deleted: ${data.id}`);
                break;
            }
        
            default:
                break;
        }
        res.json({ success: true });
    } catch (error) {
        console.error('CLERK WEBHOOK ERROR:', error.message);
        res.status(400).json({ success: false, message: error.message }); 
    }
}

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
    console.log('🔥 STRIPE WEBHOOK RECEIVED');

    const sig = request.headers['stripe-signature'];
    let event;

    try {
        // Stripe requires the raw request body (Buffer) for verification
        event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`STRIPE WEBHOOK VERIFICATION ERROR: ${err.message}`); 
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Standard event for Stripe Checkout success
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { purchaseData } = session.metadata;

        try {
            const purchaseId = session.metadata?.purchaseId;
            if (!purchaseId) {
                console.error('❌ purchaseId missing in Stripe metadata');
                return response.json({ received: true });
            }
            
            // Check if purchase exists and isn't already processed
            if (!purchaseData || purchaseData.status === 'completed') {
                return response.json({ received: true });
            }

            const userData = await User.findById(purchaseData.userId);
            const courseData = await Course.findById(purchaseData.courseId);

            if (userData && courseData) {
                // Finalize enrollment in both models
                if (!courseData.enrolledStudents.includes(userData._id)) {
                    courseData.enrolledStudents.push(userData._id);
                }

                if (!userData.enrolledCourses.includes(courseData._id)) {
                    userData.enrolledCourses.push(courseData._id);
                }

                purchaseData.status = 'completed';

                // Save updates simultaneously
                await Promise.all([
                    courseData.save(),
                    userData.save(),
                    purchaseData.save()
                ]);

                console.log(`STRIPE WEBHOOK: Enrollment finalized for purchase ${purchaseId}`);
            }
        } catch (dbError) {
            console.error("STRIPE WEBHOOK DB ERROR:", dbError.message);
            return response.status(500).json({ success: false });
        }
    } else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
        // Handle failed or expired sessions
        const session = event.data.object;
        const purchaseId = session.metadata?.purchaseId;
        if (purchaseId) {
            await Purchase.findByIdAndUpdate(purchaseId, { status: 'failed' });
        }
    }

    response.json({ received: true });