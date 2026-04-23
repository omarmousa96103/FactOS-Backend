const User = require('../models/User')
const jwt = require('jsonwebtoken')

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// @desc    Register a new user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'Please fill in all fields' })
        }

        const userExists = await User.findOne({ email })
        if (userExists) {
            return res.status(400).json({ message: 'An account with this email already exists' })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' })
        }

        const user = await User.create({ firstName, lastName, email, password })

        res.status(201).json({
            _id:       user._id,
            firstName: user.firstName,
            lastName:  user.lastName,
            email:     user.email,
            token:     generateToken(user._id),
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// @desc    Login a user
// @route   POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: 'Please fill in all fields' })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' })
        }

        const isMatch = await user.matchPassword(password)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' })
        }

        res.json({
            _id:       user._id,
            firstName: user.firstName,
            lastName:  user.lastName,
            email:     user.email,
            token:     generateToken(user._id),
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports = { signup, login }