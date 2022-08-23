const express = require('express');
const router = new express.Router();
const { users, groups } = require('./modules');

router.use('/Users', users);
router.use('/Groups', groups);

module.exports = router;
