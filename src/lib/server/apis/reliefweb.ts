/**
 * ReliefWeb API client for humanitarian crisis updates
 * API Documentation: https://apidoc.reliefweb.int/
 */

const BASE_URL = 'https://api.reliefweb.int/v1';
const APP_NAME = 'aidtracker-dashboard';

export interface ReliefWebReport {
  id: number;
  title: string;
  date: string;
  url: string;
  source: string;
  country: string[];
  format: string;
  theme?: string[];
}

export interface ReliefWebDisaster {
  id: number;
  name: string;
  glide: string;
  status: string;
  date: string;
  type: string[];
  country: string[];
  url: string;
}

export interface ReliefWebCountry {
  id: number;
  name: string;
  iso3: string;
  status: string;
  description?: string;
}

interface ReliefWebResponse<T> {
  totalCount: number;
  count: number;
  data: T[];
}

/**
 * Fetch latest reports for a country or globally
 */
export async function getLatestReports(
  countryIso3?: string,
  limit: number = 10
): Promise<ReliefWebReport[]> {
  try {
    const params = new URLSearchParams({
      appname: APP_NAME,
      limit: limit.toString(),
      preset: 'latest',
      'fields[include][]': 'title,date.created,url_alias,source.name,country.name,format.name,theme.name',
    });

    if (countryIso3) {
      params.append('filter[field]', 'country.iso3');
      params.append('filter[value]', countryIso3);
    }

    const response = await fetch(`${BASE_URL}/reports?${params.toString()}`);

    if (!response.ok) {
      console.error('ReliefWeb API error:', response.status);
      return [];
    }

    const json = await response.json();
    const data = json.data || [];

    return data.map((item: any) => ({
      id: item.id,
      title: item.fields?.title || 'Untitled',
      date: item.fields?.date?.created || '',
      url: `https://reliefweb.int${item.fields?.url_alias || `/node/${item.id}`}`,
      source: item.fields?.source?.[0]?.name || 'Unknown',
      country: item.fields?.country?.map((c: any) => c.name) || [],
      format: item.fields?.format?.[0]?.name || 'Report',
      theme: item.fields?.theme?.map((t: any) => t.name) || [],
    }));
  } catch (error) {
    console.error('Failed to fetch ReliefWeb reports:', error);
    return [];
  }
}

/**
 * Fetch active disasters
 * Uses POST method to support complex filter conditions
 */
export async function getActiveDisasters(
  countryIso3?: string,
  limit: number = 20
): Promise<ReliefWebDisaster[]> {
  try {
    // Build filter conditions - ReliefWeb API requires POST for multiple filters
    const filterConditions: any[] = [
      { field: 'status', value: 'ongoing' }
    ];

    if (countryIso3) {
      filterConditions.push({ field: 'country.iso3', value: countryIso3 });
    }

    const requestBody = {
      appname: APP_NAME,
      limit: limit,
      filter: {
        operator: 'AND',
        conditions: filterConditions
      },
      fields: {
        include: ['name', 'glide', 'status', 'date.event', 'type.name', 'country.name', 'country.iso3', 'url_alias']
      },
      sort: ['date.event:desc']
    };

    const response = await fetch(`${BASE_URL}/disasters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('ReliefWeb disasters API error:', response.status);
      return [];
    }

    const json = await response.json();
    const data = json.data || [];

    return data.map((item: any) => ({
      id: item.id,
      name: item.fields?.name || 'Unknown Disaster',
      glide: item.fields?.glide || '',
      status: item.fields?.status || 'unknown',
      date: item.fields?.date?.event || '',
      type: item.fields?.type?.map((t: any) => t.name) || [],
      country: item.fields?.country?.map((c: any) => c.name) || [],
      url: `https://reliefweb.int${item.fields?.url_alias || `/disaster/${item.id}`}`,
    }));
  } catch (error) {
    console.error('Failed to fetch ReliefWeb disasters:', error);
    return [];
  }
}

/**
 * Get crisis country information
 */
export async function getCountryInfo(countryIso3: string): Promise<ReliefWebCountry | null> {
  try {
    const params = new URLSearchParams({
      appname: APP_NAME,
      'filter[field]': 'iso3',
      'filter[value]': countryIso3,
      'fields[include][]': 'name,iso3,status,description',
    });

    const response = await fetch(`${BASE_URL}/countries?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const data = json.data?.[0];

    if (!data) return null;

    return {
      id: data.id,
      name: data.fields?.name || '',
      iso3: data.fields?.iso3 || countryIso3,
      status: data.fields?.status || 'unknown',
      description: data.fields?.description || '',
    };
  } catch (error) {
    console.error('Failed to fetch ReliefWeb country info:', error);
    return null;
  }
}

/**
 * Search reports by keyword
 */
export async function searchReports(
  query: string,
  limit: number = 20
): Promise<ReliefWebReport[]> {
  try {
    const params = new URLSearchParams({
      appname: APP_NAME,
      limit: limit.toString(),
      query: query,
      'fields[include][]': 'title,date.created,url_alias,source.name,country.name,format.name',
      'sort[]': 'date.created:desc',
    });

    const response = await fetch(`${BASE_URL}/reports?${params.toString()}`);

    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    const data = json.data || [];

    return data.map((item: any) => ({
      id: item.id,
      title: item.fields?.title || 'Untitled',
      date: item.fields?.date?.created || '',
      url: `https://reliefweb.int${item.fields?.url_alias || `/node/${item.id}`}`,
      source: item.fields?.source?.[0]?.name || 'Unknown',
      country: item.fields?.country?.map((c: any) => c.name) || [],
      format: item.fields?.format?.[0]?.name || 'Report',
    }));
  } catch (error) {
    console.error('Failed to search ReliefWeb reports:', error);
    return [];
  }
}

/**
 * Get headline figures for a crisis
 */
export async function getHeadlineFigures(countryIso3: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      appname: APP_NAME,
      limit: '20',
      'filter[field]': 'country.iso3',
      'filter[value]': countryIso3,
      'fields[include][]': 'figure,name,source,date,url',
      'sort[]': 'date:desc',
    });

    // Note: ReliefWeb doesn't have a dedicated figures endpoint in v1
    // This would need to parse from reports or use a different approach
    return [];
  } catch (error) {
    console.error('Failed to fetch headline figures:', error);
    return [];
  }
}
