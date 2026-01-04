<script lang="ts">
  import Skeleton from './Skeleton.svelte';

  export let rows: number = 10;
  export let columns: number = 4;
</script>

<div class="table-skeleton">
  <div class="skeleton-header-row">
    {#each Array(columns) as _, i}
      <div class="skeleton-cell" class:right={i > 0}>
        <Skeleton width={i === 0 ? '120px' : '80px'} height="0.875rem" />
      </div>
    {/each}
  </div>
  {#each Array(rows) as _}
    <div class="skeleton-row">
      {#each Array(columns) as _, i}
        <div class="skeleton-cell" class:right={i > 0}>
          <Skeleton width={i === 0 ? '150px' : '60px'} height="1rem" />
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .table-skeleton {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .skeleton-header-row {
    display: flex;
    padding: 0.75rem 1rem;
    background: var(--surface, #f8fafc);
    border-bottom: 1px solid #e5e7eb;
  }

  .skeleton-row {
    display: flex;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .skeleton-row:last-child {
    border-bottom: none;
  }

  .skeleton-cell {
    flex: 1;
  }

  .skeleton-cell.right {
    display: flex;
    justify-content: flex-end;
  }
</style>
