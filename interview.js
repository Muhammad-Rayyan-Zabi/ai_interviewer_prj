// This file goes in `netlify/functions/interview.js`

// Use dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// The Gemini API model and URL
const apiModel = "gemini-2.5-flash-preview-09-2025"; // <-- This is the correct model
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`;

exports.handler = async (event) => {
    // 1. Check if it's a POST request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Securely get the API key from Netlify's environment variables
    //    You must set this in your Netlify site settings!
    //    Variable name: GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "API key is not set. Set GEMINI_API_KEY in Netlify environment variables." })
        };
    }

    // 3. Parse the prompts from the HTML file's request
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Bad request: Invalid JSON." }) };
    }

    const { userPrompt, systemPrompt } = body;

    if (!userPrompt || !systemPrompt) {
        return { statusCode: 400, body: JSON.stringify({ error: "Bad request: Missing userPrompt or systemPrompt." }) };
    }

    // 4. Construct the payload for the Gemini API
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    // 5. Call the Gemini API
    try {
        const fullApiUrl = `${apiUrl}?key=${apiKey}`;
        
        const response = await fetch(fullApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();

        // 6. Extract the text and send it back to the HTML file
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            const text = result.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                body: JSON.stringify({ text: text })
            };
        } else {
            throw new Error("Invalid response structure from Google API.");
        }

    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

