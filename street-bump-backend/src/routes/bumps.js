const express = require('express');
const router = express.Router();
const bumpController = require('../controllers/bumpController');

router.get('/', bumpController.getVerifiedBumps);
router.post('/', bumpController.createBump);
router.get('/nearby', bumpController.getNearbyBumps);

module.exports = router;