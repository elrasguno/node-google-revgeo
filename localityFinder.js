var localityFinder = (function () {   

    var __self__      = this;
    this.localityData = {};

    var setLocalityData = function(data) {
        this.localityData = data;
    }

    /**
     * getLocalityInfo
     *
     * @access public
     */
    var getLocalityInfo = function(latlng) {
        var lng     = latlng.pop(),
            lat     = latlng.pop(),
            dataIdx = Math.floor(lat),
            data    = this.localityData[dataIdx],
            len     = data && this.localityData[dataIdx].length,
            result, i;

        for (i = 0; i < len; i++) {
            if ( isBetweenCoords(lat, data[i].bounds.lat) 
                 && isBetweenCoords(lng, data[i].bounds.lng) ) {
                //console.log("You are in " + data[i].name);
                return data[i];
            }
        }

        return false;
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
     * cacheData
     *
     * Cache off data into this.localityData
     *
     * @access private
     */
    var cacheData = function(cacheInfo) {
        var lat1     = Math.floor(cacheInfo.bounds.lat[0]),
            lat2     = Math.floor(cacheInfo.bounds.lat[1]),
            dataIdx  = (function() {
                            var min = Math.min.apply(null, [lat1, lat2]),
                                max = Math.max.apply(null, [lat1, lat2]),
                                result = [], i;
                            for (i = min; i <= max; i++) { result.push(i); }
                            return result;
                        })(),
            cacheObj = this.localityData,
            cachedData,
            result, i;

        // Given that the floored values of the bounds of an area
        // can be different, store data in a range from min to max.
        for (i = 0; i < dataIdx.length; i++) {
            if (!cacheObj[dataIdx[i]]) {
                cacheObj[dataIdx[i]] = [];
            }
            cacheObj[dataIdx[i]].push(cacheInfo);    
        }

        // TODO: prevent duplicates.
        // Read existing file
        //if (cachedData = fs.readFileSync('./revgeo_data.json', 'utf8')) {
        //    console.log('CACHED_DATA', cachedData);
        //    cachedData = JSON.parse(cachedData);
        //}
        //return;

        // Get file descriptor
        var data    = JSON.stringify(cacheObj),
            mbCount = encodeURIComponent(data).match(/%[89ABab]/g),
            mbLen   = (mbCount ? mbCount.length : 0),
            len     = (data.length + mbLen),
            fd      = fs.openSync('./revgeo_data.json', 'w+');

        // Write back updated data
        console.log('writing %d bytes to revgeo_data.json', len);
        fd && fs.writeSync(fd, data, 0, len, null);
        fs.closeSync(fd);
    };

    var getLocalityDataFromGoogle = function(latlng, cb) {
        var lng = latlng.pop(),
            lat = latlng.pop(),
            result = '',
            cacheInfo = null;
        var url = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&sensor=false";
        console.log('url', url);

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
            console.log("Got error: " + e.message);
        });
    }

    return {
        isWithinBounds : function () { return isWithinBounds.apply(__self__, arguments) },
        getLocalityInfo : function () { return getLocalityInfo.apply(__self__, arguments) },
        getLocalityDataFromGoogle : function () { return getLocalityDataFromGoogle.apply(__self__, arguments) },
        setLocalityData : function () { return setLocalityData.apply(__self__, arguments) },
        parseGoogleData : function () { return parseGoogleData.apply(__self__, arguments) },
        cacheData       : function () { return cacheData.apply(__self__, arguments) }
    }

})();

var fs       = require('fs'),
    http     = require('http'),
    start_ts = +new Date;

fs.readFile('./revgeo_data.json', 'utf8', function (err, data) {
    var got_data_ts = +new Date,
        got_data_in = (got_data_ts - start_ts),
        parsed_data, results, results_len;

    try {
        parsed_data = JSON.parse(data);
        results     = parsed_data && parsed_data.results;
        results_len = results && results.length;
    } catch (e) {
        console.log("bad data, bad");
        console.log(e);
        return;
    }

    localityFinder.setLocalityData(parsed_data);

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
        
        locality = localityFinder.getLocalityInfo([lat,lng]);
        if (locality) {
            now = +new Date;
            console.log("data from cache (%dms)", (now - got_data_ts), locality);
        } else {
            var info     = localityFinder.getLocalityDataFromGoogle([lat,lng], function(info) {
                now      = +new Date,
                inBounds = localityFinder.isWithinBounds([lat,lng], info);
                console.log("data from google (%dms)", (now - got_data_ts), info.name);
                // Validate that input data falls within info bounds
                info && inBounds && localityFinder.cacheData(info);
            });
        }
    }
});
