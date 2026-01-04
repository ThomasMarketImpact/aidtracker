<script lang="ts">
  import Skeleton from './Skeleton.svelte';

  export let height: string = '300px';
  export let title: string = '';
</script>

<div class="chart-skeleton">
  {#if title}
    <div class="skeleton-header">
      <Skeleton width="200px" height="1.25rem" />
    </div>
  {/if}
  <div class="skeleton-chart" style="height: {height};">
    <div class="skeleton-bars">
      {#each [80, 60, 90, 45, 75, 55, 85, 40] as h}
        <div class="skeleton-bar" style="height: {h}%;">
          <Skeleton width="100%" height="100%" rounded="sm" />
        </div>
      {/each}
    </div>
    <div class="skeleton-x-axis">
      {#each Array(8) as _}
        <Skeleton width="30px" height="0.75rem" />
      {/each}
    </div>
  </div>
</div>

<style>
  .chart-skeleton {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .skeleton-header {
    margin-bottom: 1rem;
  }

  .skeleton-chart {
    display: flex;
    flex-direction: column;
  }

  .skeleton-bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 1rem 0;
  }

  .skeleton-bar {
    flex: 1;
    min-width: 20px;
  }

  .skeleton-x-axis {
    display: flex;
    justify-content: space-around;
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }
</style>
