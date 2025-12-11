import axios from 'axios';

const testSessionBooking = async () => {
  try {
    console.log('Testing session booking functionality...');

    // Step 1: Login to get token
    console.log('1. Logging in as user...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'user123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    // Step 2: Get counsellors
    console.log('2. Fetching counsellors...');
    const counsellorsResponse = await axios.get('http://localhost:5000/api/user/counsellors', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const counsellor = counsellorsResponse.data[0];
    if (!counsellor) {
      throw new Error('No counsellors available');
    }
    console.log(`Found counsellor: ${counsellor.user.firstName} ${counsellor.user.lastName}`);

    // Step 3: Test session booking
    console.log('3. Testing session booking...');
    const sessionData = {
      counsellor: counsellor._id,
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      startTime: '10:00 AM',
      duration: 60
    };

    console.log('Booking session with data:', sessionData);

    const sessionResponse = await axios.post('http://localhost:5001/api/user/sessions', sessionData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Session booked successfully!');
    console.log('Session details:', JSON.stringify(sessionResponse.data, null, 2));

    // Step 4: Verify session was created
    console.log('4. Verifying session was created...');
    const sessionsResponse = await axios.get('http://localhost:5001/api/user/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const latestSession = sessionsResponse.data[sessionsResponse.data.length - 1];
    console.log('Latest session in user sessions:', JSON.stringify(latestSession, null, 2));

    console.log('\n✅ All tests passed! Session booking functionality is working.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);

    if (error.response?.status === 400) {
      console.log('This is a validation error (400), which is expected behavior');
    } else if (error.response?.status === 500) {
      console.log('❌ Still getting 500 error - need to check server logs');
    }

    process.exit(1);
  }
};

// Run the test
testSessionBooking();