# Phase 0: API Endpoint Test Results

> Tested: December 2024

## Summary

| Category | Working | Failed | Notes |
|----------|---------|--------|-------|
| **FTS API v1** | 5/6 | 1 (expected) | Core functionality works |
| **FTS API v2** | 3/4 | 1 (expected) | Reference data works |
| **HDX HAPI** | 0/3 | 3 | Requires registration (403) |

## Working Endpoints

### FTS API v1 (Primary for Flows)

| Endpoint | Response Time | Records | Notes |
|----------|--------------|---------|-------|
| `/v1/public/fts/flow?year=2024` | 1.2s | 24,000+ flows | ✅ Main flow data |
| `/v1/public/fts/flow?year=2024&groupby=plan` | 11.5s | Grouped data | ✅ Coordinated vs Other breakdown |
| `/v1/public/fts/flow?year=2024&locationId=218` | ~1s | 1,410 flows | ✅ Country filtering (use locationId, not ISO3) |
| `/v1/public/organization` | 4.2s | 14,319 orgs | ✅ Full org list |
| `/v1/public/plan/year/2024` | 0.3s | 50 plans | ✅ Annual plans |
| `/v1/public/global-cluster` | 0.15s | 22 clusters | ✅ Sector/cluster list |

### FTS API v2 (Primary for Reference Data)

| Endpoint | Response Time | Records | Notes |
|----------|--------------|---------|-------|
| `/v2/public/location` | 0.17s | 258 locations | ✅ Countries & regions |
| `/v2/public/plan` | 3.6s | 910 plans | ✅ All historical plans |
| `/v2/public/plan/{id}?content=entities` | 0.8s | 1 plan | ✅ Plan details with clusters |

## Broken/Unavailable Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/v1/public/emergency` | 404 | Confirmed broken - do not use |
| `/v2/public/fts/flow` | 404 | Confirmed broken - use v1 instead |
| `hapi.humdata.org/*` | 403 | Requires app_identifier registration |

## Key Findings

### 1. Country Filtering
**Issue:** `locationISO3=SYR` returns 400 error
**Solution:** Use `locationId=218` instead (Syria's numeric ID)

### 2. API Version Routing Confirmed
```javascript
// Correct routing:
const FTS_ROUTES = {
  // V1 - Use for flows and organizations
  flows: 'https://api.hpc.tools/v1/public/fts/flow',
  organizations: 'https://api.hpc.tools/v1/public/organization',
  globalClusters: 'https://api.hpc.tools/v1/public/global-cluster',
  plansByYear: (year) => `https://api.hpc.tools/v1/public/plan/year/${year}`,

  // V2 - Use for locations and plan details
  locations: 'https://api.hpc.tools/v2/public/location',
  allPlans: 'https://api.hpc.tools/v2/public/plan',
  planDetails: (id) => `https://api.hpc.tools/v2/public/plan/${id}?content=entities`
};
```

### 3. HDX HAPI Unavailable
- HAPI requires registration at https://hapi.humdata.org/
- Returns 403 Forbidden without valid `app_identifier`
- **Decision:** Use manual HDX Excel download for needs data instead

### 4. Response Times
- Flow queries can be slow (up to 12s with groupby)
- Reference data queries are fast (<1s)
- Plan caching is important for performance

### 5. Data Volumes Discovered

| Data Type | Count | Notes |
|-----------|-------|-------|
| Organizations | 14,319 | All donors + recipients |
| Locations | 258 | Countries + regions |
| All Plans (historical) | 910 | 2000-2025 |
| Plans (2024) | 50 | Current year |
| Global Clusters | 22 | Includes sub-types |
| Flows (2024) | ~24,000 | Single year |

## Location ID Mapping Needed

Since we need to use `locationId` instead of ISO3 codes, we need to build a mapping:

```
Syria (SYR) → 218
Afghanistan (AFG) → 1
Yemen (YEM) → 269
Ukraine (UKR) → 234
Sudan (SDN) → 203
...
```

This can be extracted from `/v2/public/location` response.

## Next Steps

1. ✅ API routing confirmed
2. ⏳ Download sample flow data for 2023-2024
3. ⏳ Extract location ID mapping from v2/location
4. ⏳ Download HDX needs data manually
5. ⏳ Calculate actual node counts for aggregation planning
