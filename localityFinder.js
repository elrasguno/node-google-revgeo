var localityFinder = (function () {   

    var __self__       = this;
    this.KEY_PREFIX    = 'LFDATA',
    this.KEY_DELIMITER = '#_#';

    /**
     * getLocalityInfo
     *
     * @access public
     */
    var getLocalityInfo = function(latlng, cb) {
        var lng     = latlng.pop(),
            lat     = latlng.pop(),
            dataIdx = Math.floor(lat),
            rKey    = [this.KEY_PREFIX, this.KEY_DELIMITER, dataIdx].join(''),
            start_ts = +new Date,
            data, len, i, parsed, end_ts;
        
        data = client.lrange(rKey, 0, -1, function(err, res) {
            if (res && (len = res.length)) {
                for (i = 0; i < len; i++) {
                    parsed = JSON.parse(res[i]);
                    if ( isWithinBounds([lat,lng], parsed) ) {
                        client.end();
                        end_ts = +new Date;

                        parsed.src = 'cache';
                        parsed.timing = (end_ts - start_ts) + 'ms';
                        cb && cb(parsed);
                        return true;
                    }
                }
            }

            var info     = getLocalityDataFromGoogle([lat,lng], function(info) {
                now      = +new Date,
                inBounds = isWithinBounds([lat,lng], info);
                // Validate that input data falls within info bounds
                // Add data to queue for consumer to pick up
                info && inBounds && queueDataForProcessing(info);

                info.src = 'google';
                info.timing = (now - start_ts) + 'ms';
                cb && cb(info);
                return true;
            });
        });
    };

    /**
     * isBetweenCoords
     *
     * Test whether point argument is between min and max of coordsData
     * @access private
     * @param {int} point
     * @param {Array} coordsData
     */
    var isBetweenCoords = function(point, coordsData) {
        var min = Math.min.apply(null, coordsData),
            max = Math.max.apply(null, coordsData);
        return (point >= min && point <= max);
    };

    /**
     * isWithinBounds
     *
     */
    var isWithinBounds = function(latlng, coordsData) {
        var lng = latlng.pop(),
            lat = latlng.pop();

        if ( isBetweenCoords(lat, coordsData.bounds.lat) 
             && isBetweenCoords(lng, coordsData.bounds.lng) ) {
            return true;
        }
        return false;
    };

    /**
     * parseGoogleData
     *
     * Cache data from Google
     * @access private
     */
    var parseGoogleData = function(data, field) {
        // Iterate backwards through data from Google.
        // The first object to have <field> in its "types" array
        // will be what we want to use
        
        var localityObj,
            idx = data.length - 1,
            cacheInfo = null,
            bounds = [],
            result = {},
            foundData = false,
            dataIdx;
        while (idx--) {
            localityObj = data[idx];
            if (localityObj.types && localityObj.types.indexOf(field || 'locality') !== -1) {
                foundData = true;
                break;
            }
        }

        if (foundData) {
            cacheInfo = {};
            if (localityObj.formatted_address) {
                cacheInfo.name = localityObj.formatted_address.split(',').slice(0,2).join(',');
            }
            if (localityObj.geometry && (bounds = localityObj.geometry.bounds)) {
                cacheInfo.bounds = { 
                    lat : [ bounds.southwest.lat, bounds.northeast.lat ],
                    lng : [ bounds.southwest.lng, bounds.northeast.lng ]
                };
            }
        }

        return cacheInfo;
    };

    /**
     * queueDataForProcessing
     *
     * Cache off data into redis queue
     *
     * @access private
     */
    var queueDataForProcessing = function(cacheInfo) {
        console.log('cacheInfo (%s)', typeof cacheInfo, cacheInfo);
        
        // Check to make sure city hasn't made it into cached data already
        client.hget('localityFinderCities', cacheInfo.name, function(err, res) {
            if (!err && res === null) {
                client.rpush([KEY_PREFIX, KEY_DELIMITER, 'consumerQueue'].join(''), JSON.stringify(cacheInfo), function(err, res) {
                    client.end();
                });
            }
        });
    };

    var getLocalityDataFromGoogle = function(latlng, cb) {
        var lng = latlng.pop(),
            lat = latlng.pop(),
            result = '',
            cacheInfo = null;
        var url = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&sensor=false";

        http.get(url, function(res) {
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                result += chunk;
            });
            res.on('end', function(e) {
                var data    = JSON.parse(result),
                    results = data.results;
                
                if (results && results.length) {
                    // Cache data from google temporarily for debugging
                    var data    = JSON.stringify(results),
                        mbCount = encodeURIComponent(data).match(/%[89ABab]/g),
                        mbLen   = (mbCount ? mbCount.length : 0),
                        len     = (data.length + mbLen),
                        fd, cityName;


                    cacheInfo = (parseGoogleData(results) || parseGoogleData(results, 'administrative_area_level_2'));
                    if (cb && cacheInfo) {
                        cb && cacheInfo && cb(cacheInfo);

                        // Write back updated data
                        cityName = (cacheInfo.name.split(', ').join('_').toLowerCase() || 'tmp');
                        fd = fs.openSync('./data.' + cityName + '.json', 'w+');
                        fd && fs.writeSync(fd, data, 0, len, null);
                        fs.closeSync(fd);
                    }
                }
            });
        }).on('error', function(e) {
            console.log("Couldn't reach google: " + e.message);
            client.end();
        });
    }

    return {
        getLocalityInfo : function () { return getLocalityInfo.apply(__self__, arguments) }
    }

})();

var redis    = require('redis')
  , client   = redis.createClient()
  , fs       = require('fs')
  , http     = require('http')
  , start_ts = +new Date;

// Setup redis client
client.on('error', function (err) {
    console.log('redis error', err);
    client.end();
});

//client.auth('bb92cba4fb580e1fa2c2ca8168aa302f887a8ff9');
client.select(3);

var latlng, lng, lat, locality, now;
if (process.argv.length > 2) {
    switch (process.argv.length) {
        case 3:
            latlng = process.argv.pop().split(' ');
            break;
        case 4:
            latlng = process.argv;
            break;
    }

    lng = latlng.pop();
    lat = latlng.pop();
    
    locality = localityFinder.getLocalityInfo([lat,lng], function(results) {
        console.log(JSON.stringify(results));
    });

    // TODO: update getLocalityInfo
    // 1) Return results from google on cache miss
    // 2) Push results to queue for consumer to pick up and cache
}
