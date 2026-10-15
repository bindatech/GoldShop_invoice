const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, updateShopDetails } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/shop-details', protect, updateShopDetails);

module.exports = router;
