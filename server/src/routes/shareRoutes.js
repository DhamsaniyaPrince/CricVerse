const express = require('express');
const router = express.Router();
const { createShareLink, resolveShareLink } = require('../controllers/shareController');

router.post('/', createShareLink);
router.get('/:code', resolveShareLink);

module.exports = router;
