<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatMoney } from '$lib/utils/format';
  import type { PageData } from './$types';

  export let data: PageData;

  function handleYearChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    goto(`/donors?year=${select.value}`);
  }

  let searchQuery = '';
  $: filteredDonors = data.donors.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<svelte:head>
  <title>Donors - Humanitarian Funding Data</title>
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <div class="header-left">
      <h1>Donor Funding Flows</h1>
      <p class="subtitle">Explore humanitarian funding by donor organization</p>
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
      <a href="/donors" class="sub-nav-link active">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
        </svg>
        Donors
      </a>
      <a href="/about" class="sub-nav-link">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        About the Data
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
      <span class="stat-label">Total Funding ({data.selectedYear})</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{data.totalDonors}</span>
      <span class="stat-label">Active Donors</span>
    </div>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="Search donors..."
      bind:value={searchQuery}
      class="search-input"
    />
  </div>

  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th>Donor</th>
          <th>Type</th>
          <th class="right">Total Funding</th>
          <th class="right">Countries Funded</th>
          <th class="right">Transactions</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each filteredDonors as donor}
          <tr>
            <td><strong>{donor.name}</strong></td>
            <td><span class="type-badge">{donor.type}</span></td>
            <td class="right">{formatMoney(donor.totalFunding)}</td>
            <td class="right">{donor.countryCount}</td>
            <td class="right">{donor.flowCount.toLocaleString()}</td>
            <td>
              <a href="/?year={data.selectedYear}&donor={encodeURIComponent(donor.name)}" class="view-link">
                View Details
              </a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
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

  .table-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
  }

  th {
    background: var(--surface, #f8fafc);
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  th.right, td.right {
    text-align: right;
  }

  tbody tr:hover {
    background: var(--surface, #f8fafc);
  }

  .type-badge {
    display: inline-flex;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  .view-link {
    color: var(--primary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .view-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .table-card {
      overflow-x: auto;
    }

    table {
      min-width: 700px;
    }
  }
</style>
