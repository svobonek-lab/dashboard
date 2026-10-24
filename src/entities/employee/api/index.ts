import type { Employee } from '../model';
import { crmRepo } from '../../../shared/api/crm-repository';

export const getEmployees = (orgId: string): Promise<Employee[]> => crmRepo.getEmployees(orgId);
export const saveEmployee = (orgId: string, employee: Partial<Employee>): Promise<Employee> => crmRepo.saveEmployee(orgId, employee);
