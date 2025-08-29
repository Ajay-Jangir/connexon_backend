const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const membershipController = require('../controllers/membershipController');

router.post('/register', userController.registerUser);
router.post('/login', userController.login);
router.put('/update', authMiddleware, userController.updateUser);
router.get('/myprofile', authMiddleware, userController.getMyProfile);
router.get('/membershipPlans', authMiddleware, membershipController.getAllActivePlans);


module.exports = router;
