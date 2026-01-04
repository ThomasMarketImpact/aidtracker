<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ECharts, EChartsOption } from 'echarts';

  export let options: EChartsOption;
  export let height: string = '400px';
  export let onChartClick: ((params: any) => void) | undefined = undefined;

  let container: HTMLDivElement;
  let chart: ECharts | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      // Dynamic import for code splitting
      const echarts = await import('echarts');

      chart = echarts.init(container);
      chart.setOption(options);
      loading = false;

      if (onChartClick) {
        chart.on('click', onChartClick);
      }

      const handleResize = () => chart?.resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (e) {
      error = 'Failed to load chart';
      loading = false;
      console.error('Chart loading error:', e);
    }
  });

  onDestroy(() => {
    chart?.dispose();
  });

  $: if (chart && options) {
    chart.setOption(options, true);
  }
</script>

<div class="chart-wrapper" style="height: {height};">
  {#if loading}
    <div class="chart-loading">
      <div class="loading-spinner"></div>
      <span>Loading chart...</span>
    </div>
  {:else if error}
    <div class="chart-error">
      <span>{error}</span>
    </div>
  {/if}
  <div
    bind:this={container}
    style="width: 100%; height: 100%;"
    class:hidden={loading || error}
  ></div>
</div>

<style>
  .chart-wrapper {
    position: relative;
    width: 100%;
  }

  .chart-loading,
  .chart-error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: #f8fafc;
    color: #64748b;
    font-size: 0.875rem;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: var(--primary, #005f73);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .chart-error {
    color: #dc2626;
  }

  .hidden {
    visibility: hidden;
  }
</style>
