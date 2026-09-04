import { IConverter, ConversionResult } from './base-converter';
import { CsvToJsonConverter, JsonToCsvConverter } from './implementations/csv-converters';
import { MarkdownToHtmlConverter, TxtToHtmlConverter, TxtToPdfConverter } from './implementations/doc-converters';
import { JsonToYamlConverter, YamlToJsonConverter } from './implementations/yaml-converters';
import { AppError } from '../errors/app-error';

export class ConverterRegistry {
  private static instance: ConverterRegistry;
  private converters: IConverter[] = [];

  private constructor() {
    // Register default converters
    this.register(new CsvToJsonConverter());
    this.register(new JsonToCsvConverter());
    this.register(new MarkdownToHtmlConverter());
    this.register(new TxtToHtmlConverter());
    this.register(new TxtToPdfConverter());
    this.register(new JsonToYamlConverter());
    this.register(new YamlToJsonConverter());
  }

  public static getInstance(): ConverterRegistry {
    if (!ConverterRegistry.instance) {
      ConverterRegistry.instance = new ConverterRegistry();
    }
    return ConverterRegistry.instance;
  }

  public register(converter: IConverter): void {
    this.converters.push(converter);
  }

  public findConverter(sourceFormat: string, targetFormat: string): IConverter | null {
    const cleanSource = sourceFormat.toLowerCase().replace(/^\./, '');
    const cleanTarget = targetFormat.toLowerCase().replace(/^\./, '');
    return (
      this.converters.find((c) => c.canConvert(cleanSource, cleanTarget)) || null
    );
  }

  public getAvailableTargets(sourceFormat: string): string[] {
    const cleanSource = sourceFormat.toLowerCase().replace(/^\./, '');
    return this.converters
      .filter((c) => c.sourceFormat.toLowerCase() === cleanSource)
      .map((c) => c.targetFormat.toLowerCase());
  }

  public getAllCapabilities(): { source: string; targets: string[] }[] {
    const map = new Map<string, Set<string>>();
    for (const c of this.converters) {
      if (!map.has(c.sourceFormat)) {
        map.set(c.sourceFormat, new Set());
      }
      map.get(c.sourceFormat)!.add(c.targetFormat);
    }

    return Array.from(map.entries()).map(([source, targets]) => ({
      source,
      targets: Array.from(targets),
    }));
  }

  public async execute(
    sourceFormat: string,
    targetFormat: string,
    inputBuffer: Buffer,
    originalFilename: string
  ): Promise<ConversionResult> {
    const converter = this.findConverter(sourceFormat, targetFormat);
    if (!converter) {
      throw AppError.unsupportedFileType(
        `No converter available for transformation from ${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()}.`
      );
    }

    return converter.convert(inputBuffer, originalFilename);
  }
}
