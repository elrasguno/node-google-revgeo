var lf   = require('./include/localityFinder').localityFinder 
  , argc = process.argv.length
  , util = require('./include/utilities').utilities
  , run  = function(latlng) {

    var lng, lat;
    lng = latlng.pop();
    lat = latlng.pop();
    
    lf.getLocalityInfo([lat,lng], function(results) {
        console.log(JSON.stringify(results));
    });
};

switch (process.argv.length) {
    case 2: 
        // This is here for convenience so you can paste
        // lat long results from google i.e
        // $ echo "40.8656° N, 73.5325° W" | node controller.js
        util.getStdin(function (data) {
            if (data) {
                run(util.convertStdin(data));
            } else {
                console.log("Usage: node controller.js <lat> <long>");
                process.exit(1);
            }
        });
        break;
    case 3:
        latlng = process.argv.pop().split(' ');
        break;
    case 4:
        latlng = process.argv;
        break;
    default:
        console.log("Usage: node controller.js <lat> <long>");
        break;
}
    
if (argc === 3 || argc === 4) {
    run(latlng); 
}
