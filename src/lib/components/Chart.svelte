<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  import type { ECharts, EChartsOption } from 'echarts';

  export let options: EChartsOption;
  export let height: string = '400px';
  export let onChartClick: ((params: any) => void) | undefined = undefined;

  let container: HTMLDivElement;
  let chart: ECharts | null = null;
  let currentClickHandler: ((params: any) => void) | undefined = undefined;

  // Helper to update click handler - removes old handler before adding new one
  function updateClickHandler(newHandler: ((params: any) => void) | undefined) {
    if (!chart) return;

    // Remove existing handler if present
    if (currentClickHandler) {
      chart.off('click', currentClickHandler);
    }

    // Add new handler if provided
    if (newHandler) {
      chart.on('click', newHandler);
    }

    currentClickHandler = newHandler;
  }

  onMount(() => {
    chart = echarts.init(container);
    chart.setOption(options);

    // Register initial click handler
    updateClickHandler(onChartClick);

    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    // Clean up click handler before disposing
    if (chart && currentClickHandler) {
      chart.off('click', currentClickHandler);
      currentClickHandler = undefined;
    }
    chart?.dispose();
    chart = null;
  });

  // Update options when they change
  $: if (chart && options) {
    chart.setOption(options, true);
  }

  // Update click handler when prop changes
  $: if (chart) {
    updateClickHandler(onChartClick);
  }
</script>

<div bind:this={container} style="width: 100%; height: {height};"></div>
