<script lang="ts">
  import { goto } from '$app/navigation';
  import Chart from '$lib/components/Chart.svelte';
  import DownloadButton from '$lib/components/DownloadButton.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { DATA_SOURCES } from '$lib/utils/excelExport';
  import type { PageData } from './$types';

  export let data: PageData;

  // Format helpers
  function formatMoney(value: number): string {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    return `$${value.toLocaleString()}`;
  }

  function formatNumber(value: number): string {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString();
  }

  function getFundingLevel(perPerson: number | null): { label: string; class: string } {
    if (!perPerson) return { label: 'N/A', class: 'badge-neutral' };
    if (perPerson >= 150) return { label: 'High', class: 'badge-success' };
    if (perPerson >= 80) return { label: 'Medium', class: 'badge-warning' };
    return { label: 'Low', class: 'badge-danger' };
  }

  // Navigation handlers
  function handleYearChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const params = new URLSearchParams();
    params.set('year', select.value);
    if (data.selectedCountry) params.set('country', data.selectedCountry);
    goto(`?${params.toString()}`);
  }

  function handleCountryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const params = new URLSearchParams();
    params.set('year', data.selectedYear.toString());
    if (select.value) params.set('country', select.value);
    goto(`?${params.toString()}`);
  }

  function selectCountry(iso3: string) {
    const params = new URLSearchParams();
    params.set('year', data.selectedYear.toString());
    params.set('country', iso3);
    goto(`?${params.toString()}`);
  }

  function clearCountry() {
    goto(`?year=${data.selectedYear}`);
  }

  function selectDonor(donorName: string) {
    const params = new URLSearchParams();
    params.set('year', data.selectedYear.toString());
    params.set('donor', donorName);
    goto(`?${params.toString()}`);
  }

  function clearDonor() {
    goto(`?year=${data.selectedYear}`);
  }

  function handleDonorFilterChange(filter: string) {
    const params = new URLSearchParams();
    params.set('year', data.selectedYear.toString());
    if (data.selectedCountry) params.set('country', data.selectedCountry);
    if (filter !== 'all') params.set('donorFilter', filter);
    goto(`?${params.toString()}`);
  }

  // Donor filter labels for display
  const donorFilterLabels: Record<string, string> = {
    'all': 'All Donors',
    'us': 'US Government',
    'eu_echo': 'EU + Member States',
    'gulf': 'Gulf States',
    'oecd': 'OECD Members'
  };

  // Modal state for US/EU breakdown
  let showBreakdownModal = false;
  let breakdownType: 'US' | 'EU' | null = null;

  function handleDonorChartClick(params: any) {
    const donorName = params.name;
    if (donorName === 'United States (All)') {
      breakdownType = 'US';
      showBreakdownModal = true;
    } else if (donorName === 'EU Member States (Combined)') {
      breakdownType = 'EU';
      showBreakdownModal = true;
    }
  }

  function closeBreakdownModal() {
    showBreakdownModal = false;
    breakdownType = null;
  }

  function handleYearChartClick(params: any) {
    const year = params.name;
    if (year && data.availableYears.includes(Number(year))) {
      goto(`?year=${year}`);
    }
  }

  // Chart configurations
  $: fundingTrendOptions = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const year = params[0]?.name;
        const yearData = data.fundingTrend.find(d => d.year === Number(year));
        let html = `<strong>${year}</strong>`;
        if (Number(year) === data.selectedYear) {
          html += ` <span style="color:#3b82f6">(selected)</span>`;
        }
        html += `<br/>`;
        params.forEach((p: any) => {
          if (p.seriesName === 'People in Need') {
            html += `${p.marker} ${p.seriesName}: ${p.value ? formatNumber(p.value) : 'N/A'}<br/>`;
          } else {
            html += `${p.marker} ${p.seriesName}: ${formatMoney(p.value)}<br/>`;
          }
        });
        if (yearData && yearData.inflationMultiplier !== 1) {
          html += `<span style="color:#999;font-size:11px">Inflation multiplier: ${yearData.inflationMultiplier.toFixed(2)}x</span><br/>`;
        }
        html += `<span style="color:#3b82f6;font-size:11px">Click to view this year</span>`;
        return html;
      }
    },
    legend: {
      data: ['Nominal USD', '2025 USD (Inflation Adjusted)', 'People in Need'],
      bottom: 0
    },
    grid: { left: '3%', right: '8%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.fundingTrend.map(d => d.year),
      axisLabel: {
        color: '#666',
        formatter: (value: string) => {
          return Number(value) === data.selectedYear ? `{selected|${value}}` : value;
        },
        rich: {
          selected: {
            color: '#3b82f6',
            fontWeight: 'bold',
            backgroundColor: '#eff6ff',
            padding: [2, 4],
            borderRadius: 2
          }
        }
      },
      triggerEvent: true
    },
    yAxis: [
      {
        type: 'value',
        name: 'Funding (USD)',
        position: 'left',
        axisLabel: {
          color: '#666',
          formatter: (val: number) => formatMoney(val)
        },
        axisLine: { show: true, lineStyle: { color: '#3b82f6' } }
      },
      {
        type: 'value',
        name: 'People in Need',
        position: 'right',
        axisLabel: {
          color: '#666',
          formatter: (val: number) => formatNumber(val)
        },
        axisLine: { show: true, lineStyle: { color: '#ef4444' } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Nominal USD',
        data: data.fundingTrend.map(d => d.funding),
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
        emphasis: { focus: 'series' }
      },
      {
        name: '2025 USD (Inflation Adjusted)',
        data: data.fundingTrend.map(d => d.fundingReal2025),
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 3 },
        itemStyle: { color: '#3b82f6' },
        emphasis: { focus: 'series' }
      },
      {
        name: 'People in Need',
        data: data.fundingTrend.map(d => d.peopleInNeed),
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: 3 },
        itemStyle: { color: '#ef4444' },
        symbol: 'circle',
        symbolSize: 8,
        emphasis: { focus: 'series' }
      }
    ]
  };

  $: topCountriesOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0];
        const country = data.countriesData.find(c => c.name === p.name);
        let html = `<strong>${p.name}</strong><br/>`;
        html += `Funding: ${formatMoney(p.value)}<br/>`;
        if (country?.peopleInNeed) {
          html += `People in Need: ${formatNumber(country.peopleInNeed)}<br/>`;
          if (country.fundingPerPerson) {
            html += `$/Person: $${country.fundingPerPerson.toFixed(0)}`;
          }
        }
        return html;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#666',
        formatter: (val: number) => formatMoney(val)
      }
    },
    yAxis: {
      type: 'category',
      data: data.countriesData.slice(0, 15).map(c => c.name).reverse(),
      axisLabel: { color: '#666', width: 100, overflow: 'truncate' }
    },
    series: [{
      type: 'bar',
      data: data.countriesData.slice(0, 15).map(c => c.funding).reverse(),
      itemStyle: {
        color: (params: any) => {
          const country = data.countriesData[14 - params.dataIndex];
          const perPerson = country?.fundingPerPerson;
          if (!perPerson) return '#94a3b8';
          if (perPerson >= 150) return '#22c55e';
          if (perPerson >= 80) return '#eab308';
          return '#ef4444';
        }
      },
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => formatMoney(params.value),
        fontSize: 10,
        color: '#666'
      }
    }]
  };

  $: sectorPieOptions = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${formatMoney(params.value)} (${params.percent}%)`
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 20,
      bottom: 20
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      data: data.sectorData.slice(0, 10).map((s, i) => ({
        value: s.funding,
        name: s.sector,
        itemStyle: {
          color: ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'][i]
        }
      }))
    }]
  };

  // Color mapping for donor categories
  const donorCategoryColors: Record<string, string> = {
    'US': '#3b82f6',      // Blue for US
    'EU': '#eab308',      // Gold/Yellow for EU
    'Other': '#64748b'    // Slate gray for others
  };

  $: topGovernmentDonorsData = data.topGovernmentDonors.slice(0, 12);

  $: topGovernmentDonorsOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const donorName = params[0].name;
        const donorData = topGovernmentDonorsData.find(d => d.donor === donorName);
        let html = `<strong>${donorName}</strong><br/>`;
        html += `Funding: ${formatMoney(params[0].value)}<br/>`;
        if (donorData?.yoyChange !== null && donorData?.yoyChange !== undefined) {
          const sign = donorData.yoyChange >= 0 ? '+' : '';
          const color = donorData.yoyChange >= 0 ? '#22c55e' : '#ef4444';
          html += `<span style="color:${color}">YoY: ${sign}${donorData.yoyChange.toFixed(1)}%</span>`;
        }
        return html;
      }
    },
    grid: { left: '3%', right: '22%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#666',
        formatter: (val: number) => formatMoney(val)
      }
    },
    yAxis: {
      type: 'category',
      data: [...topGovernmentDonorsData].reverse().map(d => d.donor),
      axisLabel: {
        color: '#666',
        width: 180,
        overflow: 'truncate',
        fontSize: 11
      }
    },
    series: [{
      type: 'bar',
      data: [...topGovernmentDonorsData].reverse().map(d => ({
        value: d.funding,
        itemStyle: {
          color: donorCategoryColors[d.category] || '#64748b'
        }
      })),
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => {
          const reversedData = [...topGovernmentDonorsData].reverse();
          const donor = reversedData[params.dataIndex];
          if (!donor) return formatMoney(params.value);
          let label = formatMoney(params.value);
          if (donor.yoyChange !== null && donor.yoyChange !== undefined) {
            const sign = donor.yoyChange >= 0 ? '+' : '';
            const changeColor = donor.yoyChange >= 0 ? '#22c55e' : '#ef4444';
            label += ` {change|${sign}${donor.yoyChange.toFixed(0)}%}`;
          }
          return label;
        },
        fontSize: 10,
        color: '#666',
        rich: {
          change: {
            fontSize: 10,
            padding: [0, 0, 0, 4]
          }
        }
      }
    }]
  };

  // Breakdown chart options for US agencies
  $: usBreakdownOptions = {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (params: any) => {
        const agencyName = params[0].name;
        const agencyData = data.usAgenciesBreakdown.find(d => d.donor === agencyName);
        let html = `<strong>${agencyName}</strong><br/>`;
        html += `Funding: ${formatMoney(params[0].value)}<br/>`;
        if (agencyData?.yoyChange !== null && agencyData?.yoyChange !== undefined) {
          const sign = agencyData.yoyChange >= 0 ? '+' : '';
          const color = agencyData.yoyChange >= 0 ? '#22c55e' : '#ef4444';
          html += `<span style="color:${color}">YoY: ${sign}${agencyData.yoyChange.toFixed(1)}%</span>`;
        }
        return html;
      }
    },
    grid: { left: '3%', right: '20%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#666',
        formatter: (val: number) => formatMoney(val)
      }
    },
    yAxis: {
      type: 'category' as const,
      data: [...data.usAgenciesBreakdown].slice(0, 15).reverse().map(d => d.donor),
      axisLabel: {
        color: '#666',
        width: 180,
        overflow: 'truncate' as const,
        fontSize: 11
      }
    },
    series: [{
      type: 'bar' as const,
      data: [...data.usAgenciesBreakdown].slice(0, 15).reverse().map(d => ({
        value: d.funding,
        itemStyle: { color: '#3b82f6' }
      })),
      label: {
        show: true,
        position: 'right' as const,
        formatter: (params: any) => {
          const reversedData = [...data.usAgenciesBreakdown].slice(0, 15).reverse();
          const agency = reversedData[params.dataIndex];
          if (!agency) return formatMoney(params.value);
          let label = formatMoney(params.value);
          if (agency.yoyChange !== null && agency.yoyChange !== undefined) {
            const sign = agency.yoyChange >= 0 ? '+' : '';
            label += ` ${sign}${agency.yoyChange.toFixed(0)}%`;
          }
          return label;
        },
        fontSize: 10,
        color: '#666'
      }
    }]
  };

  // Breakdown chart options for EU member states
  $: euBreakdownOptions = {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (params: any) => {
        const countryName = params[0].name;
        const countryData = data.euMemberStatesBreakdown.find(d => d.donor === countryName);
        let html = `<strong>${countryName}</strong><br/>`;
        html += `Funding: ${formatMoney(params[0].value)}<br/>`;
        if (countryData?.yoyChange !== null && countryData?.yoyChange !== undefined) {
          const sign = countryData.yoyChange >= 0 ? '+' : '';
          const color = countryData.yoyChange >= 0 ? '#22c55e' : '#ef4444';
          html += `<span style="color:${color}">YoY: ${sign}${countryData.yoyChange.toFixed(1)}%</span>`;
        }
        return html;
      }
    },
    grid: { left: '3%', right: '20%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value' as const,
      axisLabel: {
        color: '#666',
        formatter: (val: number) => formatMoney(val)
      }
    },
    yAxis: {
      type: 'category' as const,
      data: [...data.euMemberStatesBreakdown].slice(0, 20).reverse().map(d => d.donor),
      axisLabel: {
        color: '#666',
        width: 180,
        overflow: 'truncate' as const,
        fontSize: 11
      }
    },
    series: [{
      type: 'bar' as const,
      data: [...data.euMemberStatesBreakdown].slice(0, 20).reverse().map(d => ({
        value: d.funding,
        itemStyle: { color: '#eab308' }
      })),
      label: {
        show: true,
        position: 'right' as const,
        formatter: (params: any) => {
          const reversedData = [...data.euMemberStatesBreakdown].slice(0, 20).reverse();
          const country = reversedData[params.dataIndex];
          if (!country) return formatMoney(params.value);
          let label = formatMoney(params.value);
          if (country.yoyChange !== null && country.yoyChange !== undefined) {
            const sign = country.yoyChange >= 0 ? '+' : '';
            label += ` ${sign}${country.yoyChange.toFixed(0)}%`;
          }
          return label;
        },
        fontSize: 10,
        color: '#666'
      }
    }]
  };

  // Multi-line chart for top 15 countries funding over time
  const countryColors = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#a855f7', '#eab308', '#64748b', '#dc2626'
  ];

  $: countryFundingTrendOptions = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const year = params[0].name;
        const yearIndex = data.countryFundingByYear.years.indexOf(Number(year));
        let html = `<strong>${year}</strong><br/>`;
        params.sort((a: any, b: any) => b.value - a.value);
        params.forEach((p: any) => {
          if (p.value > 0) {
            const country = data.countryFundingByYear.countries.find(c => c.name === p.seriesName);
            let changeHtml = '';
            if (country && yearIndex > 0) {
              const prevValue = country.funding[yearIndex - 1];
              if (prevValue > 0) {
                const change = ((p.value - prevValue) / prevValue) * 100;
                const sign = change >= 0 ? '+' : '';
                const color = change >= 0 ? '#22c55e' : '#ef4444';
                changeHtml = ` <span style="color:${color}">${sign}${change.toFixed(0)}%</span>`;
              }
            }
            html += `${p.marker} ${p.seriesName}: ${formatMoney(p.value)}${changeHtml}<br/>`;
          }
        });
        return html;
      }
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      data: data.countryFundingByYear.countries.map(c => c.name)
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.countryFundingByYear.years,
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#666',
        formatter: (val: number) => formatMoney(val)
      }
    },
    series: data.countryFundingByYear.countries.map((country, i) => ({
      name: country.name,
      type: 'line',
      data: country.funding,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2 },
      itemStyle: { color: countryColors[i % countryColors.length] },
      emphasis: { focus: 'series' }
    }))
  };

  // Country detail chart options
  $: countryHistoryOptions = data.countryDetail ? {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => `${params[0].name}: ${formatMoney(params[0].value)}`
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.countryDetail.fundingHistory.map(d => d.year),
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#666', formatter: (val: number) => formatMoney(val) }
    },
    series: [{
      data: data.countryDetail.fundingHistory.map(d => d.funding),
      type: 'bar',
      itemStyle: { color: '#3b82f6' }
    }]
  } : {};

  $: countryDonorsOptions = data.countryDetail ? {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#666', formatter: (val: number) => formatMoney(val) }
    },
    yAxis: {
      type: 'category',
      data: data.countryDetail.topDonors.slice(0, 8).map(d => d.donor).reverse(),
      axisLabel: { color: '#666', width: 120, overflow: 'truncate' }
    },
    series: [{
      type: 'bar',
      data: data.countryDetail.topDonors.slice(0, 8).map(d => d.funding).reverse(),
      itemStyle: { color: '#22c55e' }
    }]
  } : {};

  $: countrySectorsOptions = data.countryDetail ? {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${formatMoney(params.value)}`
    },
    series: [{
      type: 'pie',
      radius: ['30%', '70%'],
      data: data.countryDetail.sectors.slice(0, 8).map((s, i) => ({
        value: s.funding,
        name: s.sector,
        itemStyle: {
          color: ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'][i]
        }
      })),
      label: { formatter: '{b}', fontSize: 10 }
    }]
  } : {};

  // Donor detail chart options
  $: donorHistoryOptions = data.donorDetail ? {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = data.donorDetail?.fundingHistory.find(h => h.year == params[0].name);
        return `${params[0].name}<br/>Funding: ${formatMoney(params[0].value)}<br/>Countries: ${d?.countries || 0}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.donorDetail.fundingHistory.map(d => d.year),
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#666', formatter: (val: number) => formatMoney(val) }
    },
    series: [{
      data: data.donorDetail.fundingHistory.map(d => d.funding),
      type: 'bar',
      itemStyle: { color: '#3b82f6' }
    }]
  } : {};

  $: donorFlowsChartOptions = data.donorDetail ? {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const flow = data.donorDetail?.flows.find(f => f.country === params[0].name);
        return `<strong>${params[0].name}</strong><br/>Funding: ${formatMoney(params[0].value)}<br/>Flows: ${flow?.flowCount || 0}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#666', formatter: (val: number) => formatMoney(val) }
    },
    yAxis: {
      type: 'category',
      data: data.donorDetail.flows.slice(0, 15).map(f => f.country).reverse(),
      axisLabel: { color: '#666', width: 120, overflow: 'truncate' }
    },
    series: [{
      type: 'bar',
      data: data.donorDetail.flows.slice(0, 15).map(f => f.funding).reverse(),
      itemStyle: { color: '#22c55e' },
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => formatMoney(params.value),
        fontSize: 10,
        color: '#666'
      }
    }]
  } : {};

  $: donorSectorsOptions = data.donorDetail ? {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${formatMoney(params.value)} (${params.percent}%)`
    },
    series: [{
      type: 'pie',
      radius: ['30%', '70%'],
      data: data.donorDetail.sectors.slice(0, 8).map((s, i) => ({
        value: s.funding,
        name: s.sector,
        itemStyle: {
          color: ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'][i]
        }
      })),
      label: { formatter: '{b}', fontSize: 10 }
    }]
  } : {};

  // Chart click handlers
  function handleCountryChartClick(params: any) {
    const countryName = params.name;
    const country = data.countriesData.find(c => c.name === countryName);
    if (country) {
      selectCountry(country.iso3);
    }
  }

  // Export configurations for download buttons
  $: fundingTrendExportConfig = {
    title: 'Humanitarian Funding Trend Over Time',
    data: data.fundingTrend.map(d => ({
      year: d.year,
      nominalUSD: d.funding,
      real2025USD: d.fundingReal2025,
      inflationMultiplier: d.inflationMultiplier,
      countries: d.countries,
      peopleInNeed: d.peopleInNeed
    })),
    columns: [
      { key: 'year', header: 'Year' },
      { key: 'nominalUSD', header: 'Nominal USD', format: 'currency' },
      { key: 'real2025USD', header: '2025 USD (Inflation Adjusted)', format: 'currency' },
      { key: 'inflationMultiplier', header: 'Inflation Multiplier', format: 'number' },
      { key: 'countries', header: 'Countries Funded', format: 'number' },
      { key: 'peopleInNeed', header: 'People in Need', format: 'number' }
    ],
    sources: [DATA_SOURCES.FTS, DATA_SOURCES.HAPI, DATA_SOURCES.GHO],
    filename: 'funding-trend-over-time',
    additionalInfo: 'Inflation adjusted to 2025 USD using US CPI data'
  };

  $: topCountriesExportConfig = {
    title: `Top 15 Recipient Countries - ${data.selectedYear}`,
    data: data.countriesData.slice(0, 15).map(c => ({
      country: c.name,
      iso3: c.iso3,
      funding: c.funding,
      flowCount: c.flowCount,
      yoyChange: c.yoyChange,
      peopleInNeed: c.peopleInNeed,
      fundingPerPerson: c.fundingPerPerson
    })),
    columns: [
      { key: 'country', header: 'Country' },
      { key: 'iso3', header: 'ISO3' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' },
      { key: 'flowCount', header: 'Flow Count', format: 'number' },
      { key: 'yoyChange', header: 'YoY Change (%)', format: 'number' },
      { key: 'peopleInNeed', header: 'People in Need', format: 'number' },
      { key: 'fundingPerPerson', header: '$/Person', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS, DATA_SOURCES.HAPI],
    filename: `top-15-recipient-countries-${data.selectedYear}`,
    year: data.selectedYear
  };

  $: topDonorsExportConfig = {
    title: `Top Government Donors - ${data.selectedYear}`,
    data: data.topGovernmentDonors.slice(0, 12).map(d => ({
      donor: d.donor,
      category: d.category,
      funding: d.funding,
      prevFunding: d.prevFunding,
      yoyChange: d.yoyChange
    })),
    columns: [
      { key: 'donor', header: 'Donor' },
      { key: 'category', header: 'Category' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' },
      { key: 'prevFunding', header: 'Previous Year (USD)', format: 'currency' },
      { key: 'yoyChange', header: 'YoY Change (%)', format: 'number' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `top-government-donors-${data.selectedYear}`,
    year: data.selectedYear,
    additionalInfo: 'Categories: US = United States, EU = European Union and member states, Other = All other government donors'
  };

  $: countryFundingTrendExportConfig = {
    title: `Top 15 Recipients - Funding Trend (2016-2025)${data.donorFilter !== 'all' ? ` - ${donorFilterLabels[data.donorFilter]}` : ''}`,
    data: data.countryFundingByYear.countries.flatMap(country =>
      data.countryFundingByYear.years.map((year, i) => ({
        country: country.name,
        iso3: country.iso3,
        year: year,
        funding: country.funding[i]
      }))
    ),
    columns: [
      { key: 'country', header: 'Country' },
      { key: 'iso3', header: 'ISO3' },
      { key: 'year', header: 'Year' },
      { key: 'funding', header: 'Funding (2025 USD)', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `top-15-recipients-funding-trend${data.donorFilter !== 'all' ? `-${data.donorFilter}` : ''}`,
    additionalInfo: `All values inflation-adjusted to 2025 USD${data.donorFilter !== 'all' ? `. Filtered by: ${donorFilterLabels[data.donorFilter]}` : ''}`
  };

  $: fundingNeedsTableExportConfig = {
    title: `Funding vs Needs Analysis - ${data.selectedYear}`,
    data: data.countriesData.slice(0, 20).map(c => ({
      country: c.name,
      iso3: c.iso3,
      funding: c.funding,
      yoyChange: c.yoyChange,
      peopleInNeed: c.peopleInNeed,
      fundingPerPerson: c.fundingPerPerson,
      status: getFundingLevel(c.fundingPerPerson).label
    })),
    columns: [
      { key: 'country', header: 'Country' },
      { key: 'iso3', header: 'ISO3' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' },
      { key: 'yoyChange', header: 'YoY Change (%)', format: 'number' },
      { key: 'peopleInNeed', header: 'People in Need', format: 'number' },
      { key: 'fundingPerPerson', header: '$/Person', format: 'currency' },
      { key: 'status', header: 'Funding Status' }
    ],
    sources: [DATA_SOURCES.FTS, DATA_SOURCES.HAPI, DATA_SOURCES.GHO],
    filename: `funding-vs-needs-${data.selectedYear}`,
    year: data.selectedYear,
    additionalInfo: 'Status: High (>=$150/person), Medium ($80-149/person), Low (<$80/person)'
  };

  $: donorTableExportConfig = {
    title: `Top 15 Donors - ${data.selectedYear}`,
    data: data.donorData.slice(0, 15).map(d => ({
      donor: d.donor,
      type: d.donorType,
      funding: d.funding,
      countriesFunded: d.countriesFunded
    })),
    columns: [
      { key: 'donor', header: 'Donor' },
      { key: 'type', header: 'Type' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' },
      { key: 'countriesFunded', header: 'Countries Funded', format: 'number' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `top-15-donors-${data.selectedYear}`,
    year: data.selectedYear
  };

  $: sectorExportConfig = {
    title: `Sector Funding Breakdown - ${data.selectedYear}`,
    data: data.sectorData.slice(0, 10).map(s => ({
      sector: s.sector,
      funding: s.funding
    })),
    columns: [
      { key: 'sector', header: 'Sector' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `sector-breakdown-${data.selectedYear}`,
    year: data.selectedYear
  };

  // Country detail export configs
  $: countryHistoryExportConfig = data.countryDetail ? {
    title: `${data.countryDetail.name} - Funding History`,
    data: data.countryDetail.fundingHistory.map(d => ({
      year: d.year,
      funding: d.funding
    })),
    columns: [
      { key: 'year', header: 'Year' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `${data.countryDetail.iso3}-funding-history`
  } : { title: '', data: [], columns: [], sources: [], filename: '' };

  $: countryDonorsExportConfig = data.countryDetail ? {
    title: `${data.countryDetail.name} - Top Donors (${data.selectedYear})`,
    data: data.countryDetail.topDonors.slice(0, 8).map(d => ({
      donor: d.donor,
      funding: d.funding
    })),
    columns: [
      { key: 'donor', header: 'Donor' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `${data.countryDetail.iso3}-top-donors-${data.selectedYear}`,
    year: data.selectedYear
  } : { title: '', data: [], columns: [], sources: [], filename: '' };

  $: countrySectorsExportConfig = data.countryDetail ? {
    title: `${data.countryDetail.name} - Sector Breakdown (${data.selectedYear})`,
    data: data.countryDetail.sectors.slice(0, 8).map(s => ({
      sector: s.sector,
      funding: s.funding
    })),
    columns: [
      { key: 'sector', header: 'Sector' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `${data.countryDetail.iso3}-sector-breakdown-${data.selectedYear}`,
    year: data.selectedYear
  } : { title: '', data: [], columns: [], sources: [], filename: '' };

  // Donor detail export configs
  $: donorHistoryExportConfig = data.donorDetail ? {
    title: `${data.donorDetail.name} - Funding History`,
    data: data.donorDetail.fundingHistory.map(d => ({
      year: d.year,
      funding: d.funding,
      countries: d.countries
    })),
    columns: [
      { key: 'year', header: 'Year' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' },
      { key: 'countries', header: 'Countries Funded', format: 'number' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `${data.donorDetail.name.replace(/[^a-zA-Z0-9]/g, '-')}-funding-history`
  } : { title: '', data: [], columns: [], sources: [], filename: '' };

  $: donorFlowsExportConfig = data.donorDetail ? {
    title: `${data.donorDetail.name} - Funding Flows to Countries (${data.selectedYear})`,
    data: data.donorDetail.flows.map(f => ({
      country: f.country,
      iso3: f.iso3,
      funding: f.funding,
      flowCount: f.flowCount
    })),
    columns: [
      { key: 'country', header: 'Recipient Country' },
      { key: 'iso3', header: 'ISO3' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' },
      { key: 'flowCount', header: 'Flow Count', format: 'number' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `${data.donorDetail.name.replace(/[^a-zA-Z0-9]/g, '-')}-flows-${data.selectedYear}`,
    year: data.selectedYear
  } : { title: '', data: [], columns: [], sources: [], filename: '' };

  $: donorSectorsExportConfig = data.donorDetail ? {
    title: `${data.donorDetail.name} - Sector Breakdown (${data.selectedYear})`,
    data: data.donorDetail.sectors.slice(0, 8).map(s => ({
      sector: s.sector,
      funding: s.funding
    })),
    columns: [
      { key: 'sector', header: 'Sector' },
      { key: 'funding', header: 'Funding (USD)', format: 'currency' }
    ],
    sources: [DATA_SOURCES.FTS],
    filename: `${data.donorDetail.name.replace(/[^a-zA-Z0-9]/g, '-')}-sectors-${data.selectedYear}`,
    year: data.selectedYear
  } : { title: '', data: [], columns: [], sources: [], filename: '' };
</script>

<svelte:head>
  <title>Humanitarian Funding Dashboard - {data.selectedYear}</title>
</svelte:head>

<div class="dashboard">
  <!-- Header & Filters -->
  <header class="dashboard-header">
    <div class="header-left">
      <a href="https://marketimpact.org" target="_blank" rel="noopener noreferrer" class="logo-link">
        <Logo className="header-logo" />
      </a>
      <div class="header-titles">
        <h1>Humanitarian Funding Dashboard</h1>
        <p class="subtitle">FTS Funding Flows vs HAPI Humanitarian Needs</p>
      </div>
    </div>
    <div class="filters">
      <div class="filter-group">
        <label for="year-select">Year</label>
        <select id="year-select" value={data.selectedYear} on:change={handleYearChange}>
          {#each data.availableYears as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
      <div class="filter-group">
        <label for="country-select">Country</label>
        <select id="country-select" value={data.selectedCountry || ''} on:change={handleCountryChange}>
          <option value="">All Countries</option>
          {#each data.countriesList as country}
            <option value={country.iso3}>{country.name}</option>
          {/each}
        </select>
      </div>
    </div>
  </header>

  <!-- Summary KPIs -->
  <div class="kpi-row">
    <div class="kpi-card">
      <span class="kpi-value">{formatMoney(data.summary.totalFunding)}</span>
      <span class="kpi-label">Total Funding ({data.selectedYear})</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{formatNumber(data.summary.totalPeopleInNeed)}</span>
      <span class="kpi-label">People in Need</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">
        {data.summary.totalPeopleInNeed > 0
          ? `$${(data.summary.totalFunding / data.summary.totalPeopleInNeed).toFixed(0)}`
          : 'N/A'}
      </span>
      <span class="kpi-label">Avg $/Person</span>
    </div>
    <div class="kpi-card">
      <span class="kpi-value">{data.summary.countriesWithFunding}</span>
      <span class="kpi-label">Countries with Funding</span>
    </div>
  </div>

  {#if data.countryDetail}
    <!-- Country Detail View -->
    <div class="country-detail-panel">
      <div class="panel-header">
        <h2>{data.countryDetail.name}</h2>
        <button class="close-btn" on:click={clearCountry}>Back to Overview</button>
      </div>

      <div class="country-kpis">
        <div class="kpi-card small">
          <span class="kpi-value">{formatMoney(data.countryDetail.currentFunding)}</span>
          <span class="kpi-label">{data.selectedYear} Funding</span>
        </div>
        <div class="kpi-card small">
          <span class="kpi-value">{data.countryDetail.peopleInNeed > 0 ? formatNumber(data.countryDetail.peopleInNeed) : 'N/A'}</span>
          <span class="kpi-label">People in Need</span>
        </div>
        <div class="kpi-card small">
          <span class="kpi-value">
            {data.countryDetail.peopleInNeed > 0
              ? `$${(data.countryDetail.currentFunding / data.countryDetail.peopleInNeed).toFixed(0)}`
              : 'N/A'}
          </span>
          <span class="kpi-label">$/Person</span>
        </div>
      </div>

      <div class="charts-grid-3">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Funding History</h3>
            <DownloadButton config={countryHistoryExportConfig} />
          </div>
          <Chart options={countryHistoryOptions} height="250px" />
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Top Donors ({data.selectedYear})</h3>
            <DownloadButton config={countryDonorsExportConfig} />
          </div>
          <Chart options={countryDonorsOptions} height="250px" />
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Sector Breakdown</h3>
            <DownloadButton config={countrySectorsExportConfig} />
          </div>
          <Chart options={countrySectorsOptions} height="250px" />
        </div>
      </div>
    </div>
  {:else if data.donorDetail}
    <!-- Donor Detail View -->
    <div class="donor-detail-panel">
      <div class="panel-header">
        <div>
          <h2>{data.donorDetail.name}</h2>
          <span class="donor-type-badge">{data.donorDetail.type}</span>
        </div>
        <button class="close-btn" on:click={clearDonor}>Back to Overview</button>
      </div>

      <div class="country-kpis">
        <div class="kpi-card small">
          <span class="kpi-value">{formatMoney(data.donorDetail.currentFunding)}</span>
          <span class="kpi-label">{data.selectedYear} Funding</span>
        </div>
        <div class="kpi-card small">
          <span class="kpi-value">{data.donorDetail.countriesFunded}</span>
          <span class="kpi-label">Countries Funded</span>
        </div>
        <div class="kpi-card small">
          <span class="kpi-value">{data.donorDetail.sectors.length}</span>
          <span class="kpi-label">Sectors Supported</span>
        </div>
      </div>

      <div class="charts-grid-3">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Funding History</h3>
            <DownloadButton config={donorHistoryExportConfig} />
          </div>
          <Chart options={donorHistoryOptions} height="250px" />
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Top Recipients ({data.selectedYear})</h3>
            <DownloadButton config={donorFlowsExportConfig} />
          </div>
          <Chart options={donorFlowsChartOptions} height="250px" />
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Sector Breakdown</h3>
            <DownloadButton config={donorSectorsExportConfig} />
          </div>
          <Chart options={donorSectorsOptions} height="250px" />
        </div>
      </div>

      <!-- Flows Table -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>All Funding Flows ({data.selectedYear})</h3>
          <DownloadButton config={donorFlowsExportConfig} />
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Recipient Country</th>
                <th class="right">Funding</th>
                <th class="right">Flows</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each data.donorDetail.flows as flow}
                <tr>
                  <td>
                    <strong>{flow.country}</strong>
                    <span class="iso-code">{flow.iso3}</span>
                  </td>
                  <td class="right">{formatMoney(flow.funding)}</td>
                  <td class="right">{flow.flowCount}</td>
                  <td>
                    <button class="drill-btn" on:click={() => selectCountry(flow.iso3)}>
                      View Country
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {:else}
    <!-- Main Dashboard View - Two column layout -->
    <div class="main-charts-layout">
      <!-- Left Column: Stacked charts -->
      <div class="left-column">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Funding Trend Over Time</h3>
            <DownloadButton config={fundingTrendExportConfig} />
          </div>
          <p class="chart-hint">Click on any year to view detailed data for that year</p>
          <Chart options={fundingTrendOptions} height="280px" onChartClick={handleYearChartClick} />
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Top 15 Recipient Countries ({data.selectedYear}){data.donorFilter !== 'all' ? ` - ${donorFilterLabels[data.donorFilter]}` : ''}</h3>
            <DownloadButton config={topCountriesExportConfig} />
          </div>
          <div class="filter-buttons">
            {#each Object.entries(donorFilterLabels) as [filter, label]}
              <button
                class="filter-btn"
                class:active={data.donorFilter === filter}
                on:click={() => handleDonorFilterChange(filter)}
              >
                {label}
              </button>
            {/each}
          </div>
          <p class="chart-hint">Click a country to see detailed breakdown</p>
          <Chart options={topCountriesOptions} height="400px" onChartClick={handleCountryChartClick} />
        </div>
      </div>
      <!-- Right Column: Tall donors chart -->
      <div class="right-column">
        <div class="chart-card full-height">
          <div class="chart-header">
            <h3>Top Government Donors ({data.selectedYear})</h3>
            <DownloadButton config={topDonorsExportConfig} />
          </div>
          <p class="chart-hint">🔵 US | 🟡 EU | ⚫ Other. Click US/EU for breakdown. Shows YoY % change.</p>
          <Chart options={topGovernmentDonorsOptions} height="680px" onChartClick={handleDonorChartClick} />
        </div>
      </div>
    </div>

    <!-- Country Funding Trends (Multi-line) -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>Top 15 Recipients - Funding Trend (2016-2025, Inflation Adjusted to 2025 USD)</h3>
        <div class="chart-controls">
          <select class="donor-filter-select" value={data.donorFilter} on:change={handleDonorFilterChange}>
            <option value="all">All Donors</option>
            <option value="us">US Government</option>
            <option value="eu_echo">EU + Member States</option>
            <option value="gulf">Gulf States</option>
            <option value="oecd">OECD Members</option>
          </select>
          <DownloadButton config={countryFundingTrendExportConfig} />
        </div>
      </div>
      <p class="chart-hint">
        {#if data.donorFilter !== 'all'}
          <strong>Filtered by: {donorFilterLabels[data.donorFilter]}</strong> |
        {/if}
        All values adjusted to 2025 USD. Click legend to show/hide countries.
      </p>
      <Chart options={countryFundingTrendOptions} height="400px" />
    </div>

    <!-- Funding vs Needs Table -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>Funding vs Needs Analysis ({data.selectedYear})</h3>
        <DownloadButton config={fundingNeedsTableExportConfig} />
      </div>
      <p class="chart-hint">Countries color-coded by funding adequacy per person in need. YoY = Year-over-Year change.</p>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th class="right">Funding</th>
              <th class="right">YoY</th>
              <th class="right">People in Need</th>
              <th class="right">$/Person</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.countriesData.slice(0, 20) as country}
              {@const level = getFundingLevel(country.fundingPerPerson)}
              {@const yoyColor = country.yoyChange !== null ? (country.yoyChange >= 0 ? '#22c55e' : '#ef4444') : '#666'}
              <tr>
                <td>
                  <strong>{country.name}</strong>
                  <span class="iso-code">{country.iso3}</span>
                </td>
                <td class="right">{formatMoney(country.funding)}</td>
                <td class="right" style="color: {yoyColor}">
                  {#if country.yoyChange !== null}
                    {country.yoyChange >= 0 ? '+' : ''}{country.yoyChange.toFixed(0)}%
                  {:else}
                    N/A
                  {/if}
                </td>
                <td class="right">{country.peopleInNeed ? formatNumber(country.peopleInNeed) : 'N/A'}</td>
                <td class="right">
                  {country.fundingPerPerson ? `$${country.fundingPerPerson.toFixed(0)}` : 'N/A'}
                </td>
                <td>
                  <span class="badge {level.class}">{level.label}</span>
                </td>
                <td>
                  <button class="drill-btn" on:click={() => selectCountry(country.iso3)}>
                    View Details
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top Donors -->
    <div class="chart-card">
      <div class="chart-header">
        <h3>Top 15 Donors ({data.selectedYear})</h3>
        <DownloadButton config={donorTableExportConfig} />
      </div>
      <p class="chart-hint">Click "View Flows" to see funding breakdown by recipient country</p>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Type</th>
              <th class="right">Funding</th>
              <th class="right">Countries</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.donorData.slice(0, 15) as donor}
              <tr>
                <td><strong>{donor.donor}</strong></td>
                <td><span class="badge badge-neutral">{donor.donorType}</span></td>
                <td class="right">{formatMoney(donor.funding)}</td>
                <td class="right">{donor.countriesFunded}</td>
                <td>
                  <button class="drill-btn" on:click={() => selectDonor(donor.donor)}>
                    View Flows
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Breakdown Modal -->
  {#if showBreakdownModal}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions a11y_interactive_supports_focus -->
    <div class="modal-overlay" on:click={closeBreakdownModal} role="dialog" aria-modal="true">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
      <div class="modal-content" on:click|stopPropagation role="document">
        <div class="modal-header">
          <h2>
            {#if breakdownType === 'US'}
              🔵 United States - Agency Breakdown ({data.selectedYear})
            {:else}
              🟡 EU Member States - Country Breakdown ({data.selectedYear})
            {/if}
          </h2>
          <button class="modal-close" on:click={closeBreakdownModal} aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body">
          {#if breakdownType === 'US'}
            <p class="modal-subtitle">
              Total: {formatMoney(data.usAgenciesBreakdown.reduce((sum, d) => sum + d.funding, 0))}
              from {data.usAgenciesBreakdown.length} agencies
            </p>
            <Chart options={usBreakdownOptions} height="{Math.max(300, data.usAgenciesBreakdown.slice(0, 15).length * 35)}px" />
          {:else if breakdownType === 'EU'}
            <p class="modal-subtitle">
              Total: {formatMoney(data.euMemberStatesBreakdown.reduce((sum, d) => sum + d.funding, 0))}
              from {data.euMemberStatesBreakdown.length} member states
            </p>
            <Chart options={euBreakdownOptions} height="{Math.max(400, data.euMemberStatesBreakdown.slice(0, 20).length * 30)}px" />
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <footer>
    <p>
      Data sources: <a href="https://fts.unocha.org" target="_blank">UN OCHA FTS</a> |
      <a href="https://hapi.humdata.org" target="_blank">HDX HAPI</a>
    </p>
  </footer>
</div>

<style>
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .logo-link {
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .logo-link :global(.header-logo) {
    height: 40px;
    width: auto;
  }

  .header-titles h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
  }

  .subtitle {
    color: var(--color-text-muted, #666);
    margin: 0;
  }

  .filters {
    display: flex;
    gap: 1rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted, #666);
    text-transform: uppercase;
  }

  .filter-group select {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    min-width: 150px;
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .kpi-card {
    background: var(--color-card, #fff);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    padding: 1.25rem;
    text-align: center;
  }

  .kpi-card.small {
    padding: 1rem;
  }

  .kpi-value {
    display: block;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-primary, #3b82f6);
  }

  .kpi-card.small .kpi-value {
    font-size: 1.5rem;
  }

  .kpi-label {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-muted, #666);
    margin-top: 0.25rem;
  }

  .charts-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .charts-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .main-charts-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .left-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .left-column .chart-card {
    margin-bottom: 0;
  }

  .right-column .chart-card.full-height {
    height: 100%;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
  }

  .chart-card {
    background: var(--color-card, #fff);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .charts-grid-2 .chart-card,
  .charts-grid-3 .chart-card {
    margin-bottom: 0;
  }

  .chart-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .chart-header h3 {
    margin: 0;
    flex: 1;
  }

  .chart-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .donor-filter-select {
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    background: var(--color-card, #fff);
    cursor: pointer;
  }

  .donor-filter-select:hover {
    border-color: var(--color-primary, #3b82f6);
  }

  .chart-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    margin: 0 0 0.5rem 0;
  }

  .filter-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    background: var(--color-card, #fff);
    color: var(--color-text-muted, #666);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-btn:hover {
    border-color: var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .filter-btn.active {
    background: var(--color-primary, #3b82f6);
    border-color: var(--color-primary, #3b82f6);
    color: white;
  }

  .chart-card.wide {
    grid-column: span 1;
  }

  .country-detail-panel {
    background: var(--color-card, #fff);
    border: 2px solid var(--color-primary, #3b82f6);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .donor-detail-panel {
    background: var(--color-card, #fff);
    border: 2px solid #22c55e;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .donor-type-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #6b7280;
    margin-left: 0.5rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .close-btn {
    background: var(--color-bg, #f3f4f6);
    border: 1px solid var(--color-border, #ddd);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .close-btn:hover {
    background: var(--color-border, #e5e7eb);
  }

  .country-kpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  th {
    font-weight: 600;
    color: var(--color-text-muted, #666);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .right {
    text-align: right;
  }

  .iso-code {
    color: var(--color-text-muted, #999);
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-success {
    background: #dcfce7;
    color: #166534;
  }

  .badge-warning {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-danger {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-neutral {
    background: #f3f4f6;
    color: #4b5563;
  }

  .drill-btn {
    background: transparent;
    border: 1px solid var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .drill-btn:hover {
    background: var(--color-primary, #3b82f6);
    color: white;
  }

  footer {
    margin-top: 2rem;
    padding: 1rem 0;
    border-top: 1px solid var(--color-border, #e5e7eb);
    text-align: center;
    color: var(--color-text-muted, #666);
    font-size: 0.875rem;
  }

  footer a {
    color: var(--color-primary, #3b82f6);
  }

  @media (max-width: 1024px) {
    .charts-grid-2, .charts-grid-3, .main-charts-layout {
      grid-template-columns: 1fr;
    }

    .main-charts-layout {
      display: flex;
      flex-direction: column;
    }

    .right-column .chart-card.full-height {
      height: auto;
    }

    .kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }

    .country-kpis {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .dashboard-header {
      flex-direction: column;
    }

    .header-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .logo-link :global(.header-logo) {
      height: 32px;
    }

    .header-titles h1 {
      font-size: 1.25rem;
    }

    .filters {
      width: 100%;
    }

    .filter-group {
      flex: 1;
    }

    .kpi-row {
      grid-template-columns: 1fr;
    }
  }

  /* Modal styles */
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
    background: var(--color-card, #fff);
    border-radius: 12px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
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
    color: var(--color-text, #333);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-subtitle {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted, #666);
    font-size: 0.875rem;
  }
</style>
