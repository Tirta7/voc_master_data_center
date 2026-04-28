'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';

interface MqttContextType {
    isConnected: boolean;
    subscribe: (topic: string, callback: (payload: any) => void) => () => void;
    publish: (topic: string, message: any) => void;
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

/**
 * Returns true if the incoming `topic` matches the `pattern` (which may contain MQTT wildcards).
 * Supports '+' (single level) and '#' (multi-level).
 */
function topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '#') return true;
        if (i >= topicParts.length) return false;
        if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
}

export const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<MqttClient | null>(null);
    const callbacks = useRef<Record<string, Set<(payload: any) => void>>>({});

    useEffect(() => {
        const getMqttUrl = () => {
            if (typeof window !== 'undefined') {
                // Dynamically use current hostname to ensure MQTT connects to the same server 
                // regardless of IP changes in local network.
                return `ws://${window.location.hostname}:8083`;
            }
            return process.env.NEXT_PUBLIC_MQTT_URL || 'ws://localhost:8083';
        };
        const mqttUrl = getMqttUrl();

        // Guard flag: if cleanup runs before connect fires, skip re-subscribing
        let destroyed = false;
        let retryCount = 0;
        const maxRetries = 3;

        const mqttClient = mqtt.connect(mqttUrl, {
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 5000,
            manualConnect: false,
        });

        clientRef.current = mqttClient;

        mqttClient.on('connect', () => {
            if (destroyed) {
                mqttClient.end(true);
                return;
            }
            console.log('MQTT Connected successfully to', mqttUrl);
            setIsConnected(true);
            retryCount = 0;

            // Re-subscribe to all registered topics on (re)connect
            Object.keys(callbacks.current).forEach(topic => {
                mqttClient.subscribe(topic, err => {
                    if (err) console.warn(`MQTT subscribe error [${topic}]:`, err.message);
                });
            });
        });

        mqttClient.on('disconnect', () => setIsConnected(false));
        mqttClient.on('offline', () => setIsConnected(false));

        mqttClient.on('error', (err) => {
            retryCount++;
            if (retryCount >= maxRetries) {
                console.warn(`MQTT connection failed after ${maxRetries} attempts. Real-time updates will fallback to Socket.io.`);
                mqttClient.end();
                return;
            }
            if (err.message !== 'client disconnecting') {
                console.warn('MQTT connection attempt error:', err.message);
            }
        });

        mqttClient.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                Object.entries(callbacks.current).forEach(([registeredTopic, cbSet]) => {
                    if (topicMatches(registeredTopic, topic)) {
                        cbSet.forEach(cb => cb(payload));
                    }
                });
            } catch (e) {
                console.warn('MQTT payload parse error:', e);
            }
        });

        return () => {
            destroyed = true;
            setIsConnected(false);
            mqttClient.end(true); // force=true: end immediately, no waiting
            clientRef.current = null;
        };
    }, []);

    // subscribe is stable — never recreated (empty deps)
    const subscribe = useCallback((topic: string, callback: (payload: any) => void) => {
        if (!callbacks.current[topic]) {
            callbacks.current[topic] = new Set();
            // Only subscribe on broker if already connected
            if (clientRef.current?.connected) {
                clientRef.current.subscribe(topic);
            }
        }

        callbacks.current[topic].add(callback);

        return () => {
            callbacks.current[topic]?.delete(callback);
            if (callbacks.current[topic]?.size === 0) {
                delete callbacks.current[topic];
                if (clientRef.current?.connected) {
                    clientRef.current.unsubscribe(topic);
                }
            }
        };
    }, []);

    const publish = useCallback((topic: string, message: any) => {
        if (clientRef.current?.connected) {
            clientRef.current.publish(topic, JSON.stringify(message));
        }
    }, []);

    return (
        <MqttContext.Provider value={{ isConnected, subscribe, publish }}>
            {children}
        </MqttContext.Provider>
    );
};

export const useMqtt = () => {
    const context = useContext(MqttContext);
    if (context === undefined) {
        throw new Error('useMqtt must be used within a MqttProvider');
    }
    return context;
};
