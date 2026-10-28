/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1F4D3A',
          hover: '#173D2E',
          light: '#2D6B52',
          50: '#F0F5F2',
          100: '#E1EBE5',
          200: '#C3D8CC',
          300: '#92B8A1',
        },
        sage: {
          DEFAULT: '#A9BFA8',
          light: '#C8D7C7',
          dark: '#7D997C',
          50: '#F5F8F5',
          100: '#E7EFE6',
          200: '#D2DFD1',
        },
        'warm-white': {
          DEFAULT: '#FAF7F0',
          paper: '#FFFFFF',
          muted: '#F4EFE6',
          dark: '#ECE5D8',
        },
        amber: {
          DEFAULT: '#E0A030',
          hover: '#C78C26',
          light: '#F4BA4C',
          50: '#FEF9EE',
          100: '#FDF1D6',
          200: '#FBE0A8',
        },
        charcoal: {
          DEFAULT: '#2B2B2B',
          muted: '#5A5A5A',
          light: '#767676',
          border: '#E5E0D5',
        },
        // Map primary to forest green for consistent branding
        primary: {
          DEFAULT: '#1F4D3A',
          50: '#F0F5F2',
          100: '#E1EBE5',
          200: '#C3D8CC',
          500: '#2D6B52',
          600: '#1F4D3A',
          700: '#173D2E',
        },
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
