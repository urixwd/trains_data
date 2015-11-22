var models = require('./models');
var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.connect('mongodb://localhost/train');

function r_data(year, month, routeId){
    var obj = {};

    obj.mm = month;
    obj.yyyy = year;
    obj.route = routeId;
    obj.start = new Date(year, month);
    obj.end = new Date(obj.start.getFullYear(), obj.start.getMonth() + 1, 0, 24, 0, 0).getTime();
    obj.start = obj.start.getTime();
    obj.url = ['http://otrain.org/#/', year, '/', month+1, '/routes/', routeId].join('');
    obj.api_url = ['http://otrain.org/api/route-info-full?from_date=', obj.start, '&route_id=', routeId ,'&to_date=', obj.end].join('');
    obj.crawling_status = 0;

    return obj;
}

var drop = false;
if(drop){
    mongoose.connection.collections['urls'].drop( function(err) {
        console.log('collection dropped');
    });
}

var toInsert;
var counter = 0;
if(!drop){
    for(var route=0;route<1300;route++){
        for(var month=0; month<12;month++){
            for(var year = 2014; year<=2015; year++){
                toInsert = r_data(year, month, route);

                mongoose.connection.collections['urls'].insert(
                    toInsert,
                    function (err, team) {
                        if (err) console.log('error ');
                        else{
                            counter++;
                            console.log(counter);
                        }
                    }
                );
            }
        }
    }
}