# AidTracker

A humanitarian funding analytics dashboard that visualizes funding flows against humanitarian needs data. Built for [aidtracker.marketimpact.org](https://aidtracker.marketimpact.org).

## Overview

AidTracker helps analyze the gap between humanitarian funding and actual needs by combining data from:

- **[Financial Tracking Service (FTS)](https://fts.unocha.org/)** - UN OCHA's authoritative humanitarian funding database
- **[Humanitarian API (HAPI)](https://hapi.humdata.org/)** - Programmatic access to humanitarian needs data
- **Global Humanitarian Overview (GHO)** - Annual people-in-need statistics

## Features

- **Funding Trends** - Track humanitarian funding from 2016-2025 with inflation adjustment to 2025 USD
- **Country Analysis** - Compare funding across countries with per-person-in-need metrics
- **Sector Breakdown** - Visualize funding distribution across humanitarian clusters (Health, WASH, Protection, etc.)
- **Donor Analysis** - Identify top government donors with year-over-year changes
- **Interactive Charts** - Click-to-filter visualizations powered by ECharts

## Tech Stack

- **Frontend**: SvelteKit 5, TypeScript, ECharts 6
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Architecture

### Shared Utilities

The codebase uses shared utilities to ensure consistency across routes:

- **`$lib/utils/validation.ts`** - Input validation with safe number parsing, year validation, and parameter sanitization
- **`$lib/utils/formatters.ts`** - Consistent number and currency formatting across the dashboard
- **`$lib/utils/excelExport.ts`** - Excel export functionality for chart data

### Data Ingestion

Data ingestion scripts in `/scripts` use resilient fetching with exponential backoff retry logic:

- Automatic retry on network failures (up to 4 attempts)
- Exponential backoff (2s, 4s, 8s, 16s delays)
- Retry on HTTP 429, 500, 502, 503, 504 status codes

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (recommend [Neon](https://neon.tech/))

### Installation

```bash
# Clone the repository
git clone https://github.com/ThomasMarketImpact/aidtracker.git
cd aidtracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials
```

### Environment Variables

Create a `.env` file with:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
FTS_API_BASE=https://api.hpc.tools
HAPI_API_BASE=https://hapi.humdata.org/api/v2
HAPI_APP_ID=your_base64_encoded_app_id
```

### Database Setup

```bash
# Push schema to database
npm run db:push

# Ingest data from APIs
npm run ingest
```

### Development

```bash
# Start dev server
npm run dev

# Type checking
npm run check

# Open database studio
npm run db:studio
```

### Production Build

```bash
npm run build
npm run preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | Run type checking |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run ingest` | Run full data ingestion |
| `npm run ingest:flows` | Ingest FTS funding flows |
| `npm run test:db` | Test database connection |

## Data Model

- **countries** - Country metadata with ISO3 codes and HRP flags
- **organizations** - Donor and recipient organizations
- **sectors** - Humanitarian sectors/clusters
- **plans** - Humanitarian Response Plans
- **flowSummaries** - Aggregated funding flows by year, donor, recipient, sector
- **humanitarianNeeds** - People in need by country, year, sector
- **fundingRequirements** - Appeal requirements vs actual funding

## Documentation

- [PROJECT_PLAN_Funding_vs_Needs.md](./PROJECT_PLAN_Funding_vs_Needs.md) - Project architecture
- [FTS_API_Documentation.md](./FTS_API_Documentation.md) - FTS API reference
- [humanitarian_needs_data_overview.md](./humanitarian_needs_data_overview.md) - Data sources guide

## License

MIT

## Acknowledgments

- [UN OCHA Financial Tracking Service](https://fts.unocha.org/)
- [Humanitarian Data Exchange](https://data.humdata.org/)
- [Centre for Humanitarian Data](https://centre.humdata.org/)
