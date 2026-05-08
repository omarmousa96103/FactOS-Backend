const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const connectDB = require('./config/db')
const EventEmitter = require('events')
EventEmitter.defaultMaxListeners = 20

dotenv.config()

connectDB()

const app = express()

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://your-vercel-app.vercel.app',
    ],
    credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/auth',      require('./routes/authRoutes'))
app.use('/api/news',      require('./routes/newsRoutes'))
app.use('/api/factcheck', require('./routes/factCheckRoutes'))
app.use('/api/user',      require('./routes/userRoutes'))

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'FactOS API is running' })
})

// Error middleware
app.use(require('./middleware/errorMiddleware'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))