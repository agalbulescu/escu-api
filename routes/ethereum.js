const express = require('express');
const router  = express.Router(); 

const nftsController = require('../controllers/ethereum/nfts');

router.get('/nfts', nftsController.getAllNfts);

module.exports = router;