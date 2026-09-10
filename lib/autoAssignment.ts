import { Employee, Lead } from '../types';

export interface AssignmentInput {
  lead: Lead;
  employees: Employee[];
}

export interface AssignmentResult {
  bestEmployee: Employee;
  score: number;
  reasoning: string;
}

export function autoAssignEmployee({ lead, employees }: AssignmentInput): AssignmentResult {
  if (employees.length === 0) {
    throw new Error('No employees available for assignment.');
  }

  // Scoring algorithm based on specialization match, current capacity, priority, and simulated distance
  let bestScore = -1;
  let bestEmployee = employees[0];
  let reasoning = '';

  for (const emp of employees) {
    let score = 100;

    // 1. Capacity penalty (higher capacity = lower score to prevent overload)
    score -= (emp.capacity / emp.maxCapacity) * 40;

    // 2. Specialization bonus
    const leadTypeLower = lead.aiSummary.jobType.toLowerCase();
    const specLower = emp.specialization.toLowerCase();
    if (specLower.includes(leadTypeLower) || leadTypeLower.includes(specLower.split(' ')[0])) {
      score += 35;
    }

    // 3. Priority weight
    if (lead.priority === 'Urgent' && emp.status === 'Green') {
      score += 20;
    } else if (lead.priority === 'Urgent' && emp.status === 'Red') {
      score -= 30;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEmployee = emp;
      reasoning = `Matched based on specialization "${emp.specialization}", current load (${emp.capacity}%), and availability status (${emp.status}).`;
    }
  }

  return {
    bestEmployee,
    score: Math.round(bestScore),
    reasoning
  };
}

export function reassignLead(lead: Lead, newEmployee: Employee): Lead {
  return {
    ...lead,
    assignedEmployeeId: newEmployee.id,
    assignedEmployeeName: newEmployee.name,
    history: [
      {
        id: 'h-' + Date.now(),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: `Přiřazeno novému pracovníkovi: ${newEmployee.name} (Auto-Assignment Engine)`,
        author: 'Systém'
      },
      ...lead.history
    ]
  };
}
