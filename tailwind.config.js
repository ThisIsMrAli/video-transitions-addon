/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        expressText: "#222222",
        expressBorder: "#d5d5d5",
        expressbg: "#e6e6e6",
        expressbgLighter: "#f8f8f8",
        expressbgDarker: "#808080",
        expressbgDark: "#1d1d1d",

   
      },
      fontSize: {
        xxs: "0.75rem",
        xs: "0.8125rem",
        sm: "0.9375rem",
        base: "1rem",
        lg: "1.1875rem",
        xl: "1.4375rem",
        "2xl": "2.0625rem",
        "3xl": "2.875rem",
        "4xl": "3.625rem",
        "5xl": "5.8125rem",
      },
      fontFamily: {
        poppins: "Poppins",
        "open-sans": "Open Sans",
        adobe:
          "adobe-clean,Source Sans Pro,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Ubuntu,Trebuchet MS,Lucida Grande,sans-serif",
      },
    },
  },
  plugins: [],
};
