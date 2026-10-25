import type { Lead } from '../model';
import type { LeadNote, LeadStoredFile } from '../../../shared/api/crm-repository';
import { crmRepo } from '../../../shared/api/crm-repository';

export const getLeads = async (orgId: string): Promise<Lead[]> => await crmRepo.getLeads(orgId) as Lead[];
export const saveLead = async (orgId: string, lead: Partial<Lead>): Promise<Lead> => await crmRepo.saveLead(orgId, lead) as Lead;
export const updateLeadStatus = (orgId: string, leadId: string, status: string): Promise<void> => crmRepo.updateLeadStatus(orgId, leadId, status);
export const deleteLead = (orgId: string, leadId: string): Promise<void> => crmRepo.deleteLead(orgId, leadId);
export const getLeadNotes = (orgId: string, leadId: string): Promise<LeadNote[]> => crmRepo.getLeadNotes(orgId, leadId);
export const addLeadNote = (orgId: string, leadId: string, body: string): Promise<LeadNote> => crmRepo.addLeadNote(orgId, leadId, body);
export const deleteLeadNote = (orgId: string, noteId: string): Promise<void> => crmRepo.deleteLeadNote(orgId, noteId);
export const getLeadFiles = (orgId: string, leadId: string): Promise<LeadStoredFile[]> => crmRepo.getLeadFiles(orgId, leadId);
export const uploadLeadFile = (orgId: string, leadId: string, file: File): Promise<LeadStoredFile> => crmRepo.uploadLeadFile(orgId, leadId, file);
export const deleteLeadFile = (orgId: string, file: LeadStoredFile): Promise<void> => crmRepo.deleteLeadFile(orgId, file);
