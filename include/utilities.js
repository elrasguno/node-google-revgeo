var data = '',
    utilities    = (function() {
        var convertStdin = function (input) {
            var parts    = input.split(', '),

                latParts = parts[0].split(' '),
                lat      = parseFloat(latParts[0]);
                latCard  = latParts[1].replace(/^\s+|\s+$/, '');
                lat      = (latCard === 'S' ? lat *= -1 : lat);

                lngParts = parts[1].split(' ');
                lng      = parseFloat(lngParts[0]);
                lngCard  = lngParts[1].replace(/^\s+|\s+$/, '');
                lng      = (lngCard === 'W' ? lng *= -1 : lng);
                 
                return [lat, lng];
        };

        var getStdin = function(cb) {
            var data  = '',
                done  = false,
                timer = setTimeout( function () { // Kill after timeout if no input is passed in
                    if (done === false) {
                        cb && cb(data);
                    }
                }, 250);

            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            process.stdin.on('data', function (chunk) {
                data += chunk;
            });

            process.stdin.on('end', function () {
                clearTimeout(timer);
                done = true;
                cb && cb(data);
            });
        };

        return {
            convertStdin : convertStdin,
            getStdin : getStdin
        }
    })();
    
exports.utilities = utilities;
