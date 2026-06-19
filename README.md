# 💱 Currency Converter Pro

A modern, real-time currency converter built with vanilla HTML, CSS, and JavaScript — featuring live exchange rates, rate alerts, multi-currency comparison, and a clean fintech-inspired UI.

##  Features

-  Real-time Currency Conversion — Live exchange rates for 150+ currencies
-  Multi-Currency Compare — Compare one currency against 20 major currencies at once
-  Rate Alerts — Set a target rate and get notified when it's reached
-  Favorites — Save frequently used currency pairs for quick access
-  Conversion History — Track your last 20 conversions, exportable as CSV
-  Dark/Light Theme — Toggle between themes, preference saved automatically
-  Persistent Storage — Favorites, history, and theme saved via localStorage
-  Fully Responsive — Works smoothly on mobile, tablet, and desktop
-  Accessible — ARIA labels and keyboard-friendly controls

##  Tech Stack

- HTML5 — Semantic structure
- CSS3 — Custom properties (CSS variables), Flexbox, Grid, animations
- JavaScript (ES6+) — Classes, async/await, Fetch API, localStorage
- [Open Exchange Rates API](https://open.er-api.com/) — Live currency data
- [Font Awesome](https://fontawesome.com/) — Icons
- [FlagCDN](https://flagcdn.com/) — Country flags

##  Live Demo

http://127.0.0.1:5500/index.html

##  Screenshots

<img width="638" height="314" alt="image" src="https://github.com/user-attachments/assets/0892abd7-a939-4e86-aade-a87dd56a94a5" />


## Installation & Setup



Then simply open `index.html` in your browser — no build step or dependencies required.

> Tip: For best results, use the **Live Server** extension in VS Code instead of opening the file directly.

##  Project Structure
##  Architecture

The app follows a clean, class-based architecture:

- **`CurrencyAPI`** — Handles all API requests for live exchange rates
- **`AlertManager`** — Manages rate alerts, polling every 30 seconds
- **`Storage`** — Wrapper around localStorage with error handling
- **`Toast`** — Reusable notification component
- **`App`** — Main controller that wires up the UI and state

 Author

Abhishek
- GitHub: [@Abhishek5514](https://github.com/Abhishek5514)

 📄 License

This project is open source and available under the [MIT License](LICENSE).
