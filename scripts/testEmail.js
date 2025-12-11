import dotenv from 'dotenv';
dotenv.config();

import { sendVerificationEmail } from '../utils/emailService.js';

// Test email sending
async function testEmail() {
    console.log('\n🧪 Testing Email Service Configuration...\n');

    console.log('Configuration:');
    console.log('  EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('  EMAIL_USER:', process.env.EMAIL_USER);
    console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***configured***' : 'NOT SET');
    console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('  FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('\n');

    try {
        // Send a test verification email
        const testEmail = process.env.EMAIL_USER; // Send to yourself for testing
        const testToken = 'test-token-12345';

        console.log(`📧 Sending test verification email to: ${testEmail}\n`);

        await sendVerificationEmail(testEmail, 'Test User', testToken);

        console.log('\n✅ Email sent successfully!');
        console.log('\n📬 Check your inbox at:', testEmail);
        console.log('   Subject: "Verify Your WiseDeep Account"');
        console.log('   From:', process.env.EMAIL_FROM);
        console.log('\n✨ Email service is working correctly!\n');

    } catch (error) {
        console.error('\n❌ Email test failed:', error.message);
        console.error('\nPossible issues:');
        console.error('  - Check Gmail app password is correct');
        console.error('  - Ensure 2-factor authentication is enabled on Gmail');
        console.error('  - Verify "Less secure app access" is not blocking (if applicable)');
        console.error('  - Check internet connection\n');
    }
}

testEmail();
