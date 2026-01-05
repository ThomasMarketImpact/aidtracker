<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatMoney, formatNumber } from '$lib/utils/format';
  import Chart from '$lib/components/Chart.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  function handleYearChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    goto(`/sectors?year=${select.value}`);
  }

  let searchQuery = '';
  $: filteredSectors = data.sectors.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chart options for sector trends
  $: trendChartOptions = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((p: any) => {
          const value = p.value >= 1e9 ? `$${(p.value / 1e9).toFixed(1)}B` : `$${(p.value / 1e6).toFixed(0)}M`;
          result += `${p.marker} ${p.seriesName}: ${value}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: data.trends.sectors.map(s => s.name),
      bottom: 0,
      type: 'scroll' as const,
      textStyle: { fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      data: data.trends.years,
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisLabel: {
        color: '#666',
        formatter: (val: number) => val >= 1e9 ? `$${(val / 1e9).toFixed(0)}B` : `$${(val / 1e6).toFixed(0)}M`
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: data.trends.sectors.map((s, i) => ({
      name: s.name,
      type: 'line' as const,
      data: s.data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2 }
    }))
  };

  // Pie chart for sector distribution
  $: pieChartOptions = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        const value = params.value >= 1e9
          ? `$${(params.value / 1e9).toFixed(1)}B`
          : `$${(params.value / 1e6).toFixed(0)}M`;
        return `${params.name}: ${value} (${params.percent.toFixed(1)}%)`;
      }
    },
    legend: {
      orient: 'vertical' as const,
      right: '5%',
      top: 'center',
      type: 'scroll' as const,
      textStyle: { fontSize: 11 }
    },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold' as const
        }
      },
      data: data.sectors.slice(0, 10).map(s => ({
        name: s.name.length > 25 ? s.name.substring(0, 22) + '...' : s.name,
        value: s.funding
      }))
    }]
  };

  function getYoyClass(yoy: number | null): string {
    if (yoy === null) return 'neutral';
    if (yoy >= 10) return 'positive';
    if (yoy <= -10) return 'negative';
    return 'neutral';
  }

  function formatYoy(yoy: number | null): string {
    if (yoy === null) return 'N/A';
    const prefix = yoy >= 0 ? '+' : '';
    return `${prefix}${yoy.toFixed(1)}%`;
  }

</script>

<svelte:head>
  <title>Sectors - Humanitarian Funding Data</title>
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <div class="header-left">
      <h1>Sector Analysis</h1>
      <p class="subtitle">Humanitarian funding breakdown by sector and cluster</p>
    </div>
  </header>

  <nav class="sub-nav">
    <div class="sub-nav-links">
      <a href="/" class="sub-nav-link">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
        Dashboard
      </a>
      <a href="/countries" class="sub-nav-link">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
        Countries
      </a>
      <a href="/donors" class="sub-nav-link">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
        </svg>
        Donors
      </a>
      <a href="/sectors" class="sub-nav-link active">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Sectors
      </a>
      <a href="/about" class="sub-nav-link">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        About
      </a>
    </div>
    <div class="filters">
      <div class="filter-group">
        <label for="year-select">Year</label>
        <select id="year-select" value={data.selectedYear} on:change={handleYearChange}>
          {#each data.availableYears as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </div>
  </nav>

  <div class="stats-row">
    <div class="stat-card">
      <span class="stat-value">{formatMoney(data.totalFunding)}</span>
      <span class="stat-label">Total Sector Funding ({data.selectedYear})</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{data.totalSectors}</span>
      <span class="stat-label">Active Sectors</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{data.globalClusters.length}</span>
      <span class="stat-label">Global Clusters</span>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-card">
      <h3>Sector Funding Trends</h3>
      <div class="chart-container">
        <Chart options={trendChartOptions} height="350px" />
      </div>
    </div>
    <div class="chart-card">
      <h3>Funding Distribution ({data.selectedYear})</h3>
      <div class="chart-container">
        <Chart options={pieChartOptions} height="350px" />
      </div>
    </div>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="Search sectors..."
      bind:value={searchQuery}
      class="search-input"
    />
  </div>

  <div class="sectors-grid">
    {#each filteredSectors as sector, i}
      <div class="sector-card">
        <div class="sector-header">
          <div class="sector-rank">#{i + 1}</div>
          <div class="sector-info">
            <h4 class="sector-name">{sector.name}</h4>
            <span class="sector-code">{sector.code}</span>
            {#if sector.isGlobalCluster}
              <span class="cluster-badge">Global Cluster</span>
            {/if}
          </div>
        </div>

        <div class="sector-funding">
          <span class="funding-amount">{formatMoney(sector.funding)}</span>
          <span class="yoy {getYoyClass(sector.yoyChange)}">{formatYoy(sector.yoyChange)}</span>
        </div>

        <div class="sector-stats">
          <div class="stat-item">
            <span class="stat-num">{sector.countryCount}</span>
            <span class="stat-lbl">Countries</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{sector.donorCount}</span>
            <span class="stat-lbl">Donors</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{sector.flowCount.toLocaleString()}</span>
            <span class="stat-lbl">Flows</span>
          </div>
        </div>

        {#if sector.peopleInNeed}
          <div class="needs-section">
            <div class="needs-header">People in Need</div>
            <div class="needs-stats">
              <div class="need-item">
                <span class="need-value">{formatNumber(sector.peopleInNeed)}</span>
                <span class="need-label">In Need</span>
              </div>
              {#if sector.fundingPerPerson}
                <div class="need-item">
                  <span class="need-value">${sector.fundingPerPerson.toFixed(0)}</span>
                  <span class="need-label">Per Person</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        {#if sector.topCountries.length > 0}
          <div class="top-countries">
            <div class="countries-header">Top Recipients</div>
            <div class="countries-list">
              {#each sector.topCountries as country}
                <a href="/?year={data.selectedYear}&country={country.iso3}" class="country-chip">
                  <span class="country-name">{country.name}</span>
                  <span class="country-funding">{formatMoney(country.funding)}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .page-header {
    margin-bottom: 1rem;
  }

  .page-header h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
  }

  .subtitle {
    color: var(--color-text-muted, #666);
    margin: 0;
  }

  /* Sub Navigation */
  .sub-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface, #f8fafc);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .sub-nav-links {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .sub-nav-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted, #666);
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .sub-nav-link:hover {
    background: rgba(0, 95, 115, 0.08);
    color: var(--primary);
  }

  .sub-nav-link.active {
    background: var(--primary);
    color: white;
  }

  .sub-nav-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .filters {
    display: flex;
    gap: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
  }

  .filter-group select {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    min-width: 120px;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-muted, #666);
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .chart-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .chart-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .chart-container {
    min-height: 350px;
  }

  .search-box {
    margin-bottom: 1rem;
  }

  .search-input {
    width: 100%;
    max-width: 400px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(0, 95, 115, 0.1);
  }

  .sectors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1rem;
  }

  .sector-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sector-header {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .sector-rank {
    background: var(--surface, #f8fafc);
    color: var(--color-text-muted, #666);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 2rem;
    text-align: center;
  }

  .sector-info {
    flex: 1;
  }

  .sector-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .sector-code {
    display: block;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }

  .cluster-badge {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: 4px;
  }

  .sector-funding {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .funding-amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .yoy {
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
  }

  .yoy.positive {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .yoy.negative {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .yoy.neutral {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  .sector-stats {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--surface, #f8fafc);
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    flex: 1;
    text-align: center;
  }

  .stat-num {
    font-size: 1rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-lbl {
    font-size: 0.625rem;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
  }

  .needs-section {
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, #e2e8f0);
  }

  .needs-header, .countries-header {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-muted, #666);
    margin-bottom: 0.5rem;
  }

  .needs-stats {
    display: flex;
    gap: 1rem;
  }

  .need-item {
    display: flex;
    flex-direction: column;
  }

  .need-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }

  .need-label {
    font-size: 0.625rem;
    color: var(--color-text-muted, #666);
  }

  .top-countries {
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, #e2e8f0);
  }

  .countries-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .country-chip {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    background: var(--surface, #f8fafc);
    border-radius: 9999px;
    text-decoration: none;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .country-chip:hover {
    background: rgba(0, 95, 115, 0.1);
  }

  .country-chip .country-name {
    color: #1f2937;
    font-weight: 500;
  }

  .country-chip .country-funding {
    color: var(--primary);
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }

    .sectors-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
