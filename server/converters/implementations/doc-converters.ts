import { marked } from 'marked';
import PDFDocument from 'pdfkit';
import { BaseConverter, ConversionResult } from '../base-converter';
import { AppError } from '../../errors/app-error';

export class MarkdownToHtmlConverter extends BaseConverter {
  readonly name = 'Markdown to HTML Converter';
  readonly sourceFormat = 'md';
  readonly targetFormat = 'html';

  public async convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    try {
      const markdown = inputBuffer.toString('utf-8');
      const bodyHtml = await marked.parse(markdown);

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${originalFilename}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
    h1, h2, h3 { color: #111; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #f7f7f8; padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid #e5e7eb; }
    blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 16px; color: #555; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

      return {
        buffer: Buffer.from(fullHtml, 'utf-8'),
        mimeType: 'text/html',
        outputExtension: 'html',
        suggestedFilename: `${this.getOutputBasename(originalFilename)}.html`,
      };
    } catch (err: any) {
      throw AppError.conversionFailed(`Markdown to HTML conversion error: ${err.message}`);
    }
  }
}

export class TxtToHtmlConverter extends BaseConverter {
  readonly name = 'TXT to HTML Converter';
  readonly sourceFormat = 'txt';
  readonly targetFormat = 'html';

  public async convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    try {
      const text = inputBuffer.toString('utf-8');
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      const paragraphs = escaped
        .split(/\n\s*\n/)
        .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
        .join('\n');

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${originalFilename}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #222; }
    p { margin-bottom: 1.2em; }
  </style>
</head>
<body>
${paragraphs}
</body>
</html>`;

      return {
        buffer: Buffer.from(fullHtml, 'utf-8'),
        mimeType: 'text/html',
        outputExtension: 'html',
        suggestedFilename: `${this.getOutputBasename(originalFilename)}.html`,
      };
    } catch (err: any) {
      throw AppError.conversionFailed(`TXT to HTML conversion error: ${err.message}`);
    }
  }
}

export class TxtToPdfConverter extends BaseConverter {
  readonly name = 'TXT to PDF Converter';
  readonly sourceFormat = 'txt';
  readonly targetFormat = 'pdf';

  public convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    return new Promise((resolve, reject) => {
      try {
        const text = inputBuffer.toString('utf-8');
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          info: {
            Title: originalFilename,
            Author: 'File System Converter Academic Engine',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            buffer: pdfBuffer,
            mimeType: 'application/pdf',
            outputExtension: 'pdf',
            suggestedFilename: `${this.getOutputBasename(originalFilename)}.pdf`,
          });
        });

        doc.on('error', (err) => {
          reject(AppError.conversionFailed(`PDF generation failed: ${err.message}`));
        });

        // Header
        doc.fontSize(18).fillColor('#1e293b').text(originalFilename, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#64748b').text(`Generated on ${new Date().toUTCString()} by File System Converter`);
        doc.moveDown(1.5);

        // Body Text
        doc.fontSize(11).fillColor('#334155').lineGap(4).text(text, {
          align: 'left',
          width: 500,
        });

        doc.end();
      } catch (err: any) {
        reject(AppError.conversionFailed(`PDF compilation error: ${err.message}`));
      }
    });
  }
}
