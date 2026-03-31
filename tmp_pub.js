const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    const payload = JSON.stringify({
        status: "online",
        uptime: 2000,
        rssi: -40,
        ip: "192.168.1.23"
    });
    const topic = "billiard/table/781C3CCC0744/status";
    console.log(`Publishing to ${topic}: ${payload}`);
    client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) console.error('Failed to publish', err);
        else console.log('Published successfully');
        client.end();
    });
});
