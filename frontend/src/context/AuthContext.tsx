'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { socket, inventorySocket } from '@/lib/socket';
import { API_URL } from '@/utils/urlUtils';

axios.defaults.baseURL = API_URL;

interface User {
    id: number;
    name: string;
    username: string;
    role: string;
    permissions: string[];
    baseShift?: string;
    phone?: string;
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
    terminalId: string | null;
    setTerminalId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeShift, setActiveShift] = useState<any>(null);
    const [terminalId, setTerminalIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingAccessData, setPendingAccessData] = useState<any>(null);
    const router = useRouter();
    const pathname = usePathname();

    const handlePendingAccess = (data: any) => {
        setPendingAccessData(data);
    };

    const cancelPendingAccess = () => {
        setPendingAccessData(null);
    };

    const setTerminalId = (id: string | null) => {
        if (id) localStorage.setItem('terminalId', id);
        else localStorage.removeItem('terminalId');
        setTerminalIdState(id);
    };

    const refetchShiftRef = useRef(false);
    const refetchShift = async () => {
        if (refetchShiftRef.current) return;
        refetchShiftRef.current = true;
        console.info(`[Auth] Refetching shift at ${new Date().toLocaleTimeString()}`);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const response = await axios.get('/finance/shifts/active');
                if (response.data) {
                    setActiveShift(response.data);
                } else {
                    setActiveShift(null);
                }
            } catch (error) {
                console.error('Failed to fetch active shift:', error);
            }
        } finally {
            refetchShiftRef.current = false;
        }
    };

    const refetchProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await axios.get('/users/me', {
                timeout: 10000 // 10s for profile check
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
        // Setup interceptors BEFORE initialization
        const requestInterceptor = axios.interceptors.request.use((config) => {
            let currentToken = localStorage.getItem('token');
            
            // Sanitize token strings from potential storage artifacts
            if (currentToken === 'null' || currentToken === 'undefined') currentToken = null;

            if (currentToken) {
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

                // Fetch shift and profile in parallel
                // Optimized: refetchShift() can happen in background to make login feel instant
                try {
                    refetchShift(); // Don't await
                    await refetchProfile(); // Profile is needed for UI
                    // Explicit Status Sync: Tell server we are ACTIVE
                    socket.emit('update_status', { userId: parsedUser.id, status: 'ACTIVE' });
                } catch (err: any) {
                    console.error('Initialization error:', err);
                    if (err.response?.status === 401) {
                        logout();
                    }
                }
            }
            
            const storedTerminal = localStorage.getItem('terminalId');
            if (storedTerminal) setTerminalIdState(storedTerminal);

            setLoading(false);
        };

        initializeAuth();

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    useEffect(() => {
        if (user && pathname && pathname !== '/login') {
            if (socket.connected) {
                socket.emit('page_change', { userId: user.id, page: pathname });
            }
        }
    }, [pathname, user]);

    useEffect(() => {
        if (!user) return;

        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            const status = isVisible ? 'ACTIVE' : 'AWAY';

            console.info(`[Auth] Visibility changed: ${isVisible ? 'VISIBLE' : 'HIDDEN'} at ${new Date().toLocaleTimeString()}`);
            if (isVisible) {
                // Force socket to reconnect if it died during idle
                if (!socket.connected) {
                    console.info(`[Auth] Connection lost during idle, reconnecting...`);
                    socket.connect();
                }
                // Also refetch shift to ensure UI is fresh
                refetchShift();
                // Tell server we are back on current page
                socket.emit('page_change', { userId: user.id, page: window.location.pathname });
            } else {
                // Tell server user has left the app (minimized/switched)
                socket.emit('page_change', { userId: user.id, page: '_OUTSIDE_APP_' });
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

        // Listen for role updates
        socket.on('role_updated', () => {
            // Refetch profile since permissions might have changed
            refetchProfile();
        });

        // Listen for employee updates
        socket.on('employee_updated', (data: { id: number }) => {
            if (data.id === user.id) {
                refetchProfile();
            }
        });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            socket.off('force_logout');
            socket.off('user_status_change');
            socket.off('assignments_updated');
            socket.off('shift_started');
            socket.off('shift_ended');
            socket.off('role_updated');
            socket.off('employee_updated');
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

        // Fetch shift in background to make login feel instant
        refetchShift();
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

    const hasPermission = useCallback((permission: string) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        // The user might be an array or undefined, so guard it
        return Array.isArray(user.permissions) && user.permissions.includes(permission);
    }, [user]);

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
            pendingAccessData,
            terminalId,
            setTerminalId
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
