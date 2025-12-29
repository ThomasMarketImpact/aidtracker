import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  header: string;
  format?: 'currency' | 'number' | 'percent' | 'text';
}

export interface ExportConfig {
  title: string;
  data: Record<string, any>[];
  columns: ExportColumn[];
  sources: string[];
  filename: string;
  year?: number;
  additionalInfo?: string;
}

function formatValue(value: any, format?: ExportColumn['format']): any {
  if (value === null || value === undefined) return 'N/A';

  switch (format) {
    case 'currency':
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    case 'number':
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    case 'percent':
      return typeof value === 'number' ? value / 100 : parseFloat(value) / 100 || 0;
    default:
      return value;
  }
}

export function exportToExcel(config: ExportConfig): void {
  const { title, data, columns, sources, filename, year, additionalInfo } = config;

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();

  // Build the worksheet data with headers and source info
  const wsData: any[][] = [];

  // Title row
  wsData.push([title]);
  wsData.push([]); // Empty row

  // Metadata
  if (year) {
    wsData.push(['Year:', year]);
  }
  wsData.push(['Generated:', new Date().toISOString().split('T')[0]]);
  if (additionalInfo) {
    wsData.push(['Notes:', additionalInfo]);
  }
  wsData.push([]); // Empty row

  // Sources section
  wsData.push(['DATA SOURCES:']);
  sources.forEach(source => {
    wsData.push(['', source]);
  });
  wsData.push([]); // Empty row

  // Column headers
  const headerRow = columns.map(col => col.header);
  wsData.push(headerRow);

  // Data rows
  data.forEach(row => {
    const dataRow = columns.map(col => {
      const value = row[col.key];
      return formatValue(value, col.format);
    });
    wsData.push(dataRow);
  });

  // Create worksheet from data
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = columns.map(col => {
    const maxLength = Math.max(
      col.header.length,
      ...data.map(row => String(row[col.key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 12), 40) };
  });
  ws['!cols'] = colWidths;

  // Apply number formats to data cells
  const headerRowIndex = wsData.findIndex(row => row.length === columns.length && row[0] === columns[0].header);
  const dataStartRow = headerRowIndex + 2; // 1-indexed in XLSX

  columns.forEach((col, colIdx) => {
    if (col.format === 'currency' || col.format === 'number' || col.format === 'percent') {
      for (let rowIdx = dataStartRow; rowIdx <= wsData.length; rowIdx++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx - 1, c: colIdx });
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          if (col.format === 'currency') {
            ws[cellRef].z = '$#,##0';
          } else if (col.format === 'percent') {
            ws[cellRef].z = '0.0%';
          } else {
            ws[cellRef].z = '#,##0';
          }
        }
      }
    }
  });

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Generate and download file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Pre-configured export functions for each visualization
export const DATA_SOURCES = {
  FTS: 'UN OCHA Financial Tracking Service (FTS) - https://fts.unocha.org',
  HAPI: 'Humanitarian Data Exchange HAPI - https://hapi.humdata.org',
  GHO: 'Global Humanitarian Overview (GHO) - https://humanitarianaction.info'
};
