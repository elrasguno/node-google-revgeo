var redis    = require('redis')
  , client   = redis.createClient()
  , fs       = require('fs')
  , http     = require('http')
  , start_ts = +new Date;

// Setup redis client
client.on('error', function (err) {
    console.log(err);
    client.end();
});

client.auth('bb92cba4fb580e1fa2c2ca8168aa302f887a8ff9');
client.select(2);

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

    var idx, data, len, i;
    for (idx in parsed_data) {
        data = parsed_data[idx];
        len  = data && data.length;

        if (data && data.constructor === Array) {
            for (i = 0; i < len; i++) {
                (function(eye, idx, data) {
                client.hget('localityFinderCities', data[eye].name, function(err, res) {
                    //console.log('hget localityFinderCities err', err);
                    //console.log('hget localityFinderCities res', res);
                    if (!err && res === null) {

                        // Create a hash for the city name
                        console.log('boo', data[eye].name);
                        if (data && data[eye] && data[eye].name) {
                            client.hset('localityFinderCities', data[eye].name, Math.round((+new Date) / 1000), function(err, res) {
                                if (!err) {
                                    console.log('Caching %s', data[eye].name);
                                }
                            });

                            // Add city data to a list
                            client.rpush(
                                [KEY_PREFIX, KEY_DELIMITER, idx].join(''), 
                                JSON.stringify(data[eye])
                            );
                        }
                    } else {
                        if (data && data[eye] && data[eye].name) {
                            console.log("Already cached %s", data[eye].name);
                        }
                    }
                });
                })(i, idx, data);
            }
        }
    }
    
    // Close redis connection
    setTimeout( function() { client.end(); }, 3000);
});
