import 'server-only';

import {
  createCustomer as insertCustomer,
  hasDuplicateCustomerPhone,
  listCustomers as queryCustomers,
  setCustomerActive,
  updateCustomer as saveCustomer,
} from './supabase-repository';
import type { CustomerCreateInput, CustomerSaveResult, CustomerUpdateInput } from './types';

export async function listCustomers(search = '') {
  return queryCustomers(search);
}

export async function customerPhoneAlreadyExists(phone: string, excludeId?: string) {
  return hasDuplicateCustomerPhone(phone, excludeId);
}

export async function createCustomer(input: CustomerCreateInput): Promise<CustomerSaveResult> {
  const duplicatePhone = await hasDuplicateCustomerPhone(input.phone);
  const customer = await insertCustomer({
    name: input.name,
    phone: input.phone,
    document: input.document,
    authorizedAt: new Date().toISOString(),
    noticeVersion: input.authorization.noticeVersion,
    authorizationSource: input.authorization.source,
  });
  return { customer, duplicatePhone };
}

export async function updateCustomer(
  input: CustomerUpdateInput,
): Promise<CustomerSaveResult | null> {
  const duplicatePhone = await hasDuplicateCustomerPhone(input.phone, input.id);
  const customer = await saveCustomer(input.id, {
    name: input.name,
    phone: input.phone,
    document: input.document,
  });
  return customer ? { customer, duplicatePhone } : null;
}

export async function changeCustomerStatus(id: string, active: boolean) {
  return setCustomerActive(id, active);
}
