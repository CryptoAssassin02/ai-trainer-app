const express = require('express');
const router = express.Router();

// TODO: Import route modules when implemented
// const authRoutes = require('./auth');
// const workoutRoutes = require('./workouts');
// const profileRoutes = require('./profiles');
// const macrosRoutes = require('./macros');

// Health check route (in addition to the one in server.js)
router.get('/status', (req, res) => {
  res.json({ status: 'API is running' });
});

// TODO: Register route modules when implemented
// router.use('/auth', authRoutes);
// router.use('/workouts', workoutRoutes);
// router.use('/profiles', profileRoutes);
// router.use('/macros', macrosRoutes);

module.exports = router; 