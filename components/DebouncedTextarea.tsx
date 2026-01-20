import React, { useState, useEffect, useRef } from 'react';

interface DebouncedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceMs?: number;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
    value,
    onDebouncedChange,
    debounceMs = 300,
    ...props
}) => {
    const [localValue, setLocalValue] = useState(value);
    const isTypingRef = useRef(false);

    // Sync from parent only if not typing (to avoid cursor jumps or racing)
    // Actually, we should sync if parent changes from outside, but mostly 
    // we want to respect local typing.
    useEffect(() => {
        if (!isTypingRef.current && value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    useEffect(() => {
        if (!isTypingRef.current) return;

        const timer = setTimeout(() => {
            onDebouncedChange(localValue);
            isTypingRef.current = false;
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [localValue, debounceMs, onDebouncedChange]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        isTypingRef.current = true;
        setLocalValue(e.target.value);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // Immediate update on blur to ensure data consistency before save/print
        isTypingRef.current = false;
        onDebouncedChange(localValue);
        if (props.onBlur) props.onBlur(e);
    };

    return (
        <textarea
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};
