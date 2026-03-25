const mqtt = require('mqtt');

// Update these to match user's setup
const BROKER_URL = 'mqtt://localhost:1883';
const TARGET_MAC = '781C3CCC0744'; // Meja 2 in screenshot
const TOPIC = `billiard/table/${TARGET_MAC}/light/set`;

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('Connected to MQTT Broker');
  
  const payload = JSON.stringify({
    status: 'ON',
    tableId: 2,
    relayPin: 1,
    force: true
  });

  console.log(`Publishing to ${TOPIC}...`);
  console.log(`Payload: ${payload}`);
  
  client.publish(TOPIC, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error('Publish failed:', err);
    } else {
      console.log('Publish SUCCESS');
    }
    client.end();
  });
});

client.on('error', (err) => {
  console.error('MQTT Error:', err);
  process.exit(1);
});
