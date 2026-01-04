<script lang="ts">
  import { getRegionalSummary, type Region, REGION_COLORS } from '$lib/constants/regions';
  import { formatMoney } from '$lib/utils/format';

  type CountryData = {
    iso3: string;
    name: string;
    funding: number;
    peopleInNeed?: number | null;
  };

  export let countries: CountryData[];
  export let title: string = 'Regional Breakdown';

  $: regionalData = getRegionalSummary(countries, c => c.funding);
  $: totalFunding = regionalData.reduce((sum, r) => sum + r.total, 0);
  $: maxTotal = Math.max(...regionalData.map(r => r.total));
</script>

<div class="regional-breakdown">
  <h4 class="title">{title}</h4>

  <div class="region-list">
    {#each regionalData as region}
      {@const percent = (region.total / totalFunding) * 100}
      <div class="region-item">
        <div class="region-header">
          <div class="region-name">
            <span class="color-dot" style="background: {region.color}"></span>
            <span class="name">{region.region}</span>
          </div>
          <div class="region-stats">
            <span class="funding">{formatMoney(region.total)}</span>
            <span class="percent">{percent.toFixed(1)}%</span>
          </div>
        </div>
        <div class="region-bar">
          <div
            class="bar-fill"
            style="width: {(region.total / maxTotal) * 100}%; background: {region.color}"
          ></div>
        </div>
        <div class="country-count">
          {region.countryCount} {region.countryCount === 1 ? 'country' : 'countries'}
        </div>
      </div>
    {/each}
  </div>

  {#if regionalData.length === 0}
    <div class="no-data">No regional data available</div>
  {/if}
</div>

<style>
  .regional-breakdown {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
  }

  .title {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .region-list {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .region-item {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .region-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .region-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .region-stats {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .funding {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }

  .percent {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .region-bar {
    height: 8px;
    background: #f3f4f6;
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .country-count {
    font-size: 0.625rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .no-data {
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
    padding: 2rem;
  }
</style>
