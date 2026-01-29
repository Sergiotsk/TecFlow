import React, { useState, useEffect, useRef } from 'react';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string | number;
    onDebouncedChange: (value: string) => void;
    debounceMs?: number;
    formatAsNumber?: boolean; // New prop to handle numeric inputs as text
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
    value,
    onDebouncedChange,
    debounceMs = 300,
    formatAsNumber = false,
    ...props
}) => {
    const [localValue, setLocalValue] = useState<string | number>(value);
    const isTypingRef = useRef(false);

    useEffect(() => {
        if (!isTypingRef.current && value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    useEffect(() => {
        if (!isTypingRef.current) return;

        const timer = setTimeout(() => {
            onDebouncedChange(String(localValue));
            isTypingRef.current = false;
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [localValue, debounceMs, onDebouncedChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        isTypingRef.current = true;
        let newValue = e.target.value;

        // If formatAsNumber is true, strip non-numeric characters except decimal point
        if (formatAsNumber) {
            // Allow numbers, decimal point, and minus sign at the start
            newValue = newValue.replace(/[^\d.-]/g, '');
            // Ensure only one decimal point
            const parts = newValue.split('.');
            if (parts.length > 2) {
                newValue = parts[0] + '.' + parts.slice(1).join('');
            }
            // Ensure minus sign only at the start
            if (newValue.indexOf('-') > 0) {
                newValue = newValue.replace(/-/g, '');
            }
        }

        setLocalValue(newValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        isTypingRef.current = false;
        onDebouncedChange(String(localValue));
        if (props.onBlur) props.onBlur(e);
    };

    // Override type to 'text' when formatAsNumber is true
    const inputType = formatAsNumber ? 'text' : props.type;

    return (
        <input
            {...props}
            type={inputType}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};
