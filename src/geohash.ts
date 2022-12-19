/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Geohash encoding/decoding and associated functions   (c) Chris Veness 2014-2016 / MIT Licence  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/**
 * Geohash encode, decode, bounds, neighbours.
 */

/* (Geohash-specific) Base32 map */
const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encodes latitude/longitude to geohash, either to specified precision or to automatically
 * evaluated precision.
 * @param lat - Latitude in degrees.
 * @param lon - Longitude in degrees.
 * @param precision - Number of characters in resulting
 * @returns Geohash of supplied latitude/longitude.
 * @example
 * let geohash = encode(52.205, 0.119, 7); // geohash: 'u120fxw'
 */
export const encode = function (lat: number, lon: number, precision?: number): string {
    // infer precision?
    if (typeof precision == 'undefined') {
        // refine geohash until it matches precision of supplied lat/lon
        for (let p = 1; p <= 12; p++) {
            const hash = encode(lat, lon, p);
            const posn = decode(hash);
            if (posn.lat == lat && posn.lon == lon) { return hash; }
        }
        precision = 12; // set to maximum
    }

    lat = Number(lat);
    lon = Number(lon);
    precision = Number(precision);

    if (isNaN(lat) || isNaN(lon) || isNaN(precision)) { throw new Error('Invalid geohash'); }

    let idx = 0; // index into base32 map
    let bit = 0; // each char holds 5 bits
    let evenBit = true;
    let geohash = '';

    let latMin = -90, latMax = 90;
    let lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {
        if (evenBit) {
            // bisect E-W longitude
            const lonMid = (lonMin + lonMax) / 2;
            if (lon >= lonMid) {
                idx = idx * 2 + 1;
                lonMin = lonMid;
            } else {
                idx = idx * 2;
                lonMax = lonMid;
            }
        } else {
            // bisect N-S latitude
            const latMid = (latMin + latMax) / 2;
            if (lat >= latMid) {
                idx = idx * 2 + 1;
                latMin = latMid;
            } else {
                idx = idx * 2;
                latMax = latMid;
            }
        }
        evenBit = !evenBit;

        if (++bit == 5) {
            // 5 bits gives us a character: append it and start over
            geohash += base32.charAt(idx);
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
};

/**
 * Decode geohash to latitude/longitude (location is approximate centre of geohash cell,
 * to reasonable precision).
 * @param geohash Geohash string to be converted to latitude/longitude.
 * @returns (Center of) geohashed location.
 *
 * @example
 * let latlon = decode('u120fxw'); // latlon: { lat: 52.205, lon: 0.1188 }
 */
export const decode = function (geohash: string): { lat: number; lon: number; } {

    const b = bounds(geohash); // <-- the hard work
    // now just determine the centre of the cell...

    const latMin = b.sw.lat, lonMin = b.sw.lon;
    const latMax = b.ne.lat, lonMax = b.ne.lon;

    // cell centre
    let lat = (latMin + latMax) / 2;
    let lon = (lonMin + lonMax) / 2;

    // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
    lat = Number(lat.toFixed(Math.floor(2 - Math.log(latMax - latMin) / Math.LN10)));
    lon = Number(lon.toFixed(Math.floor(2 - Math.log(lonMax - lonMin) / Math.LN10)));

    return { lat, lon };
};


/**
 * Returns SW/NE latitude/longitude bounds of specified cell
 * @param geohash Cell that bounds are required of.
 */
export const bounds = function (geohash: string): { sw: { lat: number, lon: number }, ne: { lat: number, lon: number } } {
    if (geohash.length === 0) { throw new Error('Invalid geohash'); }

    geohash = geohash.toLowerCase();

    let evenBit = true;
    let latMin = -90, latMax = 90;
    let lonMin = -180, lonMax = 180;

    for (let i = 0; i < geohash.length; i++) {
        const chr = geohash.charAt(i);
        const idx = base32.indexOf(chr);
        if (idx == -1) { throw new Error('Invalid geohash'); }

        for (let n = 4; n >= 0; n--) {
            const bitN = idx >> n & 1;
            if (evenBit) {
                // longitude
                const lonMid = (lonMin + lonMax) / 2;
                if (bitN == 1) {
                    lonMin = lonMid;
                } else {
                    lonMax = lonMid;
                }
            } else {
                // latitude
                const latMid = (latMin + latMax) / 2;
                if (bitN == 1) {
                    latMin = latMid;
                } else {
                    latMax = latMid;
                }
            }
            evenBit = !evenBit;
        }
    }

    const bounds = {
        sw: { lat: latMin, lon: lonMin },
        ne: { lat: latMax, lon: lonMax },
    };

    return bounds;
};


/**
 * Determines adjacent cell in given direction.
 * @param geohash Cell to which adjacent cell is required.
 * @param direction Direction from geohash (N/S/E/W).
 * @returns Geocode of adjacent cell.
 * @throws  Invalid
 */
export const adjacent = function (geohash: string, direction: 'N' | 'n' | 'S' | 's' | 'E' | 'e' | 'W' | 'w') {
    // based on github.com/davetroy/geohash-js

    geohash = geohash.toLowerCase();
    direction = direction.toLowerCase() as 'n' | 's' | 'e' | 'w';

    if (length === 0) { throw new Error('Invalid geohash'); }
    if ('nsew'.indexOf(direction) == -1) { throw new Error('Invalid direction'); }

    const neighbour = {
        n: ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
        s: ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp'],
        e: ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
        w: ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb'],
    };
    const border = {
        n: ['prxz', 'bcfguvyz'],
        s: ['028b', '0145hjnp'],
        e: ['bcfguvyz', 'prxz'],
        w: ['0145hjnp', '028b'],
    };

    const lastCh = geohash.slice(-1);    // last character of hash
    let parent = geohash.slice(0, -1); // hash without last character

    const type = geohash.length % 2;

    // check for edge-cases which don't share common prefix
    if (border[direction][type].indexOf(lastCh) != -1 && parent !== '') {
        parent = adjacent(parent, direction);
    }

    // append letter for direction to parent
    return parent + base32.charAt(neighbour[direction][type].indexOf(lastCh));
};


/**
 * Returns all 8 adjacent cells to specified cell
 * @param geohash Geohash neighbours are required of.
 */
export const neighbours = function (geohash: string) {
    return {
        'n': adjacent(geohash, 'n'),
        'ne': adjacent(adjacent(geohash, 'n'), 'e'),
        'e': adjacent(geohash, 'e'),
        'se': adjacent(adjacent(geohash, 's'), 'e'),
        's': adjacent(geohash, 's'),
        'sw': adjacent(adjacent(geohash, 's'), 'w'),
        'w': adjacent(geohash, 'w'),
        'nw': adjacent(adjacent(geohash, 'n'), 'w'),
    };
};
