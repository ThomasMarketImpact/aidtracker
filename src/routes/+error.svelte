<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Error - AidTracker</title>
</svelte:head>

<div class="error-container">
  <div class="error-content">
    <h1 class="error-code">{$page.status}</h1>
    <h2 class="error-title">
      {#if $page.status === 404}
        Page Not Found
      {:else if $page.status === 500}
        Server Error
      {:else}
        Something Went Wrong
      {/if}
    </h2>
    <p class="error-message">
      {#if $page.error?.message}
        {$page.error.message}
      {:else if $page.status === 404}
        The page you're looking for doesn't exist or has been moved.
      {:else}
        An unexpected error occurred. Please try again later.
      {/if}
    </p>
    <div class="error-actions">
      <a href="/" class="btn btn-primary">Go to Dashboard</a>
      <button class="btn btn-secondary" on:click={() => window.location.reload()}>
        Try Again
      </button>
    </div>
  </div>
</div>

<style>
  .error-container {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    max-width: 500px;
  }

  .error-code {
    font-size: 6rem;
    font-weight: 700;
    color: var(--color-primary, #3b82f6);
    margin: 0;
    line-height: 1;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text, #1f2937);
    margin: 1rem 0 0.5rem;
  }

  .error-message {
    color: var(--color-text-secondary, #6b7280);
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 0.875rem;
  }

  .btn-primary {
    background-color: var(--color-primary, #3b82f6);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--color-primary-dark, #2563eb);
  }

  .btn-secondary {
    background-color: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text, #1f2937);
  }

  .btn-secondary:hover {
    background-color: var(--color-bg-tertiary, #e5e7eb);
  }
</style>
