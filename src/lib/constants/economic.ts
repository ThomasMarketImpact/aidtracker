/**
 * Economic and humanitarian data constants
 */

/**
 * US CPI annual averages (BLS CPI-U) - used to convert to 2025 USD
 * Source: Bureau of Labor Statistics, with 2024-2025 estimated
 */
export const CPI_DATA: Record<number, number> = {
  2016: 240.0,
  2017: 245.1,
  2018: 251.1,
  2019: 255.7,
  2020: 258.8,
  2021: 271.0,
  2022: 292.7,
  2023: 304.7,
  2024: 314.5,  // Estimated
  2025: 320.8,  // Estimated (~2% inflation)
};

/**
 * Global People in Need by year - from OCHA Global Humanitarian Overview reports
 * Source: https://humanitarianaction.info / GHO annual reports
 */
export const GHO_PEOPLE_IN_NEED: Record<number, number> = {
  2016: 130_900_000,   // GHO 2016
  2017: 141_100_000,   // GHO 2017
  2018: 135_700_000,   // GHO 2018
  2019: 131_700_000,   // GHO 2019
  2020: 167_600_000,   // GHO 2020 (COVID-19 impact)
  2021: 235_000_000,   // GHO 2021
  2022: 274_000_000,   // GHO 2022
  2023: 339_000_000,   // GHO 2023
  2024: 300_000_000,   // GHO 2024
  2025: 305_000_000,   // GHO 2025
};

/**
 * GHO 2024 People in Need by country (millions) - for countries missing from HAPI
 */
export const GHO_PIN_BY_COUNTRY: Record<string, number> = {
  'PSE': 3_000_000,      // Occupied Palestinian Territory
  'LBN': 3_000_000,      // Lebanon
  'HTI': 5_500_000,      // Haiti
  'MMR': 18_600_000,     // Myanmar
  'PAK': 10_000_000,     // Pakistan
  'BGD': 2_000_000,      // Bangladesh (Rohingya crisis)
  'MOZ': 3_000_000,      // Mozambique
  'BFA': 6_300_000,      // Burkina Faso
  'MLI': 8_800_000,      // Mali
  'NER': 4_300_000,      // Niger
  'CMR': 4_700_000,      // Cameroon
  'CAF': 3_400_000,      // Central African Republic
  'VEN': 7_700_000,      // Venezuela
  'COL': 8_300_000,      // Colombia
  'ZWE': 7_700_000,      // Zimbabwe
  'IRQ': 2_500_000,      // Iraq
};

/**
 * Calculate multiplier to convert past year's USD to 2025 USD
 * @param year - The year to convert from
 * @returns Multiplier to apply to convert to 2025 USD
 */
export function getInflationMultiplier(year: number): number {
  const baseCpi = CPI_DATA[2025] || 320.8;
  const yearCpi = CPI_DATA[year] || baseCpi;
  return baseCpi / yearCpi;
}
