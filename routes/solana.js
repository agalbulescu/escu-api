const express = require('express');
const router  = express.Router(); 

const nftsController = require('../controllers/solana/nfts');
const domainsController = require('../controllers/solana/domains');
const refreshDomainsController = require('../controllers/solana/refreshDomains');
const snsController = require('../controllers/solana/sns');
const refreshSnsController = require('../controllers/solana/refreshSns');

router.get('/nfts', nftsController.getAllNfts);
router.get('/domains', domainsController.getAllDomains);
router.get('/refreshDomains', refreshDomainsController.getAllNewDomains);
router.get('/sns', snsController.getAllSns);
router.get('/refreshSns', refreshSnsController.getAllNewSns);

module.exports = router;