# Review QR Generator

A React + Vite app that generates Google review QR codes from review links and opens a truthful, AI-assisted review drafting flow.

## Features

- Paste a Google review URL or g.page link
- Validate that the URL is a valid Google review URL
- Generate a QR code with brand blue styling
- Download the QR as a PNG file
- Copy the original URL to clipboard
- View recent QR history saved in localStorage
- Responsive layout for mobile and desktop
- Print-friendly QR preview
- Optional business guidance embedded in each QR flow
- Customer-provided experience notes used to create varied, editable AI drafts
- Server-side Gemini API proxy so the API key is never shipped to the browser

## Tech Stack

- React
- Vite
- JavaScript
- QRCode library

## Project Setup

```bash
npm install
npm run dev
```

For AI generation, configure `GEMINI_API_KEY` in the deployment environment. Without it, review generation is unavailable rather than producing made-up testimonials.

Then open the local URL shown in the terminal, usually:

```bash
http://localhost:5173
```

## Production Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Notes

The AI is instructed to use only the customer's notes and optional business guidance. Customers should review and edit the draft so it reflects their real experience. The Vercel function lives at `api/gemini.js` and keeps the Gemini credential server-side.

## Repository

- GitHub: https://github.com/Majidullask04/Review-QR-Generator

# QR-review2.0
