/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [{ pattern: /(bg|text|border)-(improving|stagnating|declining|insufficient|conflicting)(-(soft))?/ }],
  theme: {
    extend: {
      fontFamily: {
        head: ['Oswald', 'Impact', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        parchment: '#F4EBD6',
        panel: '#FFF8F3',
        sand: '#F1E8D0',
        cream: '#FBF3E6',
        rust: { DEFAULT: '#B8460F', dark: '#963709' },
        ink: { DEFAULT: '#1A0F08', 70: '#4a3f37', 50: '#7a6f64', 30: '#b3a893' },
        olive: '#5C5640',
        mint: { DEFAULT: '#A8F0B4', dark: '#1F6B3A' },
        grid: '#E6DAC0',
        // State palette — order improving, stagnating, insufficient, declining, conflicting passes CVD checks
        improving: { DEFAULT: '#1F6B3A', soft: '#DDF7E2' },
        stagnating: { DEFAULT: '#B07A0E', soft: '#FBEFD2' },
        insufficient: { DEFAULT: '#3452D8', soft: '#E4E9FC' },
        declining: { DEFAULT: '#C0392B', soft: '#FBE3DF' },
        conflicting: { DEFAULT: '#7B4FD6', soft: '#EEE6FB' },
      },
      boxShadow: {
        hard: '4px 4px 0 0 #1A0F08',
        'hard-sm': '2px 2px 0 0 #1A0F08',
        'hard-rust': '4px 4px 0 0 #963709',
      },
      keyframes: {
        in: { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'none' } },
        stamp: { '0%': { opacity: 0, transform: 'scale(1.25) rotate(-6deg)' }, '60%': { opacity: 1, transform: 'scale(.96) rotate(-3deg)' }, '100%': { transform: 'scale(1) rotate(-3deg)' } },
      },
      animation: { in: 'in .25s ease-out both', stamp: 'stamp .45s cubic-bezier(.2,.8,.2,1) both' },
    },
  },
  plugins: [],
}
