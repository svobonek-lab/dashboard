import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmployeeLeads } from '../src/app/employeeScope';

const lead = (id: string, assignedEmployeeId: string) => ({
  id,
  assignedEmployeeId,
  title: id,
  description: '',
  city: '',
  address: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  preferredDate: '',
  price: 0,
  status: 'New' as const,
  priority: 'Medium' as const,
  assignedEmployeeName: '',
  thumbnail: '',
  photos: [],
  files: [],
  checklist: [],
  aiSummary: { jobType: '', complexity: 'Medium' as const, estimatedRange: '', assignedEmployee: '', risks: [], recommendedNextStep: '' },
  timeline: [],
  aiChat: [],
  history: []
});

const employee = (id: string, email: string, authUserId?: string) => ({
  id,
  email,
  auth_user_id: authUserId,
  name: id,
  avatar: '',
  specialization: '',
  capacity: 0,
  maxCapacity: 0,
  todaysJobsCount: 0,
  status: 'Green' as const,
  phone: ''
});

test('employee sees only leads assigned to their employee record', () => {
  const leads = [lead('mine', 'emp-1'), lead('other', 'emp-2')];
  const employees = [employee('emp-1', 'worker@firma.cz', 'auth-1'), employee('emp-2', 'other@firma.cz', 'auth-2')];

  assert.deepEqual(getEmployeeLeads(leads, employees, 'auth-1', 'worker@firma.cz').map((item) => item.id), ['mine']);
});

test('employee lookup supports the invited email before auth_user_id is linked', () => {
  const leads = [lead('mine', 'emp-1'), lead('other', 'emp-2')];
  const employees = [employee('emp-1', 'Worker@Firma.cz'), employee('emp-2', 'other@firma.cz')];

  assert.deepEqual(getEmployeeLeads(leads, employees, 'new-auth-id', 'worker@firma.cz').map((item) => item.id), ['mine']);
});

test('missing employee identity fails closed', () => {
  assert.deepEqual(getEmployeeLeads([lead('mine', 'emp-1')], [employee('emp-1', 'worker@firma.cz')]), []);
});
