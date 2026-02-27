
const http = require('http');

http.get('http://localhost:4000/billiard/tables', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const tables = JSON.parse(data);
            const activeTables = tables.filter(t => t.status !== 'available' && t.activeTransaction);
            if (activeTables.length > 0) {
                console.log(JSON.stringify(activeTables[0].activeTransaction, null, 2));
            } else {
                console.log("No active tables found.");
            }
        } catch (e) {
            console.log(data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
