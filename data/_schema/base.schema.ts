import { z } from 'zod';

export const baseRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const collectionMetaSchema = z.object({
  version: z.number().int().positive(),
  lastModified: z.string().datetime(),
  description: z.string(),
});

export const collectionFileSchema = z.object({
  _meta: collectionMetaSchema,
  records: z.array(baseRecordSchema),
});
