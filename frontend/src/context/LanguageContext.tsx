'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Supported locales
export type Locale = 'id' | 'en';

// Auto-import message files
const messages: Record<Locale, any> = {
    id: null,
    en: null,
};

// Lazy loader for messages
async function loadMessages(locale: Locale) {
    if (!messages[locale]) {
        const mod = await import(`../../messages/${locale}.json`);
        messages[locale] = mod.default;
    }
    return messages[locale];
}

// Resolve a nested key from a flat dot-notation path: e.g. "common.save"
function resolveKey(obj: any, key: string): string {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') return key;
        current = current[part];
    }
    return typeof current === 'string' ? current : key;
}

// Context type
interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    locale: 'id',
    setLocale: () => { },
    t: (key) => key,
    isLoaded: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('id');
    const [translations, setTranslations] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load messages for locale
    const applyLocale = useCallback(async (newLocale: Locale) => {
        setIsLoaded(false);
        const msgs = await loadMessages(newLocale);
        setTranslations(msgs);
        setLocaleState(newLocale);
        setIsLoaded(true);
    }, []);

    // On mount, read from localStorage
    useEffect(() => {
        const saved = (localStorage.getItem('app_language') as Locale) || 'id';
        applyLocale(saved);
    }, [applyLocale]);

    const setLocale = useCallback((newLocale: Locale) => {
        localStorage.setItem('app_language', newLocale);
        applyLocale(newLocale);
    }, [applyLocale]);

    // Translation function with optional interpolation
    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        if (!translations) return key;
        let result = resolveKey(translations, key);
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                result = result.replace(`{${k}}`, String(v));
            });
        }
        return result;
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t, isLoaded }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
