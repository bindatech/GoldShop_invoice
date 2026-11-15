const mongoose = require("mongoose")

const connectDB = async()=>{
    try{
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : undefined;
        const conn = await mongoose.connect(mongoUri, { family: 4, serverSelectionTimeoutMS: 15000 });
        console.log(`MongoDB connected: ${conn.connection.host}`);
        mongoose.connection.on('error', (err) => console.error(`MongoDB error: ${err.message}`));
        mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

        // Ensure default admin user exists
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
    }catch(error){
        console.log("mongodb is not connecting", error)
        process.exit(1);
    }
}

module.exports = connectDB