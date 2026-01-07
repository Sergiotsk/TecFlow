const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually read .env.local because dotenv might not be set up for this standalone script
try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);

    if (match && match[1]) {
        const apiKey = match[1].trim();
        console.log("API Key found (length):", apiKey.length);

        const genAI = new GoogleGenerativeAI(apiKey);

        async function list() {
            try {
                // Using a known model availability check or just standard list if available in SDK ?
                // The SDK doesn't expose listModels directly on the main class easily in standard docs sometimes, 
                // but let's try the model manager if it exists, or just try generating with a known safe model.
                // Actually standard way is via GET request usually, but let's try to just hit 'gemini-1.5-flash' and 'gemini-pro' specifically.

                const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-pro'];

                console.log("Testing models...");

                for (const modelName of models) {
                    console.log(`\nTesting ${modelName}...`);
                    try {
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent("Hello?");
                        const response = await result.response;
                        console.log(`SUCCESS: ${modelName} responded: ${response.text()}`);
                    } catch (e) {
                        console.error(`FAILED: ${modelName}`);
                        console.error(e.message);
                    }
                }

                try {
                    console.log("\nAttempting to list models via API...");
                    // Basic fetch to list models
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const data = await response.json();
                    if (data.models) {
                        console.log("Available Models:");
                        data.models.forEach(m => console.log(` - ${m.name} (${m.supportedGenerationMethods?.join(', ')})`));
                    } else {
                        console.log("Could not list models. Response:", JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("List Models Error:", err);
                }
            } catch (error) {
                console.error("Script Error:", error);
            }
        }

        list();

    } else {
        console.error("Could not find GEMINI_API_KEY in .env.local");
    }
} catch (err) {
    console.error("Error reading .env.local:", err);
}
