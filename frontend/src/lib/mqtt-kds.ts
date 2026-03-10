/**
 * MQTT WebSocket helper for KDS/BDS realtime connections
 * Connects to Mosquitto broker WebSocket port (8083)
 */

import mqtt, { MqttClient } from 'mqtt';

export type KdsEventType =
    | 'newOrder'
    | 'statusUpdated'
    | 'orderItemUpdated'
    | 'itemCancelled'
    | 'cancellationRequested'
    | 'cancellationRejected';

// All MQTT events topic prefix
const TOPIC_PREFIX = 'kds/events';

/** Returns the full MQTT topic for an event type */
export const eventTopic = (event: KdsEventType) => `${TOPIC_PREFIX}/${event}`;

/** All topics to subscribe to */
export const ALL_KDS_TOPICS: string[] = [
    eventTopic('newOrder'),
    eventTopic('statusUpdated'),
    eventTopic('orderItemUpdated'),
    eventTopic('itemCancelled'),
    eventTopic('cancellationRequested'),
    eventTopic('cancellationRejected'),
];

/** Wildcard topic that covers all KDS events */
export const KDS_WILDCARD_TOPIC = `${TOPIC_PREFIX}/+`;

/**
 * Create an MQTT client connecting via WebSocket to Mosquitto.
 * host = window.location.hostname (same IP as backend, port 8083)
 */
export function createMqttClient(hostname: string): MqttClient {
    const brokerUrl = `ws://${hostname}:8083`;
    const client = mqtt.connect(brokerUrl, {
        clientId: `kds_web_${Math.random().toString(36).substr(2, 9)}`,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 10000,
        keepalive: 30,
    });
    return client;
}
