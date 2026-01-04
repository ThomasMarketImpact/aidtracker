<script lang="ts">
  import { analyzeTrend, getTrendIndicator, getTrendColor, type TrendData } from '$lib/utils/trends';
  import { formatMoney } from '$lib/utils/format';

  export let data: TrendData;
  export let showProjection: boolean = false;
  export let label: string = 'Trend';

  $: analysis = analyzeTrend(data);
  $: trendIndicator = getTrendIndicator(analysis.trend);
  $: colorClass = getTrendColor(analysis.trend);

  function formatPercent(value: number | null): string {
    if (value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  function getTrendLabel(trend: typeof analysis.trend): string {
    switch (trend) {
      case 'strong_growth': return 'Strong Growth';
      case 'moderate_growth': return 'Growing';
      case 'stable': return 'Stable';
      case 'moderate_decline': return 'Declining';
      case 'strong_decline': return 'Sharp Decline';
    }
  }
</script>

<div class="trend-indicator">
  <div class="trend-header">
    <span class="trend-label">{label}</span>
    <span class="trend-badge {colorClass}">
      <span class="trend-arrow">{trendIndicator}</span>
      <span class="trend-text">{getTrendLabel(analysis.trend)}</span>
    </span>
  </div>

  <div class="trend-metrics">
    <div class="metric">
      <span class="metric-label">Avg. Growth</span>
      <span class="metric-value {colorClass}">{formatPercent(analysis.averageGrowthRate)}</span>
    </div>

    {#if analysis.cagr !== null}
      <div class="metric">
        <span class="metric-label">CAGR</span>
        <span class="metric-value {colorClass}">{formatPercent(analysis.cagr)}</span>
      </div>
    {/if}

    {#if analysis.volatility !== null}
      <div class="metric">
        <span class="metric-label">Volatility</span>
        <span class="metric-value">{analysis.volatility.toFixed(1)}%</span>
      </div>
    {/if}

    {#if showProjection && analysis.linearProjection !== null}
      <div class="metric projection">
        <span class="metric-label">Next Year (Est.)</span>
        <span class="metric-value">{formatMoney(analysis.linearProjection)}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .trend-indicator {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .trend-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .trend-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .trend-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .trend-badge.positive {
    background: #dcfce7;
    color: #16a34a;
  }

  .trend-badge.neutral {
    background: #f3f4f6;
    color: #6b7280;
  }

  .trend-badge.negative {
    background: #fee2e2;
    color: #dc2626;
  }

  .trend-arrow {
    font-size: 0.875rem;
  }

  .trend-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-label {
    font-size: 0.625rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .metric-value.positive {
    color: #16a34a;
  }

  .metric-value.negative {
    color: #dc2626;
  }

  .metric.projection {
    padding-top: 0.5rem;
    border-top: 1px dashed #e5e7eb;
  }
</style>
