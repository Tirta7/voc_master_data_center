'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { socket, inventorySocket } from '@/lib/socket';

interface User {
    id: number;
    name: string;
    username: string;
    role: string;
    permissions: string[];
    baseShift?: string;
    assignedTableIds?: any[];
}

interface AuthContextType {
    user: User | null;
    activeShift: any;
    login: (token: string, userData: User) => void;
    handlePendingAccess: (data: any) => void;
    cancelPendingAccess: () => void;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    refetchShift: () => Promise<void>;
    loading: boolean;
    pendingAccessData: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeShift, setActiveShift] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pendingAccessData, setPendingAccessData] = useState<any>(null);
    const router = useRouter();

    const handlePendingAccess = (data: any) => {
        setPendingAccessData(data);
    };

    const cancelPendingAccess = () => {
        setPendingAccessData(null);
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const refetchShift = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch(`${API_URL}/finance/shifts/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    setActiveShift(JSON.parse(text));
                } else {
                    setActiveShift(null);
                }
            } else {
                setActiveShift(null);
            }
        } catch (error) {
            console.error('Failed to fetch active shift:', error);
        }
    };

    const refetchProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data) {
                const freshUser = response.data;
                // Add friendly role name if not present (backend returns entity)
                if (freshUser.role && typeof freshUser.role === 'object') {
                    freshUser.permissions = freshUser.role.permissions;
                    freshUser.role = freshUser.role.name;
                }
                localStorage.setItem('user', JSON.stringify(freshUser));
                setUser(freshUser);
            }
        } catch (error) {
            console.error('Failed to refetch profile:', error);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const storedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (storedUser && token) {
                const parsedUser = JSON.parse(storedUser);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                // Set socket query for reconnection
                socket.io.opts.query = { userId: parsedUser.id };
                inventorySocket.io.opts.query = { userId: parsedUser.id };

                // Force connection with new query
                socket.disconnect().connect();
                inventorySocket.disconnect().connect();

                // Fetch shift BEFORE setting user to prevent overlay flash
                await refetchShift();

                // Immediately refetch profile to get latest assignments/permissions
                await refetchProfile();

                // Explicit Status Sync: Tell server we are ACTIVE now that we've loaded
                socket.emit('update_status', { userId: parsedUser.id, status: 'ACTIVE' });
            }
            setLoading(false);
        };

        initializeAuth();

        // Global axios config
        axios.defaults.timeout = 15000; // 15s timeout to prevent hanging on mobile

        // Add a global interceptor as a fallback
        const requestInterceptor = axios.interceptors.request.use((config) => {
            const currentToken = localStorage.getItem('token');
            if (currentToken && !config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${currentToken}`;
            }
            return config;
        });

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    useEffect(() => {
        if (!user) return;

        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            const status = isVisible ? 'ACTIVE' : 'AWAY';

            if (isVisible) {
                // Force socket to reconnect if it died during idle
                if (!socket.connected) {
                    socket.connect();
                }
                // Also refetch shift to ensure UI is fresh
                refetchShift();
            }

            socket.emit('update_status', { userId: user.id, status });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Listen for force logout
        socket.on('force_logout', (data: { userId: number, message?: string }) => {
            if (data.userId === user.id) {
                const logoutMsg = data.message || 'Hubungi admin, Anda Melakukan pelanggaran kerja.';
                logout();
                alert(logoutMsg);
            }
        });

        // Listen for status changes from others
        socket.on('user_status_change', (data: { userId: number, status: string }) => {
            window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: data }));
        });

        // Listen for assignments
        socket.on('assignments_updated', (data: { userId: number, assignedTableIds: any[] }) => {
            if (data.userId === user.id) {
                refetchShift();
                refetchProfile();
            }
        });

        // Listen for shift status changes
        socket.on('shift_started', (data: any) => {
            if (data.userId === user.id) {
                refetchShift();
            }
        });

        socket.on('shift_ended', (data: { userId: number }) => {
            if (data.userId === user.id) {
                setActiveShift(null);
            }
        });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            socket.off('force_logout');
            socket.off('user_status_change');
            socket.off('assignments_updated');
            socket.off('shift_started');
            socket.off('shift_ended');
        };
    }, [user]);

    const login = async (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Update socket query
        socket.io.opts.query = { userId: userData.id };
        socket.disconnect().connect();

        // Clear any pending access data
        setPendingAccessData(null);

        // Fetch shift BEFORE setting user & redirecting
        await refetchShift();
        setUser(userData);

        // Redirect based on role
        const role = userData.role?.toUpperCase();
        if (role === 'ADMIN' || role === 'OWNER') {
            router.push('/admin/dashboard');
        } else if (role === 'KITCHEN') {
            router.push('/kds');
        } else if (role === 'BARTENDER') {
            router.push('/bartender');
        } else {
            router.push('/');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setPendingAccessData(null);
        setUser(null);
        router.push('/login');
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{
            user,
            activeShift,
            login,
            handlePendingAccess,
            cancelPendingAccess,
            logout,
            hasPermission,
            refetchShift,
            loading,
            pendingAccessData
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
