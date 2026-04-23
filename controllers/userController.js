const User = require('../models/User')

// @desc   Get user profile
// @route  GET /api/user/profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password')
        if (!user) return res.status(404).json({ message: 'User not found' })
        res.json(user)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// @desc   Update user profile
// @route  PUT /api/user/profile
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
        if (!user) return res.status(404).json({ message: 'User not found' })

        const { firstName, lastName, email, preferences, notifications } = req.body

        if (firstName)     user.firstName     = firstName
        if (lastName)      user.lastName      = lastName
        if (email)         user.email         = email
        if (preferences)   user.preferences   = { ...user.preferences,   ...preferences }
        if (notifications) user.notifications = { ...user.notifications, ...notifications }

        const updated = await user.save()

        res.json({
            _id:           updated._id,
            firstName:     updated.firstName,
            lastName:      updated.lastName,
            email:         updated.email,
            preferences:   updated.preferences,
            notifications: updated.notifications,
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// @desc   Update password
// @route  PUT /api/user/password
const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
        if (!user) return res.status(404).json({ message: 'User not found' })

        const { currentPassword, newPassword } = req.body

        const isMatch = await user.matchPassword(currentPassword)
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' })
        }

        user.password = newPassword
        await user.save()

        res.json({ message: 'Password updated successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports = { getProfile, updateProfile, updatePassword }