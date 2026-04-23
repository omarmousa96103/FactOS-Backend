const axios = require('axios')

const FACT_CHECK_PROMPT = `
You are FactOS AI, a strict fact-checking assistant.
When given a claim, respond ONLY with valid JSON:
{
  "verdict": "Confirmed" or "False" or "Rumored" or "Unverified",
  "explanation": "2-3 sentence explanation",
  "sources": ["source1", "source2"],
  "confidence": 0-100
}
`

const BATCH_CATEGORIZE_PROMPT = `
You are a news categorization assistant.
Given a list of articles, respond ONLY with a valid JSON array where each item has:
{
  "category": "Sport" or "Economy" or "Politics" or "Fashion" or "World" or "Celebrity" or "General",
  "status": "Confirmed" or "Rumored" or "Not Confirmed" or "Unverified"
}

Category rules:
- Sport: football, basketball, tennis, cricket, F1, Olympics, athlete, match, tournament, league, score, team
- Economy: stock market, GDP, inflation, interest rates, trade, currency, gold, oil prices, banks, finance
- Politics: elections, government, president, prime minister, parliament, policy, law, military, war, diplomacy
- Celebrity: actors, musicians, singers, influencers, awards, entertainment, red carpet, film stars
- Fashion: clothing, runway, designer, fashion week, style, beauty, trends
- World: international news, disasters, climate, health, science, technology
- General: only if none of the above apply

Status rules:
- Confirmed: major outlet reporting concrete facts
- Rumored: speculative, anonymous sources, words like "reportedly" or "allegedly"
- Not Confirmed: directly contradicted by official sources
- Unverified: unclear or insufficient information

Return ONLY a JSON array with exactly the same number of items as the input. No extra text.
`

const batchCategorizeArticles = async (articles) => {
    try {
        // split into chunks of 25 if more than 25
        const CHUNK_SIZE = 25
        const chunks     = []

        for (let i = 0; i < articles.length; i += CHUNK_SIZE) {
            chunks.push(articles.slice(i, i + CHUNK_SIZE))
        }

        const allEnriched = []

        for (const chunk of chunks) {
            const input = chunk.map((a, i) => (
                `${i}. Headline: ${a.headline}\nSummary: ${a.summary?.slice(0, 100) || ''}\nSource: ${a.source}`
            )).join('\n\n')

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model:    'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: BATCH_CATEGORIZE_PROMPT },
                        { role: 'user',   content: input },
                    ],
                    max_tokens: 2000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
                        'Content-Type':  'application/json',
                    }
                }
            )

            const raw     = response.data.choices[0].message.content
            const cleaned = raw.replace(/```json|```/g, '').trim()
            const results = JSON.parse(cleaned)

            const enriched = chunk.map((article, i) => ({
                ...article,
                category: results[i]?.category || 'General',
                status:   results[i]?.status   || 'Unverified',
            }))

            allEnriched.push(...enriched)

            // small delay between chunks to avoid rate limiting
            if (chunks.length > 1) {
                await new Promise((r) => setTimeout(r, 1000))
            }
        }

        return allEnriched
    } catch (error) {
        console.error('Batch categorize error:', error.message)
        return articles
    }
}

const factCheckWithAI = async (query) => {
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model:    'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: FACT_CHECK_PROMPT },
                    { role: 'user',   content: query },
                ],
                max_tokens: 300,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_KEY}`,
                    'Content-Type':  'application/json',
                }
            }
        )

        const raw     = response.data.choices[0].message.content
        const cleaned = raw.replace(/```json|```/g, '').trim()
        return JSON.parse(cleaned)
    } catch (error) {
        console.error('AI error:', error.message)
        return {
            verdict:     'Unverified',
            explanation: 'Unable to process this claim at the moment.',
            sources:     [],
            confidence:  0,
        }
    }
}

module.exports = { factCheckWithAI, batchCategorizeArticles }