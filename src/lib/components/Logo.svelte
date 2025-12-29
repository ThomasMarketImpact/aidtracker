<script>
  export let showText = true;
  export let variant = 'default'; // 'default', 'icon', 'white'
  export let className = '';

  $: viewBoxWidth = showText ? 260 : 60;
  $: viewBoxHeight = 60;
  $: strokeColor = variant === 'white' ? '#ffffff' : '#0a9396';
  $: textColor = variant === 'white' ? '#ffffff' : '#001219';
  $: strokeWidth = showText ? 2.5 : 3;
</script>

<svg
  class={className}
  viewBox="0 0 {viewBoxWidth} {viewBoxHeight}"
  xmlns="http://www.w3.org/2000/svg"
  preserveAspectRatio="xMidYMid meet"
>
  <!-- Three overlapping circles -->
  <g transform="translate(30, 30)">
    <!-- Top circle -->
    <circle
      cx={showText ? 15 : 0}
      cy={showText ? -8 : -10}
      r={showText ? 15 : 16}
      fill="none"
      stroke={strokeColor}
      stroke-width={strokeWidth}
    />

    <!-- Bottom left circle -->
    <circle
      cx={showText ? 5 : -8}
      cy={showText ? 8 : 8}
      r={showText ? 15 : 16}
      fill="none"
      stroke={strokeColor}
      stroke-width={strokeWidth}
    />

    <!-- Bottom right circle -->
    <circle
      cx={showText ? 25 : 8}
      cy={showText ? 8 : 8}
      r={showText ? 15 : 16}
      fill="none"
      stroke={strokeColor}
      stroke-width={strokeWidth}
    />
  </g>

  {#if showText}
    <!-- Brand name -->
    <text
      x="80"
      y="38"
      font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      font-size="22"
      font-weight="700"
      fill={textColor}
    >
      MarketImpact
    </text>
  {/if}
</svg>

<style>
  /* Ensure text renders crisply */
  text {
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
