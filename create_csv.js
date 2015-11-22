var mongoose = require('mongoose');
var models = require('./models');
var request = require('request');
var _ = require('lodash');
var json2csv = require('json2csv');
var fs = require('fs');
var Q = require('q');
mongoose.connect('mongodb://localhost/train');


Array.prototype.extend = function (array) {
  var self = this;
  array.forEach(function(val, key){
    self.push(val);
  });
};

var struct = {
  lines: {
    fields: ['url_id', 'line_id', 'week_day', 'num_trips'],
    table: []
  },
  hours: {
    fields: ['url_id', 'hour_id', 'line_id', 'hour'],
    table: [],
  },
  arrivals: {
    fields: ['url_id', 'arrival_id', 'line_id', 'arrival_on_time_pct', 'arrival_late_pct', 'departure_early_pct', 'departure_on_time_pct', 'stop_id','arrival_early_pct', 'departure_late_pct'],
    table: [],
  },
  urls: {
    fields: ['_id', 'mm', 'yyyy', 'route', 'url', 'api_url'],
    table: []
  }
};

var start = function(){
  console.log('start');
  models.urls.find({crawling_status: 2}, function(err, urls) {
    if (err) return console.error(err);

    console.log('total ' + urls.length);
    var tempJSON, recordToPush;

    //iterate each route
    //for(var i=0; i<3; i++){
    for(var i=0; i<urls.length; i++){
      tempJSON = JSON.parse(urls[i].json); //

      _.each(['lines', 'hours', 'arrivals'], function(val, key){
        struct[val].table.extend(tempJSON[val].table);
      });

      //urls
      struct.urls.table.push(urls[i]);
    }

    json2csv({ data: struct.lines.table, fields: struct.lines.fields }, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('csv/lines.csv', csv, function(err) {
        if (err) throw err;
        console.log('lines file saved');
      });
    });
    json2csv({ data: struct.hours.table, fields: struct.hours.fields }, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('csv/hours.csv', csv, function(err) {
        if (err) throw err;
        console.log('hours file saved');
      });
    });
    json2csv({ data: struct.arrivals.table, fields: struct.arrivals.fields }, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('csv/arrivals.csv', csv, function(err) {
        if (err) throw err;
        console.log('arrivals file saved');
      });
    });
    json2csv({ data: struct.urls.table, fields: struct.urls.fields}, function(err, csv) {
      if (err) console.log(err);
      fs.writeFile('csv/urls.csv', csv, function(err) {
        if (err) throw err;
        console.log('urls file saved');
      });
    });
    debugger;
    //console.log(struct);
    console.log('done');

  });
};
start();