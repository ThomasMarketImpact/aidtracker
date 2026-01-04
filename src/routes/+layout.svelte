<script>
  /* global document, HTMLElement */
  import { onDestroy } from 'svelte';
  import '../app.css';
  import Logo from '$lib/components/Logo.svelte';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

  // Current page is always "Data" for this subdomain
  const isDataPage = true;

  let mobileMenuOpen = false;
  /** @type {HTMLElement | null} */
  let mobileMenuEl = null;
  /** @type {HTMLButtonElement | null} */
  let mobileMenuButtonEl = null;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (!mobileMenuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu();
      mobileMenuButtonEl?.focus();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea',
      'input[type="text"]',
      'input[type="radio"]',
      'input[type="checkbox"]',
      'select',
      '[tabindex]:not([tabindex="-1"])'
    ];
    /** @type {HTMLElement[]} */
    const focusables = mobileMenuEl
      ? /** @type {HTMLElement[]} */ (
          Array.from(mobileMenuEl.querySelectorAll(focusableSelectors.join(',')))
        )
      : [];
    if (focusables.length === 0) return;
    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === firstEl) {
      event.preventDefault();
      lastEl.focus();
    } else if (!event.shiftKey && document.activeElement === lastEl) {
      event.preventDefault();
      firstEl.focus();
    }
  }

  $: if (mobileMenuOpen) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    const firstLink = mobileMenuEl?.querySelector('a, button');
    if (firstLink && firstLink instanceof HTMLElement) firstLink.focus();
  } else {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<LoadingOverlay />

<a href="#main-content" class="skip-link">Skip to content</a>

<header class="site-header">
  <nav class="section-container">
    <div class="nav-inner">
      <!-- Logo -->
      <div class="logo-wrapper">
        <a href="https://marketimpact.org" class="logo-link" aria-label="Market Impact Home">
          <div class="logo-mobile">
            <Logo className="logo-svg" />
          </div>
          <div class="logo-desktop">
            <Logo className="logo-svg" />
          </div>
        </a>
      </div>

      <!-- Navigation Links -->
      <div class="nav-links">
        <a href="https://marketimpact.org/about" class="nav-link">About</a>
        <a href="https://marketimpact.org/services" class="nav-link">Solutions</a>
        <a href="https://marketimpact.org/aidgpt" class="nav-link nav-link-aidgpt">
          AidGPT
          <span class="ai-badge">AI</span>
        </a>
        <a href="https://marketimpact.org/blog" class="nav-link">Blog</a>
        <a href="https://marketimpact.org/reports" class="nav-link">Reports</a>
        <a href="/" class="nav-link active">Data</a>
      </div>

      <!-- CTA Buttons -->
      <div class="nav-cta">
        <a
          href="https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7191818967940845571"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-linkedin"
        >
          <svg class="linkedin-icon" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
            />
          </svg>
          Subscribe
        </a>
        <a href="https://marketimpact.org/contact" class="btn-contact">
          Contact Us
        </a>
      </div>

      <!-- Mobile Menu Button -->
      <button
        class="mobile-menu-btn"
        aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-menu"
        bind:this={mobileMenuButtonEl}
        on:click={toggleMobileMenu}
      >
        {#if mobileMenuOpen}
          <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        {:else}
          <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        {/if}
      </button>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div id="mobile-menu" class="mobile-menu" bind:this={mobileMenuEl}>
        <div class="mobile-menu-inner">
          <a href="https://marketimpact.org/about" class="mobile-link" on:click={closeMobileMenu}>About</a>
          <a href="https://marketimpact.org/services" class="mobile-link" on:click={closeMobileMenu}>Solutions</a>
          <a href="https://marketimpact.org/aidgpt" class="mobile-link mobile-link-aidgpt" on:click={closeMobileMenu}>
            AidGPT
            <span class="ai-badge">AI</span>
          </a>
          <a href="https://marketimpact.org/blog" class="mobile-link" on:click={closeMobileMenu}>Blog</a>
          <a href="https://marketimpact.org/reports" class="mobile-link" on:click={closeMobileMenu}>Reports</a>
          <a href="/" class="mobile-link active" on:click={closeMobileMenu}>Data</a>
          <a href="https://marketimpact.org/contact" class="mobile-link" on:click={closeMobileMenu}>Contact</a>
          <div class="mobile-cta">
            <a
              href="https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7191818967940845571"
              target="_blank"
              rel="noopener noreferrer"
              class="mobile-btn-linkedin"
              on:click={closeMobileMenu}
            >
              <svg class="linkedin-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Subscribe to Newsletter
            </a>
            <a href="https://marketimpact.org/contact" class="mobile-btn-contact" on:click={closeMobileMenu}>
              Contact Us
            </a>
          </div>
        </div>
      </div>
    {/if}
  </nav>
</header>

<main id="main-content" class="main-content">
  <slot />
</main>

<footer class="site-footer">
  <div class="section-container footer-inner">
    <div class="footer-grid">
      <!-- Company Info -->
      <div class="footer-company">
        <div class="footer-logo">
          <Logo variant="white" className="logo-svg" />
        </div>
        <p class="footer-desc">
          Where humanitarian expertise meets AI innovation. Transforming aid effectiveness through
          evidence-based solutions and cutting-edge technology.
        </p>
        <div class="footer-social">
          <a
            href="https://linkedin.com/company/marketimpact"
            class="social-link"
            aria-label="Visit MarketImpact on LinkedIn"
          >
            <svg class="social-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="footer-links">
        <h3 class="footer-heading">Services</h3>
        <ul class="footer-list">
          <li><a href="https://marketimpact.org/services">AI Implementation</a></li>
          <li><a href="https://marketimpact.org/services">Digital Transformation</a></li>
          <li><a href="https://marketimpact.org/services">Crisis Response</a></li>
          <li><a href="https://marketimpact.org/services">Training Workshops</a></li>
        </ul>
      </div>

      <!-- Contact Info -->
      <div class="footer-contact">
        <h3 class="footer-heading">Contact</h3>
        <ul class="footer-list">
          <li><a href="https://marketimpact.org/contact">Get in Touch</a></li>
          <li>15+ years humanitarian expertise</li>
          <li>Experience with 50+ organizations</li>
          <li>Active in 20+ countries</li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; {new Date().getFullYear()} MarketImpact. All rights reserved.</p>
    </div>
  </div>
</footer>

<style>
  :global(body) {
    margin: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  :global(#svelte) {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Header */
  .site-header {
    background: white;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border-bottom: 1px solid #f3f4f6;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .nav-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
  }

  .logo-wrapper {
    display: flex;
    align-items: center;
  }

  .logo-link {
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .logo-mobile {
    display: block;
    width: 10rem;
  }

  .logo-desktop {
    display: none;
    width: 14rem;
  }

  :global(.logo-svg) {
    width: 100%;
    height: auto;
  }

  @media (min-width: 640px) {
    .logo-mobile {
      display: none;
    }
    .logo-desktop {
      display: block;
    }
  }

  /* Navigation Links */
  .nav-links {
    display: none;
    align-items: center;
    gap: 2rem;
  }

  @media (min-width: 1024px) {
    .nav-links {
      display: flex;
    }
  }

  .nav-link {
    color: #374151;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s;
  }

  .nav-link:hover {
    color: var(--primary);
  }

  .nav-link.active {
    color: var(--primary);
    font-weight: 600;
  }

  .nav-link-aidgpt {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .nav-link-aidgpt:hover {
    color: var(--secondary);
  }

  .ai-badge {
    font-size: 10px;
    font-weight: 700;
    color: white;
    background: var(--secondary);
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
  }

  /* CTA Buttons */
  .nav-cta {
    display: none;
    align-items: center;
    gap: 0.75rem;
  }

  @media (min-width: 768px) {
    .nav-cta {
      display: flex;
    }
  }

  .btn-linkedin {
    display: inline-flex;
    align-items: center;
    background: #0A66C2;
    color: white;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    transition: all 0.2s;
  }

  .btn-linkedin:hover {
    background: #004182;
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  .linkedin-icon {
    width: 1rem;
    height: 1rem;
    margin-right: 0.5rem;
  }

  .btn-contact {
    background: var(--primary);
    color: white;
    padding: 0.625rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    transition: all 0.2s;
  }

  .btn-contact:hover {
    background: #004a5a;
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  /* Mobile Menu Button */
  .mobile-menu-btn {
    display: block;
    background: none;
    border: none;
    color: #374151;
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
  }

  .mobile-menu-btn:hover {
    color: var(--primary);
  }

  @media (min-width: 1024px) {
    .mobile-menu-btn {
      display: none;
    }
  }

  .menu-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  /* Mobile Menu */
  .mobile-menu {
    background: white;
    border-top: 1px solid #f3f4f6;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  @media (min-width: 1024px) {
    .mobile-menu {
      display: none;
    }
  }

  .mobile-menu-inner {
    padding: 0.5rem;
  }

  .mobile-link {
    display: block;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: #374151;
    text-decoration: none;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .mobile-link:hover {
    color: var(--primary);
    background: #f9fafb;
  }

  .mobile-link.active {
    color: var(--primary);
    background: var(--color-primary-50, #f0fdff);
  }

  .mobile-link-aidgpt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mobile-link-aidgpt:hover {
    color: var(--secondary);
    background: var(--color-secondary-50, #f0fdff);
  }

  .mobile-cta {
    padding-top: 1rem;
    margin-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mobile-btn-linkedin {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: white;
    background: #0A66C2;
    text-decoration: none;
    border-radius: 0.375rem;
    transition: background 0.2s;
  }

  .mobile-btn-linkedin:hover {
    background: #004182;
  }

  .mobile-btn-contact {
    display: block;
    width: 100%;
    text-align: center;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: white;
    background: var(--primary);
    text-decoration: none;
    border-radius: 0.375rem;
    transition: background 0.2s;
  }

  .mobile-btn-contact:hover {
    background: #004a5a;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    padding: 0;
  }

  /* Footer */
  .site-footer {
    background: #111827;
    color: white;
  }

  .footer-inner {
    padding: 3rem 1rem;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  @media (min-width: 768px) {
    .footer-grid {
      grid-template-columns: 2fr 1fr 1fr;
    }
  }

  .footer-company {
    max-width: 28rem;
  }

  .footer-logo {
    width: 11rem;
    margin-bottom: 1rem;
  }

  .footer-desc {
    color: #d1d5db;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .footer-social {
    display: flex;
    gap: 1rem;
  }

  .social-link {
    color: #d1d5db;
    transition: color 0.2s;
  }

  .social-link:hover {
    color: white;
  }

  .social-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .footer-heading {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: white;
  }

  .footer-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: #d1d5db;
  }

  .footer-list a {
    color: #d1d5db;
    text-decoration: none;
    transition: color 0.2s;
  }

  .footer-list a:hover {
    color: white;
  }

  .footer-bottom {
    border-top: 1px solid #374151;
    margin-top: 2rem;
    padding-top: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: #9ca3af;
  }

  @media (min-width: 640px) {
    .footer-bottom {
      flex-direction: row;
      justify-content: space-between;
    }
  }
</style>
