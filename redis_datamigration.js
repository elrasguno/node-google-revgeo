var redis    = require('redis')
  , client   = redis.createClient()
  , fs       = require('fs')
  , http     = require('http')
  , debug    = false
  , start_ts = +new Date
  , end_ts;

// Setup redis client
client.on('error', function (err) {
    console.log(err);
    client.end();
});

client.auth('bb92cba4fb580e1fa2c2ca8168aa302f887a8ff9');
client.select(3);

fs.readFile('./revgeo_data.json', 'utf8', function (err, data) {
    var got_data_ts = +new Date,
        got_data_in = (got_data_ts - start_ts),
        parsed_data,
        KEY_PREFIX    = 'LFDATA',
        KEY_DELIMITER = '#_#';

    try {
        parsed_data = JSON.parse(data);
    } catch (e) {
        console.log("bad data, bad");
        console.log(e);
        return;
    }

    var idx, data, len, i,
        ops_begun = 0,
        ops_done  = 0;
    for (idx in parsed_data) {
        data = parsed_data[idx];
        len  = data && data.length;

        if (data && data.constructor === Array) {
            for (i = 0; i < len; i++) {
                ops_begun++;
                (function(eye, idx, data) {
                client.hget('localityFinderCities', data[eye].name, function(err, res) {
                    if (!err && res === null) {

                        // Create a hash for the city name
                        if (data && data[eye] && data[eye].name) {
                            client.hset('localityFinderCities', data[eye].name, Math.round((+new Date) / 1000), function(err, res) {
                                if (!err) {
                                    debug && console.log('Caching %s %d/%d', data[eye].name, ops_begun, ops_done);
                                }
                            });

                            // Add city data to a list
                            client.rpush([KEY_PREFIX, KEY_DELIMITER, idx].join(''), JSON.stringify(data[eye]), function(err, res) {
                                debug && console.log('Cached %s %d/%d', data[eye].name, ops_begun, ops_done);
                                ops_done++;
                                // Close redis connection
                                if (ops_begun === ops_done) { 
                                    end_ts = +new Date;
                                    console.log('Cached %d cities in %dms', ops_done, (end_ts - start_ts));
                                    client.end(); 
                                }
                            });
                        }
                    } else {
                        if (data && data[eye] && data[eye].name) {
                            ops_done++;
                            // Close redis connection
                            if (ops_begun === ops_done) { 
                                end_ts = +new Date;
                                console.log('Pulled %d cached cities in %dms', ops_done, (end_ts - start_ts));
                                client.end(); 
                            } 
                            debug && console.log("Already cached %s %d/%d", data[eye].name, ops_begun, ops_done);
                        }
                    }

                    
                });
                })(i, idx, data);
            }
        }
    }
});
