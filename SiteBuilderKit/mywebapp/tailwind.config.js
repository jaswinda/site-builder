module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': '.75rem',
      },
      colors: {
        brand: {
          light: "#eff1f8",
          DEFAULT: "#ebedf2",
          dark: "#e9ebf3",
          disabled: "#f6f8fb",
        }
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
  blocklist: [ /* Prevent conflicts with the built-in size-x classes from the builder */
      'size-12',
      'size-14',
      'size-16',
      'size-20',
      'size-24',
      'size-28',
      'size-32',
      'size-36',
      'size-40',
      'size-44',
      'size-48',
      'size-52',
      'size-56',
      'size-60',
      'size-64',
      'size-72',
      'size-80',
      'size-96'
  ],
}
