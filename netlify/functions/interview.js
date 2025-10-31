// Use dynamic import for node-fetch, required for v3+
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// The Gemini API model and URL
const apiModel = "gemini-2.5-flash-preview-09-2025";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // --- THIS IS THE SECURE PART ---
    // It reads the key from Netlify's settings, not from the code.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "API key is not set. Set GEMINI_API_KEY in Netlify env variables." })
        };
    }
    // ---------------------------------

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Bad request: Invalid JSON." }) };
    }

    const { userPrompt, systemPrompt } = body;
    if (!userPrompt || !systemPrompt) {
        return { statusCode: 400, body: JSON.stringify({ error: "Bad request: Missing prompts." }) };
    }

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

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
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
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

