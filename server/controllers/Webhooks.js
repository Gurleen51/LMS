import { Webhook } from "svix";
import User from "../models/User.js";

//API Controller Function to mange Clerk User with Database

export const clerkWebhooks = async (req, res) => {
    try {
        // ... (Verification logic) ...
        const {data, type} = req.body

        console.log(`--- Processing Webhook Type: ${type} at ${new Date().toISOString()} ---`) // NEW LOG

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.imageUrl,
                }
                
                try {
                    // This is the Mongoose call that is failing!
                    const newUser = await User.create(userData)
                    console.log(`✅ SUCCESS: User created with ID: ${newUser._id}`);
                } catch (dbError) {
                    // THIS IS WHAT WE NEED TO SEE!
                    console.error("❌ DB CREATE ERROR:", dbError.message); 
                }
                
                // Send success response back to Clerk
                res.status(200).json({ received: true }) 
                break;
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.imageUrl,
                }
                await User.findByIdAndUpdate(data.id, userData)
                res.json({})
                break;
            }

            case 'user.deleted': {
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }
        
            default:
                console.log(`Unhandled type: ${type}`);
                res.status(200).json({ received: true, message: "Unhandled event type" })
                break;
        }
    } catch (error) {
        console.error('🛑 WEBHOOK VERIFICATION/HANDLING FAILED:', error.message)
        // Send a non-200 status for serious errors.
        res.status(400).json({ success: false, message: error.message })
    }
}