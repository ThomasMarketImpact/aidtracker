<script lang="ts">
  export let value: string;
  export let label: string;
  export let size: 'normal' | 'small' = 'normal';
</script>

<div class="kpi-card" class:small={size === 'small'}>
  <span class="kpi-value">{value}</span>
  <span class="kpi-label">{label}</span>
</div>

<style>
  .kpi-card {
    background: white;
    padding: 1.25rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .kpi-card.small {
    padding: 1rem;
  }

  .kpi-value {
    display: block;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--primary, #005f73);
    margin-bottom: 0.25rem;
  }

  .kpi-card.small .kpi-value {
    font-size: 1.25rem;
  }

  .kpi-label {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-muted, #666);
  }

  .kpi-card.small .kpi-label {
    font-size: 0.75rem;
  }
</style>
