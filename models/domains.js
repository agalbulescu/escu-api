const mongoose = require ('mongoose');

const DomainsSchema = new mongoose.Schema({
    wallet: String,
    domains: Array,
    comments: String,
    createdOn: Date,
    updatedOn: Date
})

module.exports = mongoose.models.Domains || mongoose.model('Domains', DomainsSchema);