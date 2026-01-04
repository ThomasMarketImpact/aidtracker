<script lang="ts">
  import Chart from './Chart.svelte';
  import { formatMoney } from '$lib/utils/format';

  export let show = false;
  export let title = '';
  export let subtitle = '';
  export let onClose: () => void;

  // For table display
  export let tableData: Array<{
    name: string;
    funding: number;
    yoyChange: number | null;
  }> = [];

  // For chart display
  export let chartOptions: Record<string, unknown> | null = null;
  export let chartHeight = '300px';

  function handleOverlayClick() {
    onClose();
  }

  function handleContentClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions a11y_interactive_supports_focus -->
  <div class="modal-overlay" on:click={handleOverlayClick} role="dialog" aria-modal="true">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div class="modal-content" on:click={handleContentClick} role="document">
      <div class="modal-header">
        <h2>{title}</h2>
        <button class="modal-close" on:click={onClose} aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        {#if subtitle}
          <p class="modal-subtitle">{subtitle}</p>
        {/if}

        {#if tableData.length > 0}
          <div class="breakdown-table">
            <table>
              <thead>
                <tr>
                  <th>Agency</th>
                  <th class="right">Funding</th>
                  <th class="right">YoY Change</th>
                </tr>
              </thead>
              <tbody>
                {#each tableData as item}
                  {@const yoyColor = item.yoyChange !== null ? (item.yoyChange >= 0 ? '#22c55e' : '#ef4444') : '#666'}
                  <tr>
                    <td>{item.name}</td>
                    <td class="right">{formatMoney(item.funding)}</td>
                    <td class="right" style="color: {yoyColor}">
                      {#if item.yoyChange !== null}
                        {item.yoyChange >= 0 ? '+' : ''}{item.yoyChange.toFixed(0)}%
                      {:else}
                        N/A
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else if chartOptions}
          <Chart options={chartOptions} height={chartHeight} />
        {:else}
          <p>No data available</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-muted, #666);
    padding: 0.25rem 0.5rem;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--color-text, #1f2937);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-subtitle {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted, #666);
    font-size: 0.875rem;
  }

  .breakdown-table {
    max-height: 400px;
    overflow-y: auto;
  }

  .breakdown-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .breakdown-table th,
  .breakdown-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .breakdown-table th {
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--color-text-muted, #666);
    background: var(--surface, #f8fafc);
    position: sticky;
    top: 0;
  }

  .breakdown-table .right {
    text-align: right;
  }
</style>
