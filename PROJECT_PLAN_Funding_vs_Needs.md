clcl# Project Plan: Interactive Funding vs Needs Comparison

> **Tech Stack:** SvelteKit + Neo4j + Vercel
> **Data Sources:** FTS API (Funding) + HDX/HAPI (Humanitarian Needs)
> **Last Updated:** December 2024 (v2 - incorporates data quality review)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Data Model Analysis](#data-model-analysis)
3. [API Version Strategy](#api-version-strategy) *(NEW)*
4. [Data Quality Framework](#data-quality-framework) *(NEW)*
5. [Why Neo4j?](#why-neo4j)
6. [Neo4j Graph Schema](#neo4j-graph-schema) *(UPDATED)*
7. [Data Ingestion Pipeline](#data-ingestion-pipeline) *(UPDATED)*
8. [SvelteKit Application Architecture](#sveltekit-application-architecture)
9. [API Design](#api-design)
10. [Caching Strategy](#caching-strategy) *(NEW)*
11. [Interactive Visualizations](#interactive-visualizations)
12. [Vercel Deployment Strategy](#vercel-deployment-strategy)
13. [Implementation Phases](#implementation-phases) *(UPDATED)*
14. [Technical Decisions](#technical-decisions)
15. [Cost Considerations](#cost-considerations)

---

## Project Overview

### Goal

Build an interactive web application that allows users to explore and compare:
- **Humanitarian Needs** (People in Need, People Targeted)
- **Funding Requirements** (What was requested)
- **Funding Received** (What was actually funded)
- **Funding Gap** (Requirements - Received)

### Key Questions the App Should Answer

1. Which countries have the largest funding gaps?
2. How does funding compare to needs over time?
3. Which sectors/clusters are most underfunded?
4. Who are the top donors and where does their money go?
5. How do coordinated plan vs "other" funding compare?
6. What is the funding per person in need?

### User Experience

- Interactive world map showing needs vs funding
- Time-series charts (2010-2025)
- Drill-down by country, year, sector, donor
- Cross-filtering and comparison tools
- Exportable data and visualizations

---

## Data Model Analysis

### Available Data Points

#### From HDX (Humanitarian Needs)

| Field | Description | Granularity |
|-------|-------------|-------------|
| `country` | Country name + ISO code | Country |
| `year` | Reference year | Year |
| `people_in_need` | Population requiring assistance | Country-Year |
| `people_targeted` | Population targeted by response | Country-Year |
| `requirements_usd` | Funding requested | Country-Year |
| `funding_usd` | Funding received | Country-Year |
| `percent_funded` | Coverage percentage | Country-Year |
| `plan_type` | HRP, Flash Appeal, Regional | Country-Year |

**Coverage:** 46 countries, 2010-2024

#### From FTS API (Funding Flows)

| Field | Description | Granularity |
|-------|-------------|-------------|
| `flow_id` | Unique flow identifier | Transaction |
| `amount_usd` | Flow amount | Transaction |
| `source_org` | Donor organization | Transaction |
| `dest_org` | Recipient organization | Transaction |
| `location` | Country/region | Transaction |
| `plan` | Associated HRP/Appeal | Transaction |
| `cluster` | Sector (WASH, Health, etc.) | Transaction |
| `year` | Budget year | Transaction |
| `status` | Commitment/Paid/Pledge | Transaction |

**Coverage:** 2000-present, ~30,000+ flows/year

#### HDX HAPI (Programmatic Access)

In addition to manual HDX downloads, the **HDX HAPI** provides REST API access:

| Feature | Details |
|---------|---------|
| **Base URL** | `https://hapi.humdata.org/api/v1` |
| **Authentication** | Free app identifier (no account needed) |
| **Coverage** | 25 countries with standardized indicators |
| **Format** | JSON responses |

**Key HAPI Endpoints:**
```
/api/v1/affected-people/humanitarian-needs  # PiN by sector
/api/v1/coordination-context/funding        # Funding data
/api/v1/population-social/population        # Population baselines
```

### Data Relationships (Why Graph DB Makes Sense)

```
                    ┌─────────────┐
                    │   COUNTRY   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   NEED   │    │   PLAN   │    │  CRISIS  │
    │ (yearly) │    │  (HRP)   │    │(emergency)│
    └──────────┘    └────┬─────┘    └──────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │ CLUSTER │ │ PROJECT │ │  FLOW   │
        │(sector) │ │         │ │(funding)│
        └─────────┘ └─────────┘ └────┬────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                         ▼                       ▼
                   ┌──────────┐           ┌──────────┐
                   │  DONOR   │           │RECIPIENT │
                   │  (org)   │           │  (org)   │
                   └──────────┘           └──────────┘
```

---

## API Version Strategy

> ⚠️ **Critical:** FTS API v1 and v2 have different working endpoints. Using the wrong version will result in 404 errors.

### Endpoint Routing Map

```typescript
// src/lib/api/fts-client.ts
const FTS_API_ROUTES = {
  // ═══════════════════════════════════════════════════════════
  // V1 ENDPOINTS (Use for flows and organizations)
  // ═══════════════════════════════════════════════════════════
  flows: 'https://api.hpc.tools/v1/public/fts/flow',
  organizations: 'https://api.hpc.tools/v1/public/organization',
  plansByYear: (year: number) => `https://api.hpc.tools/v1/public/plan/year/${year}`,

  // ═══════════════════════════════════════════════════════════
  // V2 ENDPOINTS (Use for locations and plan details)
  // ═══════════════════════════════════════════════════════════
  locations: 'https://api.hpc.tools/v2/public/location',
  plans: 'https://api.hpc.tools/v2/public/plan',
  planDetails: (id: number) => `https://api.hpc.tools/v2/public/plan/${id}?content=entities`,
  projectSearch: (planCode: string) =>
    `https://api.hpc.tools/v2/public/project/search?planCodes=${planCode}`,

  // ═══════════════════════════════════════════════════════════
  // ❌ DO NOT USE - These return 404
  // ═══════════════════════════════════════════════════════════
  // v2Flows: 'https://api.hpc.tools/v2/public/fts/flow'  // BROKEN
  // v1Emergency: 'https://api.hpc.tools/v1/public/emergency' // BROKEN
};
```

### Verified Endpoint Status

| Endpoint | Version | Status | Use For |
|----------|---------|--------|---------|
| `/fts/flow` | v1 | ✅ Working | All flow/funding data |
| `/organization` | v1 | ✅ Working | Donor/recipient orgs |
| `/plan/year/{year}` | v1 | ✅ Working | Plans by year |
| `/location` | v2 | ✅ Working | Country/region list |
| `/plan` | v2 | ✅ Working | All plans with requirements |
| `/plan/{id}` | v2 | ✅ Working | Plan details with entities |
| `/fts/flow` | v2 | ❌ 404 | **DO NOT USE** |
| `/emergency` | v1 | ❌ 404 | **DO NOT USE** |

### HDX Data Access Strategy

| Method | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Manual Download** | Historical master dataset (2010-2024) | Complete data, Excel format | Manual process |
| **HDX HAPI** | Current operational data, 25 countries | Programmatic, real-time | Limited country coverage |
| **CKAN API** | Dataset metadata only | Discover new datasets | No data content |

**Recommendation:** Use manual download for historical baseline, HAPI for ongoing updates where available.

---

## Data Quality Framework

> ⚠️ **Critical:** Data quality varies significantly by year and source. Users must be informed of limitations.

### Known Methodology Issues

| Years | Issue | Impact | Mitigation |
|-------|-------|--------|------------|
| **2011-2013** | PiN uses "people targeted" as proxy | Underestimates actual need | Flag in UI, add methodology note |
| **Current year** | Data still being updated | Incomplete totals | Show "provisional" indicator |
| **Pre-2010** | Limited historical data | Gaps in time series | Clearly mark data availability |

### Data Quality Schema

Add quality metadata to Neo4j nodes:

```cypher
// Quality flags on Need nodes
(:Need {
  id: string,
  people_in_need: int,
  people_targeted: int,
  requirements_usd: float,
  funding_usd: float,
  // ─── DATA QUALITY FIELDS ───
  data_quality: string,       // 'verified' | 'provisional' | 'proxy'
  methodology_note: string,   // Explanation of data source
  confidence_level: string,   // 'high' | 'medium' | 'low'
  last_updated: datetime
})

// Separate quality notes for reusable warnings
(:DataQualityNote {
  id: string,
  years_affected: [int],      // e.g., [2011, 2012, 2013]
  title: string,
  description: string,
  recommendation: string
})

// Link needs to quality notes
(n:Need)-[:HAS_QUALITY_NOTE]->(q:DataQualityNote)
```

### Quality Flag Definitions

| Flag | Meaning | UI Treatment |
|------|---------|--------------|
| `verified` | Official, validated data | Normal display |
| `provisional` | Current year, subject to change | ℹ️ Blue info icon |
| `proxy` | Estimated from related metrics | ⚠️ Yellow warning |
| `unavailable` | No data for this dimension | Gray, "N/A" |

### UI Quality Indicators

```svelte
<!-- src/lib/components/DataWarning.svelte -->
<script lang="ts">
  export let year: number;
  export let dataQuality: 'verified' | 'provisional' | 'proxy' | 'unavailable';

  const currentYear = new Date().getFullYear();

  const warnings = {
    methodology_2011_2013: year >= 2011 && year <= 2013,
    current_year_incomplete: year === currentYear,
    proxy_data: dataQuality === 'proxy'
  };
</script>

{#if warnings.methodology_2011_2013}
  <aside class="warning methodology" role="alert">
    <span class="icon">⚠️</span>
    <span class="text">
      <strong>Methodology Note:</strong> 2011-2013 data uses "people targeted"
      as a proxy for "people in need" due to data collection limitations.
    </span>
  </aside>
{/if}

{#if warnings.current_year_incomplete}
  <aside class="info provisional" role="status">
    <span class="icon">ℹ️</span>
    <span class="text">
      <strong>{year} data is provisional</strong> and updated throughout the year.
      Last sync: {lastUpdated}
    </span>
  </aside>
{/if}

{#if warnings.proxy_data}
  <aside class="warning proxy" role="alert">
    <span class="icon">⚠️</span>
    <span class="text">
      This value is estimated from related metrics and may not reflect actual figures.
    </span>
  </aside>
{/if}
```

---

## Why Neo4j?

### Advantages for This Use Case

| Feature | Benefit |
|---------|---------|
| **Native relationships** | Funding flows are inherently relational (donor→recipient) |
| **Traversal queries** | "Show all funding that flows through WFP to Syria" |
| **Flexible schema** | Easy to add new data sources/relationships |
| **Path analysis** | Track money through intermediaries |
| **Aggregation** | Sum funding by any dimension combination |
| **Visualization** | Neo4j Bloom for data exploration |

### Graph Queries We Can Answer

```cypher
// Funding gap by country
MATCH (c:Country)-[:HAS_NEED]->(n:Need {year: 2023})
MATCH (c)<-[:FLOWS_TO]-(f:Flow {year: 2023})
WITH c, n.requirements as required, SUM(f.amount) as received
RETURN c.name, required, received, required - received as gap

// Donor network for a crisis
MATCH (d:Organization)-[:FUNDED]->(f:Flow)-[:FLOWS_TO]->(c:Country {iso3: 'SYR'})
RETURN d.name, SUM(f.amount) as total
ORDER BY total DESC

// Funding per person in need
MATCH (c:Country)-[:HAS_NEED]->(n:Need {year: 2023})
MATCH (c)<-[:FLOWS_TO]-(f:Flow {year: 2023})
WITH c, n.people_in_need as pin, SUM(f.amount) as funding
RETURN c.name, funding / pin as funding_per_person
```

### Neo4j Hosting Options

| Option | Cost | Best For |
|--------|------|----------|
| **Neo4j AuraDB Free** | $0 | Development, small datasets |
| **Neo4j AuraDB Pro** | ~$65/month | Production, larger datasets |
| **Self-hosted (Docker)** | Infrastructure cost | Full control |

**Recommendation:** Start with AuraDB Free tier, upgrade as needed.

---

## Neo4j Graph Schema

### Free Tier Constraint Analysis

> ⚠️ **Critical:** Neo4j AuraDB Free tier limits: **200,000 nodes**, **400,000 relationships**

| Node Type | Raw Count | Notes |
|-----------|-----------|-------|
| Country | ~50 | HDX coverage |
| Need | ~750 | 50 countries × 15 years |
| Plan | ~500 | ~30-40 plans/year |
| Organization | ~2,000 | Donors + recipients |
| Cluster | ~15 | Global clusters |
| **Flow (raw)** | **~450,000** | ~30K/year × 15 years |

**Problem:** Raw flows alone exceed the 200K limit by 2.25x.

**Solution:** Aggregate flows at ingestion time into `FlowSummary` nodes.

### Node Types (Optimized)

```cypher
// ═══════════════════════════════════════════════════════════
// CORE REFERENCE NODES
// ═══════════════════════════════════════════════════════════

(:Country {
  id: string,           // ISO3 code (primary key)
  name: string,
  region: string,
  latitude: float,
  longitude: float
})

(:Cluster {
  id: int,
  code: string,         // e.g., "HEA", "WSH"
  name: string          // Health, WASH, etc.
})

(:Organization {
  id: int,
  name: string,
  abbreviation: string,
  type: string,         // 'UN Agency' | 'NGO' | 'Government' | 'Private'
  country_id: string    // ISO3 of HQ location
})

(:Plan {
  id: int,
  code: string,         // e.g., "HSYR24"
  name: string,
  type: string,         // 'HRP' | 'Flash Appeal' | 'Regional' | 'Other'
  year: int,
  start_date: date,
  end_date: date,
  orig_requirements: float,
  revised_requirements: float
})

// ═══════════════════════════════════════════════════════════
// HUMANITARIAN NEEDS (from HDX)
// ═══════════════════════════════════════════════════════════

(:Need {
  id: string,               // '{iso3}_{year}' composite key
  year: int,
  people_in_need: int,
  people_targeted: int,
  requirements_usd: float,
  funding_usd: float,
  percent_funded: float,
  // ─── DATA QUALITY FIELDS ───
  data_quality: string,     // 'verified' | 'provisional' | 'proxy'
  methodology_note: string,
  confidence_level: string, // 'high' | 'medium' | 'low'
  last_updated: datetime
})

// ═══════════════════════════════════════════════════════════
// AGGREGATED FLOW SUMMARIES (instead of individual flows)
// Reduces ~450K flows to ~50K summaries
// ═══════════════════════════════════════════════════════════

(:FlowSummary {
  id: string,               // '{donor_id}_{recipient_id}_{country}_{year}_{cluster}'
  year: int,
  total_amount_usd: float,
  flow_count: int,
  commitment_amount: float,
  paid_amount: float,
  pledge_amount: float
})

// ═══════════════════════════════════════════════════════════
// DATA QUALITY METADATA
// ═══════════════════════════════════════════════════════════

(:DataQualityNote {
  id: string,
  years_affected: [int],
  title: string,
  description: string,
  impact: string,
  recommendation: string
})
```

### Relationship Types (Simplified)

```cypher
// ─── Country Relationships ───
(Country)-[:HAS_NEED]->(Need)           // Year on Need node, not relationship
(Country)-[:IN_REGION]->(Region)

// ─── Plan Relationships ───
(Plan)-[:COVERS]->(Country)
(Plan)-[:HAS_CLUSTER]->(Cluster)

// ─── Flow Summary Relationships ───
(Organization)-[:FUNDED]->(FlowSummary)
(FlowSummary)-[:RECEIVED_BY]->(Organization)
(FlowSummary)-[:FLOWS_TO]->(Country)
(FlowSummary)-[:FOR_PLAN]->(Plan)       // Optional - not all flows have plans
(FlowSummary)-[:FOR_CLUSTER]->(Cluster) // Optional

// ─── Need Relationships ───
(Need)-[:FOR_COUNTRY]->(Country)
(Need)-[:HAS_QUALITY_NOTE]->(DataQualityNote)
```

### Required Indexes

```cypher
// ═══════════════════════════════════════════════════════════
// CREATE INDEXES FOR QUERY PERFORMANCE
// Run these after initial schema creation
// ═══════════════════════════════════════════════════════════

// Primary key indexes
CREATE CONSTRAINT country_id IF NOT EXISTS FOR (c:Country) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT plan_id IF NOT EXISTS FOR (p:Plan) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT need_id IF NOT EXISTS FOR (n:Need) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT flow_summary_id IF NOT EXISTS FOR (f:FlowSummary) REQUIRE f.id IS UNIQUE;

// Query performance indexes
CREATE INDEX country_name IF NOT EXISTS FOR (c:Country) ON (c.name);
CREATE INDEX org_abbrev IF NOT EXISTS FOR (o:Organization) ON (o.abbreviation);
CREATE INDEX plan_code IF NOT EXISTS FOR (p:Plan) ON (p.code);
CREATE INDEX plan_year IF NOT EXISTS FOR (p:Plan) ON (p.year);
CREATE INDEX need_year IF NOT EXISTS FOR (n:Need) ON (n.year);
CREATE INDEX flow_year IF NOT EXISTS FOR (f:FlowSummary) ON (f.year);

// Composite indexes for common filter patterns
CREATE INDEX flow_year_amount IF NOT EXISTS FOR (f:FlowSummary) ON (f.year, f.total_amount_usd);
```

### Estimated Node Counts (After Aggregation)

| Node Type | Count | % of Limit |
|-----------|-------|------------|
| Country | 50 | 0.03% |
| Need | 750 | 0.38% |
| Plan | 500 | 0.25% |
| Organization | 2,000 | 1.0% |
| Cluster | 15 | 0.01% |
| FlowSummary | ~50,000 | 25% |
| DataQualityNote | ~10 | 0.01% |
| **Total** | **~53,325** | **26.7%** |

✅ **Well within free tier limits** with room for growth.

### Sample Data Load (Cypher)

```cypher
// ═══════════════════════════════════════════════════════════
// STEP 1: Create reference nodes
// ═══════════════════════════════════════════════════════════

// Create countries
LOAD CSV WITH HEADERS FROM 'file:///countries.csv' AS row
CREATE (:Country {
  id: row.iso3,
  name: row.name,
  region: row.region,
  latitude: toFloat(row.lat),
  longitude: toFloat(row.lon)
});

// Create clusters
LOAD CSV WITH HEADERS FROM 'file:///clusters.csv' AS row
CREATE (:Cluster {
  id: toInteger(row.id),
  code: row.code,
  name: row.name
});

// Create organizations
LOAD CSV WITH HEADERS FROM 'file:///organizations.csv' AS row
CREATE (:Organization {
  id: toInteger(row.id),
  name: row.name,
  abbreviation: row.abbreviation,
  type: row.type
});

// ═══════════════════════════════════════════════════════════
// STEP 2: Create needs data with quality flags
// ═══════════════════════════════════════════════════════════

LOAD CSV WITH HEADERS FROM 'file:///needs.csv' AS row
MATCH (c:Country {id: row.iso3})
CREATE (n:Need {
  id: row.iso3 + '_' + row.year,
  year: toInteger(row.year),
  people_in_need: toInteger(row.pin),
  people_targeted: toInteger(row.targeted),
  requirements_usd: toFloat(row.requirements),
  funding_usd: toFloat(row.funding),
  percent_funded: toFloat(row.percent_funded),
  // Quality flags based on year
  data_quality: CASE
    WHEN toInteger(row.year) >= 2011 AND toInteger(row.year) <= 2013 THEN 'proxy'
    WHEN toInteger(row.year) = date().year THEN 'provisional'
    ELSE 'verified'
  END,
  methodology_note: CASE
    WHEN toInteger(row.year) >= 2011 AND toInteger(row.year) <= 2013
    THEN 'PiN derived from people targeted figure'
    ELSE null
  END
})
CREATE (c)-[:HAS_NEED]->(n);

// ═══════════════════════════════════════════════════════════
// STEP 3: Create AGGREGATED flow summaries (not individual flows)
// This CSV is pre-aggregated by: donor, recipient, country, year, cluster
// ═══════════════════════════════════════════════════════════

LOAD CSV WITH HEADERS FROM 'file:///flow_summaries.csv' AS row
MATCH (donor:Organization {id: toInteger(row.donor_id)})
MATCH (recipient:Organization {id: toInteger(row.recipient_id)})
MATCH (country:Country {id: row.country_iso3})
OPTIONAL MATCH (cluster:Cluster {id: toInteger(row.cluster_id)})
CREATE (f:FlowSummary {
  id: row.donor_id + '_' + row.recipient_id + '_' + row.country_iso3 + '_' + row.year,
  year: toInteger(row.year),
  total_amount_usd: toFloat(row.total_amount),
  flow_count: toInteger(row.flow_count),
  commitment_amount: toFloat(row.commitment_amount),
  paid_amount: toFloat(row.paid_amount),
  pledge_amount: toFloat(row.pledge_amount)
})
CREATE (donor)-[:FUNDED]->(f)
CREATE (f)-[:RECEIVED_BY]->(recipient)
CREATE (f)-[:FLOWS_TO]->(country)
FOREACH (ignoreMe IN CASE WHEN cluster IS NOT NULL THEN [1] ELSE [] END |
  CREATE (f)-[:FOR_CLUSTER]->(cluster)
);

// ═══════════════════════════════════════════════════════════
// STEP 4: Create data quality notes
// ═══════════════════════════════════════════════════════════

CREATE (:DataQualityNote {
  id: 'methodology_2011_2013',
  years_affected: [2011, 2012, 2013],
  title: 'Proxy PiN Data',
  description: 'For 2011-2013, People in Need figures use the largest "people targeted" figure from the Consolidated Appeal Process (CAP) as a proxy.',
  impact: 'May underestimate actual humanitarian need',
  recommendation: 'Use caution when comparing to later years'
});

// Link needs to quality notes
MATCH (n:Need) WHERE n.year IN [2011, 2012, 2013]
MATCH (q:DataQualityNote {id: 'methodology_2011_2013'})
CREATE (n)-[:HAS_QUALITY_NOTE]->(q);
```

---

## Data Ingestion Pipeline

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA SOURCES                               │
├──────────────────┬──────────────────┬───────────────────────────┤
│    FTS API v1    │    FTS API v2    │    HDX / HAPI             │
│  (flows, orgs)   │ (locations,plans)│  (needs, requirements)    │
└────────┬─────────┴────────┬─────────┴─────────────┬─────────────┘
         │                  │                       │
         ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Rate Limiter                              │ │
│  │         (10 requests/second, retry with backoff)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Validators (Zod)                         │ │
│  │        (Schema validation, type checking, sanitization)     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Transformer                               │ │
│  │    (Normalize, aggregate flows, add quality flags)          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEO4J AURADB                                │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────┐        │
│  │Countries │ │  Needs   │ │FlowSummaries│ │   Orgs   │        │
│  └──────────┘ └──────────┘ └─────────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Rate Limiting & Retry Logic

```typescript
// src/lib/ingestion/api-client.ts
import pRetry from 'p-retry';
import pThrottle from 'p-throttle';

// Rate limit: 10 requests per second
const throttle = pThrottle({
  limit: 10,
  interval: 1000
});

const throttledFetch = throttle(async (url: string) => {
  return pRetry(
    async () => {
      const response = await fetch(url);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Rate limited. Retry after ${retryAfter}s`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 30000,
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      }
    }
  );
});
```

### Data Validation with Zod

```typescript
// src/lib/ingestion/validators.ts
import { z } from 'zod';

// FTS Flow schema
export const FlowSchema = z.object({
  id: z.number(),
  amountUSD: z.number().min(0),
  status: z.enum(['commitment', 'paid', 'pledge', 'carry-over']),
  sourceObjects: z.array(z.object({
    type: z.string(),
    id: z.number(),
    name: z.string().optional()
  })),
  destinationObjects: z.array(z.object({
    type: z.string(),
    id: z.number(),
    name: z.string().optional()
  }))
});

// HDX Needs schema
export const NeedSchema = z.object({
  country: z.string().length(3),  // ISO3
  year: z.number().min(2010).max(2030),
  people_in_need: z.number().nullable(),
  people_targeted: z.number().nullable(),
  requirements_usd: z.number().min(0),
  funding_usd: z.number().min(0).nullable()
});

// Validation wrapper
export function validateFlows(data: unknown[]): z.infer<typeof FlowSchema>[] {
  const validated: z.infer<typeof FlowSchema>[] = [];
  const errors: { index: number; error: z.ZodError }[] = [];

  data.forEach((item, index) => {
    const result = FlowSchema.safeParse(item);
    if (result.success) {
      validated.push(result.data);
    } else {
      errors.push({ index, error: result.error });
    }
  });

  if (errors.length > 0) {
    console.warn(`${errors.length} flows failed validation`);
  }

  return validated;
}
```

### Flow Aggregation Logic

```typescript
// src/lib/ingestion/aggregator.ts

interface RawFlow {
  id: number;
  amountUSD: number;
  status: string;
  sourceObjects: { type: string; id: number }[];
  destinationObjects: { type: string; id: number }[];
  year: number;
  locationISO3?: string;
  clusterId?: number;
}

interface FlowSummary {
  id: string;
  donorId: number;
  recipientId: number;
  countryISO3: string;
  year: number;
  clusterId?: number;
  totalAmount: number;
  flowCount: number;
  commitmentAmount: number;
  paidAmount: number;
  pledgeAmount: number;
}

export function aggregateFlows(flows: RawFlow[]): FlowSummary[] {
  const summaryMap = new Map<string, FlowSummary>();

  for (const flow of flows) {
    // Extract donor (source org)
    const donor = flow.sourceObjects.find(o => o.type === 'Organization');
    // Extract recipient (dest org)
    const recipient = flow.destinationObjects.find(o => o.type === 'Organization');
    // Extract country
    const country = flow.destinationObjects.find(o => o.type === 'Location');

    if (!donor || !recipient || !country) continue;

    // Create composite key for aggregation
    const key = `${donor.id}_${recipient.id}_${flow.locationISO3}_${flow.year}_${flow.clusterId || 'none'}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        id: key,
        donorId: donor.id,
        recipientId: recipient.id,
        countryISO3: flow.locationISO3!,
        year: flow.year,
        clusterId: flow.clusterId,
        totalAmount: 0,
        flowCount: 0,
        commitmentAmount: 0,
        paidAmount: 0,
        pledgeAmount: 0
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalAmount += flow.amountUSD;
    summary.flowCount += 1;

    // Track by status
    switch (flow.status) {
      case 'commitment':
        summary.commitmentAmount += flow.amountUSD;
        break;
      case 'paid':
        summary.paidAmount += flow.amountUSD;
        break;
      case 'pledge':
        summary.pledgeAmount += flow.amountUSD;
        break;
    }
  }

  return Array.from(summaryMap.values());
}
```

### Incremental Update Strategy

```typescript
// src/lib/ingestion/sync.ts

interface SyncMetadata {
  dataType: 'flows' | 'plans' | 'needs' | 'organizations';
  lastSyncTimestamp: Date;
  lastSyncYear: number;
  recordCount: number;
}

// Only fetch what's needed
export async function incrementalSync(dataType: string): Promise<void> {
  const lastSync = await getLastSync(dataType);
  const currentYear = new Date().getFullYear();

  switch (dataType) {
    case 'flows':
      // Current year changes frequently - always refresh
      await syncFlowsForYear(currentYear);
      // Previous year may still receive late updates
      await syncFlowsForYear(currentYear - 1);
      // Historical years are immutable - skip
      break;

    case 'needs':
      // HDX updates monthly - check if new data available
      if (await hasNewHDXData(lastSync.lastSyncTimestamp)) {
        await syncAllNeeds();
      }
      break;

    case 'organizations':
      // Orgs change rarely - weekly sync is sufficient
      if (daysSince(lastSync.lastSyncTimestamp) > 7) {
        await syncOrganizations();
      }
      break;
  }

  await updateSyncMetadata(dataType, new Date(), currentYear);
}
```

### Ingestion Script Structure

```
scripts/
├── ingestion/
│   ├── fetch-fts-flows.ts      # Pull flows from FTS API v1
│   ├── fetch-fts-orgs.ts       # Pull organizations from FTS API v1
│   ├── fetch-fts-plans.ts      # Pull plans from FTS API v2
│   ├── fetch-hdx-needs.ts      # Download HDX datasets or query HAPI
│   ├── validators.ts           # Zod schemas for validation
│   ├── aggregator.ts           # Flow aggregation logic
│   ├── quality-flags.ts        # Add data quality metadata
│   ├── load-neo4j.ts           # Load into Neo4j
│   └── sync.ts                 # Incremental update logic
├── data/
│   ├── raw/                    # Raw API responses (gitignored)
│   ├── processed/              # Transformed CSVs for Neo4j
│   └── sync-metadata.json      # Track last sync times
└── run-ingestion.ts            # Orchestrate full or incremental sync
```

### Scheduled Updates

| Data Type | Update Frequency | Strategy | Method |
|-----------|-----------------|----------|--------|
| FTS Flows (current year) | Daily | Incremental | Vercel Cron |
| FTS Flows (previous year) | Weekly | Incremental | Vercel Cron |
| FTS Flows (historical) | Never | Immutable | Initial load only |
| HDX Needs | Monthly | Full refresh | Manual or Vercel Cron |
| Organizations | Weekly | Full refresh | Vercel Cron |
| Plans | Weekly | Full refresh | Vercel Cron |

---

## SvelteKit Application Architecture

### Project Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── fts-client.ts         # FTS API v1/v2 routing (see API Version Strategy)
│   │   ├── hdx-client.ts         # HDX file downloads
│   │   ├── hapi-client.ts        # HDX HAPI programmatic access
│   │   └── types.ts              # Shared API types
│   ├── ingestion/
│   │   ├── flows.ts              # Flow fetching + aggregation
│   │   ├── needs.ts              # Needs data ingestion
│   │   ├── validators.ts         # Zod schemas for validation
│   │   ├── aggregator.ts         # Flow aggregation logic
│   │   ├── quality-flags.ts      # Data quality metadata
│   │   └── sync.ts               # Incremental update logic
│   ├── server/
│   │   ├── neo4j.ts              # Neo4j driver + connection pool
│   │   └── cache.ts              # Tiered caching logic
│   ├── components/
│   │   ├── charts/
│   │   │   ├── FundingGapChart.svelte
│   │   │   ├── TimeSeriesChart.svelte
│   │   │   ├── SankeyDiagram.svelte
│   │   │   ├── WorldMap.svelte
│   │   │   └── ClusterComparison.svelte
│   │   ├── filters/
│   │   │   ├── YearSelector.svelte
│   │   │   ├── CountrySelector.svelte
│   │   │   └── ClusterFilter.svelte
│   │   ├── ui/
│   │   │   ├── Card.svelte
│   │   │   ├── DataTable.svelte
│   │   │   ├── Loading.svelte
│   │   │   └── DataWarning.svelte   # Quality/methodology warnings
│   │   └── index.ts
│   ├── stores/
│   │   ├── filters.ts            # Global filter state
│   │   └── data.ts               # Cached data with refresh
│   └── utils/
│       └── formatters.ts         # Currency, number formatting
├── routes/
│   ├── +page.svelte              # Dashboard home
│   ├── +layout.svelte            # Global layout
│   ├── api/
│   │   ├── funding/
│   │   │   └── +server.ts        # Funding data endpoint
│   │   ├── needs/
│   │   │   └── +server.ts        # Needs data endpoint
│   │   ├── comparison/
│   │   │   └── +server.ts        # Funding vs needs
│   │   ├── flows/
│   │   │   └── +server.ts        # Flow network data
│   │   └── cron/
│   │       └── update-flows/
│   │           └── +server.ts    # Daily sync cron job
│   ├── country/
│   │   └── [iso3]/
│   │       └── +page.svelte      # Country detail page
│   ├── year/
│   │   └── [year]/
│   │       └── +page.svelte      # Year overview
│   └── explore/
│       └── +page.svelte          # Free exploration tool
└── static/
    └── data/
        ├── countries.json        # Static country metadata
        └── clusters.json         # Cluster definitions

scripts/
├── ingestion/
│   ├── fetch-fts-flows.ts        # Pull flows from FTS API v1
│   ├── fetch-fts-orgs.ts         # Pull organizations
│   ├── fetch-fts-plans.ts        # Pull plans from FTS API v2
│   ├── fetch-hdx-needs.ts        # Download HDX datasets
│   └── load-neo4j.ts             # Load data into Neo4j
├── data/
│   ├── raw/                      # Raw API responses (gitignored)
│   ├── processed/                # Transformed CSVs
│   └── sync-metadata.json        # Track last sync times
├── run-ingestion.ts              # Full ingestion orchestrator
├── run-incremental.ts            # Incremental sync
└── validate-data.ts              # Data quality checks
```

### Key Components

#### 1. Dashboard Home (`/`)

```svelte
<script>
  import WorldMap from '$lib/components/charts/WorldMap.svelte';
  import FundingGapChart from '$lib/components/charts/FundingGapChart.svelte';
  import TimeSeriesChart from '$lib/components/charts/TimeSeriesChart.svelte';
  import YearSelector from '$lib/components/filters/YearSelector.svelte';
</script>

<div class="dashboard">
  <header>
    <h1>Humanitarian Funding vs Needs</h1>
    <YearSelector />
  </header>

  <section class="hero-stats">
    <StatCard title="People in Need" value={185_000_000} />
    <StatCard title="Funding Required" value={45_000_000_000} format="currency" />
    <StatCard title="Funding Received" value={25_000_000_000} format="currency" />
    <StatCard title="Funding Gap" value={20_000_000_000} format="currency" variant="warning" />
  </section>

  <section class="map-section">
    <WorldMap data={countryData} metric="funding_gap" />
  </section>

  <section class="charts">
    <FundingGapChart data={gapByCountry} />
    <TimeSeriesChart data={yearlyTrends} />
  </section>
</div>
```

#### 2. Country Detail Page (`/country/[iso3]`)

```svelte
<script>
  import { page } from '$app/stores';
  import SankeyDiagram from '$lib/components/charts/SankeyDiagram.svelte';

  export let data; // From +page.server.ts

  const { country, needs, flows, topDonors, sectorBreakdown } = data;
</script>

<div class="country-detail">
  <h1>{country.name}</h1>

  <section class="needs-overview">
    <h2>Humanitarian Needs</h2>
    <TimeSeriesChart
      data={needs}
      series={['people_in_need', 'people_targeted']}
    />
  </section>

  <section class="funding-flow">
    <h2>Funding Flows</h2>
    <SankeyDiagram
      nodes={flows.nodes}
      links={flows.links}
    />
  </section>

  <section class="donors">
    <h2>Top Donors</h2>
    <DataTable data={topDonors} />
  </section>

  <section class="sectors">
    <h2>Funding by Sector</h2>
    <ClusterComparison data={sectorBreakdown} />
  </section>
</div>
```

### State Management

```typescript
// src/lib/stores/filters.ts
import { writable, derived } from 'svelte/store';

export const selectedYear = writable<number>(2024);
export const selectedCountries = writable<string[]>([]);
export const selectedClusters = writable<string[]>([]);
export const comparisonMode = writable<'absolute' | 'per_capita'>('absolute');

// Derived store for API query params
export const queryParams = derived(
  [selectedYear, selectedCountries, selectedClusters],
  ([$year, $countries, $clusters]) => ({
    year: $year,
    countries: $countries.join(','),
    clusters: $clusters.join(',')
  })
);
```

---

## API Design

### Endpoints

#### GET `/api/funding`

Returns aggregated funding data.

```typescript
// src/routes/api/funding/+server.ts
import { json } from '@sveltejs/kit';
import { getDriver } from '$lib/server/neo4j';

export async function GET({ url }) {
  const year = url.searchParams.get('year') || '2024';
  const country = url.searchParams.get('country');

  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (f:Flow)-[:IN_YEAR]->(y:Year {value: $year})
      ${country ? 'MATCH (f)-[:FLOWS_TO]->(c:Country {id: $country})' : ''}
      RETURN
        SUM(f.amount_usd) as total_funding,
        COUNT(f) as flow_count,
        collect(DISTINCT f.status) as statuses
    `, { year: parseInt(year), country });

    return json(result.records[0].toObject());
  } finally {
    await session.close();
  }
}
```

#### GET `/api/needs`

Returns humanitarian needs data.

```typescript
// src/routes/api/needs/+server.ts
export async function GET({ url }) {
  const year = url.searchParams.get('year');

  const result = await session.run(`
    MATCH (c:Country)-[:HAS_NEED]->(n:Need)-[:FOR_YEAR]->(y:Year {value: $year})
    RETURN c.name as country,
           c.id as iso3,
           n.people_in_need as pin,
           n.people_targeted as targeted,
           n.requirements_usd as requirements,
           n.funding_usd as funding,
           n.percent_funded as percent_funded
    ORDER BY n.requirements_usd DESC
  `, { year: parseInt(year) });

  return json(result.records.map(r => r.toObject()));
}
```

#### GET `/api/comparison`

Returns funding vs needs comparison.

```typescript
// src/routes/api/comparison/+server.ts
export async function GET({ url }) {
  const year = url.searchParams.get('year');

  const result = await session.run(`
    MATCH (c:Country)-[:HAS_NEED]->(n:Need)-[:FOR_YEAR]->(y:Year {value: $year})
    OPTIONAL MATCH (c)<-[:FLOWS_TO]-(f:Flow)-[:IN_YEAR]->(y)
    WITH c, n, SUM(f.amount_usd) as actual_funding
    RETURN
      c.name as country,
      c.id as iso3,
      n.people_in_need as people_in_need,
      n.requirements_usd as requirements,
      COALESCE(actual_funding, 0) as fts_funding,
      n.funding_usd as hdx_funding,
      n.requirements_usd - COALESCE(actual_funding, 0) as funding_gap,
      CASE WHEN n.people_in_need > 0
           THEN COALESCE(actual_funding, 0) / n.people_in_need
           ELSE 0 END as funding_per_person
    ORDER BY funding_gap DESC
  `, { year: parseInt(year) });

  return json(result.records.map(r => r.toObject()));
}
```

#### GET `/api/flows`

Returns flow network for Sankey diagrams.

```typescript
// src/routes/api/flows/+server.ts
export async function GET({ url }) {
  const country = url.searchParams.get('country');
  const year = url.searchParams.get('year');

  const result = await session.run(`
    MATCH (donor:Organization)-[:FUNDED]->(f:Flow)-[:RECEIVED_BY]->(recipient:Organization)
    MATCH (f)-[:FLOWS_TO]->(c:Country {id: $country})
    MATCH (f)-[:IN_YEAR]->(y:Year {value: $year})
    WITH donor, recipient, SUM(f.amount_usd) as amount
    RETURN
      donor.name as source,
      recipient.name as target,
      amount as value
    ORDER BY value DESC
    LIMIT 50
  `, { country, year: parseInt(year) });

  // Transform to Sankey format
  const links = result.records.map(r => r.toObject());
  const nodes = [...new Set(links.flatMap(l => [l.source, l.target]))]
    .map(name => ({ name }));

  return json({ nodes, links });
}
```

---

## Caching Strategy

### Tiered TTL Approach

Different data types have different update frequencies. Use tiered caching:

```typescript
// src/lib/server/cache.ts
import { kv } from '@vercel/kv';  // Or use in-memory for development

interface CacheConfig {
  ttl: number;        // Time-to-live in seconds
  staleWhileRevalidate: number;
}

const CACHE_TIERS: Record<string, CacheConfig> = {
  // Static/rarely changing data
  'reference': {
    ttl: 86400 * 7,           // 7 days
    staleWhileRevalidate: 86400 * 14
  },
  // Historical data (immutable)
  'historical': {
    ttl: 86400 * 30,          // 30 days
    staleWhileRevalidate: 86400 * 60
  },
  // Current year data (changes frequently)
  'current-year': {
    ttl: 3600,                // 1 hour
    staleWhileRevalidate: 7200
  },
  // Aggregated/computed data
  'computed': {
    ttl: 21600,               // 6 hours
    staleWhileRevalidate: 43200
  }
};

function getCacheTier(path: string, year?: number): string {
  const currentYear = new Date().getFullYear();

  if (path.includes('/organization') || path.includes('/location') || path.includes('/cluster')) {
    return 'reference';
  }

  if (year && year < currentYear - 1) {
    return 'historical';
  }

  if (year && year >= currentYear) {
    return 'current-year';
  }

  return 'computed';
}
```

### API Route with Caching

```typescript
// src/routes/api/funding/+server.ts
import { json } from '@sveltejs/kit';
import { kv } from '@vercel/kv';
import { getDriver } from '$lib/server/neo4j';

export async function GET({ url, setHeaders }) {
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()));
  const country = url.searchParams.get('country');

  // Build cache key
  const cacheKey = `api:funding:${year}:${country || 'all'}`;

  // Check cache first
  const cached = await kv.get(cacheKey);
  if (cached) {
    setHeaders({
      'X-Cache': 'HIT',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
    });
    return json(cached);
  }

  // Fetch from Neo4j
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (f:FlowSummary {year: $year})
      ${country ? 'MATCH (f)-[:FLOWS_TO]->(c:Country {id: $country})' : ''}
      RETURN
        SUM(f.total_amount_usd) as total_funding,
        SUM(f.flow_count) as flow_count,
        SUM(f.commitment_amount) as commitments,
        SUM(f.paid_amount) as paid,
        SUM(f.pledge_amount) as pledges
    `, { year, country });

    const data = result.records[0]?.toObject() || {};

    // Determine cache TTL based on data freshness
    const tier = getCacheTier('/funding', year);
    const config = CACHE_TIERS[tier];

    // Store in cache
    await kv.set(cacheKey, data, { ex: config.ttl });

    setHeaders({
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${config.ttl}, stale-while-revalidate=${config.staleWhileRevalidate}`
    });

    return json(data);
  } finally {
    await session.close();
  }
}
```

### Cache Invalidation

```typescript
// src/routes/api/cron/update-flows/+server.ts

export async function POST({ request }) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const currentYear = new Date().getFullYear();

  // Run data sync
  await syncFlowsForYear(currentYear);
  await syncFlowsForYear(currentYear - 1);

  // Invalidate relevant cache keys
  const keysToInvalidate = [
    `api:funding:${currentYear}:*`,
    `api:funding:${currentYear - 1}:*`,
    `api:comparison:${currentYear}:*`,
    `api:comparison:${currentYear - 1}:*`
  ];

  for (const pattern of keysToInvalidate) {
    const keys = await kv.keys(pattern);
    if (keys.length > 0) {
      await kv.del(...keys);
    }
  }

  return json({ success: true, invalidated: keysToInvalidate });
}
```

### Client-Side Caching

```typescript
// src/lib/stores/data.ts
import { writable, derived } from 'svelte/store';

interface CachedData<T> {
  data: T | null;
  timestamp: number;
  loading: boolean;
  error: string | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes client-side

function createCachedStore<T>(fetcher: () => Promise<T>) {
  const store = writable<CachedData<T>>({
    data: null,
    timestamp: 0,
    loading: false,
    error: null
  });

  async function refresh(force = false) {
    const current = get(store);

    // Skip if recent and not forced
    if (!force && current.data && Date.now() - current.timestamp < CACHE_DURATION) {
      return;
    }

    store.update(s => ({ ...s, loading: true, error: null }));

    try {
      const data = await fetcher();
      store.set({
        data,
        timestamp: Date.now(),
        loading: false,
        error: null
      });
    } catch (e) {
      store.update(s => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      }));
    }
  }

  return {
    subscribe: store.subscribe,
    refresh
  };
}
```

---

## Interactive Visualizations

### Recommended Libraries

| Visualization | Library | Why |
|--------------|---------|-----|
| World Map | `svelte-maplibre` or `leaflet` | Interactive, custom styling |
| Time Series | `layercake` + `d3` | Svelte-native, flexible |
| Sankey Diagram | `d3-sankey` | Standard for flow viz |
| Bar Charts | `layercake` | Svelte-native |
| Data Tables | `svelte-headless-table` | Sorting, filtering built-in |

### Key Visualizations

#### 1. Funding Gap World Map

```svelte
<!-- WorldMap.svelte -->
<script>
  import { MapLibre, GeoJSON, Popup } from 'svelte-maplibre';
  import { scaleSequential } from 'd3-scale';
  import { interpolateReds } from 'd3-scale-chromatic';

  export let data; // Country funding gaps

  const colorScale = scaleSequential(interpolateReds)
    .domain([0, Math.max(...data.map(d => d.funding_gap))]);

  function getColor(iso3) {
    const country = data.find(d => d.iso3 === iso3);
    return country ? colorScale(country.funding_gap) : '#ccc';
  }
</script>

<MapLibre style="mapbox://styles/mapbox/light-v10">
  <GeoJSON data={countriesGeoJSON}>
    {#each data as country}
      <Fill
        id={country.iso3}
        color={getColor(country.iso3)}
        on:click={() => goto(`/country/${country.iso3}`)}
      />
    {/each}
  </GeoJSON>
</MapLibre>
```

#### 2. Funding vs Requirements Time Series

```svelte
<!-- TimeSeriesChart.svelte -->
<script>
  import { LayerCake, Svg } from 'layercake';
  import Line from './Line.svelte';
  import Area from './Area.svelte';
  import AxisX from './AxisX.svelte';
  import AxisY from './AxisY.svelte';

  export let data;
  // data = [{ year, requirements, funding, gap }, ...]
</script>

<div class="chart-container">
  <LayerCake
    data={data}
    x="year"
    y={['requirements', 'funding']}
  >
    <Svg>
      <AxisX />
      <AxisY formatTick={d => `$${d/1e9}B`} />
      <Area y="requirements" fill="#e0e0e0" />
      <Line y="requirements" stroke="#333" strokeDasharray="5,5" />
      <Line y="funding" stroke="#2196F3" strokeWidth={2} />
    </Svg>
  </LayerCake>
</div>
```

#### 3. Donor → Recipient Sankey

```svelte
<!-- SankeyDiagram.svelte -->
<script>
  import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

  export let nodes;
  export let links;

  const sankeyGenerator = sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[0, 0], [width, height]]);

  const { nodes: sankeyNodes, links: sankeyLinks } =
    sankeyGenerator({ nodes, links });
</script>

<svg {width} {height}>
  {#each sankeyLinks as link}
    <path
      d={sankeyLinkHorizontal()(link)}
      fill="none"
      stroke="#aaa"
      stroke-width={link.width}
      opacity={0.5}
    />
  {/each}

  {#each sankeyNodes as node}
    <rect
      x={node.x0}
      y={node.y0}
      width={node.x1 - node.x0}
      height={node.y1 - node.y0}
      fill="#2196F3"
    />
    <text x={node.x1 + 5} y={(node.y0 + node.y1) / 2}>
      {node.name}
    </text>
  {/each}
</svg>
```

---

## Vercel Deployment Strategy

### Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'nodejs18.x',
      regions: ['iad1'], // US East (close to Neo4j AuraDB)
      memory: 1024,
      maxDuration: 10
    })
  }
};
```

### Environment Variables

```bash
# .env (local) / Vercel Dashboard (production)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Optional: API caching
VERCEL_URL=https://your-app.vercel.app
```

### Caching Strategy

```typescript
// src/routes/api/funding/+server.ts
export async function GET({ url, setHeaders }) {
  // Cache for 1 hour, stale-while-revalidate for 1 day
  setHeaders({
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
  });

  // ... fetch data
}
```

### Cron Jobs for Data Updates

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/update-flows",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    }
  ]
}
```

### Edge Functions for Static Data

```typescript
// src/routes/api/countries/+server.ts
export const config = {
  runtime: 'edge'
};

export async function GET() {
  // Return cached country list from edge
  return json(COUNTRY_LIST);
}
```

---

## Implementation Phases

### Phase 0: Data Discovery & Validation (3-5 days)

> ⚠️ **Critical:** Complete this phase before writing application code to avoid rework.

| Task | Description | Output |
|------|-------------|--------|
| **API Exploration** | Test all FTS endpoints, confirm v1/v2 routing | Verified endpoint list |
| **Data Sampling** | Download sample data from FTS + HDX for 2023-2024 | Sample JSON/CSV files |
| **Schema Validation** | Verify actual data structures match documentation | Updated type definitions |
| **Volume Estimation** | Calculate actual node/relationship counts | Updated capacity plan |
| **Free Tier Assessment** | Confirm aggregation strategy keeps us under 200K nodes | Go/no-go decision |
| **HAPI Evaluation** | Test HDX HAPI coverage vs manual download | Data access decision |

**Deliverable:** Validated data model, confirmed API strategy, updated capacity plan

**Exit Criteria:**
- [ ] All working endpoints documented with examples
- [ ] Sample data loaded and inspected
- [ ] Node count estimate < 150K (75% of free tier limit)
- [ ] Data quality flags defined for 2011-2013

---

### Phase 1: Foundation (Week 1-2)

| Task | Description |
|------|-------------|
| Neo4j Setup | Create AuraDB instance, define schema **with indexes** |
| Data Quality Layer | Build validators + quality flag system |
| Rate-Limited Ingestion | TypeScript scripts with retry logic and throttling |
| Flow Aggregation | Implement aggregation to reduce 450K flows → ~50K summaries |
| Initial Load | Load 2020-2024 data **with quality flags** |
| SvelteKit Scaffold | Initialize project, configure Vercel adapter |
| Basic API | Implement `/api/needs`, `/api/funding` **with caching** |

**Deliverable:** Working API returning real data with quality indicators

**Key Files Created:**
- `src/lib/api/fts-client.ts` - FTS API v1/v2 routing
- `src/lib/ingestion/validators.ts` - Zod schemas
- `src/lib/ingestion/aggregator.ts` - Flow aggregation
- `src/lib/server/neo4j.ts` - Database connection

---

### Phase 2: Core Visualizations (Week 3-4)

| Task | Description |
|------|-------------|
| Dashboard Layout | Build main dashboard page with stat cards |
| **Data Quality UI** | Implement `DataWarning.svelte` for methodology notes |
| World Map | Choropleth map with funding gaps, quality indicators |
| Time Series | Requirements vs funding chart (2010-2025) |
| Country Pages | Country detail views with quality flags |
| Filters | Year selector, country multi-select |

**Deliverable:** Interactive dashboard with map, charts, and quality indicators

**User Stories:**
- User sees ⚠️ warning when viewing 2011-2013 data
- User sees ℹ️ indicator for current year provisional data
- User can filter by year and see funding gap on map

---

### Phase 3: Advanced Features (Week 5-6)

| Task | Description |
|------|-------------|
| Sankey Diagrams | Donor → recipient flow visualization |
| Sector Breakdown | Cluster/sector comparison charts |
| Per Capita View | Funding per person in need |
| **Coordinated vs Other** | Replicate FTS homepage funding breakdown chart |
| Data Export | CSV/JSON download with metadata |
| Comparison Tool | Side-by-side country/year comparison |

**Deliverable:** Full-featured exploration tool

---

### Phase 4: Polish & Deploy (Week 7-8)

| Task | Description |
|------|-------------|
| **Caching** | Implement tiered TTL caching strategy |
| **Incremental Sync** | Set up Vercel cron jobs for daily updates |
| Performance | Query optimization, lazy loading |
| Mobile | Responsive design for all views |
| Accessibility | ARIA labels, keyboard navigation |
| Documentation | User guide, API docs, data methodology |
| Monitoring | Error tracking, analytics |
| Launch | Production deployment, domain setup |

**Deliverable:** Production-ready application

---

### Phase Summary

| Phase | Duration | Focus | Risk Level |
|-------|----------|-------|------------|
| 0 | 3-5 days | Data validation | Low |
| 1 | 2 weeks | Backend + Data | Medium |
| 2 | 2 weeks | Core UI | Low |
| 3 | 2 weeks | Advanced features | Medium |
| 4 | 2 weeks | Polish + Deploy | Low |
| **Total** | **~9 weeks** | | |

---

## Technical Decisions

### Decision 1: Neo4j vs PostgreSQL

| Factor | Neo4j | PostgreSQL |
|--------|-------|------------|
| Relationship queries | Excellent | Good (with joins) |
| Aggregations | Good | Excellent |
| Hosting simplicity | AuraDB managed | Many options |
| Cost (free tier) | 200K nodes | Varies |
| Learning curve | Cypher is new | SQL is familiar |

**Decision:** Neo4j - the flow model is inherently graph-based, and traversal queries are common.

### Decision 2: Real-time vs Batch Data

| Factor | Real-time (API) | Batch (Pre-loaded) |
|--------|-----------------|-------------------|
| Data freshness | Up-to-date | Daily/weekly |
| Performance | Slower first load | Fast |
| Complexity | Higher | Lower |
| API rate limits | Risk | No risk |

**Decision:** Batch with daily updates. FTS data doesn't change frequently enough to warrant real-time.

### Decision 3: Chart Library

| Library | Pros | Cons |
|---------|------|------|
| Layercake | Svelte-native, flexible | Less out-of-box |
| Chart.js | Easy, many chart types | Not Svelte-native |
| D3 | Maximum control | Steep learning curve |
| Observable Plot | Modern, concise | Newer, less docs |

**Decision:** Layercake for standard charts, D3 for Sankey/custom viz.

---

## Cost Considerations

### Monthly Estimates

| Service | Tier | Cost |
|---------|------|------|
| Neo4j AuraDB | Free (dev) / Pro (prod) | $0 - $65 |
| Vercel | Hobby (dev) / Pro (prod) | $0 - $20 |
| Domain | .org/.com | ~$1/month |
| **Total** | | **$0 - $86/month** |

### Free Tier Limits

**Neo4j AuraDB Free:**
- 200,000 nodes
- 400,000 relationships
- 1 database

**Vercel Hobby:**
- 100 GB bandwidth
- Serverless function limits
- No team features

### Scaling Considerations

If data grows significantly:
1. Upgrade Neo4j to Pro tier
2. Implement query result caching (Redis)
3. Consider pre-computing aggregates
4. Use Vercel Pro for higher limits

---

## Next Steps

1. **Confirm tech stack decisions** - Any preferences on chart libraries, etc.?
2. **Set up Neo4j AuraDB** - Create free instance
3. **Build data ingestion scripts** - Start with 2023-2024 data
4. **Scaffold SvelteKit project** - Initialize with Vercel adapter
5. **Implement first API endpoint** - `/api/comparison`
6. **Build first visualization** - World map with funding gaps

---

*Document created: December 2024*
*Ready for implementation*
