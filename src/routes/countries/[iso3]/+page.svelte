<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatMoney, formatNumber } from '$lib/utils/format';
  import Chart from '$lib/components/Chart.svelte';
  import TrendIndicator from '$lib/components/TrendIndicator.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  function handleYearChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    goto(`/countries/${data.country.iso3}?year=${select.value}`);
  }

  // Funding history chart options
  $: fundingChartOptions = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0];
        return `<strong>${p.name}</strong><br/>Funding: ${formatMoney(p.value)}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: data.fundingHistory.map(d => d.year.toString()),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#6b7280',
        formatter: (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : `$${(v/1e6).toFixed(0)}M`
      },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    series: [{
      name: 'Funding',
      type: 'bar' as const,
      data: data.fundingHistory.map(d => d.funding),
      itemStyle: { color: '#005f73', borderRadius: [4, 4, 0, 0] },
      emphasis: { itemStyle: { color: '#0a9396' } }
    }]
  };

  // Sector funding chart
  $: sectorChartOptions = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        return `<strong>${params.name}</strong><br/>Funding: ${formatMoney(params.value)}`;
      }
    },
    legend: { bottom: '0%', left: 'center', type: 'scroll' as const },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      data: data.sectors.slice(0, 10).map((s, i) => ({
        name: s.sector,
        value: s.funding,
        itemStyle: { color: ['#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226', '#6d6875'][i] }
      }))
    }]
  };

  // IPC phases chart
  $: ipcChartOptions = data.foodInsecurity ? {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => `<strong>${params.name}</strong><br/>${formatNumber(params.value)} people`
    },
    legend: { bottom: '0%', left: 'center' },
    series: [{
      type: 'pie' as const,
      radius: '70%',
      center: ['50%', '45%'],
      data: [
        { name: 'Phase 1 (Minimal)', value: data.foodInsecurity.phases.phase1, itemStyle: { color: '#c6e6a3' } },
        { name: 'Phase 2 (Stressed)', value: data.foodInsecurity.phases.phase2, itemStyle: { color: '#f9e05b' } },
        { name: 'Phase 3 (Crisis)', value: data.foodInsecurity.phases.phase3, itemStyle: { color: '#e67800' } },
        { name: 'Phase 4 (Emergency)', value: data.foodInsecurity.phases.phase4, itemStyle: { color: '#c80000' } },
        { name: 'Phase 5 (Famine)', value: data.foodInsecurity.phases.phase5, itemStyle: { color: '#640000' } }
      ].filter(d => d.value > 0),
      label: { show: false },
      labelLine: { show: false }
    }]
  } : null;

  // JIAF severity chart
  $: jiafChartOptions = data.jiafSeverity ? {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => params.map((p: any) => `${p.seriesName}: ${formatNumber(p.value)}`).join('<br/>')
    },
    legend: { bottom: '0%' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: ['Severity 1', 'Severity 2', 'Severity 3', 'Severity 4', 'Severity 5'],
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#6b7280', formatter: (v: number) => formatNumber(v) },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    series: [{
      name: 'Population',
      type: 'bar' as const,
      data: [
        { value: data.jiafSeverity.severity1, itemStyle: { color: '#94d2bd' } },
        { value: data.jiafSeverity.severity2, itemStyle: { color: '#e9d8a6' } },
        { value: data.jiafSeverity.severity3, itemStyle: { color: '#ee9b00' } },
        { value: data.jiafSeverity.severity4, itemStyle: { color: '#ca6702' } },
        { value: data.jiafSeverity.severity5, itemStyle: { color: '#9b2226' } }
      ],
      barWidth: '60%'
    }]
  } : null;

  // Funding gap chart
  $: gapChartOptions = data.fundingReqsHistory.length > 0 ? {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const year = params[0].name;
        let html = `<strong>${year}</strong><br/>`;
        params.forEach((p: any) => {
          html += `${p.seriesName}: ${formatMoney(p.value)}<br/>`;
        });
        return html;
      }
    },
    legend: { bottom: '0%' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: data.fundingReqsHistory.map(d => d.year.toString()),
      axisLabel: { color: '#6b7280' }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#6b7280',
        formatter: (v: number) => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : `$${(v/1e6).toFixed(0)}M`
      },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    series: [
      {
        name: 'Requirements',
        type: 'bar' as const,
        stack: 'total',
        data: data.fundingReqsHistory.map(d => d.requirements),
        itemStyle: { color: '#e5e7eb' }
      },
      {
        name: 'Funded',
        type: 'bar' as const,
        stack: 'funded',
        data: data.fundingReqsHistory.map(d => d.funding),
        itemStyle: { color: '#005f73' }
      }
    ]
  } : null;

  function getYoyClass(yoy: number | null): string {
    if (yoy === null) return '';
    return yoy >= 0 ? 'positive' : 'negative';
  }

  function formatYoy(yoy: number | null): string {
    if (yoy === null) return '-';
    const sign = yoy >= 0 ? '+' : '';
    return `${sign}${yoy.toFixed(1)}%`;
  }

  function getFundingLevel(perPerson: number | null): { label: string; class: string } {
    if (!perPerson) return { label: 'N/A', class: 'badge-neutral' };
    if (perPerson >= 150) return { label: 'High', class: 'badge-success' };
    if (perPerson >= 80) return { label: 'Medium', class: 'badge-warning' };
    return { label: 'Low', class: 'badge-danger' };
  }
</script>

<svelte:head>
  <title>{data.country.name} - Humanitarian Funding Analysis</title>
</svelte:head>

<div class="page-container">
  <!-- Header with breadcrumb -->
  <nav class="breadcrumb">
    <a href="/">Dashboard</a>
    <span class="separator">/</span>
    <a href="/countries">Countries</a>
    <span class="separator">/</span>
    <span class="current">{data.country.name}</span>
  </nav>

  <header class="page-header">
    <div class="header-left">
      <div class="country-title">
        <h1>{data.country.name}</h1>
        <span class="iso-badge">{data.country.iso3}</span>
        {#if data.country.hasHrp}
          <span class="hrp-badge">HRP</span>
        {/if}
      </div>
      <p class="subtitle">
        {data.country.region || 'Region not specified'}
        {#if data.country.inGho}
          · Included in Global Humanitarian Overview
        {/if}
      </p>
    </div>
    <div class="year-filter">
      <label for="year-select">Year</label>
      <select id="year-select" value={data.selectedYear} on:change={handleYearChange}>
        {#each data.availableYears as year}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </div>
  </header>

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card primary">
      <span class="kpi-value">{formatMoney(data.summary.totalFunding)}</span>
      <span class="kpi-label">Total Funding ({data.selectedYear})</span>
      {#if data.summary.yoyChange !== null}
        <span class="kpi-change {getYoyClass(data.summary.yoyChange)}">
          {formatYoy(data.summary.yoyChange)} vs {data.selectedYear - 1}
        </span>
      {/if}
    </div>

    <div class="kpi-card">
      <span class="kpi-value">{data.summary.peopleInNeed ? formatNumber(data.summary.peopleInNeed) : 'N/A'}</span>
      <span class="kpi-label">People in Need</span>
    </div>

    {#if true}
      {@const level = getFundingLevel(data.summary.fundingPerPerson)}
      <div class="kpi-card">
        <span class="kpi-value">{data.summary.fundingPerPerson ? `$${data.summary.fundingPerPerson.toFixed(0)}` : 'N/A'}</span>
        <span class="kpi-label">Funding per Person</span>
        <span class="badge {level.class}">{level.label}</span>
      </div>
    {/if}

    <div class="kpi-card">
      <span class="kpi-value">{data.summary.donorCount}</span>
      <span class="kpi-label">Active Donors</span>
    </div>

    {#if data.fundingRequirements}
      <div class="kpi-card">
        <span class="kpi-value">{formatMoney(data.fundingRequirements.gap)}</span>
        <span class="kpi-label">Funding Gap</span>
        <span class="kpi-subtitle">{data.fundingRequirements.percentFunded.toFixed(0)}% funded</span>
      </div>
    {/if}

    {#if data.refugeePopulation}
      <div class="kpi-card">
        <span class="kpi-value">{formatNumber(data.refugeePopulation.total || 0)}</span>
        <span class="kpi-label">Refugees & Asylum Seekers</span>
        {#if data.refugeePopulation.idps}
          <span class="kpi-subtitle">{formatNumber(data.refugeePopulation.idps)} IDPs</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Charts Row -->
  <div class="charts-grid">
    <!-- Funding History -->
    <div class="chart-card">
      <h3>Funding History</h3>
      {#if data.fundingHistory.length > 0}
        <Chart options={fundingChartOptions} height="300px" />
        <TrendIndicator
          data={{ values: data.fundingHistory.map(d => d.funding), years: data.fundingHistory.map(d => d.year) }}
          label="Funding Trend"
        />
      {:else}
        <div class="no-data">No funding history available</div>
      {/if}
    </div>

    <!-- Sector Breakdown -->
    <div class="chart-card">
      <h3>Funding by Sector</h3>
      {#if data.sectors.length > 0}
        <Chart options={sectorChartOptions} height="350px" />
      {:else}
        <div class="no-data">No sector data available</div>
      {/if}
    </div>
  </div>

  <!-- Donors Table -->
  <div class="table-card">
    <h3>Top Donors ({data.selectedYear})</h3>
    <table>
      <thead>
        <tr>
          <th>Donor</th>
          <th>Type</th>
          <th class="right">Funding</th>
          <th class="right">YoY Change</th>
          <th class="right">Flows</th>
        </tr>
      </thead>
      <tbody>
        {#each data.donors as donor}
          <tr>
            <td><strong>{donor.donor}</strong></td>
            <td><span class="type-badge">{donor.type}</span></td>
            <td class="right">{formatMoney(donor.funding)}</td>
            <td class="right {getYoyClass(donor.yoyChange)}">{formatYoy(donor.yoyChange)}</td>
            <td class="right">{donor.flowCount}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Sector Details Table -->
  <div class="table-card">
    <h3>Sector Analysis ({data.selectedYear})</h3>
    <table>
      <thead>
        <tr>
          <th>Sector</th>
          <th class="right">Funding</th>
          <th class="right">People in Need</th>
          <th class="right">People Targeted</th>
          <th class="right">$/Person</th>
        </tr>
      </thead>
      <tbody>
        {#each data.sectors as sector}
          <tr>
            <td><strong>{sector.sector}</strong></td>
            <td class="right">{formatMoney(sector.funding)}</td>
            <td class="right">{sector.peopleInNeed ? formatNumber(sector.peopleInNeed) : '-'}</td>
            <td class="right">{sector.peopleTargeted ? formatNumber(sector.peopleTargeted) : '-'}</td>
            <td class="right">{sector.fundingPerPerson ? `$${sector.fundingPerPerson.toFixed(0)}` : '-'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Crisis Indicators Row -->
  <div class="crisis-grid">
    <!-- IPC Food Insecurity -->
    {#if data.foodInsecurity && ipcChartOptions}
      <div class="chart-card">
        <h3>Food Insecurity (IPC Phases)</h3>
        <p class="chart-subtitle">Analysis: {data.foodInsecurity.analysisPeriod || data.foodInsecurity.year}</p>
        <Chart options={ipcChartOptions} height="280px" />
        <div class="ipc-summary">
          <div class="ipc-stat critical">
            <span class="stat-value">{formatNumber(data.foodInsecurity.phases.phase3Plus)}</span>
            <span class="stat-label">Phase 3+ (Crisis+)</span>
          </div>
          <div class="ipc-stat">
            <span class="stat-value">{formatNumber(data.foodInsecurity.totalAnalyzed)}</span>
            <span class="stat-label">Total Analyzed</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- JIAF Severity -->
    {#if data.jiafSeverity && jiafChartOptions}
      <div class="chart-card">
        <h3>JIAF Severity Distribution</h3>
        <p class="chart-subtitle">Year: {data.jiafSeverity.year}</p>
        <Chart options={jiafChartOptions} height="280px" />
        <div class="jiaf-summary">
          <div class="jiaf-stat">
            <span class="stat-value">{formatNumber(data.jiafSeverity.severity3Plus)}</span>
            <span class="stat-label">Severity 3+ (Severe)</span>
          </div>
          <div class="jiaf-stat critical">
            <span class="stat-value">{formatNumber(data.jiafSeverity.severity4Plus)}</span>
            <span class="stat-label">Severity 4+ (Extreme)</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Funding Gap Chart -->
    {#if data.fundingReqsHistory.length > 0 && gapChartOptions}
      <div class="chart-card">
        <h3>Funding Requirements vs Received</h3>
        <Chart options={gapChartOptions} height="280px" />
        {#if data.fundingRequirements}
          <div class="gap-summary">
            <div class="gap-stat">
              <span class="stat-value">{formatMoney(data.fundingRequirements.requirements)}</span>
              <span class="stat-label">Required ({data.fundingRequirements.year})</span>
            </div>
            <div class="gap-stat">
              <span class="stat-value">{formatMoney(data.fundingRequirements.funding)}</span>
              <span class="stat-label">Received</span>
            </div>
            <div class="gap-stat unfunded">
              <span class="stat-value">{(100 - data.fundingRequirements.percentFunded).toFixed(0)}%</span>
              <span class="stat-label">Unfunded</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Refugee Population -->
  {#if data.refugeePopulation}
    <div class="table-card">
      <h3>Displacement Data ({data.refugeePopulation.year})</h3>
      <div class="displacement-grid">
        <div class="displacement-card">
          <span class="displacement-value">{formatNumber(data.refugeePopulation.refugees)}</span>
          <span class="displacement-label">Refugees</span>
        </div>
        <div class="displacement-card">
          <span class="displacement-value">{formatNumber(data.refugeePopulation.asylumSeekers)}</span>
          <span class="displacement-label">Asylum Seekers</span>
        </div>
        {#if data.refugeePopulation.idps}
          <div class="displacement-card">
            <span class="displacement-value">{formatNumber(data.refugeePopulation.idps)}</span>
            <span class="displacement-label">IDPs</span>
          </div>
        {/if}
        {#if data.refugeePopulation.stateless}
          <div class="displacement-card">
            <span class="displacement-value">{formatNumber(data.refugeePopulation.stateless)}</span>
            <span class="displacement-label">Stateless</span>
          </div>
        {/if}
        {#if data.refugeePopulation.returnedRefugees}
          <div class="displacement-card">
            <span class="displacement-value">{formatNumber(data.refugeePopulation.returnedRefugees)}</span>
            <span class="displacement-label">Returned Refugees</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Child Welfare Indicators -->
  {#if data.childWelfare}
    <div class="table-card">
      <h3>Child Welfare Indicators ({data.childWelfare.year})</h3>
      <div class="welfare-grid">
        {#if data.childWelfare.under5Mortality}
          <div class="welfare-card">
            <span class="welfare-value">{data.childWelfare.under5Mortality.toFixed(1)}</span>
            <span class="welfare-label">Under-5 Mortality (per 1,000)</span>
          </div>
        {/if}
        {#if data.childWelfare.infantMortality}
          <div class="welfare-card">
            <span class="welfare-value">{data.childWelfare.infantMortality.toFixed(1)}</span>
            <span class="welfare-label">Infant Mortality (per 1,000)</span>
          </div>
        {/if}
        {#if data.childWelfare.stuntingPrevalence}
          <div class="welfare-card">
            <span class="welfare-value">{data.childWelfare.stuntingPrevalence.toFixed(1)}%</span>
            <span class="welfare-label">Stunting (Under 5)</span>
          </div>
        {/if}
        {#if data.childWelfare.wastingPrevalence}
          <div class="welfare-card">
            <span class="welfare-value">{data.childWelfare.wastingPrevalence.toFixed(1)}%</span>
            <span class="welfare-label">Wasting (Under 5)</span>
          </div>
        {/if}
        {#if data.childWelfare.dtp3Coverage}
          <div class="welfare-card positive">
            <span class="welfare-value">{data.childWelfare.dtp3Coverage.toFixed(1)}%</span>
            <span class="welfare-label">DTP3 Coverage</span>
          </div>
        {/if}
        {#if data.childWelfare.measlesCoverage}
          <div class="welfare-card positive">
            <span class="welfare-value">{data.childWelfare.measlesCoverage.toFixed(1)}%</span>
            <span class="welfare-label">Measles Coverage</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Humanitarian Response Plans -->
  {#if data.plans.length > 0}
    <div class="table-card">
      <h3>Humanitarian Response Plans</h3>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Year</th>
            <th>Type</th>
            <th class="right">Requirements</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each data.plans as plan}
            <tr>
              <td><strong>{plan.shortName || plan.name}</strong></td>
              <td>{plan.year}</td>
              <td>{plan.planType || '-'}</td>
              <td class="right">{formatMoney(plan.requirements)}</td>
              <td>
                {#if plan.isReleased}
                  <span class="badge badge-success">Released</span>
                {:else}
                  <span class="badge badge-neutral">Draft</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .breadcrumb a {
    color: var(--primary, #005f73);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .breadcrumb .separator {
    color: #9ca3af;
  }

  .breadcrumb .current {
    color: #6b7280;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .country-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .iso-badge {
    background: var(--primary, #005f73);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .hrp-badge {
    background: #0a9396;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .subtitle {
    color: #6b7280;
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
  }

  .year-filter {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .year-filter label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
  }

  .year-filter select {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    min-width: 120px;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .kpi-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .kpi-card.primary {
    background: linear-gradient(135deg, #005f73 0%, #0a9396 100%);
    color: white;
    border: none;
  }

  .kpi-card.primary .kpi-label {
    color: rgba(255, 255, 255, 0.8);
  }

  .kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary, #005f73);
  }

  .kpi-card.primary .kpi-value {
    color: white;
  }

  .kpi-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .kpi-change {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .kpi-change.positive {
    color: #22c55e;
  }

  .kpi-change.negative {
    color: #ef4444;
  }

  .kpi-card.primary .kpi-change.positive {
    color: #86efac;
  }

  .kpi-card.primary .kpi-change.negative {
    color: #fca5a5;
  }

  .kpi-subtitle {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  /* Charts Grid */
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .chart-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
  }

  .chart-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .chart-subtitle {
    font-size: 0.75rem;
    color: #6b7280;
    margin: -0.75rem 0 1rem 0;
  }

  /* Crisis Grid */
  .crisis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .ipc-summary, .jiaf-summary, .gap-summary {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .ipc-stat, .jiaf-stat, .gap-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .ipc-stat.critical .stat-value,
  .jiaf-stat.critical .stat-value {
    color: #dc2626;
  }

  .gap-stat.unfunded .stat-value {
    color: #ea580c;
  }

  /* Tables */
  .table-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }

  .table-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f8fafc;
    font-weight: 600;
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  th.right, td.right {
    text-align: right;
  }

  tbody tr:hover {
    background: #f8fafc;
  }

  .type-badge {
    font-size: 0.75rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .positive {
    color: #22c55e;
  }

  .negative {
    color: #ef4444;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-success {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .badge-danger {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .badge-neutral {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  /* Displacement Grid */
  .displacement-grid, .welfare-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .displacement-card, .welfare-card {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .displacement-value, .welfare-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary, #005f73);
    margin-bottom: 0.25rem;
  }

  .displacement-label, .welfare-label {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .welfare-card.positive .welfare-value {
    color: #22c55e;
  }

  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .charts-grid, .crisis-grid {
      grid-template-columns: 1fr;
    }

    .table-card {
      overflow-x: auto;
    }

    table {
      min-width: 600px;
    }
  }
</style>
