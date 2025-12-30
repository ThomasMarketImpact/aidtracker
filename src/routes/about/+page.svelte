<script lang="ts">
</script>

<svelte:head>
  <title>About the Data - Humanitarian Funding Data</title>
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <div class="header-left">
      <h1>About the Data</h1>
      <p class="subtitle">Understanding our data sources and methodology</p>
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
      <a href="/about" class="sub-nav-link active">
        <svg class="sub-nav-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        About the Data
      </a>
    </div>
  </nav>

  <div class="content-grid">
    <section class="info-card">
      <h2>Financial Tracking Service (FTS)</h2>
      <p class="source-link">
        <a href="https://fts.unocha.org" target="_blank" rel="noopener noreferrer">fts.unocha.org</a>
      </p>
      <p>
        The Financial Tracking Service is managed by the United Nations Office for the Coordination
        of Humanitarian Affairs (OCHA). It provides comprehensive data on humanitarian funding flows
        from government donors, private organizations, and other sources to humanitarian organizations
        and recipient countries.
      </p>
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Coverage</span>
          <span class="detail-value">Global humanitarian funding since 2000</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Update Frequency</span>
          <span class="detail-value">Continuous (as reported by donors)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data Points</span>
          <span class="detail-value">Donor, recipient, amount, plan, cluster</span>
        </div>
      </div>
    </section>

    <section class="info-card">
      <h2>Humanitarian API (HAPI)</h2>
      <p class="source-link">
        <a href="https://hapi.humdata.org" target="_blank" rel="noopener noreferrer">hapi.humdata.org</a>
      </p>
      <p>
        The Humanitarian API is part of the Humanitarian Data Exchange (HDX) platform, managed by
        OCHA's Centre for Humanitarian Data. HAPI provides standardized access to key humanitarian
        datasets including population statistics, humanitarian needs, and operational presence data.
      </p>
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Coverage</span>
          <span class="detail-value">Countries with humanitarian response plans</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Update Frequency</span>
          <span class="detail-value">Varies by dataset (monthly to annually)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data Points</span>
          <span class="detail-value">People in need, population, operational presence</span>
        </div>
      </div>
    </section>

    <section class="info-card full-width">
      <h2>Methodology</h2>
      <p>
        This dashboard combines funding data from FTS with humanitarian needs data from HAPI to
        provide insights into the relationship between funding and humanitarian needs.
      </p>
      <ul class="methodology-list">
        <li>
          <strong>Funding per person in need</strong> is calculated by dividing total funding
          received by a country by the number of people in need as reported in Humanitarian
          Needs Overviews (HNOs).
        </li>
        <li>
          <strong>Funding status</strong> classifications (High, Medium, Low) are based on
          funding per person thresholds: High (&ge;$150), Medium ($80-150), Low (&lt;$80).
        </li>
        <li>
          <strong>Donor aggregations</strong> combine all reported contributions from a single
          source organization across all recipient countries and organizations.
        </li>
        <li>
          <strong>Year filtering</strong> shows funding flows reported for the selected calendar
          year, with humanitarian needs data matched to the same reference year where available.
        </li>
      </ul>
    </section>

    <section class="info-card full-width">
      <h2>Data Limitations</h2>
      <ul class="methodology-list">
        <li>
          Funding data relies on voluntary reporting by donors and may not capture all
          humanitarian assistance.
        </li>
        <li>
          People in need figures are estimates from humanitarian needs assessments and may
          not be available for all countries or years.
        </li>
        <li>
          Double-counting may occur when funding is reported at multiple stages of the
          humanitarian funding chain.
        </li>
        <li>
          Currency conversion to USD uses rates at the time of reporting, which may affect
          year-over-year comparisons.
        </li>
      </ul>
    </section>

    <section class="info-card full-width">
      <h2>Contact</h2>
      <p>
        This dashboard is maintained by <a href="https://marketimpact.org" target="_blank" rel="noopener noreferrer">MarketImpact</a>.
        For questions about the data or methodology, please <a href="https://marketimpact.org/contact" target="_blank" rel="noopener noreferrer">contact us</a>.
      </p>
    </section>
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

  .content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .info-card.full-width {
    grid-column: 1 / -1;
  }

  .info-card h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--primary);
  }

  .source-link {
    margin: 0 0 1rem 0;
  }

  .source-link a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }

  .source-link a:hover {
    text-decoration: underline;
  }

  .info-card p {
    color: var(--color-text, #333);
    line-height: 1.6;
    margin: 0 0 1rem 0;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border, #e2e8f0);
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .detail-label {
    font-size: 0.875rem;
    color: var(--color-text-muted, #666);
    font-weight: 500;
  }

  .detail-value {
    font-size: 0.875rem;
    color: var(--color-text, #333);
    text-align: right;
  }

  .methodology-list {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--color-text, #333);
    line-height: 1.6;
  }

  .methodology-list li {
    margin-bottom: 0.75rem;
  }

  .methodology-list li:last-child {
    margin-bottom: 0;
  }

  .info-card a {
    color: var(--primary);
    text-decoration: none;
  }

  .info-card a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .detail-item {
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-value {
      text-align: left;
    }
  }
</style>
