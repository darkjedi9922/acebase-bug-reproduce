const {AceBase} = require('../dist/cjs');
const path = require('path');
const fs = require('fs');

// remove previous test db
fs.rmSync(path.join(__dirname, '../custom-test.acebase'), {recursive: true, force: true});

const db = new AceBase('custom-test');
db.ready(async () => {
    
    let ref = db.ref('table');

    // add "large" dataset to the database
    let songIds1 = Array(110).fill(0).map((_value, index) => `id-${index}`);
    await ref.update(songIds1.reduce((obj, songId) => {
        obj[songId] = {playlistId: 'playlist1'};
        return obj;
    }, {}));

    // remove all the added records with the query 
    await ref.query().filter('playlistId', '==', 'playlist1').remove();

    // add new "small" dataset to the database -> error
    let songIds2 = Array(10).fill(0).map((_value, index) => `id-${index}`);
    await ref.update(songIds2.reduce((obj, songId) => {
        obj[songId] = {playlistId: 'playlist1'};
        return obj;
    }, {}));
});
