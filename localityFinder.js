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
                console.log("You are in " + data[i].name);
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
            cacheInfo = {},
            bounds = [],
            result = {},
            dataIdx;
        while (idx--) {
            localityObj = data[idx];
            if (localityObj.types && localityObj.types.indexOf('locality') !== -1) {
                break;
            }
        }

        if (localityObj.formatted_address) {
            cacheInfo.name = localityObj.formatted_address.split(',').slice(0,2).join(',');
        }
        if (localityObj.geometry && (bounds = localityObj.geometry.bounds)) {
            cacheInfo.bounds = { 
                lat : [ bounds.southwest.lat, bounds.northeast.lat ],
                lng : [ bounds.southwest.lng, bounds.northeast.lng ]
            };
        }

        return cacheInfo;
    };

    /**
     * cacheData
     *
     * Cache off data into this.cacheObj
     * @access private
     */
    var cacheData = function(cacheInfo) {
        var dataIdx  = Math.floor(cacheInfo.bounds.lat[0]),
            cacheObj = this.localityData,
            cachedData,
            result;

        if (!cacheObj[dataIdx]) {
            cacheObj[dataIdx] = [];
        }
        cacheObj[dataIdx].push(cacheInfo);

        // Read existing file
        //if (cachedData = fs.readFileSync('./revgeo_data.json', 'utf8')) {
        //    console.log('CACHED_DATA', cachedData);
        //    cachedData = JSON.parse(cachedData);
        //}
        //return;

        // Get file descriptor
        var data = JSON.stringify(cacheObj),
            len  = data.length,
            fd   = fs.openSync('./revgeo_data.json', 'w+');

        // Read existing data

        // Write back updated data
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
            //console.log("Got response: " + res.statusCode);
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                result += chunk;
            });
            res.on('end', function(e) {
                //console.log('end', result);
                var data    = JSON.parse(result),
                    results = data.results;
                
                if (results && results.length) {
                    cacheInfo = parseGoogleData(results);        
                    cb && cacheInfo && cb(cacheInfo);
                }
            });
        }).on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    }

    return {
        getLocalityInfo : function () { return getLocalityInfo.apply(__self__, arguments) },
        getLocalityDataFromGoogle : function () { return getLocalityDataFromGoogle.apply(__self__, arguments) },
        setLocalityData : function () { return setLocalityData.apply(__self__, arguments) },
        parseGoogleData : function () { return parseGoogleData.apply(__self__, arguments) },
        cacheData       : function () { return cacheData.apply(__self__, arguments) }
    }

})();

var fs   = require('fs'),
    http = require('http');

fs.readFile('./revgeo_data.json', 'utf8', function (err, data) {
    var parsed_data = JSON.parse(data),
        results     = parsed_data && parsed_data.results,
        results_len = results && results.length;

    localityFinder.setLocalityData(parsed_data);

    var lng, lat, locality;
    if (process.argv.length === 4) {
        lng = process.argv.pop();
        lat = process.argv.pop();
    
        locality = localityFinder.getLocalityInfo([lat,lng]);
        if (locality) {
            console.log("data from cache", locality);
        } else {
            var info = localityFinder.getLocalityDataFromGoogle([lat,lng], function(info) {
                console.log('zomg info', info);
                info && localityFinder.cacheData(info);
            });
        }
    }
});

//fs.readFile('./rome_data.json', 'utf8', function (err, data) {
//    var parsed_data = JSON.parse(data),
//        results     = parsed_data && parsed_data.results,
//        results_len = results && results.length;
//
//    var info = localityFinder.parseGoogleData(results);
//
//    localityFinder.cacheData(info);
//});

//var lng, lat;
//if (process.argv.length === 4) {
//    lng = process.argv.pop();
//    lat = process.argv.pop();
//
//    //if ( localityFinder.isBetweenCoords(lat, cacheInfo.bounds.lat) 
//    //     && localityFinder.isBetweenCoords(lng, cacheInfo.bounds.lng)) {
//    //    console.log("You are in " + cacheInfo.name);
//    //}
//}
