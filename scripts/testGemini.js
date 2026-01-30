import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

dotenv.config();

const logError = (message) => {
    fs.appendFileSync('scripts/gemini_error.txt', message + '\n');
    console.log(message);
};

// Clear previous log
if (fs.existsSync('scripts/gemini_error.txt')) {
    fs.unlinkSync('scripts/gemini_error.txt');
}

const testSpecificModel = async (modelName) => {
    logError(`🔥 Testing Specific Model: ${modelName}...`);
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        logError("❌ GOOGLE_API_KEY is missing.");
        return false;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        logError(`📤 Sending 'Hello' to ${modelName}...`);
        const result = await model.generateContent("Hello");
        const response = await result.response;
        const text = response.text();

        logError(`✅ ${modelName} Response Received: ${text.substring(0, 100)}...`);
        return true;

    } catch (error) {
        logError(`❌ ${modelName} Failed:`);
        logError(`   Status: ${error.status}`);
        logError(`   Message: ${error.message}`);
        return false;
    }
};

testSpecificModel("gemini-flash-latest");
