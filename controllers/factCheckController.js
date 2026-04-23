const { factCheckWithAI } = require('../services/aiService')

// @desc   Fact check a claim
// @route  POST /api/factcheck
const factCheck = async (req, res) => {
    try {
        const { query } = req.body

        if (!query) {
            return res.status(400).json({ message: 'Query is required' })
        }

        const result = await factCheckWithAI(query)
        res.json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports = { factCheck }