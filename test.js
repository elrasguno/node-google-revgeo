var fs = require('fs');

var localityFinder = (function () {
    
    /**
     * testLatitude
     *
     * Test whether lat argument is between min and max of coordsData
     */
    var isBetweenCoords = function(point, coordsData) {
        var min = Math.min.apply(null, coordsData),
            max = Math.max.apply(null, coordsData);
        return (point >= min && point <= max);
    }

    return {
        isBetweenCoords : isBetweenCoords
    };
})();
fs.readFile('./sf_data.json', 'utf8', function (err, data) {
    var parsed_data = JSON.parse(data),
        results     = parsed_data && parsed_data.results,
        results_len = results && results.length;
    //console.log("got data!", results_len, results);

    /**
     * Iterate backwards through data from Google.
     * 
     * The first object to have "locality" in its "types" array
     * will be what we want to use
     */
    
    var localityObj,
        idx = results_len - 1,
        cacheInfo = {},
        bounds = [],
        result = [];
    while (idx--) {
        localityObj = results[idx];
        if (localityObj.types && localityObj.types.indexOf('locality') !== -1) {
            break;
        }
    }

    
    // No match, add to cache of locality data
    if (localityObj.formatted_address) {
        cacheInfo.name = localityObj.formatted_address.split(',').slice(0,2).join(',');
    }
    if (localityObj.geometry && (bounds = localityObj.geometry.bounds)) {
        cacheInfo.bounds = { 
            lat : [ bounds.southwest.lat, bounds.northeast.lat ],
            lng : [ bounds.southwest.lng, bounds.northeast.lng ]
        };
    }

    console.log('cacheInfo', cacheInfo);
    result.push(cacheInfo);
    
    var lng, lat;
    if (process.argv.length === 4) {
        lng = process.argv.pop();
        lat = process.argv.pop();

        if ( localityFinder.isBetweenCoords(lat, cacheInfo.bounds.lat) 
             && localityFinder.isBetweenCoords(lng, cacheInfo.bounds.lng)) {
            console.log("You are in " + cacheInfo.name);
        }
    }
});
