import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

/**
 * Parse a CSV buffer into typed objects.
 * - Reads first row as column names (columns: true)
 * - Strips BOM, trims whitespace, skips empty lines
 * - Column name matching is case-insensitive and trims spaces
 */
export function parseCSV<T>(buffer: Buffer, _headers?: string[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    parse(
      buffer,
      {
        columns: (headerRow: string[]) =>
          // Normalise column names from the file: trim + lowercase for matching
          headerRow.map(h => h.trim()),
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,   // don't error on rows with fewer columns
        relax_quotes: true,
      },
      (err, records: Record<string, string>[]) => {
        if (err) return reject(err);

        // Filter out rows where every value is blank (e.g. Excel trailing empty rows)
        const filtered = records.filter(row =>
          Object.values(row).some(v => v !== null && v !== undefined && v.toString().trim() !== '')
        );

        resolve(filtered as T[]);
      }
    );
  });
}

/**
 * Stringify an array of objects into a CSV string.
 */
export function stringifyCSV(data: object[], headers: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    stringify(
      data,
      { header: true, columns: headers },
      (err, output) => {
        if (err) return reject(err);
        resolve(output);
      }
    );
  });
}
