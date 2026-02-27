
const http = require('http');

const data = JSON.stringify({
    amount: 69300,
    method: 'CASH'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/transactions/97/pay',
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
