<script>
  import '../app.css';
</script>

<nav>
  <div class="container">
    <a href="/" style="font-weight: 700; font-size: 1.25rem;">
      Funding vs Needs
    </a>
    <div style="display: flex; gap: 0.5rem;">
      <a href="/">Dashboard</a>
      <a href="/countries">Countries</a>
      <a href="/donors">Donors</a>
    </div>
  </div>
</nav>

<main>
  <slot />
</main>

<style>
  main {
    padding: 2rem 0;
    min-height: calc(100vh - 60px);
  }
</style>
