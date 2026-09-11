import React from 'react';
import { CalendarView } from '@/features/CalendarView';
import { Lead } from '@/types';

interface OwnerCalendarPageProps {
  leads: Lead[];
}

export const OwnerCalendarPage: React.FC<OwnerCalendarPageProps> = ({ leads }) => {
  return <CalendarView leads={leads} />;
};
