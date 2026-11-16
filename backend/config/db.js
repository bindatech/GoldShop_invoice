const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : undefined;
        if (!mongoUri) {
            console.error("MONGODB_URI is not set in environment variables!");
            return;
        }

        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });

        isConnected = conn.connections[0].readyState;
        console.log(`MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => console.error(`MongoDB error: ${err.message}`));
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
            isConnected = false;
        });

        // Ensure default admin user exists
        try {
            const User = require('../models/User');
            const existingAdmin = await User.findOne({ email: 'binda@gmail.com' });
            if (!existingAdmin) {
                await User.create({
                    email: 'binda@gmail.com',
                    password: '123456',
                    name: 'Binda Jewellers Admin',
                });
                console.log('Default admin created: binda@gmail.com');
            }
        } catch (adminErr) {
            console.error('Error creating default admin:', adminErr.message);
        }
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        // Do NOT call process.exit(1) on Vercel as it crashes the serverless function with 500
    }
};

module.exports = connectDB;
