import type { z } from 'zod';
import type {
  createCustomerCreditPaymentSchema,
  customerCreditDetailSchema,
  customerCreditOverviewSchema,
} from './schemas';

export type CustomerCreditOverview = z.infer<typeof customerCreditOverviewSchema>;
export type CustomerCreditDetail = z.infer<typeof customerCreditDetailSchema>;
export type CreateCustomerCreditPaymentInput = z.infer<typeof createCustomerCreditPaymentSchema>;
