
const http = require('http');
const fs = require('fs');

http.get('http://localhost:4000/billiard/tables', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const tables = JSON.parse(data);
            // Find Table 1 specifically
            const activeTable = tables.find(t => t.id === 1 && t.activeTransaction);

            if (activeTable) {
                fs.writeFileSync('transaction_dump.json', JSON.stringify(activeTable.activeTransaction, null, 2));
                console.log("Dumped Table 1 transaction to transaction_dump.json");
            } else {
                console.log("Table 1 is not active or not found.");
            }
        } catch (e) {
            console.log(data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
