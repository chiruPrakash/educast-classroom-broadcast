/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0A0C10',
          900: '#0F1117',
          800: '#161921',
          700: '#1E222B',
          600: '#252A35',
          500: '#2E3340',
        },
        signal: {
          DEFAULT: '#00E5A0',
          dim: '#00B87D',
          glow: 'rgba(0,229,160,0.15)',
        },
        amber: {
          vivid: '#FFB830',
          dim: '#CC9226',
        },
        danger: '#FF4757',
        sky: '#3B82F6',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow: {
          from: { boxShadow: '0 0 10px rgba(0,229,160,0.3)' },
          to: { boxShadow: '0 0 25px rgba(0,229,160,0.6)' }
        }
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
