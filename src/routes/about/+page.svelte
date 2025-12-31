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
          <span class="detail-value">~25 countries with formal HRPs</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Update Frequency</span>
          <span class="detail-value">Annually (with HNO releases)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data Points</span>
          <span class="detail-value">People in Need (PIN) from humanitarian needs assessments</span>
        </div>
      </div>
    </section>

    <section class="info-card">
      <h2>UNHCR Refugee Statistics</h2>
      <p class="source-link">
        <a href="https://www.unhcr.org/refugee-statistics/" target="_blank" rel="noopener noreferrer">unhcr.org/refugee-statistics</a>
      </p>
      <p>
        The UN Refugee Agency (UNHCR) maintains global statistics on refugees, asylum seekers,
        internally displaced persons (IDPs), stateless people, and other populations of concern.
        This data shows how many displaced people each country hosts.
      </p>
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Coverage</span>
          <span class="detail-value">Global (180+ countries)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Update Frequency</span>
          <span class="detail-value">Annually (mid-year estimates available)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data Points</span>
          <span class="detail-value">Refugees hosted, asylum seekers, IDPs, stateless</span>
        </div>
      </div>
    </section>

    <section class="info-card">
      <h2>IPC Food Security Analysis</h2>
      <p class="source-link">
        <a href="https://www.ipcinfo.org" target="_blank" rel="noopener noreferrer">ipcinfo.org</a>
      </p>
      <p>
        The Integrated Food Security Phase Classification (IPC) is a global standard for measuring
        acute food insecurity. Phase 3+ (Crisis, Emergency, Famine) populations are used as a
        <strong>supplementary source</strong> for countries where HAPI PIN data is unavailable.
        Note: Major crisis countries (Afghanistan, Yemen, DRC, Sudan, etc.) should have HAPI PIN
        data from their formal HRPs &mdash; IPC is only used for countries outside the HRP system.
      </p>
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Coverage</span>
          <span class="detail-value">30+ countries (food crisis zones)</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Update Frequency</span>
          <span class="detail-value">Multiple times per year</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data Points</span>
          <span class="detail-value">Phase 3+ populations (Crisis and above)</span>
        </div>
      </div>
    </section>

    <section class="info-card full-width">
      <h2>Methodology</h2>
      <p>
        This dashboard combines funding data from FTS with humanitarian needs data from HAPI and
        refugee statistics from UNHCR to provide insights into humanitarian funding patterns.
      </p>
      <ul class="methodology-list">
        <li>
          <strong>People in Need (PIN)</strong> comes from HAPI and represents populations affected
          by humanitarian crises who require assistance. This is derived from Humanitarian Needs
          Overviews (HNOs) conducted for countries with formal Humanitarian Response Plans.
        </li>
        <li>
          <strong>Refugees Hosted</strong> comes from UNHCR and represents refugees and asylum
          seekers residing in each country. This is a separate metric from PIN &mdash; a country
          can host many refugees while having few people in need (e.g., Germany), or have many
          people in need while hosting few refugees (e.g., Syria).
        </li>
        <li>
          <strong>Funding per person in need</strong> is calculated only when PIN data is available,
          by dividing total funding by the number of people in need. This metric is not calculated
          using refugee counts, as refugees hosted and humanitarian need are distinct concepts.
        </li>
        <li>
          <strong>Funding status</strong> classifications (High, Medium, Low) are based on
          funding per person thresholds: High (&ge;$150), Medium ($80-150), Low (&lt;$80).
        </li>
        <li>
          <strong>Donor aggregations</strong> combine all reported contributions from a single
          source organization across all recipient countries and organizations.
        </li>
      </ul>
    </section>

    <section class="info-card full-width">
      <h2>Data Limitations</h2>
      <ul class="methodology-list">
        <li>
          <strong>PIN coverage is limited:</strong> Only ~25 countries have formal Humanitarian
          Response Plans with PIN data. Many countries receiving significant humanitarian funding
          (such as Palestine with $3.5B in 2024) do not have PIN figures in HAPI. This is not
          an error &mdash; it reflects the scope of the HNO/HRP process.
        </li>
        <li>
          <strong>Funding data is self-reported:</strong> FTS relies on voluntary reporting by
          donors and may not capture all humanitarian assistance, particularly bilateral aid
          or private donations.
        </li>
        <li>
          <strong>Double-counting may occur:</strong> Funding reported at multiple stages of the
          humanitarian funding chain (e.g., from government to pooled fund to implementing partner)
          can result in the same money being counted more than once.
        </li>
        <li>
          <strong>Refugee data timing:</strong> UNHCR statistics are typically released mid-year
          for the previous year, so current-year data may show zeros or be incomplete.
        </li>
        <li>
          <strong>Currency effects:</strong> All figures are in USD using exchange rates at the
          time of reporting, which may affect year-over-year comparisons for non-USD donors.
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
