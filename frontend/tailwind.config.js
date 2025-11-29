/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // MarketMind dark theme colors
                marketmind: {
                    dark: '#0f172a', // slate-900
                    card: 'rgba(30, 41, 59, 0.4)', // slate-800/40
                    border: 'rgba(51, 65, 85, 0.5)', // slate-700/50
                },
                // Financial sentiment colors
                bull: {
                    DEFAULT: '#10b981', // emerald-500
                    light: '#34d399', // emerald-400
                },
                bear: {
                    DEFAULT: '#ef4444', // red-500
                    light: '#f87171', // red-400
                },
                // Legacy colors (keep for backward compatibility)
                bullish: {
                    light: '#10b981',
                    DEFAULT: '#059669',
                    dark: '#047857',
                },
                bearish: {
                    light: '#ef4444',
                    DEFAULT: '#dc2626',
                    dark: '#b91c1c',
                },
                neutral: {
                    light: '#94a3b8',
                    DEFAULT: '#64748b',
                    dark: '#475569',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'marquee': 'marquee 60s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
        },
    },
    plugins: [],
}
