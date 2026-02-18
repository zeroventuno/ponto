/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                primary: {
                    DEFAULT: 'var(--primary)',
                    container: 'var(--primary-container)',
                    on: 'var(--on-primary)',
                    'on-container': 'var(--on-primary-container)',
                },
                surface: {
                    DEFAULT: 'var(--surface)',
                    variant: 'var(--surface-variant)',
                    on: 'var(--on-surface)',
                    'on-variant': 'var(--on-surface-variant)',
                },
                muted: 'var(--muted)',
                outline: 'var(--outline)',
                success: 'var(--success)',
                warning: 'var(--warning)',
                accent: 'var(--accent)',
            },
            borderRadius: {
                '3xl': '24px',
                '4xl': '32px',
            },
            boxShadow: {
                'elevation-1': 'var(--elevation-1)',
                'elevation-2': 'var(--elevation-2)',
            }
        },
    },
    plugins: [],
}
