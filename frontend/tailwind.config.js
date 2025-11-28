/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Financial data visualization colors
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
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
}
