'use client';

import React from 'react';

interface InputFieldProps {
    label: string;
    value: any;
    savedValue?: any;
    onChange: (val: any) => void;
    placeholder?: string;
    type?: string;
    helper?: string;
    suffix?: React.ReactNode;
    className?: string;
    isEditing?: boolean;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    step?: string;
}

/**
 * Premium InputField component with:
 * 1. Smart Placeholders (Data terakhir: [value])
 * 2. Persistent Zero Fix (Allows empty string state for numbers)
 * 3. Consistent Premium Styling
 */
export default function InputField({
    label,
    value,
    savedValue,
    onChange,
    placeholder,
    type = 'text',
    helper,
    suffix,
    className = '',
    isEditing = false,
    rows = 3,
    required = false,
    disabled = false,
    autoFocus = false,
    step
}: InputFieldProps) {

    // Determine the smart placeholder
    const displayPlaceholder = (isEditing && savedValue !== undefined && savedValue !== null)
        ? `Data terakhir: ${savedValue}`
        : placeholder;

    const handleTypedValue = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        onChange(val);
    };

    const inputClasses = `w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 md:px-6 py-3 md:py-4 font-bold text-slate-700 
        focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all 
        placeholder:text-slate-300 placeholder:font-medium disabled:opacity-50 disabled:cursor-not-allowed
        ${type === 'date' || type === 'time' ? 'cursor-pointer' : ''} ${className}`;

    return (
        <div className="space-y-1 md:space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="flex justify-between items-center ml-1">
                <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {label} {required && <span className="text-rose-400">*</span>}
                </label>
            </div>

            <div className="relative group">
                {type === 'textarea' ? (
                    <textarea
                        value={(value === null || value === undefined || (typeof value === 'number' && isNaN(value))) ? '' : value}
                        onChange={handleTypedValue}
                        placeholder={displayPlaceholder}
                        className={inputClasses}
                        rows={rows}
                        required={required}
                        disabled={disabled}
                        autoFocus={autoFocus}
                    />
                ) : (
                    <input
                        type={type}
                        value={(value === null || value === undefined || (typeof value === 'number' && isNaN(value))) ? '' : value}
                        onChange={handleTypedValue}
                        placeholder={displayPlaceholder}
                        className={inputClasses}
                        required={required}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        step={step}
                    />
                )}

                {suffix ? (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                        {suffix}
                    </div>
                ) : type === 'date' ? (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                ) : type === 'time' ? (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 1118 0z" /></svg>
                    </div>
                ) : null}
            </div>

            {helper && (
                <p className="text-[10px] font-bold text-slate-400 ml-1 uppercase leading-tight opacity-70">
                    {helper}
                </p>
            )}
        </div>
    );
}
