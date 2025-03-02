const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/auth');
const bumpController = require('../controllers/bumpController');

router.use(verifyAdminToken);

router.get('/bumps/unverified', bumpController.getUnverifiedBumps);
router.patch('/bumps/:id/verify', bumpController.verifyBump);
router.delete('/bumps/:id', bumpController.deleteBump);

module.exports = router;