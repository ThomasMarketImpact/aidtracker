<script lang="ts">
  import { exportToExcel, type ExportConfig } from '$lib/utils/excelExport';

  export let config: ExportConfig;
  export let size: 'small' | 'normal' = 'small';

  function handleDownload() {
    exportToExcel(config);
  }
</script>

<button
  class="download-btn {size}"
  on:click={handleDownload}
  title="Download as Excel"
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
  <span>Excel</span>
</button>

<style>
  .download-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text-muted, #6b7280);
    transition: all 0.15s ease;
  }

  .download-btn:hover {
    background: var(--color-bg, #f3f4f6);
    color: var(--color-text, #374151);
    border-color: var(--color-text-muted, #9ca3af);
  }

  .download-btn.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
  }

  .download-btn.normal {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }

  .download-btn svg {
    width: 14px;
    height: 14px;
  }

  .download-btn.normal svg {
    width: 16px;
    height: 16px;
  }
</style>
