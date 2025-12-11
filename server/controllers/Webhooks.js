// controllers/Webhooks.js

import { Webhook } from "svix";
import User from "../models/User.js";

// API Controller Function to manage Clerk User with Database

export const clerkWebhooks = async (req, res) => {
    try{
        // --- 1. Webhook Verification ---
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
        
        // This will throw an error if verification fails (secret/signature mismatch)
        await whook.verify(JSON.stringify(req.body),{
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        })
        
        const {data, type} = req.body
        
        console.log(`--- ✅ Webhook Verified. Processing Type: ${type} ---`)

        // --- 2. Handle Event Type ---
        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url || data.profile_image_url || 'default-url.png', // Added fallback for imageUrl
                }

                // Nested Try/Catch to isolate database errors
                try {
                    const newUser = await User.create(userData)
                    console.log(`✅ SUCCESS: User created in DB with ID: ${newUser._id}`);
                } catch (dbError) {
                    // This log captures Mongoose errors (E11000 duplicate key, validation errors)
                    console.error("❌ DB CREATE ERROR:", dbError.message);
                    
                    // You might choose to send a 200/202 status back to Clerk 
                    // even on a DB failure if you don't want Clerk to retry the webhook repeatedly.
                }

                // Send success response back to Clerk
                res.status(200).json({ received: true, event: type }) 
                break;
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url || data.profile_image_url || 'default-url.png', // Added fallback
                }
                
                try {
                    await User.findByIdAndUpdate(data.id, userData)
                    console.log(`✅ SUCCESS: User updated in DB with ID: ${data.id}`);
                } catch (dbError) {
                    console.error("❌ DB UPDATE ERROR:", dbError.message);
                }

                res.status(200).json({ received: true, event: type })
                break;
            }

            case 'user.deleted': {
                try {
                    await User.findByIdAndDelete(data.id)
                    console.log(`✅ SUCCESS: User deleted in DB with ID: ${data.id}`);
                } catch (dbError) {
                    console.error("❌ DB DELETE ERROR:", dbError.message);
                }
                
                res.status(200).json({ received: true, event: type })
                break;
            }
        
            default:
                console.log(`ℹ️ Unhandled event type: ${type}`);
                res.status(200).json({ received: true, message: `Unhandled event type: ${type}` })
                break;
        }

    } catch (error) {
        // --- 3. Verification or General Error Catch ---
        console.error('🛑 WEBHOOK FAILED (Verification or General Error):', error.message)
        // Send an error response for verification failure.
        res.status(400).json({ success: false, message: error.message })
    }
}