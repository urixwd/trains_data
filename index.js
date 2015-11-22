var mongoose = require('mongoose');
var models = require('./models');
var request = require('request');
var _ = require('lodash');
var json2csv = require('json2csv');
var fs = require('fs');
var Q = require('q');
mongoose.connect('mongodb://localhost/train');

//db.getCollection('urls').update({}, { $set: {crawling_status: 0}}, {multi: true})

//http://otrain.org/api/route-info-full?from_date=1430427600000&route_id=790&to_date=1433106000000
//http://otrain.org/#/2015/5/routes/790?day=3
//http://otrain.org/#/2015/5/routes/790?day=5&time=15-18


var get_route = function(urlDoc){
  //console.log('requesting...', urlDoc.api_url);
  var deffered = Q.defer();
  //request('http://otrain.org/api/route-info-full?from_date=1433106000000&route_id=692&to_date=1435698000000', function (error, response, body) {
  if(!urlDoc.api_url) {
    deffered.resolve({urlDoc: urlDoc, error: 'no url'});
    return deffered.promise;
  }
  request(urlDoc.api_url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //res.render(body) // Show the HTML for the Google homepage.
      var data = JSON.parse(body);
      //console.log(data);

      var struct = {
        lines: {
          fields: ['url_id', 'line_id', 'week_day', 'num_trips'],
          table: []
        },
        hours: {
          fields: ['url_id', 'hour_id', 'line_id', 'hour'],
          table: [],
          autonumber: 0,
        },
        arrivals: {
          fields: ['url_id', 'arrival_id', 'line_id', 'arrival_on_time_pct', 'arrival_late_pct', 'departure_early_pct', 'departure_on_time_pct', 'stop_id','arrival_early_pct', 'departure_late_pct'],
          table: [],
          autonumber: 0,
        }
      };

      var hours, arrivals, foundStops = false;
      var addGeneralDetailsToRecord = function(obj){
        obj['url_id'] = urlDoc._id;
      };

      data.forEach(function(val, i) {
        /* array index = line_id*/

        //lines table
        //addGeneralDetailsToRecord
        if(!val.stops || !val.stops.length) return;

        var obj = {
          line_id: i,
          num_trips: val.info.num_trips,
          week_day: (val.info.week_day == 'all')?-1:val.info.week_day
        };
        addGeneralDetailsToRecord(obj);
        struct.lines.table.push(obj);

        //houres table
        hours = val.info.hours;
        if(hours == 'all') hours = [-1]; //keep it integer...
        hours.forEach(function(val, j){
          var obj = {
            hour_id: struct.hours.autonumber++,
            line_id: i,
            hour: val
          };
          addGeneralDetailsToRecord(obj);
          struct.hours.table.push(obj);
        });

        //stops table
        arrivals = val.stops;
        if(!Object.keys(arrivals).length) arrivals = []; //init...
        arrivals.forEach(function(val, j){
          if(!val.stop_id) return;
          else  foundStops = true;
          var obj = {
            arrival_id: struct.arrivals.autonumber++,
            line_id: i,
            arrival_on_time_pct: val.arrival_on_time_pct,
            arrival_late_pct: val.arrival_late_pct,
            departure_early_pct: val.departure_early_pct,
            departure_on_time_pct: val.departure_on_time_pct,
            stop_id: val.stop_id,
            arrival_early_pct: val.arrival_early_pct,
            departure_late_pct: val.departure_late_pct,
          };
          addGeneralDetailsToRecord(obj);
          struct.arrivals.table.push(obj);
          //console.log('struct.arrivals.table.length', struct.arrivals.table.length);
        });
      });

      if(foundStops)    deffered.resolve({urlDoc: urlDoc , data: struct});
      else  deffered.resolve({urlDoc: urlDoc, error: 'no stops'});
     }else{
      deffered.reject('request error');
    }
  });
  return deffered.promise
};
var updateDocMongo = function(urlDoc, data, status){
  var deffered = Q.defer();

  var $set = {
    crawling_status: status
  };
  if(data){
    $set.json = JSON.stringify(data);
  }
  //console.log('updateDocMongo', urlDoc._id);
  models.urls.findOneAndUpdate(
      {_id: urlDoc._id },
      {
        $set: $set
      }
  ).exec().then(
      function (val) {
        if(status == 2) with_stops++;
        updateCounters();
      }, function(){
        console.log('error update doc!');
        updateCounters();
      }
  );
  return deffered.promise;
};

var updateCounters = function(){
  total_counter++;
  bulk_counter++;
  if(total_counter == total_possible) {
    console.log('total_possible reached. Urls containing actual data: ' + with_stops + '/' + total_counter);
    process.exit();
  }else if(bulk_counter == BULK){
    start();
  }
};
var crawl = function(urls){
  //console.log('urls');
  _.forEach(urls, function(urlDoc){
    //console.log(urlDoc);
    get_route(urlDoc).then(
        function on_success(data){
          if(data.error){
            //no stops - irrelevant
            //console.log('no stops');
            updateDocMongo(data.urlDoc, null, 1);
          }else{
            //found data - update record
            //console.log('has stops');
            updateDocMongo(data.urlDoc, data.data, 2);
          }
        },
        function on_error(err){
          //console.log('err', urlDoc);
          updateDocMongo(urlDoc, null, 3);
        }
    );
  })
};
var NUM = 5000;
var BULK = 10;
var total_possible;
var total_counter = 0;
var bulk_counter = 0;
var with_stops = 0;
var start = function(){
  console.log('start new bulk');
  bulk_counter = 0;
  models.urls.find({crawling_status: 0}, function(err, urls) {
    if (err) return console.error(err);

    console.log('total ' + urls.length + ' left ');
    //urls = _.shuffle(urls);
    var _urls = [];
    total_possible = Math.min(NUM, urls.length);
    var bulk_iterations = Math.min(BULK, urls.length);
    for(var i=0; i<bulk_iterations; i++){
      _urls.push(urls[i]);
    }
    //urls = _.first(urls, 12); //1
    crawl(_urls);
  });
};
start();