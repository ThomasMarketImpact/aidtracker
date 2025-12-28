# Humanitarian Needs Data Overview

A comprehensive guide to accessing and understanding Global Humanitarian Needs data through the Humanitarian Data Exchange (HDX) and related OCHA data systems.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Key Data Sources](#key-data-sources)
3. [Master Historical Dataset](#master-historical-dataset)
4. [Annual GHO Datasets](#annual-gho-datasets)
5. [Data Structure & Fields](#data-structure--fields)
6. [Common Operational Datasets (CODs)](#common-operational-datasets-cods)
7. [Data Access Methods](#data-access-methods)
8. [Data Quality & Limitations](#data-quality--limitations)
9. [Known Challenges](#known-challenges)
10. [Funding Context](#funding-context)
11. [Sources & References](#sources--references)

---

## Introduction

The **Global Humanitarian Overview (GHO)** is the world's most comprehensive, authoritative, and evidence-based assessment of humanitarian need. Published annually by the UN Office for the Coordination of Humanitarian Affairs (OCHA), it provides a global snapshot of current and future trends in humanitarian action for large-scale resource mobilization efforts.

### Key Statistics (2025)
- **185 million** people targeted for assistance
- **~$45 billion** in funding appeals
- **72 countries** covered through 24 country plans, 9 flash appeals, and 9 regional plans
- **2,000+** humanitarian partner organizations

The **Humanitarian Data Exchange (HDX)** is the primary open platform for sharing this data, launched in July 2014. As of 2024, HDX hosts:
- **20,000+** datasets
- **206** contributing organizations
- Coverage of **every active humanitarian crisis**
- Users in **230 countries and territories**

---

## Key Data Sources

### Primary Platforms

| Platform | URL | Description |
|----------|-----|-------------|
| Humanitarian Data Exchange (HDX) | https://data.humdata.org | Main open data platform |
| OCHA Financial Tracking Service (FTS) | https://fts.unocha.org | Funding flows and appeals tracking |
| COD Portal | https://cod.unocha.org | Common Operational Datasets |
| HDX HAPI | https://data.humdata.org/hapi | Humanitarian API for programmatic access |
| Centre for Humanitarian Data | https://centre.humdata.org | Analysis and data standards |

### Publishing Organization

**OCHA HQ** (UN Office for the Coordination of Humanitarian Affairs) is the primary publisher of GHO data on HDX.

---

## Master Historical Dataset

### Humanitarian Needs and Funding 2010-2024

**This is the consolidated master database for all years.**

| Attribute | Details |
|-----------|---------|
| **URL** | https://data.humdata.org/dataset/global-humanitarian-overview-2024-figures |
| **Coverage** | 2010 - 2024 |
| **Countries** | 46 countries across Africa, Asia, Middle East, Latin America |
| **Format** | XLSX (Excel), ~162 KB |
| **Update Frequency** | Annually |
| **Downloads** | 1,900+ |
| **License** | CC BY-IGO (Creative Commons Attribution for Intergovernmental Organisations) |

### Data Fields

The master dataset includes:
- **People in Need (PiN)** - by country and year
- **Funds Required** - humanitarian appeal amounts in USD
- **Funds Received** - actual funding received in USD

### Important Caveats

> **Note:** For 2011, 2012, and 2013, the overall PiN reported refers to the largest "people targeted" figure, taken from the countries' Consolidated Appeal Process (CAP).

---

## Annual GHO Datasets

Individual year datasets provide more granular data including monthly updates, sector breakdowns, and operational details.

| Year | Dataset URL | Key Features |
|------|-------------|--------------|
| **2026** | https://data.humdata.org/dataset/global-humanitarian-overview-2026 | Projections and early planning |
| **2025** | https://data.humdata.org/dataset/global-humanitarian-overview-2025 | Current operational year; monthly updates |
| **2024** | https://data.humdata.org/dataset/global-humanitarian-overview-2024 | Full year data; $48.65B appeal, 186.5M people |
| **2023** | https://data.humdata.org/dataset/global-humanitarian-overview-2023 | Historical reference |
| **2022** | https://data.humdata.org/dataset/global-humanitarian-overview-2022 | 274M people in need (significant increase) |
| **2021** | https://data.humdata.org/dataset/global-humanitarian-overview-2021 | 235M people in need (1 in 33 worldwide) |
| **2017** | https://data.humdata.org/dataset/global-humanitarian-overview-2017-figures | Earlier historical data |

### Annual Dataset Contents

Each annual dataset typically includes:
- Monthly update files (CSV/XLSX)
- Annual report data
- Sector-specific breakdowns
- Regional aggregations
- Funding tracking by plan type
- People in need vs. people targeted comparisons

---

## Data Structure & Fields

### Core Indicators

| Field | Description |
|-------|-------------|
| `Country` | Country name and ISO code |
| `Year` | Reference year |
| `People in Need (PiN)` | Total population requiring humanitarian assistance |
| `People Targeted` | Population targeted by humanitarian response |
| `Requirements (USD)` | Total funding requested |
| `Funding (USD)` | Actual funding received |
| `% Funded` | Percentage of requirements met |
| `Plan Type` | HRP, Flash Appeal, Regional Plan, etc. |

### Methodology

- **Data Type:** Direct Observational Data / Anecdotal Data
- **Sources:** Multiple humanitarian partners
- **Validation:** Coordinated through OCHA country offices and cluster leads

---

## Common Operational Datasets (CODs)

CODs are authoritative reference datasets that support humanitarian operations and decision-making. They ensure consistency across all actors in a humanitarian response.

### Types of CODs

| Type | Code | Description |
|------|------|-------------|
| Administrative Boundaries | COD-AB | Official geographic boundaries (admin levels 0-4) |
| Edge-Matched Boundaries | COD-EM | Cross-border harmonized boundaries |
| Population Statistics | COD-PS | Subnational population data by age/sex |
| Country-Specific | COD-CS | Context-specific operational data |

### Core CODs (Required for All Crisis Countries)

1. **Administrative Boundaries (COD-AB)**
   - Hierarchical administrative structure
   - Annotated with place names and P-codes
   - Accompanied by tabular gazetteer

2. **Population Statistics (COD-PS)**
   - Produced primarily by UNFPA
   - Estimates by sex and 5-year age groups
   - Available at multiple admin levels

### Access Points

- **HDX COD Dashboard:** https://data.humdata.org/cod
- **COD Portal:** https://cod.unocha.org
- **GIS Geoservices:** Available for COD-AB and COD-EM datasets

---

## Data Access Methods

### 1. Manual Download (HDX Website)

Direct download of XLSX/CSV files from dataset pages on data.humdata.org.

### 2. HDX HAPI (Humanitarian API)

Programmatic access to standardized indicators.

| Feature | Details |
|---------|---------|
| **Documentation** | https://hdx-hapi.readthedocs.io/en/latest/ |
| **Architecture** | RESTful API |
| **Authentication** | App identifier required (free, no account needed) |
| **Coverage** | 25 countries with standardized indicators |
| **Format** | JSON responses |

**GitHub Repository:** https://github.com/OCHA-DAP/hdx-hapi

### 3. CKAN API (Metadata Only)

HDX runs on CKAN; the CKAN API provides access to dataset metadata but not the data itself.

**Developer Resources:** https://data.humdata.org/faqs/devs

### 4. Financial Tracking Service (FTS)

For detailed funding flow data:
- Real-time contribution tracking
- Donor and recipient reporting
- Appeal-specific breakdowns

---

## Data Quality & Limitations

### Current Data Availability

As of 2025:
- **74%** of crisis data is available and up-to-date across 22 humanitarian operations
- **70%** availability at start of 2024 across 23 operations
- This represents the highest levels in four years

### Quality Assurance Framework

OCHA evaluates data quality through:
- **HDX Data Grids** - structured assessment of data availability
- **COD Portal** - documents quality of admin boundaries and population data
- **Partner validation** - coordination with humanitarian organizations

### Known Data Quality Issues

1. **Outdated Population Censuses**
   - Many countries have old, inaccurate, or non-existent census data
   - Affects vulnerability estimates and needs calculations

2. **Disputed Boundaries**
   - Contested administrative areas create mapping gaps
   - Populations in disputed zones may be underrepresented

3. **Timeliness**
   - Outdated information cannot effectively support decision-making
   - Some datasets have significant lag times

4. **Reporting Consistency**
   - Variable reporting quality from different sources
   - Methodology changes between years affect comparability

---

## Known Challenges

### Critical Data Gaps

The following areas have persistent gaps:

| Gap Area | Impact |
|----------|--------|
| **Climate Impact Data** | Limited ability to predict hazard impacts on vulnerable populations |
| **Acute Malnutrition Prevalence** | Incomplete nutrition crisis monitoring |
| **Access Constraints** | Underreporting of humanitarian access limitations |
| **Sub-national Disaggregation** | Insufficient local-level granularity |

### Systemic Challenges

1. **Data Silos**
   - Information fragmented across organizations
   - Limited interoperability between systems

2. **Capacity Constraints**
   - Varying data collection capacity in crisis settings
   - Security limitations on field assessments

3. **Political Sensitivities**
   - Some governments restrict data sharing
   - Disputed figures on displacement and casualties

4. **Historical Comparability**
   - Methodology changes (e.g., 2011-2013 PiN calculations)
   - Different definitions over time

5. **Funding for Data**
   - Data ecosystem threatened by 2025 funding cuts
   - Risk of reversing progress on data coverage

---

## Funding Context

### 2024-2025 Funding Crisis

The humanitarian sector faces unprecedented funding challenges:

| Metric | Value |
|--------|-------|
| 2024 Funding Cut | -11% (~$5 billion reduction) |
| 2024 GHO Funded (as of Oct 2024) | 35% |
| Projected 2025 Contraction | 34-45% below 2023 levels |
| Average Appeal Duration | 10 years |

### Historical Trend

This represents the **largest funding cut ever recorded**, reversing over a decade of upward trends in international humanitarian assistance.

### Impact on Data

- Reduced capacity for data collection
- Potential gaps in monitoring and reporting
- Threat to sustained data infrastructure investments

---

## Sources & References

### Primary Data Sources

- [Humanitarian Data Exchange (HDX)](https://data.humdata.org)
- [Global Humanitarian Overview 2025 Dataset](https://data.humdata.org/dataset/global-humanitarian-overview-2025)
- [Humanitarian Needs and Funding 2010-2024](https://data.humdata.org/dataset/global-humanitarian-overview-2024-figures)
- [OCHA HQ on HDX](https://data.humdata.org/organization/cc25599d-0150-48d8-b70b-d376cfa096f1)

### Documentation & Methodology

- [HDX HAPI Documentation](https://hdx-hapi.readthedocs.io/en/latest/)
- [HDX Developer Resources](https://data.humdata.org/faqs/devs)
- [Common Operational Datasets Portal](https://cod.unocha.org)
- [COD Dashboard on HDX](https://data.humdata.org/cod)

### Reports & Analysis

- [The State of Open Humanitarian Data 2024](https://www.unocha.org/publications/report/world/state-open-humanitarian-data-2024-marking-ten-years-humanitarian-data-exchange)
- [Global Humanitarian Assistance Report 2025](https://alnap.org/help-library/resources/global-humanitarian-assistance-gha-report-2025-e-report/)
- [Reflecting on Ten Years of HDX](https://centre.humdata.org/reflecting-on-ten-years-of-hdx/)

### Standards & Quality

- [Common Operational Datasets Guidance](https://knowledge.base.unocha.org/wiki/spaces/imtoolbox/pages/42045911/Common+Operational+Datasets+CODs)
- [OCHA IM Toolbox](https://knowledge.base.unocha.org/wiki/spaces/imtoolbox/)
- [MapAction Data Quality Initiatives](https://mapaction.org/strengthening-data-quality-for-shared-humanitarian-data-sets-can-reduce-human-suffering/)

### API & Technical Resources

- [HDX HAPI GitHub Repository](https://github.com/OCHA-DAP/hdx-hapi)
- [HDX HAPI Landing Page](https://data.humdata.org/hapi)
- [Centre for Humanitarian Data](https://centre.humdata.org)

---

## Quick Reference

### Get Started

1. **For historical analysis:** Download the [2010-2024 master dataset](https://data.humdata.org/dataset/global-humanitarian-overview-2024-figures)
2. **For current operations:** Access the [GHO 2025 dataset](https://data.humdata.org/dataset/global-humanitarian-overview-2025)
3. **For programmatic access:** Use [HDX HAPI](https://data.humdata.org/hapi)
4. **For geographic data:** Visit the [COD Portal](https://cod.unocha.org)

### Key Contacts

- **HDX Platform:** data.humdata.org
- **Centre for Humanitarian Data:** centre.humdata.org
- **OCHA:** unocha.org

---

*Document compiled: December 2024*
*Data current as of: GHO 2025 cycle*
