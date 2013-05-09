## node-google-revgeo
This app uses the Google Maps API to retreive and parse location information based on a user's latitude and longitude. 

It's currently designed to report what major city a persion is from. The app uses [redis](http://redis.io) as a data store
and caches results so that Google is only hit once per city.

Example Usage

    node controller.js <latitude> <longitude>

Example Response

    {
        "bounds": {
            "lat": [
                41.390628, 
                41.5992668
            ], 
            "lng": [
                -81.878976, 
                -81.5327439
            ]
        }, 
        "name": "Cleveland, OH", 
        "src": "cache", 
        "timing": "2ms"
    }
    
