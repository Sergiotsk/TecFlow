import React, { useState, useEffect, useRef } from 'react';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string | number;
    onDebouncedChange: (value: string) => void;
    debounceMs?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
    value,
    onDebouncedChange,
    debounceMs = 300,
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
        setLocalValue(e.target.value);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        isTypingRef.current = false;
        onDebouncedChange(String(localValue));
        if (props.onBlur) props.onBlur(e);
    };

    return (
        <input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};
