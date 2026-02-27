
const http = require('http');

const data = JSON.stringify({
    tableId: 1,
    type: 'prepaid',
    duration: 60,
    packageId: 9,
    customerName: 'Test User'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/billiard/tables/1/start',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
