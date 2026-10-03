import type { ZodSchema } from 'zod';
import { exampleRecordSchema } from './example.schema';

export const schemaRegistry: Record<string, ZodSchema> = {
  example: exampleRecordSchema,
  tmp_example: exampleRecordSchema,
};

export function getSchema(collection: string): ZodSchema | null {
  const normalized = collection.replace(/\.json$/i, '').trim();
  return schemaRegistry[normalized] ?? null;
}
