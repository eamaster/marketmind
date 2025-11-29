import { useEffect, useState } from 'react';

interface PriceAnimatedProps {
    value: number;
    className?: string;
    prefix?: string;
}

export function PriceAnimated({ value, className = '', prefix = '$' }: PriceAnimatedProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        if (value !== displayValue) {
            setFlash(true);
            setDisplayValue(value);
            const timeout = setTimeout(() => setFlash(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [value, displayValue]);

    return (
        <span
            className={`${className} transition-all duration-300 ${flash ? 'scale-110 text-yellow-400' : ''
                }`}
        >
            {prefix}{displayValue.toFixed(2)}
        </span>
    );
}
