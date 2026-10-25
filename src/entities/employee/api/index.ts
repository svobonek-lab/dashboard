import type { Employee } from '../model';
import { crmRepo } from '../../../shared/api/crm-repository';

export const getEmployees = async (orgId: string): Promise<Employee[]> => await crmRepo.getEmployees(orgId) as Employee[];
export const saveEmployee = async (orgId: string, employee: Partial<Employee>): Promise<Employee> => await crmRepo.saveEmployee(orgId, employee) as Employee;
