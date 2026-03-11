import { io } from 'socket.io-client';

const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:4000`;
    }
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
};
const API_URL = getApiUrl();

export const socket = io(API_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

export const inventorySocket = io(`${API_URL}/inventory`, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

export const kdsSocket = io(`${API_URL}/kds`, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});
