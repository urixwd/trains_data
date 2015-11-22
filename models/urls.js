var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Type = Schema.Types;

var schema = new Schema({
    mm: Number,
    yyyy: Number,
    route: Number,
    start: Number,
    end: Number,
    url: String,
    api_url: String,
    crawling_status: {type: Number, default: 0}, //0 - not crawled, 1 - no data, 2 - crawled
    json: String
});

module.exports = schema;