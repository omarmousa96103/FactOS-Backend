const { fetchAllNews }            = require('../services/newsService')
const { batchCategorizeArticles } = require('../services/aiService')
const News                        = require('../models/News')

let isFetching = false

const regionQueryMap = {
    'Global':        'world news',
    'Middle East':   'Middle East news',
    'Europe':        'Europe news',
    'North America': 'North America news',
    'Asia':          'Asia news',
    'Africa':        'Africa news',
}

const areSimilar = (a, b, sourceA, sourceB) => {
    if (sourceA === sourceB) {
        const wordsA = a.toLowerCase().split(' ')
        const wordsB = new Set(b.toLowerCase().split(' '))
        const matches = wordsA.filter((w) => wordsB.has(w)).length
        return matches / Math.max(wordsA.length, wordsB.size) > 0.4
    }
    const wordsA = a.toLowerCase().split(' ')
    const wordsB = new Set(b.toLowerCase().split(' '))
    const matches = wordsA.filter((w) => wordsB.has(w)).length
    return matches / Math.max(wordsA.length, wordsB.size) > 0.6
}

const deduplicateAndMerge = (articles) => {
    const merged = []
    for (const article of articles) {
        const existing = merged.find((m) =>
            areSimilar(m.headline, article.headline, m.source, article.source)
        )
        if (existing) {
            if (!existing.sources) existing.sources = [existing.source]
            if (!existing.sources.includes(article.source)) {
                existing.sources.push(article.source)
            }
        } else {
            merged.push({ ...article, sources: [article.source] })
        }
    }
    return merged
}

const fetchAndEnrich = async (query) => {
    const fresh    = await fetchAllNews(query)
    const deduped  = deduplicateAndMerge(fresh)
    console.log(`Enriching ${deduped.length} articles with AI...`)
    const enriched = await batchCategorizeArticles(deduped)
    if (enriched.length > 0) {
        await News.insertMany(enriched, { ordered: false }).catch(() => {})
    }
    return enriched
}

const getNews = async (req, res) => {
    try {
        const { category, status, q, tab, region, country } = req.query

        // build search query based on active tab
        let searchQuery = 'latest'
        if (tab === 'popular')              searchQuery = 'most popular news today'
        if (tab === 'regional' && region)   searchQuery = regionQueryMap[region] || 'world news'
        if (tab === 'local'    && country)  searchQuery = `${country} news`
        if (q)                              searchQuery = q

        // build DB filter
        const filter = { category: { $ne: 'General' } }
        if (category) filter.category = category
        if (status)   filter.status   = status
        if (country)  filter.headline = { $regex: country, $options: 'i' }

        // return cached articles if we have enough
        const local = await News.find(filter)
            .sort({ publishedAt: -1 })
            .limit(200)

        if (local.length >= 10) {
            let articles = local.map((a) => a.toObject())

            // popular: sort by number of sources covering the story
            if (tab === 'popular') {
                articles = articles.sort((a, b) =>
                    (b.sources?.length || 1) - (a.sources?.length || 1)
                )
            }

            const deduplicated = deduplicateAndMerge(articles)

            // if filter returns too few results fetch more in background
            if (category && deduplicated.length < 5 && !isFetching) {
                isFetching = true
                fetchAndEnrich(`${category} news`)
                    .finally(() => { isFetching = false })
            }

            return res.json(deduplicated.slice(0, 50))
        }

        // if another request is already fetching just wait
        if (isFetching) {
            await new Promise((r) => setTimeout(r, 6000))
            const retried      = await News.find(filter).sort({ publishedAt: -1 }).limit(200)
            const deduplicated = deduplicateAndMerge(retried.map((a) => a.toObject()))
            return res.json(deduplicated.slice(0, 50))
        }

        // fetch fresh articles from APIs and enrich with AI
        isFetching = true
        try {
            await fetchAndEnrich(searchQuery)
        } finally {
            isFetching = false
        }

        const saved        = await News.find(filter).sort({ publishedAt: -1 }).limit(200)
        const deduplicated = deduplicateAndMerge(saved.map((a) => a.toObject()))

        // popular sort on fresh fetch
        if (tab === 'popular') {
            deduplicated.sort((a, b) =>
                (b.sources?.length || 1) - (a.sources?.length || 1)
            )
        }

        res.json(deduplicated.slice(0, 50))
    } catch (error) {
        isFetching = false
        res.status(500).json({ message: error.message })
    }
}

const searchNews = async (req, res) => {
    try {
        const { q } = req.query
        if (!q) return res.status(400).json({ message: 'Query required' })

        const local = await News.find({
            $text: { $search: q }
        }).limit(100)

        if (local.length > 0) {
            const deduplicated = deduplicateAndMerge(local.map((a) => a.toObject()))
            return res.json(deduplicated)
        }

        // not in DB so fetch from APIs and enrich
        const fresh    = await fetchAllNews(q)
        const deduped  = deduplicateAndMerge(fresh)
        const enriched = await batchCategorizeArticles(deduped)

        res.json(enriched)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const getNewsById = async (req, res) => {
    try {
        const article = await News.findById(req.params.id)
        if (!article) return res.status(404).json({ message: 'Article not found' })
        res.json(article)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports = { getNews, searchNews, getNewsById }