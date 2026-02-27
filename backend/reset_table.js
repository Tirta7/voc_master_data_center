
const http = require('http');

const data = JSON.stringify({
    status: 'available'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/billiard/tables/1/status',
    method: 'PATCH',
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
