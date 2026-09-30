import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextSalesAction, sortSalesLeads, summarizeSalesWorkspace } from '../src/app/salesWorkspace';

const lead = (id: string, status: any, price: number, priority: any = 'Medium', assignedEmployeeId = '') => ({ id, status, price, priority, assignedEmployeeId, title: id, customerName: id, city: 'Brno', address: '' } as any);

test('sales summary exposes pipeline, conversion, and assignment health', () => {
  const result = summarizeSalesWorkspace([
    lead('new', 'New', 100000, 'High'),
    lead('job', 'In Progress', 200000, 'Medium', 'emp-1'),
    lead('won', 'Completed', 300000, 'Low', 'emp-1'),
    lead('lost', 'Lost', 50000),
  ]);
  assert.equal(result.total, 4);
  assert.equal(result.pipelineValue, 600000);
  assert.equal(result.openValue, 300000);
  assert.equal(result.wonValue, 300000);
  assert.equal(result.conversionRate, 50);
  assert.equal(result.unassignedCount, 2);
  assert.equal(result.stageCounts.New, 1);
});

test('next action is explicit for every sales stage', () => {
  assert.equal(getNextSalesAction(lead('a', 'New', 1)), 'Zavolat zákazníkovi');
  assert.equal(getNextSalesAction(lead('b', 'Quote', 1)), 'Provést follow-up nabídky');
  assert.equal(getNextSalesAction(lead('c', 'Completed', 1)), 'Vyžádat hodnocení');
});

test('sales search prioritizes urgent and high value work', () => {
  const result = sortSalesLeads([
    lead('low', 'New', 900000, 'Low'),
    lead('urgent', 'New', 10000, 'Urgent'),
    lead('high', 'New', 500000, 'High'),
  ]);
  assert.deepEqual(result.map((item) => item.id), ['urgent', 'high', 'low']);
  assert.deepEqual(sortSalesLeads(result, 'urgent').map((item) => item.id), ['urgent']);
});
