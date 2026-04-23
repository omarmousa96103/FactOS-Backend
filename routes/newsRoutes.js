const express = require('express')
const router = express.Router()
const { getNews, searchNews, getNewsById } = require('../controllers/newsController')

router.get('/',        getNews)
router.get('/search',  searchNews)
router.get('/:id',     getNewsById)

module.exports = router