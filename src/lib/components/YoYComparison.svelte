<script lang="ts">
  import { formatMoney, formatNumber, formatYoyChange } from '$lib/utils/format';

  export let currentYear: number;
  export let compareYear: number;
  export let currentData: {
    totalFunding: number;
    peopleInNeed: number;
    countriesWithFunding: number;
    avgPerPerson: number;
  };
  export let compareData: {
    totalFunding: number;
    peopleInNeed: number;
    countriesWithFunding: number;
    avgPerPerson: number;
  };

  function calcChange(current: number, previous: number): number | null {
    if (!previous || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
  }

  function formatChange(current: number, previous: number): string {
    const change = calcChange(current, previous);
    if (change === null) return 'N/A';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  function getChangeClass(current: number, previous: number): string {
    const change = calcChange(current, previous);
    if (change === null) return '';
    return change >= 0 ? 'positive' : 'negative';
  }

  $: fundingChange = calcChange(currentData.totalFunding, compareData.totalFunding);
  $: pinChange = calcChange(currentData.peopleInNeed, compareData.peopleInNeed);
  $: perPersonChange = calcChange(currentData.avgPerPerson, compareData.avgPerPerson);
  $: countriesChange = currentData.countriesWithFunding - compareData.countriesWithFunding;
</script>

<div class="yoy-comparison">
  <div class="comparison-header">
    <span class="year-badge current">{currentYear}</span>
    <span class="vs">vs</span>
    <span class="year-badge compare">{compareYear}</span>
  </div>

  <div class="comparison-grid">
    <div class="comparison-card">
      <div class="card-header">Total Funding</div>
      <div class="values-row">
        <div class="value-col">
          <span class="year-label">{currentYear}</span>
          <span class="value">{formatMoney(currentData.totalFunding)}</span>
        </div>
        <div class="value-col">
          <span class="year-label">{compareYear}</span>
          <span class="value muted">{formatMoney(compareData.totalFunding)}</span>
        </div>
      </div>
      <div class="change-row {getChangeClass(currentData.totalFunding, compareData.totalFunding)}">
        <span class="change-value">{formatChange(currentData.totalFunding, compareData.totalFunding)}</span>
        <span class="change-absolute">
          ({fundingChange !== null && fundingChange >= 0 ? '+' : ''}{formatMoney(currentData.totalFunding - compareData.totalFunding)})
        </span>
      </div>
    </div>

    <div class="comparison-card">
      <div class="card-header">People in Need</div>
      <div class="values-row">
        <div class="value-col">
          <span class="year-label">{currentYear}</span>
          <span class="value">{formatNumber(currentData.peopleInNeed)}</span>
        </div>
        <div class="value-col">
          <span class="year-label">{compareYear}</span>
          <span class="value muted">{formatNumber(compareData.peopleInNeed)}</span>
        </div>
      </div>
      <div class="change-row {getChangeClass(currentData.peopleInNeed, compareData.peopleInNeed)}">
        <span class="change-value">{formatChange(currentData.peopleInNeed, compareData.peopleInNeed)}</span>
        <span class="change-absolute">
          ({pinChange !== null && pinChange >= 0 ? '+' : ''}{formatNumber(currentData.peopleInNeed - compareData.peopleInNeed)})
        </span>
      </div>
    </div>

    <div class="comparison-card">
      <div class="card-header">Avg $/Person</div>
      <div class="values-row">
        <div class="value-col">
          <span class="year-label">{currentYear}</span>
          <span class="value">${currentData.avgPerPerson.toFixed(0)}</span>
        </div>
        <div class="value-col">
          <span class="year-label">{compareYear}</span>
          <span class="value muted">${compareData.avgPerPerson.toFixed(0)}</span>
        </div>
      </div>
      <div class="change-row {getChangeClass(currentData.avgPerPerson, compareData.avgPerPerson)}">
        <span class="change-value">{formatChange(currentData.avgPerPerson, compareData.avgPerPerson)}</span>
        <span class="change-absolute">
          ({perPersonChange !== null && perPersonChange >= 0 ? '+' : ''}${(currentData.avgPerPerson - compareData.avgPerPerson).toFixed(0)})
        </span>
      </div>
    </div>

    <div class="comparison-card">
      <div class="card-header">Countries Funded</div>
      <div class="values-row">
        <div class="value-col">
          <span class="year-label">{currentYear}</span>
          <span class="value">{currentData.countriesWithFunding}</span>
        </div>
        <div class="value-col">
          <span class="year-label">{compareYear}</span>
          <span class="value muted">{compareData.countriesWithFunding}</span>
        </div>
      </div>
      <div class="change-row {countriesChange >= 0 ? 'positive' : 'negative'}">
        <span class="change-value">{countriesChange >= 0 ? '+' : ''}{countriesChange}</span>
        <span class="change-absolute">countries</span>
      </div>
    </div>
  </div>
</div>

<style>
  .yoy-comparison {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .comparison-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .year-badge {
    font-size: 1.125rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
  }

  .year-badge.current {
    background: var(--primary, #005f73);
    color: white;
  }

  .year-badge.compare {
    background: #64748b;
    color: white;
  }

  .vs {
    color: #94a3b8;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .comparison-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (max-width: 900px) {
    .comparison-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 500px) {
    .comparison-grid {
      grid-template-columns: 1fr;
    }
  }

  .comparison-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .card-header {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  .values-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .value-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .year-label {
    font-size: 0.625rem;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
  }

  .value {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .value.muted {
    color: #64748b;
  }

  .change-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f1f5f9;
  }

  .change-row.positive {
    color: #16a34a;
  }

  .change-row.negative {
    color: #dc2626;
  }

  .change-value {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .change-absolute {
    font-size: 0.75rem;
    opacity: 0.8;
  }
</style>
