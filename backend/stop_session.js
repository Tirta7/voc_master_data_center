
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/billiard/tables/1/stop',
    method: 'POST'
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

req.end();
