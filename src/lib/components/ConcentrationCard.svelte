<script lang="ts">
  import {
    type ConcentrationResult,
    getConcentrationColor,
    getConcentrationDescription,
    type DonorShare
  } from '$lib/utils/concentration';
  import { formatMoney } from '$lib/utils/format';

  export let concentration: ConcentrationResult;
  export let topDonors: DonorShare[] = [];
  export let title: string = 'Donor Concentration';
  export let showDetails: boolean = true;

  $: color = getConcentrationColor(concentration.concentrationLevel);
  $: description = getConcentrationDescription(concentration.concentrationLevel);

  function getLevelLabel(level: ConcentrationResult['concentrationLevel']): string {
    switch (level) {
      case 'low': return 'Low';
      case 'moderate': return 'Moderate';
      case 'high': return 'High';
      case 'very_high': return 'Very High';
    }
  }
</script>

<div class="concentration-card">
  <div class="card-header">
    <h4>{title}</h4>
    <span class="level-badge" style="background-color: {color}20; color: {color}; border-color: {color};">
      {getLevelLabel(concentration.concentrationLevel)}
    </span>
  </div>

  <div class="hhi-display">
    <div class="hhi-value">
      <span class="number">{concentration.hhi.toLocaleString()}</span>
      <span class="label">HHI Score</span>
    </div>
    <div class="hhi-gauge">
      <div class="gauge-track">
        <div class="gauge-fill" style="width: {Math.min(100, concentration.hhi / 100)}%; background-color: {color}"></div>
      </div>
      <div class="gauge-labels">
        <span>0</span>
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>10k</span>
      </div>
    </div>
  </div>

  <p class="description">{description}</p>

  {#if showDetails}
    <div class="metrics-grid">
      <div class="metric">
        <span class="metric-value">{concentration.topDonorShare}%</span>
        <span class="metric-label">Top Donor Share</span>
      </div>
      <div class="metric">
        <span class="metric-value">{concentration.top3DonorShare}%</span>
        <span class="metric-label">Top 3 Share</span>
      </div>
      <div class="metric">
        <span class="metric-value">{concentration.effectiveDonors}</span>
        <span class="metric-label">Effective Donors</span>
      </div>
      <div class="metric">
        <span class="metric-value">{concentration.giniCoefficient}</span>
        <span class="metric-label">Gini Index</span>
      </div>
    </div>

    {#if topDonors.length > 0}
      <div class="top-donors">
        <h5>Top Donors</h5>
        <div class="donors-list">
          {#each topDonors.slice(0, 5) as donor, i}
            <div class="donor-row">
              <div class="donor-info">
                <span class="donor-rank">#{i + 1}</span>
                <span class="donor-name">{donor.name.length > 30 ? donor.name.slice(0, 27) + '...' : donor.name}</span>
              </div>
              <div class="donor-stats">
                <span class="donor-funding">{formatMoney(donor.funding)}</span>
                <span class="donor-share">{donor.share}%</span>
              </div>
              <div class="share-bar">
                <div class="share-fill" style="width: {donor.share}%"></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .concentration-card {
    background: white;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .card-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .level-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid;
  }

  .hhi-display {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .hhi-value {
    display: flex;
    flex-direction: column;
    min-width: 80px;
  }

  .hhi-value .number {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    line-height: 1;
  }

  .hhi-value .label {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
    margin-top: 0.25rem;
  }

  .hhi-gauge {
    flex: 1;
  }

  .gauge-track {
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .gauge-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .gauge-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.625rem;
    color: var(--color-text-muted, #666);
  }

  .description {
    font-size: 0.875rem;
    color: var(--color-text-muted, #666);
    margin: 0 0 1rem 0;
    padding: 0.75rem;
    background: var(--surface, #f8fafc);
    border-radius: 6px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .metric {
    text-align: center;
    padding: 0.5rem;
    background: var(--surface, #f8fafc);
    border-radius: 6px;
  }

  .metric-value {
    display: block;
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
  }

  .metric-label {
    display: block;
    font-size: 0.625rem;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
    margin-top: 0.125rem;
  }

  .top-donors h5 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }

  .donors-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .donor-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.25rem 0.75rem;
    align-items: center;
  }

  .donor-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .donor-rank {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    min-width: 1.5rem;
  }

  .donor-name {
    font-size: 0.875rem;
    color: #1f2937;
  }

  .donor-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-self: end;
  }

  .donor-funding {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary);
  }

  .donor-share {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    min-width: 3rem;
    text-align: right;
  }

  .share-bar {
    grid-column: 1 / -1;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }

  .share-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 2px;
  }

  @media (max-width: 640px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .hhi-display {
      flex-direction: column;
      align-items: stretch;
    }

    .hhi-value {
      flex-direction: row;
      align-items: baseline;
      gap: 0.5rem;
    }
  }
</style>
