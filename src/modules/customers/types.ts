import type { z } from 'zod';
import type {
  customerCreateSchema,
  customerStatusSchema,
  customerUpdateSchema,
} from './schemas';

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  document: string | null;
  dataTreatmentAuthorizedAt: string;
  dataTreatmentNoticeVersion: string;
  dataTreatmentAuthorizationSource: 'registro presencial' | 'formulario';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerStatusInput = z.infer<typeof customerStatusSchema>;

export interface CustomerSaveResult {
  customer: CustomerRecord;
  duplicatePhone: boolean;
}
