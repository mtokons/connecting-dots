# 🗳️ Connecting Dots — Bangladesh Election Dashboard 2026

<div align="center">
  
  ![Connecting Dots](https://img.shields.io/badge/Connecting-Dots-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjIiIGZpbGw9IiMwZWE1ZTkiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjYiIHI9IjIiIGZpbGw9IiMwZWE1ZTkiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjE2IiByPSIyIiBmaWxsPSIjMGVhNWU5Ii8+PGxpbmUgeDE9IjgiIHkxPSI4IiB4Mj0iMTYiIHkyPSI2IiBzdHJva2U9IiMwZWE1ZTkiIHN0cm9rZS13aWR0aD0iMSIvPjxsaW5lIHgxPSI4IiB5MT0iOCIgeDI9IjEyIiB5Mj0iMTYiIHN0cm9rZT0iIzBlYTVlOSIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjE2IiB5MT0iNiIgeDI9IjEyIiB5Mj0iMTYiIHN0cm9rZT0iIzBlYTVlOSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
  ![Tech](https://img.shields.io/badge/React-D3.js-61dafb?style=for-the-badge&logo=react)
  
  **🇧🇩 AI-Powered Live Election Dashboard for Bangladesh's 300-Seat Parliament**
  
  *D3 Tree Visualizations • Real-time Data Scraping • AI Predictions • YouTube Live Integration*

</div>

---

## ✨ Features

### 📊 **Live Dashboard**
- Real-time seat count with beautiful visualizations
- 300-seat interactive grid map
- Party-wise vote share pie charts
- Division-wise breakdown

### 🌳 **D3 Party Trees**
- Each party represented as an interactive tree
- Bigger trees = More seats (most popular on top)
- Drill down: Party → Division → Constituency
- Smooth animations and hover effects

### 🤖 **AI Predictions**
- Bayesian estimation model
- Historical voting pattern analysis
- Win probability calculations
- Confidence scoring with real-time updates

### 📡 **Auto Data Scraping**
- Scrapes from Bangladesh Election Commission
- Monitors: The Daily Star, Prothom Alo, bdnews24, etc.
- Automatic updates every 5 minutes
- SSE (Server-Sent Events) for instant UI updates

### 📺 **Live Studio**
- Embed YouTube live streams from BD news channels
- Watch election coverage with real-time data sidebar
- Breaking news ticker

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repo
cd BDElection

# Install all dependencies
npm run install-all

# Seed the database with sample data
npm run setup

# Start development (frontend + backend)
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## 🏗️ Project Structure

```
BDElection/
├── client/                   # React Frontend
│   ├── src/
│   │   ├── components/       # Shared components (Layout)
│   │   ├── hooks/            # Custom hooks (useApi, useSSE)
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── TreeView.jsx     # D3 party trees
│   │   │   ├── Constituencies.jsx
│   │   │   ├── Predictions.jsx  # AI predictions
│   │   │   └── LiveStudio.jsx   # YouTube integration
│   │   └── index.css         # Tailwind + custom styles
│   └── vite.config.js
│
├── server/                   # Node.js Backend
│   ├── ai/
│   │   └── predictionEngine.js  # Bayesian AI model
│   ├── db/
│   │   └── database.js          # SQLite setup
│   ├── routes/
│   │   ├── api.js               # REST endpoints
│   │   └── sse.js               # Real-time events
│   ├── scraper/
│   │   ├── scrapers.js          # Web scrapers
│   │   └── scrapeManager.js     # Orchestration
│   ├── scripts/
│   │   └── seedData.js          # Database seeder
│   └── index.js                 # Express server
│
└── package.json              # Root scripts
```

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard` | Main dashboard summary |
| `GET /api/parties/tree` | Party tree data for D3 |
| `GET /api/constituencies` | List constituencies (filterable) |
| `GET /api/constituency/:id` | Single constituency details |
| `GET /api/predictions` | AI predictions |
| `GET /api/divisions` | Division-wise breakdown |
| `GET /api/search?q=` | Search constituencies/candidates |
| `GET /sse/live` | Server-Sent Events stream |

---

## 🧠 AI Prediction Model

The prediction engine uses a **Bayesian estimation approach**:

1. **Prior**: Historical voting patterns by division
2. **Observed**: Real-time election data
3. **Bayesian Update**: `P(posterior) = P(prior) × (1-w) + P(observed) × w`
4. **Weight (w)**: Increases as more centers report results

Additional factors:
- Momentum analysis (current trend vs historical)
- Win probability using logistic function
- Confidence scoring based on reporting progress

---

## 📰 Data Sources

The scraper is designed to work with:
- 🏛️ Bangladesh Election Commission (ecs.gov.bd)
- 📰 The Daily Star
- 📰 Prothom Alo
- 📰 bdnews24
- 📰 Dhaka Tribune
- 📰 And more...

> **Note:** The CSS selectors in `scrapers.js` are templates. Update them when actual election pages go live to match the real HTML structure.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Visualization** | D3.js, Recharts |
| **Animation** | Framer Motion, CSS |
| **Backend** | Node.js, Express |
| **Database** | SQLite (better-sqlite3) |
| **Scraping** | Axios, Cheerio |
| **Real-time** | Server-Sent Events |

All free and open-source! 🎉

---

## 🔧 Configuration

Edit `server/.env`:

```env
PORT=5000
SCRAPE_INTERVAL=5          # Minutes between scrapes
YOUTUBE_LIVE_ID=           # Default YouTube stream ID
```

---

## 🌐 Deployment

### With render.com (Free Tier)

1. Push code to GitHub
2. Create new Web Service on Render
3. Build command: `npm run install-all && npm run build`
4. Start command: `npm run start`
5. Add environment variables

### With Vercel + Railway

- Frontend: Deploy `client/` to Vercel
- Backend: Deploy `server/` to Railway

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Open Pull Request

---

## ⚠️ Disclaimer

This is an **unofficial** election dashboard for educational and entertainment purposes. 

- Data accuracy depends on source reliability
- AI predictions are statistical estimates, not guarantees
- Always refer to official Election Commission results

---

## 📜 License

MIT License — Free to use, modify, and distribute.

---

<div align="center">
  
  **Made with ❤️ for Bangladesh**
  
  🇧🇩 *Connecting Dots — Where Data Meets Democracy* 🗳️

</div>
