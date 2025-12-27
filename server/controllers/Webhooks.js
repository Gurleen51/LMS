import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

//API Controller Function to mange Clerk Usr with Database
export const clerkWebhooks = async (req, res) => {
    try{
        const bodyToVerify = req.rawBody ? req.rawBody : JSON.stringify(req.body);
        
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        await whook.verify(bodyToVerify, {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        })

        const {data, type} = req.body

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.imageUrl || data.profile_image_url || null, 
                }
                
                try {
                    await User.create(userData)
                    console.log(`CLERK WEBHOOK: User created and synced: ${data.id}`);
                } catch (dbError) {
                    console.error("CLERK WEBHOOK DB ERROR (Create):", dbError.message);
                    return res.status(500).json({ success: false, message: 'DB Sync Failed' });
                }
                
                res.json({ success: true, received: true })
                break;
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.imageUrl || data.profile_image_url || null, 
                }
                
                try {
                    await User.findByIdAndUpdate(data.id, userData, { new: true, upsert: true })
                    console.log(`CLERK WEBHOOK: User updated: ${data.id}`);
                } catch (dbError) {
                    console.error("CLERK WEBHOOK DB ERROR (Update):", dbError.message);
                    return res.status(500).json({ success: false, message: 'DB Sync Failed' });
                }

                res.json({ success: true, received: true })
                break;
            }

            case 'user.deleted': {
                try {
                    await User.findByIdAndDelete(data.id)
                    console.log(`CLERK WEBHOOK: User deleted: ${data.id}`);
                } catch (dbError) {
                    console.error("CLERK WEBHOOK DB ERROR (Delete):", dbError.message);
                    return res.status(500).json({ success: false, message: 'DB Sync Failed' });
                }

                res.json({ success: true, received: true })
                break;
            }
        
            default:
                console.log(`CLERK WEBHOOK: Unhandled event type ${type}`);
                res.json({ success: true, received: true, message: `Unhandled event: ${type}`})
                break;
        }
    } catch (error) {
        console.error('CLERK WEBHOOK VERIFICATION/GENERAL ERROR:', error.message)
        res.status(400).json({success: false, message:error.message}) 
    }
}


const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async(request, response)=>{
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error(`STRIPE WEBHOOK ERROR: ${err.message}`); 
        response.status(400).send(`Webhook Error: ${err.message}`);
        return; 
    }

    switch (event.type) {
        case 'payment_intent.succeeded':{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            const sessionList = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId,
                limit: 1 
            })

            if (!sessionList.data || sessionList.data.length === 0 || !sessionList.data[0].metadata) {
                console.error("STRIPE WEBHOOK FAILED: Could not retrieve session metadata.");
                return response.json({ received: true }); 
            }

            const { purchaseId } = sessionList.data[0].metadata;

            try {
                const purchaseData = await Purchase.findById(purchaseId)
                const userData = await User.findById(purchaseData.userId)
                const courseData = await Course.findById(purchaseData.courseId) 

                if (!userData || !courseData) {
                    console.error(`STRIPE WEBHOOK FAILED: User or Course data missing for purchaseId: ${purchaseId}`);
                    return response.json({ received: true }); 
                }

                courseData.enrolledStudents.push(userData._id); 
                await courseData.save();

                userData.enrolledCourses.push(courseData._id);
                await userData.save();

                purchaseData.status = 'completed';
                await purchaseData.save();

                console.log(`STRIPE WEBHOOK: Purchase ${purchaseId} completed and enrollment finalized.`);

            } catch (dbError) {
                console.error("STRIPE WEBHOOK DB ERROR:", dbError.message);
            }
            break;
        }

        case 'payment_intent.payment_failed':{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            const sessionList = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId,
                limit: 1
            })

            if (!sessionList.data || sessionList.data.length === 0 || !sessionList.data[0].metadata) {
                return response.json({ received: true });
            }

            const { purchaseId } = sessionList.data[0].metadata;
            
            try {
                const purchaseData = await Purchase.findById(purchaseId)
                if (purchaseData) {
                    purchaseData.status = 'failed';
                    await purchaseData.save();
                    console.log(`STRIPE WEBHOOK: Purchase ${purchaseId} marked as failed.`);
                }
            } catch (dbError) {
                console.error("STRIPE WEBHOOK DB ERROR (Failed):", dbError.message);
            }
            break;
        }
        
        default:
            console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
    }

    response.json({received: true});
}