import * as yaml from 'js-yaml';
import { BaseConverter, ConversionResult } from '../base-converter';
import { AppError } from '../../errors/app-error';

const dumpYaml = (yaml as any).dump || (yaml as any).default?.dump;
const loadYaml = (yaml as any).load || (yaml as any).default?.load;

export class JsonToYamlConverter extends BaseConverter {
  readonly name = 'JSON to YAML Converter';
  readonly sourceFormat = 'json';
  readonly targetFormat = 'yaml';

  public async convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    try {
      const json = JSON.parse(inputBuffer.toString('utf-8'));
      const yamlStr = dumpYaml(json, { indent: 2, lineWidth: -1 });

      return {
        buffer: Buffer.from(yamlStr, 'utf-8'),
        mimeType: 'application/x-yaml',
        outputExtension: 'yaml',
        suggestedFilename: `${this.getOutputBasename(originalFilename)}.yaml`,
      };
    } catch (err: any) {
      throw AppError.conversionFailed(`JSON to YAML conversion error: ${err.message}`);
    }
  }
}

export class YamlToJsonConverter extends BaseConverter {
  readonly name = 'YAML to JSON Converter';
  readonly sourceFormat = 'yaml';
  readonly targetFormat = 'json';

  public async convert(inputBuffer: Buffer, originalFilename: string): Promise<ConversionResult> {
    try {
      const parsed = loadYaml(inputBuffer.toString('utf-8'));
      const jsonStr = JSON.stringify(parsed, null, 2);

      return {
        buffer: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        outputExtension: 'json',
        suggestedFilename: `${this.getOutputBasename(originalFilename)}.json`,
      };
    } catch (err: any) {
      throw AppError.conversionFailed(`YAML to JSON conversion error: ${err.message}`);
    }
  }
}
