// api/groq.js - Vercel Serverless Function (Node.js)

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, model = 'openai/gpt-oss-120b', temperature = 0.7, max_tokens = 350 } = req.body;

        // ✅ API key Environment Variable থেকে পড়া হচ্ছে
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
                top_p: 0.9
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Groq API Error:', data);
            return res.status(response.status).json({ error: data });
        }

        const reply = data.choices?.[0]?.message?.content?.trim() || '';
        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
