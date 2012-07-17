var fs = require('fs');

var localityFinder = (function () {   
    var cacheObj = {};
    return {

        /**
         * testLatitude
         *
         * Test whether point argument is between min and max of coordsData
         * @param {int} point
         * @param {Array} coordsData
         */
        isBetweenCoords : function(point, coordsData) {
            var min = Math.min.apply(null, coordsData),
                max = Math.max.apply(null, coordsData);
            return (point >= min && point <= max);
        },

        /**
         * parseGoogleData
         *
         * Cache data from Google
         */
        parseGoogleData : function(data, field) {
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

            console.log('cacheInfo', cacheInfo);
            return cacheInfo;
        },

        /**
         * cacheData
         *
         * Cache off data into this.cacheObj
         */
        cacheData : function(cacheInfo) {
            var dataIdx = Math.floor(cacheInfo.bounds.lat[0]),
                cacheObj = this.getCacheObj(),
                result;

            if (!cacheObj[dataIdx]) {
                cacheObj[dataIdx] = [];
            }
            cacheObj[dataIdx].push(cacheInfo);
            console.log('cacheObj', cacheObj);
        },

        getCacheObj : function() {
            return cacheObj;
        }
    }
})();

fs.readFile('./sf_data.json', 'utf8', function (err, data) {
    var parsed_data = JSON.parse(data),
        results     = parsed_data && parsed_data.results,
        results_len = results && results.length;
    //console.log("got data!", results_len, results);

    var info = localityFinder.parseGoogleData(results);

    localityFinder.cacheData(info);
});

fs.readFile('./rome_data.json', 'utf8', function (err, data) {
    var parsed_data = JSON.parse(data),
        results     = parsed_data && parsed_data.results,
        results_len = results && results.length;
    //console.log("got data!", results_len, results);

    var info = localityFinder.parseGoogleData(results);

    localityFinder.cacheData(info);
});

var lng, lat;
if (process.argv.length === 4) {
    lng = process.argv.pop();
    lat = process.argv.pop();

    //if ( localityFinder.isBetweenCoords(lat, cacheInfo.bounds.lat) 
    //     && localityFinder.isBetweenCoords(lng, cacheInfo.bounds.lng)) {
    //    console.log("You are in " + cacheInfo.name);
    //}
}
