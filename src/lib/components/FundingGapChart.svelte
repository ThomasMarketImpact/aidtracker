<script lang="ts">
  import { formatMoney, formatNumber } from '$lib/utils/format';

  export let countries: {
    name: string;
    iso3: string;
    funding: number;
    peopleInNeed: number | null;
    fundingPerPerson: number | null;
  }[];

  export let targetPerPerson: number = 200; // Target $ per person in need

  type GapData = {
    name: string;
    iso3: string;
    funding: number;
    needs: number;
    currentPerPerson: number;
    targetFunding: number;
    gap: number;
    gapPercent: number;
  };

  $: gapData = countries
    .filter(c => c.peopleInNeed && c.peopleInNeed > 0)
    .map(c => {
      const needs = c.peopleInNeed!;
      const targetFunding = needs * targetPerPerson;
      const gap = targetFunding - c.funding;
      const currentPerPerson = c.funding / needs;

      return {
        name: c.name,
        iso3: c.iso3,
        funding: c.funding,
        needs,
        currentPerPerson,
        targetFunding,
        gap: Math.max(0, gap),
        gapPercent: Math.max(0, (gap / targetFunding) * 100),
      };
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  $: totalGap = gapData.reduce((sum, c) => sum + c.gap, 0);
  $: totalFunding = gapData.reduce((sum, c) => sum + c.funding, 0);
  $: totalNeeds = gapData.reduce((sum, c) => sum + c.needs, 0);
  $: avgCoverage = totalNeeds > 0 ? (totalFunding / (totalNeeds * targetPerPerson)) * 100 : 0;

  function getGapColor(gapPercent: number): string {
    if (gapPercent >= 80) return '#dc2626'; // Red - Critical gap
    if (gapPercent >= 50) return '#f97316'; // Orange - Severe gap
    if (gapPercent >= 25) return '#eab308'; // Yellow - Moderate gap
    return '#16a34a'; // Green - Mostly funded
  }

  function getFundedWidth(gapPercent: number): number {
    return Math.min(100, 100 - gapPercent);
  }
</script>

<div class="funding-gap-chart">
  <div class="gap-header">
    <h4>Funding Gap Analysis</h4>
    <p class="gap-description">
      Based on ${targetPerPerson} target per person in need
    </p>
  </div>

  <div class="gap-summary">
    <div class="summary-stat">
      <span class="stat-value">{formatMoney(totalGap)}</span>
      <span class="stat-label">Total Gap</span>
    </div>
    <div class="summary-stat">
      <span class="stat-value">{avgCoverage.toFixed(0)}%</span>
      <span class="stat-label">Avg Coverage</span>
    </div>
    <div class="summary-stat">
      <span class="stat-value">{formatNumber(totalNeeds)}</span>
      <span class="stat-label">People in Need</span>
    </div>
  </div>

  <div class="gap-list">
    {#each gapData as country}
      <div class="gap-item">
        <div class="gap-info">
          <span class="country-name">{country.name}</span>
          <div class="gap-details">
            <span class="funded">{formatMoney(country.funding)} funded</span>
            <span class="gap-amount" style="color: {getGapColor(country.gapPercent)}">
              {formatMoney(country.gap)} gap
            </span>
          </div>
        </div>
        <div class="gap-bar-container">
          <div class="gap-bar">
            <div
              class="bar-funded"
              style="width: {getFundedWidth(country.gapPercent)}%"
            ></div>
            <div
              class="bar-gap"
              style="width: {country.gapPercent}%; background: {getGapColor(country.gapPercent)}"
            ></div>
          </div>
          <span class="gap-percent">{country.gapPercent.toFixed(0)}% unfunded</span>
        </div>
        <div class="per-person">
          <span class="current">${country.currentPerPerson.toFixed(0)}</span>
          <span class="divider">/</span>
          <span class="target">${targetPerPerson}</span>
          <span class="label">per person</span>
        </div>
      </div>
    {/each}
  </div>

  {#if gapData.length === 0}
    <div class="no-data">
      No countries with people in need data available
    </div>
  {/if}
</div>

<style>
  .funding-gap-chart {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
  }

  .gap-header {
    margin-bottom: 1rem;
  }

  .gap-header h4 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .gap-description {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  .gap-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .summary-stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    display: block;
    font-size: 0.625rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .gap-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .gap-item {
    display: grid;
    grid-template-columns: 1fr 150px 100px;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .gap-item:last-child {
    border-bottom: none;
  }

  .gap-info {
    min-width: 0;
  }

  .country-name {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gap-details {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .funded {
    color: #16a34a;
  }

  .gap-amount {
    font-weight: 500;
  }

  .gap-bar-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .gap-bar {
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
  }

  .bar-funded {
    background: #16a34a;
    transition: width 0.3s ease;
  }

  .bar-gap {
    transition: width 0.3s ease;
  }

  .gap-percent {
    font-size: 0.625rem;
    color: #6b7280;
    text-align: right;
  }

  .per-person {
    display: flex;
    align-items: baseline;
    gap: 0.125rem;
    font-size: 0.75rem;
  }

  .current {
    font-weight: 600;
    color: #1f2937;
  }

  .divider {
    color: #9ca3af;
  }

  .target {
    color: #6b7280;
  }

  .label {
    font-size: 0.625rem;
    color: #9ca3af;
    margin-left: 0.25rem;
  }

  .no-data {
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
    padding: 2rem;
  }

  @media (max-width: 640px) {
    .gap-item {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .gap-summary {
      grid-template-columns: 1fr;
    }
  }
</style>
