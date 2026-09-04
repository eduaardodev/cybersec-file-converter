import { BaseConverter, ConversionResult } from '../base-converter';
import { AppError } from '../../errors/app-error';

// Helper to parse CSV lines with quoted values
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter (, or ;)
  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';

  function parseLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const cleanHeader = header.replace(/^["']|["']$/g, '');
      obj[cleanHeader || `col_${idx + 1}`] = rowValues[idx] !== undefined ? rowValues[idx] : '';
    });
    rows.push(obj);
  }

  return rows;
}

export class CsvToJsonConverter extends BaseConverter {
  readonly name = 'CSV to JSON Converter';
  readonly sourceFormat = 'csv';
  readonly targetFormat = 'json';

  public async convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    try {
      const text = inputBuffer.toString('utf-8');
      const records = parseCSV(text);
      const jsonString = JSON.stringify(records, null, 2);
      const buffer = Buffer.from(jsonString, 'utf-8');

      return {
        buffer,
        mimeType: 'application/json',
        outputExtension: 'json',
        suggestedFilename: `${this.getOutputBasename(originalFilename)}.json`,
      };
    } catch (err: any) {
      throw AppError.conversionFailed(`CSV to JSON conversion error: ${err.message}`);
    }
  }
}

export class JsonToCsvConverter extends BaseConverter {
  readonly name = 'JSON to CSV Converter';
  readonly sourceFormat = 'json';
  readonly targetFormat = 'csv';

  public async convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    try {
      const text = inputBuffer.toString('utf-8');
      const parsed = JSON.parse(text);
      const arrayData: any[] = Array.isArray(parsed) ? parsed : [parsed];

      if (arrayData.length === 0) {
        return {
          buffer: Buffer.from('', 'utf-8'),
          mimeType: 'text/csv',
          outputExtension: 'csv',
          suggestedFilename: `${this.getOutputBasename(originalFilename)}.csv`,
        };
      }

      // Collect all unique keys
      const headers = Array.from(
        new Set(
          arrayData.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : ['value']))
        )
      );

      const escapeCSVValue = (val: any): string => {
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headerRow = headers.map(escapeCSVValue).join(',');
      const rows = arrayData.map((item) => {
        if (typeof item !== 'object' || item === null) {
          return escapeCSVValue(item);
        }
        return headers.map((h) => escapeCSVValue(item[h])).join(',');
      });

      const csvContent = [headerRow, ...rows].join('\n');
      return {
        buffer: Buffer.from(csvContent, 'utf-8'),
        mimeType: 'text/csv',
        outputExtension: 'csv',
        suggestedFilename: `${this.getOutputBasename(originalFilename)}.csv`,
      };
    } catch (err: any) {
      throw AppError.conversionFailed(`JSON to CSV conversion error: ${err.message}`);
    }
  }
}
