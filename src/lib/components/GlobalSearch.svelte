<script lang="ts">
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';

  export let countries: { iso3: string; name: string }[] = [];
  export let donors: { donor: string; funding: number }[] = [];
  export let sectors: { sector: string; funding: number }[] = [];
  export let currentYear: number;

  const dispatch = createEventDispatcher();

  let searchQuery = '';
  let isOpen = false;
  let selectedIndex = -1;
  let inputElement: HTMLInputElement;

  type SearchResult = {
    type: 'country' | 'donor' | 'sector';
    name: string;
    id: string;
    subtitle?: string;
  };

  $: results = getSearchResults(searchQuery);

  function getSearchResults(query: string): SearchResult[] {
    if (!query || query.length < 2) return [];

    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search countries
    countries
      .filter(c => c.name.toLowerCase().includes(q) || c.iso3.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(c => {
        results.push({
          type: 'country',
          name: c.name,
          id: c.iso3,
          subtitle: c.iso3
        });
      });

    // Search donors
    donors
      .filter(d => d.donor.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(d => {
        results.push({
          type: 'donor',
          name: d.donor,
          id: d.donor,
          subtitle: formatMoney(d.funding)
        });
      });

    // Search sectors
    sectors
      .filter(s => s.sector.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(s => {
        results.push({
          type: 'sector',
          name: s.sector,
          id: s.sector,
          subtitle: formatMoney(s.funding)
        });
      });

    return results;
  }

  function formatMoney(value: number): string {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }

  function handleInput() {
    isOpen = searchQuery.length >= 2;
    selectedIndex = -1;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          selectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        isOpen = false;
        selectedIndex = -1;
        inputElement?.blur();
        break;
    }
  }

  function selectResult(result: SearchResult) {
    searchQuery = '';
    isOpen = false;
    selectedIndex = -1;

    if (result.type === 'country') {
      goto(`?year=${currentYear}&country=${result.id}`);
    } else if (result.type === 'donor') {
      goto(`?year=${currentYear}&donor=${encodeURIComponent(result.id)}`);
    } else if (result.type === 'sector') {
      // Emit event for sector - parent can handle
      dispatch('sectorSelect', { sector: result.id });
    }
  }

  function handleBlur() {
    // Delay to allow click on results
    setTimeout(() => {
      isOpen = false;
      selectedIndex = -1;
    }, 200);
  }

  function getTypeIcon(type: string): string {
    switch (type) {
      case 'country': return 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'donor': return 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z';
      case 'sector': return 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10';
      default: return '';
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'country': return 'Country';
      case 'donor': return 'Donor';
      case 'sector': return 'Sector';
      default: return '';
    }
  }
</script>

<div class="global-search">
  <div class="search-input-wrapper">
    <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
    </svg>
    <input
      type="text"
      bind:this={inputElement}
      bind:value={searchQuery}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:focus={() => isOpen = searchQuery.length >= 2}
      on:blur={handleBlur}
      placeholder="Search countries, donors, sectors..."
      class="search-input"
      role="combobox"
      aria-label="Global search"
      aria-expanded={isOpen}
      aria-autocomplete="list"
      aria-controls="search-results"
      aria-haspopup="listbox"
    />
    {#if searchQuery}
      <button
        class="clear-btn"
        on:click={() => { searchQuery = ''; isOpen = false; }}
        aria-label="Clear search"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </button>
    {/if}
  </div>

  {#if isOpen && results.length > 0}
    <ul id="search-results" class="search-results" role="listbox">
      {#each results as result, index}
        <li
          class="search-result"
          class:selected={index === selectedIndex}
          role="option"
          aria-selected={index === selectedIndex}
          on:mousedown={() => selectResult(result)}
          on:mouseenter={() => selectedIndex = index}
        >
          <div class="result-icon {result.type}">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d={getTypeIcon(result.type)} clip-rule="evenodd" />
            </svg>
          </div>
          <div class="result-content">
            <span class="result-name">{result.name}</span>
            {#if result.subtitle}
              <span class="result-subtitle">{result.subtitle}</span>
            {/if}
          </div>
          <span class="result-type">{getTypeLabel(result.type)}</span>
        </li>
      {/each}
    </ul>
  {:else if isOpen && searchQuery.length >= 2}
    <div class="no-results">
      No results found for "{searchQuery}"
    </div>
  {/if}
</div>

<style>
  .global-search {
    position: relative;
    width: 100%;
    max-width: 400px;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    width: 1rem;
    height: 1rem;
    color: #9ca3af;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.625rem 2.5rem 0.625rem 2.25rem;
    font-size: 0.875rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    transition: all 0.15s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary, #005f73);
    box-shadow: 0 0 0 3px rgba(0, 95, 115, 0.1);
  }

  .search-input::placeholder {
    color: #9ca3af;
  }

  .clear-btn {
    position: absolute;
    right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    transition: color 0.15s;
  }

  .clear-btn:hover {
    color: #6b7280;
  }

  .clear-btn svg {
    width: 1rem;
    height: 1rem;
  }

  .search-results {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 50;
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    max-height: 320px;
    overflow-y: auto;
  }

  .search-result {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background 0.1s;
  }

  .search-result:hover,
  .search-result.selected {
    background: #f3f4f6;
  }

  .result-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    flex-shrink: 0;
  }

  .result-icon.country {
    background: #dbeafe;
    color: #2563eb;
  }

  .result-icon.donor {
    background: #dcfce7;
    color: #16a34a;
  }

  .result-icon.sector {
    background: #fef3c7;
    color: #d97706;
  }

  .result-icon svg {
    width: 1rem;
    height: 1rem;
  }

  .result-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .result-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-subtitle {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .result-type {
    font-size: 0.625rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .no-results {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
    z-index: 50;
  }
</style>
