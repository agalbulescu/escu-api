const mongoose = require ('mongoose');

const NftsSchema = new mongoose.Schema({
    wallet: String,
    nfts: Array,
    nftsMetadata: Array,
    comments: String,
    createdOn: Date,
    updatedOn: Date
})

module.exports = mongoose.models.Nfts || mongoose.model('Nfts', NftsSchema);