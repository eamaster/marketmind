import { useEffect, useState } from 'react';

interface PriceAnimatedProps {
    value: number;
    className?: string;
    prefix?: string;
}

export function PriceAnimated({ value, className = '', prefix = '$' }: PriceAnimatedProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [flash, setFlash] = useState(false);

    if (value !== displayValue) {
        setDisplayValue(value);
        setFlash(true);
    }

    useEffect(() => {
        if (!flash) return;
        const timeout = setTimeout(() => setFlash(false), 300);
        return () => clearTimeout(timeout);
    }, [flash]);

    return (
        <span
            className={`${className} transition-all duration-300 ${flash ? 'scale-110 text-yellow-400' : ''
                }`}
        >
            {prefix}{displayValue.toFixed(2)}
        </span>
    );
}
