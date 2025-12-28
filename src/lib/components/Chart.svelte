<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  import type { ECharts, EChartsOption } from 'echarts';

  export let options: EChartsOption;
  export let height: string = '400px';
  export let onChartClick: ((params: any) => void) | undefined = undefined;

  let container: HTMLDivElement;
  let chart: ECharts | null = null;

  onMount(() => {
    chart = echarts.init(container);
    chart.setOption(options);

    if (onChartClick) {
      chart.on('click', onChartClick);
    }

    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    chart?.dispose();
  });

  $: if (chart && options) {
    chart.setOption(options, true);
  }
</script>

<div bind:this={container} style="width: 100%; height: {height};"></div>
