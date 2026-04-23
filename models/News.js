const mongoose = require('mongoose')

const newsSchema = new mongoose.Schema({
    headline: {
        type: String,
        required: true,
        trim: true,
    },
    summary: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        default: '',
    },
    image: {
        type: String,
        default: '',
    },
    category: {
        type: String,
        enum: ['Sport', 'Economy', 'Politics', 'Fashion', 'World', 'Celebrity', 'General'],
        default: 'General',
    },
    status: {
        type: String,
        enum: ['Confirmed', 'Rumored', 'Not Confirmed', 'Unverified'],
        default: 'Unverified',
    },
    featured: {
        type: Boolean,
        default: false,
    },
    publishedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true })

newsSchema.index({ headline: 'text', summary: 'text' })

module.exports = mongoose.model('News', newsSchema)