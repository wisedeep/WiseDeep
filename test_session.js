import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testSessionBooking = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a counsellor and user from the database
    const Counsellor = (await import('./models/Counsellor.js')).default;
    const User = (await import('./models/User.js')).default;

    const counsellor = await Counsellor.findOne({ isApproved: true });
    const user = await User.findOne({ role: 'user' });

    if (!counsellor || !user) {
      console.log('No counsellor or user found in database');
      return;
    }

    console.log('Test counsellor ID:', counsellor._id.toString());
    console.log('Test user ID:', user._id.toString());

    // Test data
    const testData = {
      counsellor: counsellor._id.toString(),
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      startTime: "10:00 AM",
      duration: 60
    };

    console.log('Test data:', testData);

    // Import session route logic
    const { default: router } = await import('./routes/user.js');

    // Mock request and response
    const mockReq = {
      body: testData,
      user: { userId: user._id.toString() }
    };

    let mockRes = {
      json: (data) => console.log('Response:', data),
      status: (code) => {
        console.log('Status code:', code);
        return mockRes;
      }
    };

    // Find the sessions post route
    const sessionRoute = router.stack.find(layer =>
      layer.route && layer.route.path === '/sessions' && layer.route.methods.post
    );

    if (sessionRoute) {
      console.log('Found session route, executing...');
      await sessionRoute.route.stack[0].handle(mockReq, mockRes);
    } else {
      console.log('Session route not found');
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

testSessionBooking();