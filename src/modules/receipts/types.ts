import type { z } from 'zod';
import type { publicReceiptSchema } from './schemas';

export type PublicReceipt = z.infer<typeof publicReceiptSchema>;
