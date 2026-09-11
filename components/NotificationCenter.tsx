import React from 'react';
import { Bell, CheckCircle2, Clock, FileText, UserCheck, X } from 'lucide-react';
import { CRMNotification } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: CRMNotification[];
  onMarkAllRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-3 w-96 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Activity & Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllRead}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Mark all read
          </button>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No new notifications.
          </div>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className={`p-4 hover:bg-slate-800/60 transition-all flex items-start gap-3 ${!item.read ? 'bg-amber-500/10' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.type === 'lead' ? <CheckCircle2 className="w-4 h-4" /> :
                 item.type === 'quote' ? <FileText className="w-4 h-4" /> :
                 item.type === 'employee' ? <UserCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-200">{item.title}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-slate-950 text-center border-t border-slate-800 text-[11px] text-slate-400 font-medium">
        Live Activity Feed active
      </div>
    </div>
  );
};
