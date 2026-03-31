const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    const payload = JSON.stringify({
        command: "REBOOT",
        timestamp: new Date().toISOString()
    });
    const topic = "billiard/table/781C3CCC0744/system/set";
    console.log(`Sending REBOOT to ${topic}`);
    client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) console.error('Failed to send reboot', err);
        else console.log('Reboot command sent successfully');
        client.end();
    });
});
