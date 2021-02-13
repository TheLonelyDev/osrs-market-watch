const fs = require('fs');
const csv = require('fast-csv');
const filenamify = require('filenamify');


// Read the OsBuddy summary file
const itemsRaw = JSON.parse(fs.readFileSync('summary.json'));
const items = Object.values(itemsRaw);

// Create an object to store a 'map' of id -> name
let itemMap = {};

items.forEach(({ id, name }) => {
    // Create a safe name for a path name
    name = filenamify(name);
    if (name[name.length - 1] === '.') {
        name = name.slice(0, -1);
    }

    itemMap[id] = name;

    // Create directories for each item
    const dir = `./data/${name}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

let prevId = 0;

const writeCsv = (id, method, data) => {
    const csvStream = csv.format({ headers: ['timestamp', 'avg', 'qty'] });

    csvStream.pipe(fs.createWriteStream(`./data/${itemMap[id]}/${method}.csv`, {
        flag: 'w+',
        //encoding: null,
        //mode: 0666,
    }));

    data.forEach(x => csvStream.write(x));

    csvStream.end();
}

let temp = {};

// Read csv data
fs.createReadStream('datapoints.csv')
    .pipe(
        csv.parse({
            headers: false // ['id', 'buy_average', 'buy_quantity', 'sell_average', 'sell_quantity', 'timestamp']
        })
    )
    .on('data', (row) => {
        // Read as int
        const id = parseInt(row[0]);

        if (temp[id] == undefined) {
            temp[id] = {
                buy: [],
                sell: [],
            };
        }

        if (row[1] != 0) {
            temp[id].buy.push([
                parseInt(row[5]),
                parseInt(row[1]),
                parseInt(row[2]),
            ]);
        }

        if (row[3] != 0) {
            temp[id].sell.push([
                parseInt(row[5]),
                parseInt(row[3]),
                parseInt(row[4]),
            ]);
        }

        if (prevId !== id) {
            for (const idX in temp) {
                for (const method in temp[idX]) {
                    writeCsv(idX, method, temp[idX][method]);
                }

                delete temp[idX];
            }

            console.log(`done ${id}`);

            prevId = id;
        }
    });