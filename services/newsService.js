const axios = require('axios')

const normalizeGNews = (a) => ({
    headline:    a.title,
    summary:     a.description,
    source:      a.source.name,
    url:         a.url,
    image:       a.image,
    category:    'General',
    status:      'Unverified',
    publishedAt: a.publishedAt,
})

const normalizeCurrents = (a) => ({
    headline:    a.title,
    summary:     a.description,
    source:      a.author || 'Currents',
    url:         a.url,
    image:       a.image || '',
    category:    'General',
    status:      'Unverified',
    publishedAt: a.published,
})

const fetchGNews = async (query = 'latest') => {
    try {
        const res = await axios.get('https://gnews.io/api/v4/search', {
            params: {
                q:     query,
                token: process.env.GNEWS_KEY,
                lang:  'en',
                max:   10, // GNews free tier max is 10
            }
        })
        return res.data.articles.map(normalizeGNews)
    } catch (error) {
        console.error('GNews error:', error.message)
        return []
    }
}

const fetchCurrents = async (query = 'latest') => {
    try {
        const res = await axios.get('https://api.currentsapi.services/v1/search', {
            params: {
                apiKey:   process.env.CURRENTS_KEY,
                keywords: query,
                language: 'en',
                page_size: 20,
            }
        })
        return res.data.news.map(normalizeCurrents)
    } catch (error) {
        console.error('Currents error:', error.message)
        return []
    }
}

const fetchCurrentsLatest = async () => {
    try {
        const res = await axios.get('https://api.currentsapi.services/v1/latest-news', {
            params: {
                apiKey:   process.env.CURRENTS_KEY,
                language: 'en',
                page_size: 20,
            }
        })
        return res.data.news.map(normalizeCurrents)
    } catch (error) {
        console.error('Currents latest error:', error.message)
        return []
    }
}

const fetchAllNews = async (query = 'latest') => {
    const isLatest = query === 'latest'

    const [gnews, currents] = await Promise.allSettled([
        fetchGNews(query),
        isLatest ? fetchCurrentsLatest() : fetchCurrents(query),
    ])

    return [
        ...(gnews.status    === 'fulfilled' ? gnews.value    : []),
        ...(currents.status === 'fulfilled' ? currents.value : []),
    ]
}

module.exports = { fetchAllNews, fetchGNews, fetchCurrents }