const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const connectDB = require('./config/db')
const EventEmitter = require('events')
EventEmitter.defaultMaxListeners = 20

dotenv.config()
connectDB()

const app = express()

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://fact-os.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(express.json())

app.use('/api/auth',      require('./routes/authRoutes'))
app.use('/api/news',      require('./routes/newsRoutes'))
app.use('/api/factcheck', require('./routes/factCheckRoutes'))
app.use('/api/user',      require('./routes/userRoutes'))

app.get('/', (req, res) => {
    res.json({ message: 'FactOS API is running' })
})

app.use(require('./middleware/errorMiddleware'))

const PORT = process.env.PORT || 8080
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))