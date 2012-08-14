var redis    = require('redis')
  , client   = redis.createClient()
  , debug    = false
  , start_ts = +new Date
  , localityFinder = {};

localityFinder.consumer = (function() {
    var __self       = this;
    this.KEY_PREFIX    = 'LFDATA',
    this.KEY_DELIMITER = '#_#';

    var consumeQueue = function () {
        var key = [this.KEY_PREFIX, this.KEY_DELIMITER, 'consumerQueue'].join(''),
            len, i, parsed, idx,
            ops_begun = 0,
            ops_done  = 0;

        client.lrange(key, 0, -1, function (err, res) {
            if (res && (len = res.length)) {
                for (i = 0; i < len; i++) {
                    ops_begun++;
                    parsed = JSON.parse(res[i]);
                    idx    = parsed && Math.floor(Math.min.apply(null, parsed.bounds.lat)); 
                    
                    // TODO: turn into a set of methods
                    // TODO: add a config system 
                    (function (parsed, idx) {
                        console.log('parsed.name', parsed.name);
                        client.hget('localityFinderCities', parsed.name, function(err, res) {
                            if (!err && res === null) {

                                // Create a hash for the city name
                                client.hset('localityFinderCities', parsed.name, Math.round((+new Date) / 1000), function(err, res) {
                                    if (!err) {
                                        debug && console.log('Caching %s %d/%d', parsed.name, ops_begun, ops_done);
                                    }
                                });

                                // Add city data to a list
                                client.rpush([KEY_PREFIX, KEY_DELIMITER, idx].join(''), JSON.stringify(parsed), function(err, res) {
                                    ops_done++;
                                    client.lpop(key, function (err, res) {
                                        endClientIfDone(client, ops_begun, ops_done, start_ts);
                                    });
                                });
                            } else {
                                ops_done++;
                                client.lpop(key, function (err, res) {
                                    endClientIfDone(client, ops_begun, ops_done, start_ts);
                                });
                            }
                        });
                    })(parsed, idx);
                }
            } else {
                console.log('Queue is empty; Nothing to do.');
                client.end();
            }
        });
    };

    var endClientIfDone = function (client, ops_begun, ops_done, start_ts) {
        var end_ts = +new Date;
        if (ops_begun === ops_done) { 
            console.log('Operations (%d) complete in %dms', ops_done, (end_ts - start_ts));
            client.end(); 
        }
    }
    
    return {
        consumeQueue : function () { return consumeQueue.apply(__self, arguments) }
    }
})();

// Setup redis client
client.on('error', function (err) {
    console.log('redis error', err);
    client.end();
});

//client.auth('bb92cba4fb580e1fa2c2ca8168aa302f887a8ff9');
client.select(3);

exports.consumer = localityFinder.consumer;

