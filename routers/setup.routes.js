const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'Setup module online' });
});

module.exports = router;
