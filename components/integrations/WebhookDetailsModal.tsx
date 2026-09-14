import React, { useState } from 'react';
import { RestApiConfig } from '@/types/integrations';
import { 
  Webhook, 
  Copy, 
  Check, 
  Send, 
  Code2, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

interface WebhookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RestApiConfig;
  organizationId: string;
  organizationName: string;
  onSendTestPayload: () => Promise<any>;
}

export const WebhookDetailsModal: React.FC<WebhookDetailsModalProps> = ({
  isOpen,
  onClose,
  config,
  organizationId,
  organizationName,
  onSendTestPayload
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResultNotice, setTestResultNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const curlExample = `curl -X POST "${config.webhookUrl}" \\
  -H "Authorization: Bearer ${config.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Stavba bioklimatické pergoly 5x3m",
    "customer_name": "Ing. Marek Dvořák",
    "phone": "+420 608 555 444",
    "email": "dvorak.marek@firma.cz",
    "city": "Praha 4",
    "address": "Antala Staška 12, Praha 4",
    "price": 285000,
    "status": "New",
    "description": "Poptávka z webového konfigurátoru s integrovaným LED páskem."
  }'`;

  const handleTest = async () => {
    setIsSendingTest(true);
    setTestResultNotice(null);
    try {
      const res = await onSendTestPayload();
      setTestResultNotice(res.message || 'Testovací webhook payload byl úspěšně zpracován a zakázka vytvořena v Kanbanu.');
    } catch (e: any) {
      setTestResultNotice(`Chyba: ${e.message || 'Odeslání testu selhalo'}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center font-bold">
              <Webhook className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">REST API & Inbound Webhooks</h2>
              <p className="text-xs text-slate-500 font-medium">Přímé napojení pro webové kalkulátory, poptávkové formuláře a externí CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Webhook Endpoint URL (HTTPS POST)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={config.webhookUrl}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-950 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.webhookUrl, 'url')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'url' ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Bearer API Token (Šifrováno pro organizaci)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={config.apiKey}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.apiKey, 'token')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Key className="w-3.5 h-3.5" />}
                <span>{copiedField === 'token' ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
          </div>

          {/* cURL Example */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
                Příklad volání cURL (JSON Payload)
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(curlExample, 'curl')}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'curl' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                Kopírovat cURL kód
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
              {curlExample}
            </pre>
          </div>

          {/* Test Notice */}
          {testResultNotice && (
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{testResultNotice}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Zavřít
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={isSendingTest}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isSendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Odeslat testovací payload (Simulace webu)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
