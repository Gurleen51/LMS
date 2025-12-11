import { Webhook } from "svix";
import User from "../models/User.js";

//API Controller Function to mange Clerk User with Database

export const clerkWebhooks = async (req, res) => {
    console.log("🔥 Webhook Request Received!");
    try{
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        console.log(`--- Received Webhook Type: ${type} ---`)

        await whook.verify(JSON.stringify(req.body),{
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
                    imageUrl: data.imageUrl,
                }
                try {
                    const newUser = await User.create(userData)
                    console.log(`✅ SUCCESS: User created with ID: ${newUser._id}`);
                } catch (dbError) {
                    console.error("❌ DB CREATE ERROR:", dbError.message);
                }
                res.json({})
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
                break;
        }
    } catch (error) {
        console.error('Webhook Error:', error.message)
        res.json({success: false, message:error.message})
    }
}