<script lang="ts">
  import Skeleton from './Skeleton.svelte';

  export let count: number = 4;
</script>

<div class="kpi-skeleton-row">
  {#each Array(count) as _}
    <div class="kpi-skeleton">
      <Skeleton width="80px" height="2rem" rounded="md" />
      <Skeleton width="120px" height="0.875rem" rounded="sm" />
    </div>
  {/each}
</div>

<style>
  .kpi-skeleton-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .kpi-skeleton {
    background: white;
    padding: 1.25rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .kpi-skeleton-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
