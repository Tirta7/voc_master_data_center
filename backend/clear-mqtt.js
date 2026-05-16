const mqtt = require('mqtt');
require('dotenv').config();

const url = process.env.MQTT_URL || 'mqtt://localhost:1883';
console.log('Connecting to MQTT Broker at', url);

const client = mqtt.connect(url, {
  clientId: `clear_script_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
});

client.on('connect', () => {
  console.log('Connected. Subscribing to billiard/table/# to clear retained messages...');
  
  // Subscribe to find retained messages
  client.subscribe('billiard/table/#', (err) => {
    if (err) console.error(err);
  });
  
  // Also clear known gateway and table topics just in case
  const topicsToClear = [
    'billiard/table/206EF16D5F00/light/set',
    'billiard/table/704BCA8F7254/light/set',
    'billiard/table/704BCA8F7254/status',
    'billiard/table/206EF16D5F00/status',
    'billiard/table/206EF17081E8/light/set',
    'billiard/table/206EF17048A0/light/set'
  ];

  topicsToClear.forEach(topic => {
    console.log(`Sending empty retained message to ${topic}...`);
    client.publish(topic, '', { retain: true, qos: 1 });
  });

  // Wait 3 seconds to clear any dynamically discovered topics
  setTimeout(() => {
    console.log('Done clearing retained messages.');
    client.end();
    process.exit(0);
  }, 3000);
});

client.on('message', (topic, message, packet) => {
  if (packet.retain) {
    console.log(`Found retained message on topic: ${topic}. Clearing it...`);
    client.publish(topic, '', { retain: true, qos: 1 });
  }
});

client.on('error', (err) => {
  console.error('MQTT Error:', err);
  process.exit(1);
});
