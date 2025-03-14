const express = require('express');
const { getUserProfile,updateUserProfile,deleteUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put("/profile", protect, updateUserProfile); 
router.delete("/profile", protect, deleteUserProfile); 

module.exports = router;