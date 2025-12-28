# FTS (Financial Tracking Service) API Documentation

> Research compiled: December 2024
> Purpose: Extract humanitarian funding data to replicate FTS yearly funding charts

---

## Table of Contents

1. [Overview](#overview)
2. [Data Sources & References](#data-sources--references)
3. [API Versions](#api-versions)
4. [Authentication](#authentication)
5. [Core Data Model](#core-data-model)
6. [Available Endpoints](#available-endpoints)
7. [Key Data Points](#key-data-points)
8. [Query Parameters](#query-parameters)
9. [Understanding "Coordinated Plan Funding" vs "Other Funding"](#understanding-coordinated-plan-funding-vs-other-funding)
10. [Sample API Responses](#sample-api-responses)
11. [Implementation Strategy](#implementation-strategy)
12. [Data License](#data-license)

---

## Overview

### What is FTS?

The **Financial Tracking Service (FTS)** is managed by the UN Office for the Coordination of Humanitarian Affairs (OCHA). It has tracked, curated, and published authoritative humanitarian financing data for over 25 years, with a focus on internationally coordinated appeals and response plans.

FTS is part of the **Humanitarian Programme Cycle (HPC) Tools** suite, which includes:

- **Response Planning and Monitoring Module (RPM)**: Strategic framework creation and monitoring
- **Projects Module (PM)**: Project proposals for humanitarian response plans
- **Financial Tracking Service (FTS)**: Centralized hub for humanitarian funding data worldwide

### What Data Does FTS Track?

- Global humanitarian aid flows (inside and outside coordinated appeals)
- Donor contributions and pledges
- Funding to humanitarian response plans (HRPs)
- Flash appeals and regional response plans
- Funding by sector/cluster (WASH, Health, Protection, etc.)
- Funding by country, organization, and emergency

---

## Data Sources & References

### Official Documentation

| Source | URL | Description |
|--------|-----|-------------|
| FTS Public API Landing Page | https://fts.unocha.org/content/fts-public-api | Overview and access information |
| HPC API v1 Documentation | https://api.hpc.tools/docs/v1/ | Detailed v1 endpoint documentation |
| HPC API v2 Swagger Docs | https://api.hpc.tools/docs/v2/ | Swagger UI for v2 endpoints |
| UN-OCHA HPC API GitHub | https://github.com/UN-OCHA/hpc-api | Source code and wiki |
| FTS Data Search | https://fts.unocha.org/data-search | Web interface for custom queries |
| About FTS | https://fts.unocha.org/content/about-fts-using-fts-data | Data usage guidelines |

### Additional Resources

| Source | URL | Description |
|--------|-----|-------------|
| OCHA Knowledge Base - HPC Tools | https://knowledge.base.unocha.org/wiki/spaces/hpc/pages/3993436162/HPC+Tools | HPC Tools overview |
| Humanitarian Data Exchange (HDX) | https://data.humdata.org/ | Pre-processed FTS datasets |
| OCHA Key Figures API | https://keyfigures.api.unocha.org/ | Aggregated humanitarian statistics |

---

## API Versions

### Version 1 (v1) - Legacy but Functional

- **Base URL**: `https://api.hpc.tools/v1/public/`
- **Status**: Active, widely used
- **Documentation**: https://api.hpc.tools/docs/v1/

### Version 2 (v2) - Recommended

- **Base URL**: `https://api.hpc.tools/v2/public/`
- **Status**: Active, recommended by FTS team
- **Documentation**: https://api.hpc.tools/docs/v2/
- **Note**: Data structures differ significantly from v1

### Version 4 (v4) - In Development

- **Technology**: GraphQL
- **Status**: Early development, not ready for production use
- **Source**: https://github.com/UN-OCHA/hpc-api

---

## Authentication

### Public Endpoints

**No authentication required** for public endpoints. The following have been tested and confirmed accessible:

```
https://api.hpc.tools/v1/public/fts/flow?year=2024
https://api.hpc.tools/v1/public/organization
https://api.hpc.tools/v2/public/location
https://api.hpc.tools/v2/public/plan
```

### Internal/Admin Endpoints

Some endpoints require authentication:
- **Method**: HTTP Basic Authentication
- **Request Access**: Email `ocha-hpc@un.org` with:
  - Organization name
  - Intended use case
  - Contact information

---

## Core Data Model

### The Flow Model

FTS data is structured around a **flow model** where each record represents a flow of funds from source to destination.

```
┌─────────────┐         ┌─────────────┐
│   SOURCE    │  ────►  │ DESTINATION │
│  (Donor)    │  Flow   │ (Recipient) │
└─────────────┘         └─────────────┘
```

### Flow Categories

When querying with a boundary, flows are categorized as:

| Category | Description |
|----------|-------------|
| **Incoming** | Funds flowing INTO the specified boundary |
| **Outgoing** | Funds flowing OUT OF the specified boundary |
| **Internal** | Funds moving WITHIN the specified boundary |

### Core Entities

| Entity | Description | Example |
|--------|-------------|---------|
| **Organization** | Donors and implementing agencies | USAID, WFP, UNICEF |
| **Location** | Countries and sub-national areas | Syria, Aleppo Governorate |
| **Plan** | Humanitarian Response Plans, Flash Appeals | Syria HRP 2024 |
| **Emergency** | Crisis or disaster events | Syrian Civil War |
| **Global Cluster** | Humanitarian sectors | Health, WASH, Protection |
| **Project** | Specific funded activities | Water supply rehabilitation |
| **Usage Year** | Budget/reporting year | 2024 |

---

## Available Endpoints

### V1 Public Endpoints

#### Flow Data
```
GET /v1/public/fts/flow
```
Returns financial flow data with filtering and grouping options.

**Tested Response (2024)**:
- Incoming flows: 24,392 records
- Total funding: $37.1 billion USD
- Total pledges: $59.4 million USD

#### Organizations
```
GET /v1/public/organization
```
Returns list of all organizations (donors and recipients).

**Tested Response**:
- 1000+ organizations
- Includes: ID, name, abbreviation, type, country

#### Plans by Year
```
GET /v1/public/plan/year/{YEAR}
```
Returns humanitarian response plans for a specific year.

#### RPM Plan Data
```
GET /v1/public/rpm/plan/{ISO3}
```
Returns response plan data for a specific country (by ISO3 code).

### V2 Public Endpoints

#### Locations
```
GET /v2/public/location
```
Returns all geographic locations.

**Tested Response**:
- 250+ location entries
- Includes: ID, ISO3 code, name, admin level, region flag

#### Plans
```
GET /v2/public/plan
```
Returns all humanitarian plans with requirements data.

**Tested Response**:
- Historical plans from 2000-present
- Includes: original requirements, revised requirements, dates

#### Plan Details
```
GET /v2/public/plan/{ID}?content=entities
```
Returns detailed plan data including clusters, entities, and measurements.

#### Project Search
```
GET /v2/public/project/search?planCodes={CODE}
```
Search projects by plan code.

**Example**:
```
https://api.hpc.tools/v2/public/project/search?planCodes=HSOM19&excludeFields=locations
```

---

## Key Data Points

### Global Clusters / Sectors

| Code | Name |
|------|------|
| CCM | Camp Coordination / Management |
| EDU | Education |
| ERY | Early Recovery |
| FSC | Food Security |
| HEA | Health |
| LOG | Logistics |
| MPC | Multipurpose Cash |
| NUT | Nutrition |
| PRO | Protection |
| SHL | Emergency Shelter and NFI |
| TEL | Emergency Telecommunications |
| WSH | Water Sanitation Hygiene |

### Funding Types

| Field | Description |
|-------|-------------|
| `totalFunding` | Combined funding amount |
| `singleFunding` | Funding unique to one entity |
| `sharedFunding` | Funding spanning multiple entities |
| `overlapFunding` | Funding counted in multiple categories |
| `onBoundaryFunding` | Funding at boundaries (e.g., year transitions) |

### Flow Status Types

| Status | Description |
|--------|-------------|
| Commitment | Pledged funds |
| Paid | Disbursed funds |
| Pledge | Non-binding pledge |
| Carry-over | Funds from previous period |

---

## Query Parameters

### Boundary Parameters

Filter flows by specifying boundaries:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `year` | Budget/usage year | `year=2024` |
| `organizationAbbrev` | Organization abbreviation | `organizationAbbrev=wfp` |
| `organizationId` | Organization ID | `organizationId=123` |
| `planId` | Plan ID | `planId=1032` |
| `planCode` | Plan code | `planCode=HSYR24` |
| `locationId` | Location ID | `locationId=218` |
| `locationISO3` | ISO3 country code | `locationISO3=SYR` |
| `emergencyId` | Emergency ID | `emergencyId=456` |
| `globalClusterId` | Global cluster ID | `globalClusterId=7` |
| `globalClusterCode` | Global cluster code | `globalClusterCode=HEA` |

### Groupby Parameter

Aggregate results by entity type:

```
&groupby=plan
&groupby=organization
&groupby=location
&groupby=year
&groupby=globalCluster
```

### Combining Parameters

- **Multiple values**: Use commas: `organizationAbbrev=wfp,unicef`
- **Multiple parameters**: Use ampersands: `year=2024&locationISO3=SYR`

### Example Queries

```bash
# All 2024 flows
https://api.hpc.tools/v1/public/fts/flow?year=2024

# 2024 flows grouped by plan
https://api.hpc.tools/v1/public/fts/flow?year=2024&groupby=plan

# Flows to Syria in 2024
https://api.hpc.tools/v1/public/fts/flow?year=2024&locationISO3=SYR

# WFP and UNICEF flows in 2024
https://api.hpc.tools/v1/public/fts/flow?year=2024&organizationAbbrev=wfp,unicef

# Flows to a specific plan
https://api.hpc.tools/v1/public/fts/flow?planId=1032
```

---

## Understanding "Coordinated Plan Funding" vs "Other Funding"

### Definitions

The FTS chart "Total funding reported to and processed by FTS per year - inside and outside coordinated plans" shows:

| Category | Description | Color in Chart |
|----------|-------------|----------------|
| **Coordinated Plan Funding** | Funding allocated to formal humanitarian response plans (HRPs, Flash Appeals, Regional Response Plans, etc.) | Dark blue |
| **Other Funding** | Humanitarian funding reported to FTS but not tied to formal coordinated plans (e.g., Red Cross/Red Crescent activities, bilateral funding to affected governments) | Cyan/Light green |

### Historical Data from Chart

| Year | Total ($B) | Coordinated Plan ($B) | Other ($B) |
|------|------------|----------------------|------------|
| 2016 | 22.6 | ~12.0 | ~10.6 |
| 2017 | 21.2 | ~14.5 | ~6.7 |
| 2018 | 25.5 | ~17.0 | ~8.5 |
| 2019 | 25.0 | ~18.0 | ~7.0 |
| 2020 | 29.0 | ~19.5 | ~9.5 |
| 2021 | 30.9 | ~20.0 | ~10.9 |
| 2022 | 43.3 | ~30.0 | ~13.3 |
| 2023 | 38.2 | ~25.2 | ~13.0 |
| 2024 | 37.0 | ~24.0 | ~13.0 |
| 2025 | 22.7 | ~13.0 | ~9.7 |

*Note: Coordinated/Other breakdown estimated from visual chart inspection*

### How to Extract This Data via API

#### Method 1: Using groupby=plan

```
GET https://api.hpc.tools/v1/public/fts/flow?year={YEAR}&groupby=plan
```

Response structure includes funding broken down by plan. Sum funding where:
- Plan name is NOT "Not specified" → **Coordinated Plan Funding**
- Plan name IS "Not specified" → **Other Funding**

#### Method 2: Calculate from Totals

1. Get total funding: `GET /v1/public/fts/flow?year={YEAR}` → `incoming.fundingTotal`
2. Get GHO/coordinated funding from appeals overview or plan queries
3. Other = Total - Coordinated

### Key Reference Points (Verified)

**2023 Data**:
- Total funding tracked: ~$38.19 billion
- GHO (Global Humanitarian Overview) funding: $25.22 billion
- 379 contributors, 933 recipients

**2024 Data (partial year)**:
- Incoming flows: 24,392 records
- Total funding: $37.1 billion

---

## Sample API Responses

### Flow Endpoint Response Structure

```json
{
  "status": "ok",
  "incoming": {
    "flowCount": 24392,
    "fundingTotal": 37100000000,
    "pledgeTotal": 59400000
  },
  "outgoing": {
    "flowCount": 5175,
    "fundingTotal": 4600000000,
    "pledgeTotal": 20200000
  },
  "internal": {
    "flowCount": 6066
  },
  "flows": [
    {
      "id": 176652,
      "status": "commitment",
      "amountUSD": 6600000,
      "sourceObjects": [...],
      "destinationObjects": [...],
      "categories": [...],
      "description": "..."
    }
  ]
}
```

### Plan Endpoint Response Structure

```json
{
  "status": "ok",
  "data": [
    {
      "id": 1124,
      "name": "Syria Humanitarian Response Plan 2023",
      "code": "HSYR23",
      "startDate": "2023-01-01",
      "endDate": "2023-12-31",
      "origRequirements": 5413802598,
      "revisedRequirements": 5413802598,
      "locations": [...],
      "categories": [...]
    }
  ]
}
```

### Organization Endpoint Response Structure

```json
{
  "status": "ok",
  "data": [
    {
      "id": 123,
      "name": "World Food Programme",
      "abbreviation": "WFP",
      "nativeName": null,
      "organizationTypes": ["UN Agency"],
      "locations": [{"id": 1, "name": "Italy"}]
    }
  ]
}
```

---

## Implementation Strategy

### To Replicate the Yearly Funding Chart

#### Step 1: Query Total Funding Per Year

```python
import requests

def get_total_funding(year):
    url = f"https://api.hpc.tools/v1/public/fts/flow?year={year}"
    response = requests.get(url)
    data = response.json()
    return data['incoming']['fundingTotal']
```

#### Step 2: Query Plan-Grouped Funding

```python
def get_funding_by_plan(year):
    url = f"https://api.hpc.tools/v1/public/fts/flow?year={year}&groupby=plan"
    response = requests.get(url)
    data = response.json()

    coordinated = 0
    other = 0

    # Parse through report sections to find plan breakdown
    for report_key in ['report1', 'report2', 'report3', 'report4']:
        if report_key in data:
            objects = data[report_key].get('fundingTotals', {}).get('objects', [])
            for obj in objects:
                if obj.get('type') == 'Plan':
                    if obj.get('name') == 'Not specified':
                        other += obj.get('totalFunding', 0)
                    else:
                        coordinated += obj.get('totalFunding', 0)

    return coordinated, other
```

#### Step 3: Build Complete Dataset

```python
import pandas as pd

def build_yearly_dataset():
    years = range(2016, 2026)
    data = []

    for year in years:
        total = get_total_funding(year)
        coordinated, other = get_funding_by_plan(year)

        data.append({
            'year': year,
            'total_billion': total / 1e9,
            'coordinated_billion': coordinated / 1e9,
            'other_billion': other / 1e9
        })

    return pd.DataFrame(data)
```

### Alternative: CSV Export

FTS provides direct CSV downloads:
- **Custom queries**: https://fts.unocha.org/data-search
- **Annual summaries**: https://fts.unocha.org/appeals/overview/{YEAR}

---

## Data License

All FTS data is available under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

### Requirements for Use

- Provide attribution to OCHA/FTS
- Indicate if changes were made
- Link to license

### Suggested Citation

> Data source: UN OCHA Financial Tracking Service (FTS), https://fts.unocha.org

---

## Contact & Support

- **API Access Requests**: ocha-hpc@un.org
- **FTS Support**: fts@un.org
- **Technical Issues**: https://github.com/UN-OCHA/hpc-api/issues

---

## Appendix: Verified API Endpoints (Tested December 2024)

| Endpoint | Status | Auth Required |
|----------|--------|---------------|
| `GET /v1/public/fts/flow?year=2024` | ✅ Working | No |
| `GET /v1/public/fts/flow?year=2023&groupby=plan` | ✅ Working | No |
| `GET /v1/public/organization` | ✅ Working | No |
| `GET /v1/public/plan/year/2023` | ✅ Working | No |
| `GET /v2/public/location` | ✅ Working | No |
| `GET /v2/public/plan` | ✅ Working | No |
| `GET /v2/public/plan/{ID}?content=entities` | ✅ Working | No |
| `GET /v2/public/fts/flow` | ❌ 404 | N/A |
| `GET /v1/public/emergency` | ❌ 404 | N/A |
