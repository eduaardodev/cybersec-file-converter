export interface ConversionResult {
  buffer: Buffer;
  mimeType: string;
  outputExtension: string;
  suggestedFilename: string;
}

export interface IConverter {
  readonly name: string;
  readonly sourceFormat: string;
  readonly targetFormat: string;

  canConvert(source: string, target: string): boolean;
  convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult>;
}

export abstract class BaseConverter implements IConverter {
  abstract readonly name: string;
  abstract readonly sourceFormat: string;
  abstract readonly targetFormat: string;

  public canConvert(source: string, target: string): boolean {
    return (
      this.sourceFormat.toLowerCase() === source.toLowerCase().replace(/^\./, '') &&
      this.targetFormat.toLowerCase() === target.toLowerCase().replace(/^\./, '')
    );
  }

  abstract convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult>;

  protected getOutputBasename(originalFilename: string): string {
    const parts = originalFilename.split('.');
    if (parts.length > 1) {
      parts.pop();
    }
    return parts.join('.');
  }
}
