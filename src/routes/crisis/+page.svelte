<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatMoney, formatNumber } from '$lib/utils/format';
  import Chart from '$lib/components/Chart.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  function handleYearChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    goto(`/crisis?year=${select.value}`);
  }

  // Active tab for crisis types
  let activeTab: 'severity' | 'food' | 'refugees' | 'gaps' = 'severity';

  // Severity distribution chart
  $: severityChartOptions = {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const }
    },
    legend: {
      data: ['Population'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      data: data.severityDistribution.map(s => s.label),
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#666',
        formatter: (val: number) => val >= 1e6 ? `${(val / 1e6).toFixed(0)}M` : val.toLocaleString()
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: [{
      name: 'Population',
      type: 'bar' as const,
      data: data.severityDistribution.map(s => ({
        value: s.population,
        itemStyle: { color: s.color }
      })),
      barWidth: '60%'
    }]
  };

  // IPC phases chart
  $: ipcChartOptions = {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (params: any) => {
        let result = `<strong>${params[0].name}</strong><br/>`;
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${formatNumber(p.value)}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['Phase 3 (Crisis)', 'Phase 4 (Emergency)', 'Phase 5 (Famine)'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      data: data.ipcCountries.slice(0, 10).map(c => c.countryName.length > 12 ? c.countryName.slice(0, 10) + '...' : c.countryName),
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666', rotate: 45 }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#666',
        formatter: (val: number) => val >= 1e6 ? `${(val / 1e6).toFixed(0)}M` : val.toLocaleString()
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: [
      {
        name: 'Phase 3 (Crisis)',
        type: 'bar' as const,
        stack: 'total',
        data: data.ipcCountries.slice(0, 10).map(c => c.phase3),
        itemStyle: { color: '#f97316' }
      },
      {
        name: 'Phase 4 (Emergency)',
        type: 'bar' as const,
        stack: 'total',
        data: data.ipcCountries.slice(0, 10).map(c => c.phase4),
        itemStyle: { color: '#ef4444' }
      },
      {
        name: 'Phase 5 (Famine)',
        type: 'bar' as const,
        stack: 'total',
        data: data.ipcCountries.slice(0, 10).map(c => c.phase5),
        itemStyle: { color: '#7f1d1d' }
      }
    ]
  };

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getSeverityBadgeClass(level: number): string {
    if (level >= 4) return 'severity-critical';
    if (level >= 3) return 'severity-severe';
    if (level >= 2) return 'severity-moderate';
    return 'severity-low';
  }
</script>

<svelte:head>
  <title>Crisis Overview - Humanitarian Funding Data</title>
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <div class="header-left">
      <h1>Crisis Overview</h1>
      <p class="subtitle">Global humanitarian crisis monitoring and severity indicators</p>
    </div>
  </header>

  <nav class="sub-nav">
    <div class="sub-nav-links">
      <a href="/" class="sub-nav-link">Dashboard</a>
      <a href="/countries" class="sub-nav-link">Countries</a>
      <a href="/donors" class="sub-nav-link">Donors</a>
      <a href="/sectors" class="sub-nav-link">Sectors</a>
      <a href="/crisis" class="sub-nav-link active">Crisis</a>
      <a href="/about" class="sub-nav-link">About</a>
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

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card critical">
      <div class="summary-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      <div class="summary-content">
        <span class="summary-value">{formatNumber(data.summary.totalPeopleInNeed)}</span>
        <span class="summary-label">People in Need</span>
      </div>
    </div>

    <div class="summary-card warning">
      <div class="summary-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
        </svg>
      </div>
      <div class="summary-content">
        <span class="summary-value">{formatNumber(data.summary.totalFoodInsecure)}</span>
        <span class="summary-label">Food Insecure (IPC 3+)</span>
      </div>
    </div>

    <div class="summary-card info">
      <div class="summary-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <div class="summary-content">
        <span class="summary-value">{formatNumber(data.summary.totalRefugees)}</span>
        <span class="summary-label">Refugees & Asylum Seekers</span>
      </div>
    </div>

    <div class="summary-card gap">
      <div class="summary-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      </div>
      <div class="summary-content">
        <span class="summary-value">{formatMoney(data.summary.totalFundingGap)}</span>
        <span class="summary-label">Total Funding Gap</span>
      </div>
    </div>
  </div>

  <!-- Alert Boxes -->
  {#if data.summary.countriesWithFamine > 0}
    <div class="alert alert-critical">
      <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <div class="alert-content">
        <strong>Famine Alert:</strong> {data.summary.countriesWithFamine} {data.summary.countriesWithFamine === 1 ? 'country' : 'countries'} with populations in IPC Phase 5 (Famine/Catastrophe)
      </div>
    </div>
  {/if}

  <!-- Two Column Layout -->
  <div class="main-grid">
    <!-- Left Column: Charts and Data Tables -->
    <div class="left-column">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button class="tab-btn" class:active={activeTab === 'severity'} on:click={() => activeTab = 'severity'}>
          Severity Levels
        </button>
        <button class="tab-btn" class:active={activeTab === 'food'} on:click={() => activeTab = 'food'}>
          Food Insecurity
        </button>
        <button class="tab-btn" class:active={activeTab === 'refugees'} on:click={() => activeTab = 'refugees'}>
          Displacement
        </button>
        <button class="tab-btn" class:active={activeTab === 'gaps'} on:click={() => activeTab = 'gaps'}>
          Funding Gaps
        </button>
      </div>

      <!-- Tab Content -->
      {#if activeTab === 'severity'}
        <div class="tab-content">
          <div class="chart-card">
            <h3>Global Severity Distribution (JIAF)</h3>
            <Chart options={severityChartOptions} height="300px" />
          </div>

          <div class="data-table">
            <h3>Countries by Severity</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Severity</th>
                  <th class="right">People in Need</th>
                  <th class="right">Severity 4+</th>
                </tr>
              </thead>
              <tbody>
                {#each data.jiafCountries as country}
                  <tr>
                    <td>
                      <a href="/?country={country.iso3}">{country.countryName}</a>
                    </td>
                    <td>
                      <span class="severity-badge {getSeverityBadgeClass(country.dominantSeverity)}"
                            style="background-color: {country.severityInfo.color}20; border-color: {country.severityInfo.color};">
                        {country.severityInfo.label}
                      </span>
                    </td>
                    <td class="right">{formatNumber(country.totalPin)}</td>
                    <td class="right">{formatNumber(country.pinSeverity4Plus)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

      {:else if activeTab === 'food'}
        <div class="tab-content">
          <div class="chart-card">
            <h3>IPC Food Insecurity by Country</h3>
            <Chart options={ipcChartOptions} height="300px" />
          </div>

          <div class="data-table">
            <h3>Food Insecurity Crisis (IPC Phase 3+)</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th class="right">Phase 3+</th>
                  <th class="right">Phase 4</th>
                  <th class="right">Phase 5</th>
                  <th>Period</th>
                </tr>
              </thead>
              <tbody>
                {#each data.ipcCountries as country}
                  <tr>
                    <td>
                      <a href="/?country={country.iso3}">{country.countryName}</a>
                    </td>
                    <td class="right crisis">{formatNumber(country.phase3Plus)}</td>
                    <td class="right emergency">{formatNumber(country.phase4)}</td>
                    <td class="right famine">{country.phase5 > 0 ? formatNumber(country.phase5) : '-'}</td>
                    <td class="period">{country.analysisPeriod || '-'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

      {:else if activeTab === 'refugees'}
        <div class="tab-content">
          <div class="data-table">
            <h3>Displacement by Country</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th class="right">Refugees</th>
                  <th class="right">Asylum Seekers</th>
                  <th class="right">IDPs</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {#each data.refugeeCountries as country}
                  <tr>
                    <td>
                      <a href="/?country={country.iso3}">{country.countryName}</a>
                    </td>
                    <td class="right">{formatNumber(country.refugees)}</td>
                    <td class="right">{formatNumber(country.asylumSeekers)}</td>
                    <td class="right">{country.idps > 0 ? formatNumber(country.idps) : '-'}</td>
                    <td class="right total">{formatNumber(country.total)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

      {:else if activeTab === 'gaps'}
        <div class="tab-content">
          <div class="data-table">
            <h3>Funding Gaps (Target: $200/person)</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th class="right">People in Need</th>
                  <th class="right">Current Funding</th>
                  <th class="right">Gap</th>
                  <th class="right">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {#each data.fundingGaps as country}
                  <tr>
                    <td>
                      <a href="/?country={country.iso3}">{country.countryName}</a>
                    </td>
                    <td class="right">{formatNumber(country.peopleInNeed)}</td>
                    <td class="right">{formatMoney(country.funding)}</td>
                    <td class="right gap">{formatMoney(country.fundingGap)}</td>
                    <td class="right">
                      <div class="coverage-bar">
                        <div class="coverage-fill" style="width: {Math.min(100, country.coveragePercent)}%"></div>
                        <span class="coverage-text">{country.coveragePercent.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>

    <!-- Right Column: Live Updates -->
    <div class="right-column">
      <!-- Active Disasters -->
      <div class="updates-card">
        <h3>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Active Disasters
        </h3>
        <div class="disasters-list">
          {#each data.activeDisasters as disaster}
            <a href={disaster.url} target="_blank" rel="noopener" class="disaster-item">
              <div class="disaster-header">
                <span class="disaster-type">{disaster.type[0] || 'Disaster'}</span>
                <span class="disaster-date">{formatDate(disaster.date)}</span>
              </div>
              <div class="disaster-name">{disaster.name}</div>
              <div class="disaster-countries">{disaster.country.join(', ')}</div>
            </a>
          {:else}
            <div class="empty-state">No active disasters data available</div>
          {/each}
        </div>
      </div>

      <!-- Latest Reports -->
      <div class="updates-card">
        <h3>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Latest Reports
        </h3>
        <div class="reports-list">
          {#each data.reliefWebReports as report}
            <a href={report.url} target="_blank" rel="noopener" class="report-item">
              <div class="report-meta">
                <span class="report-source">{report.source}</span>
                <span class="report-date">{formatDate(report.date)}</span>
              </div>
              <div class="report-title">{report.title}</div>
              <div class="report-countries">{report.country.slice(0, 3).join(', ')}{report.country.length > 3 ? '...' : ''}</div>
            </a>
          {:else}
            <div class="empty-state">No reports available</div>
          {/each}
        </div>
        <a href="https://reliefweb.int/updates" target="_blank" rel="noopener" class="view-all-link">
          View all on ReliefWeb
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="external-icon">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  .page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .page-header h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
  }

  .subtitle {
    color: var(--color-text-muted, #666);
    margin: 0;
  }

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
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
  }

  /* Summary Cards */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .summary-card.critical { border-left: 4px solid #ef4444; }
  .summary-card.warning { border-left: 4px solid #f97316; }
  .summary-card.info { border-left: 4px solid #3b82f6; }
  .summary-card.gap { border-left: 4px solid #8b5cf6; }

  .summary-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .summary-card.critical .summary-icon { background: #fef2f2; color: #ef4444; }
  .summary-card.warning .summary-icon { background: #fff7ed; color: #f97316; }
  .summary-card.info .summary-icon { background: #eff6ff; color: #3b82f6; }
  .summary-card.gap .summary-icon { background: #f5f3ff; color: #8b5cf6; }

  .summary-icon svg {
    width: 24px;
    height: 24px;
  }

  .summary-content {
    display: flex;
    flex-direction: column;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .summary-label {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
  }

  /* Alert */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .alert-critical {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .alert-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  /* Main Grid */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 1.5rem;
  }

  /* Tab Navigation */
  .tab-nav {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--surface, #f8fafc);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .tab-btn {
    flex: 1;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted, #666);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: var(--primary);
  }

  .tab-btn.active {
    background: white;
    color: var(--primary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .chart-card, .data-table {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .chart-card h3, .data-table h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.625rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
    font-size: 0.875rem;
  }

  th {
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
  }

  th.right, td.right {
    text-align: right;
  }

  td a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }

  td a:hover {
    text-decoration: underline;
  }

  .severity-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid;
  }

  td.crisis { color: #ea580c; }
  td.emergency { color: #dc2626; }
  td.famine { color: #7f1d1d; font-weight: 600; }
  td.gap { color: #dc2626; font-weight: 600; }
  td.total { font-weight: 600; }
  td.period { font-size: 0.75rem; color: var(--color-text-muted, #666); }

  .coverage-bar {
    position: relative;
    height: 20px;
    background: #f3f4f6;
    border-radius: 10px;
    overflow: hidden;
    min-width: 80px;
  }

  .coverage-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
    border-radius: 10px;
    transition: width 0.3s;
  }

  .coverage-text {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* Right Column */
  .updates-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .updates-card h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .section-icon {
    width: 20px;
    height: 20px;
    color: var(--primary);
  }

  .disasters-list, .reports-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 320px;
    overflow-y: auto;
  }

  .disaster-item, .report-item {
    display: block;
    padding: 0.75rem;
    background: var(--surface, #f8fafc);
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .disaster-item:hover, .report-item:hover {
    background: rgba(0, 95, 115, 0.08);
  }

  .disaster-header, .report-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
  }

  .disaster-type {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #ef4444;
    background: #fef2f2;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
  }

  .disaster-date, .report-date {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }

  .disaster-name, .report-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.25rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .disaster-countries, .report-countries {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }

  .report-source {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--primary);
  }

  .empty-state {
    text-align: center;
    color: var(--color-text-muted, #666);
    padding: 2rem;
    font-size: 0.875rem;
  }

  .view-all-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    margin-top: 1rem;
    padding: 0.625rem;
    color: var(--primary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    background: var(--surface, #f8fafc);
    border-radius: 6px;
  }

  .view-all-link:hover {
    background: rgba(0, 95, 115, 0.1);
  }

  .external-icon {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 1024px) {
    .main-grid {
      grid-template-columns: 1fr;
    }

    .right-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
  }

  @media (max-width: 640px) {
    .tab-nav {
      flex-wrap: wrap;
    }

    .tab-btn {
      flex: 1 1 45%;
    }

    .right-column {
      grid-template-columns: 1fr;
    }
  }
</style>
