import React, { useState } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Building2, 
  Zap, 
  MessageSquare, 
  Star, 
  TrendingUp, 
  DollarSign, 
  Sliders, 
  Clock, 
  Users, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Share2,
  Download,
  Check,
  ExternalLink,
  Copy,
  Info,
  Layout,
  Gauge,
  Phone,
  Mail,
  MapPin,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { WebsiteAudit, CompanyBranding } from '../types';

interface AuditCardProps {
  audit: WebsiteAudit;
  branding: CompanyBranding;
  onProceedToCRM: () => void;
  onNewURL: () => void;
}

export const AuditCard: React.FC<AuditCardProps> = ({
  audit,
  branding,
  onProceedToCRM,
  onNewURL
}) => {
  const safeServices = Array.isArray(branding?.services) ? branding.services : ['Pergoly', 'Střechy', 'Rekonstrukce'];

  // Navigation tabs for deep auditing explore
  const [activeTab, setActiveTab] = useState<'overview' | 'ux' | 'lead' | 'automation' | 'cx'>('overview');

  // ROI Calculator Sliders state
  const [sliderLeads, setSliderLeads] = useState<number>(12);
  const [sliderProjectValue, setSliderProjectValue] = useState<number>(250000);
  const [sliderEmployees, setSliderEmployees] = useState<number>(5);

  // Expanded bottleneck card state
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>('iss-1');
  const [copiedLink, setCopiedLink] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Calculations
  const missedLeadsPerMonth = Math.round(sliderLeads * 0.75); // 75% missed due to response latency
  const monthlyRevenueLost = missedLeadsPerMonth * sliderProjectValue;
  const annualRecoverableRevenue = monthlyRevenueLost * 12;
  const hoursSavedPerWeek = sliderEmployees * 4 + 8; // administrative overhead automated

  const handleCopyDemoLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Convert Hex color to RGB for jsPDF styling
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 10;
    const g = parseInt(clean.substring(2, 4), 16) || 78;
    const b = parseInt(clean.substring(4, 6), 16) || 163;
    return { r, g, b };
  };

  // Professional Multi-Page PDF Audit Generator using jsPDF
  const handleDownloadPdf = () => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryRgb = hexToRgb(branding.primaryColor);
      const accentColor = [primaryRgb.r, primaryRgb.g, primaryRgb.b];
      const darkColor = [15, 23, 42]; // Slate-900
      const grayColor = [100, 116, 139]; // Slate-500
      const lightBg = [248, 250, 252]; // Slate-50

      // Add custom font mappings (Standard font helper)
      const setBold = () => doc.setFont('Helvetica', 'bold');
      const setNormal = () => doc.setFont('Helvetica', 'normal');

      // ================= PAGE 1: COVER PAGE =================
      // Background gradient styling
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Decorative colored corner accent
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 0, 210, 12, 'F');
      doc.rect(0, 285, 210, 12, 'F');

      // AI Badge
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(20, 35, 75, 10, 2, 2, 'F');
      doc.setTextColor(56, 189, 248); // sky-400
      doc.setFontSize(9);
      setBold();
      doc.text('🤖 AI SITE AUDIT ENGINE v2.4', 25, 41);

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      setBold();
      doc.text('AUDIT DIGITÁLNÍ PREZENCE', 20, 65);
      doc.setFontSize(18);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(`Pro firmu: ${branding.name}`, 20, 77);

      // Metriky / URL
      doc.setFontSize(11);
      doc.setTextColor(203, 213, 225);
      setNormal();
      doc.text(`Auditovaný web: ${audit.url}`, 20, 92);
      doc.text(`Datum auditu: ${new Date().toLocaleDateString('cs-CZ')}`, 20, 99);
      doc.text(`Lokalita dispečinku: ${branding.city}`, 20, 106);

      // Separation line
      doc.setDrawColor(51, 65, 85);
      doc.line(20, 115, 190, 115);

      // Overall Score Visual Box
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(20, 125, 170, 45, 4, 4, 'F');
      
      // Score Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      setBold();
      doc.text('CELKOVÉ DIGITÁLNÍ SKÓRE:', 30, 138);
      
      doc.setFontSize(36);
      doc.setTextColor(74, 222, 128); // green-400
      doc.text(`${audit.score}%`, 30, 158);

      // Sub-Scores Grid description
      doc.setFontSize(10);
      doc.setTextColor(226, 232, 240);
      setNormal();
      doc.text(`• UX weby a rychlost: ${audit.websiteUxScore}/100`, 95, 138);
      doc.text(`• Sběr poptávek (Leads): ${audit.leadCaptureScore}/100`, 95, 145);
      doc.text(`• Automatizace reakce: ${audit.responseAutomationScore}/100`, 95, 152);
      doc.text(`• Hodnocení & CX: ${audit.customerExperienceScore}/100`, 95, 159);

      // Extracted Assets Section
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      setBold();
      doc.text('AUTOMATICKY DETEKOVANÉ IDENTIFIKÁTORY', 20, 190);
      
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Barva identity:', 20, 202);
      doc.text('Hlavní telefon:', 20, 210);
      doc.text('Kontaktní e-mail:', 20, 218);
      doc.text('Google Hodnocení:', 20, 226);
      doc.text('Detekované služby:', 20, 234);

      doc.setTextColor(255, 255, 255);
      setBold();
      doc.text(`${branding.primaryColor}`, 60, 202);
      doc.text(`${branding.phone}`, 60, 210);
      doc.text(`${branding.email}`, 60, 218);
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text(`${audit.googleReviewsRating} ★ (${audit.googleReviewsCount} recenzí)`, 60, 226);
      doc.setTextColor(255, 255, 255);
      doc.text(safeServices.slice(0, 4).join(', '), 60, 234);

      // Footer cover
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      setNormal();
      doc.text('Generováno systémem DemoFactory Enterprise AI. Důvěrný dokument určený výhradně pro majitele.', 20, 275);

      // ================= PAGE 2: BOTTLENECKS & RECOMMENDATIONS =================
      doc.addPage();
      
      // Page background
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Header
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      setBold();
      doc.text(`AUDIT DIGITÁLNÍCH SLABIN: ${branding.name.toUpperCase()}`, 15, 13);

      // Section title
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(15);
      doc.text('1. KRITICKÉ NEDOSTATKY WEB PREZENCE', 15, 33);
      doc.setFontSize(10);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      setNormal();
      doc.text('Analýza odhalila následující překážky, které snižují konverze a odrazují potenciální zákazníky:', 15, 39);

      let yOffset = 46;
      audit.issues.forEach((issue) => {
        // Draw Issue Container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, yOffset, 180, 36, 2, 2, 'FD');

        // Draw Left Severity Line
        doc.setFillColor(issue.severity === 'error' ? 239 : 245, issue.severity === 'error' ? 68 : 158, issue.severity === 'error' ? 68 : 11);
        doc.rect(15, yOffset, 3, 36, 'F');

        // Issue Details
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(11);
        setBold();
        doc.text(issue.title, 22, yOffset + 7);

        doc.setFontSize(9);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        setNormal();
        doc.text(`Slabina: ${issue.description}`, 22, yOffset + 14);

        doc.setTextColor(190, 24, 74); // rose-700
        setBold();
        doc.text(`Proč to bolí: ${issue.whyItHurts || 'Způsobuje odchod potenciálních stavebníků ke konkurenci.'}`, 22, yOffset + 21);

        doc.setTextColor(16, 124, 65); // green-700
        doc.text(`Jak to CRM vyřeší: ${issue.howWeFixIt || 'Bude vyřešeno integrací naší automatizované pipeline.'}`, 22, yOffset + 28);

        // Saved Time Badge
        doc.setFillColor(219, 234, 254);
        doc.roundedRect(145, yOffset + 4, 45, 6, 1, 1, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(7.5);
        doc.text(`Úspora: ${issue.timeSaved || '5 hod / týdně'}`, 148, yOffset + 8);

        yOffset += 42;
      });

      // Section title recommendations
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(14);
      setBold();
      doc.text('2. STRATEGICKÁ DOPORUČENÍ NA MÍRU', 15, yOffset + 5);

      yOffset += 11;
      audit.recommendations.forEach((rec) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, yOffset, 180, 20, 2, 2, 'FD');

        // Impact indicator
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.circle(20, yOffset + 10, 1.5, 'F');

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(10);
        setBold();
        doc.text(rec.title, 25, yOffset + 6);

        doc.setFontSize(8.5);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        setNormal();
        doc.text(rec.description, 25, yOffset + 11);
        doc.text(`Dopad: ${rec.impact}  |  Složitost implementace: ${rec.effort}`, 25, yOffset + 16);

        yOffset += 24;
      });

      // ================= PAGE 3: ROI CALCULATOR & SUMMARY =================
      doc.addPage();
      
      // Page background
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Header
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 0, 210, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      setBold();
      doc.text(`ROI KALKULACE A FINANČNÍ DOPAD`, 15, 13);

      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(15);
      doc.text('3. FINANČNÍ STRÁTA A NÁVRATNOST INVESTICE', 15, 33);

      // ROI stats summary card
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(15, 42, 180, 75, 4, 4, 'FD');

      // Main statistic text
      doc.setTextColor(190, 24, 74); // rose-700
      doc.setFontSize(13);
      setBold();
      doc.text('ODHADOVANÁ ROČNÍ ZTRÁTA UŠLÝCH PŘÍLEŽITOSTÍ:', 25, 54);

      doc.setFontSize(32);
      doc.text(`${annualRecoverableRevenue.toLocaleString('cs-CZ')} CZK`, 25, 71);

      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.setFontSize(10);
      setNormal();
      doc.text(`• Měsíčně přicházíte o cca ${missedLeadsPerMonth} poptávek z webu z celkových ${sliderLeads}.`, 25, 84);
      doc.text(`• Průměrná cena stavebního projektu je kalkulována na ${sliderProjectValue.toLocaleString('cs-CZ')} CZK.`, 25, 91);
      doc.text(`• Míra opuštění webu bez zanechání kontaktu je aktuálně odhadována na 75 %.`, 25, 98);
      doc.text(`• Přechodem na automatizované CRM ušetříte ${hoursSavedPerWeek} hodin týdně na administrativě.`, 25, 105);

      // Section: CRM Upgrades
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(14);
      setBold();
      doc.text('4. PŘEDNOSTI NAVRŽENÉHO CRM SYSTÉMU', 15, 133);

      // Render Upgraded benefits with icons/bullet points
      let benY = 145;
      audit.upgradedBenefits.forEach((benefit) => {
        doc.setFillColor(74, 222, 128); // Green background bullet
        doc.circle(20, benY + 2.5, 2, 'F');

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(10);
        setBold();
        doc.text(benefit, 28, benY + 4);
        benY += 12;
      });

      // Bottom disclaimer / guarantee box
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.setDrawColor(191, 219, 254); // Blue-200
      doc.roundedRect(15, benY + 5, 180, 45, 3, 3, 'FD');

      doc.setTextColor(30, 58, 138); // Blue-900
      doc.setFontSize(11);
      setBold();
      doc.text('ZÁRUKA ZVÝŠENÍ KONVERZÍ DEMOFACTORY AI:', 25, benY + 15);
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9.5);
      setNormal();
      doc.text('Nainstalováním a aktivací připraveného klientského widgetu získáte', 25, benY + 23);
      doc.text('měřitelný nárůst poptávek již během prvních 14 dnů. Systém je plně', 25, benY + 29);
      doc.text('multi-tenatní a nakonfigurovaný pod vaší unikátní identitou.', 25, benY + 35);

      // Save PDF
      const safeCompanyName = branding.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      doc.save(`audit_report_${safeCompanyName}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate PDF audit report:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  // Helper to color badged scores
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/20 bg-green-950/20';
    if (score >= 50) return 'text-amber-400 border-amber-500/20 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/20 bg-rose-950/20';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 80) return 'Vynikající';
    if (score >= 50) return 'Průměrné';
    return 'Kritické';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background ambient glow matching the extracted branding */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[130px] pointer-events-none"
        style={{ backgroundColor: branding.primaryColor }}
      />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-5 bg-indigo-500 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden relative z-10 text-slate-900 my-8 flex flex-col"
      >
        {/* Header Block & Share / PDF Actions */}
        <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/85 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-900 font-extrabold text-2xl shadow-lg flex-shrink-0"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                  AI Web Extracted & Audited
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">{audit.url}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
                AI Audit prezence pro {branding.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyDemoLink}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-900 flex items-center gap-2 transition-all border border-slate-300 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-400 animate-scale" /> : <Share2 className="w-4 h-4 text-blue-400" />}
              <span>{copiedLink ? 'Odkaz zkopírován!' : 'Sdílet demo'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-slate-900 flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {pdfGenerating ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : pdfSuccess ? (
                <Check className="w-4 h-4 text-green-300" />
              ) : (
                <Download className="w-4 h-4 text-blue-200" />
              )}
              <span>{pdfGenerating ? 'Generuji PDF...' : pdfSuccess ? 'PDF Staženo!' : 'Stáhnout PDF Audit'}</span>
            </button>
          </div>
        </div>

        {/* Brand Bar Indicator */}
        <div className="flex bg-slate-50 p-4 border-b border-slate-200 overflow-x-auto gap-4 justify-between items-center text-xs">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Hlavní barva:</span>
            <div className="w-4 h-4 rounded-md border border-white/20" style={{ backgroundColor: branding.primaryColor }} />
            <span className="font-mono text-slate-700 font-bold">{branding.primaryColor}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Lokalita dispečinku:</span>
            <span className="text-slate-900 font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              {branding.city}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Google Hodnocení:</span>
            <span className="text-amber-400 font-extrabold flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {audit.googleReviewsRating} ({audit.googleReviewsCount} recenzí)
            </span>
          </div>
        </div>

        {/* Tabbed Interactive Explorer */}
        <div className="border-b border-slate-200 bg-white/40 p-2 flex overflow-x-auto gap-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview' ? 'bg-slate-800 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 Celkový přehled
          </button>
          <button 
            onClick={() => setActiveTab('ux')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ux' ? 'bg-slate-800 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            💻 Web & UX ({audit.websiteUxScore}%)
          </button>
          <button 
            onClick={() => setActiveTab('lead')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'lead' ? 'bg-slate-800 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📥 Sběr poptávek ({audit.leadCaptureScore}%)
          </button>
          <button 
            onClick={() => setActiveTab('automation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'automation' ? 'bg-slate-800 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚡ Reakce dispečinku ({audit.responseAutomationScore}%)
          </button>
          <button 
            onClick={() => setActiveTab('cx')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cx' ? 'bg-slate-800 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ⭐ Klientský servis ({audit.customerExperienceScore}%)
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Top Score Circle Indicator & Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">CELKOVÉ SKÓRE PREZENCE</span>
                
                {/* Visual Gauge */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" className="stroke-slate-800" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="50" 
                      style={{ 
                        stroke: branding.primaryColor,
                        strokeDasharray: '314',
                        strokeDashoffset: `${314 - (314 * audit.score) / 100}`
                      }} 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                      fill="transparent" 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-slate-900">{audit.score}%</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Podprůměrné</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  Web vykazuje závažné slabiny v rychlosti reakce a sběru kontaktů.
                </p>
              </div>

              {/* Sub-scores Overview blocks */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-slate-50/40 p-4.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Rychlost webu & UX</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-2xl font-black text-slate-900">{audit.websiteUxScore} <span className="text-xs text-slate-500 font-normal">/ 100</span></p>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Průměrné</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">Tradiční vizuál, ale chybí jakékoliv moderní interaktivní prvky a kalkulačky.</p>
                </div>

                <div className="bg-slate-50/40 p-4.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Lead Capture (Sběr)</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-2xl font-black text-slate-900">{audit.leadCaptureScore} <span className="text-xs text-slate-500 font-normal">/ 100</span></p>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Kritické</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">Pouze statický telefon a e-mail. Zákazník musí psát dlouhý e-mail z vlastní iniciativy.</p>
                </div>

                <div className="bg-slate-50/40 p-4.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Automatizace reakce</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-2xl font-black text-slate-900">{audit.responseAutomationScore} <span className="text-xs text-slate-500 font-normal">/ 100</span></p>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Kritické</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">Nula automatických odpovědí. Zákazník nemá žádné potvrzení o přijetí a čeká dny.</p>
                </div>

                <div className="bg-slate-50/40 p-4.5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Klientský Servis (CX)</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-2xl font-black text-slate-900">{audit.customerExperienceScore} <span className="text-xs text-slate-500 font-normal">/ 100</span></p>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Dobré</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">Firma má skvělé recenze na Googlu, ale vůbec je neukazuje na webu pro zvýšení důvěry.</p>
                </div>
              </div>
            </div>

            {/* AI Extracted Assets summary */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> Detekované a extrahované stavební specializace
              </h3>
              <div className="flex flex-wrap gap-2">
                {safeServices.map((srv, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                    👷 {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Before vs After comparison */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Layout className="w-4 h-4" /> Porovnání: Současný stav vs. DemoFactory CRM
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-rose-950/10 border border-rose-500/20 p-5 rounded-3xl space-y-3">
                  <span className="px-2 py-0.5 rounded-md font-bold bg-rose-500/20 text-rose-400">PŮVODNÍ STRÁNKA</span>
                  <ul className="space-y-2 text-slate-500">
                    <li className="flex justify-between border-b border-slate-200/40 pb-1"><span>Reakce na poptávku:</span> <strong className="text-rose-300">24 až 48 hodin</strong></li>
                    <li className="flex justify-between border-b border-slate-200/40 pb-1"><span>Sběr kontaktů:</span> <strong className="text-rose-300">Jen statický e-mail</strong></li>
                    <li className="flex justify-between border-b border-slate-200/40 pb-1"><span>Plánování řemeslníků:</span> <strong className="text-rose-300">Telefonáty & Papír</strong></li>
                    <li className="flex justify-between pb-1"><span>Zákaznická zóna:</span> <strong className="text-rose-300">Chybí zcela</strong></li>
                  </ul>
                </div>

                <div className="bg-green-950/10 border border-green-500/20 p-5 rounded-3xl space-y-3">
                  <span className="px-2 py-0.5 rounded-md font-bold bg-green-500/20 text-green-400">AUTOMATIZOVANÉ CRM</span>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex justify-between border-b border-slate-200/40 pb-1"><span>Reakce na poptávku:</span> <strong className="text-green-400 font-bold">Okamžitě (&lt; 5 min)</strong></li>
                    <li className="flex justify-between border-b border-slate-200/40 pb-1"><span>Sběr kontaktů:</span> <strong className="text-green-400 font-bold">Interaktivní AI Widget</strong></li>
                    <li className="flex justify-between border-b border-slate-200/40 pb-1"><span>Plánování řemeslníků:</span> <strong className="text-green-400 font-bold">GPS & Kalendář dispečera</strong></li>
                    <li className="flex justify-between pb-1"><span>Zákaznická zóna:</span> <strong className="text-green-400 font-bold">Online klientský portál</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WEB & UX */}
        {activeTab === 'ux' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg">
                  {audit.websiteUxScore}%
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Hodnocení UX a modernosti webu</h3>
                  <p className="text-xs text-slate-500">Analýza rychlosti, mobilního zobrazení a interakce.</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(audit.websiteUxScore)}`}>
                {getScoreBadgeText(audit.websiteUxScore)}
              </span>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Odhalené nedostatky v této kategorii:</h4>
              <div className="grid grid-cols-1 gap-3">
                {audit.issues.filter(i => i.category === 'ux').map(issue => (
                  <div key={issue.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <h5 className="font-bold text-slate-800 text-sm">{issue.title}</h5>
                    </div>
                    <p className="text-xs text-slate-500">{issue.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[11px] border-t border-slate-200/50">
                      <p className="text-rose-400"><strong>Ztráta:</strong> {issue.whyItHurts}</p>
                      <p className="text-green-400"><strong>Řešení:</strong> {issue.howWeFixIt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEAD CAPTURE */}
        {activeTab === 'lead' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-lg">
                  {audit.leadCaptureScore}%
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Sběr a zachycení poptávek (Lead Capture)</h3>
                  <p className="text-xs text-slate-500">Účinnost nástrojů pro získání kontaktu z příchozího návštěvníka.</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(audit.leadCaptureScore)}`}>
                {getScoreBadgeText(audit.leadCaptureScore)}
              </span>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zásadní slabiny v konverzním trychtýři:</h4>
              <div className="grid grid-cols-1 gap-3">
                {audit.issues.filter(i => i.category === 'lead' || i.id === 'iss-1').map(issue => (
                  <div key={issue.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <h5 className="font-bold text-slate-800 text-sm">{issue.title}</h5>
                    </div>
                    <p className="text-xs text-slate-500">{issue.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[11px] border-t border-slate-200/50">
                      <p className="text-rose-400"><strong>Proč přicházíte o peníze:</strong> {issue.whyItHurts}</p>
                      <p className="text-green-400"><strong>Zlepšení s CRM:</strong> {issue.howWeFixIt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RESPONSE AUTOMATION */}
        {activeTab === 'automation' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-lg">
                  {audit.responseAutomationScore}%
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Automatizace dispečinku a rychlost reakce</h3>
                  <p className="text-xs text-slate-500">Prodleva mezi odesláním poptávky a první reakcí obchodu.</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(audit.responseAutomationScore)}`}>
                {getScoreBadgeText(audit.responseAutomationScore)}
              </span>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kritické prodlevy v komunikaci:</h4>
              <div className="grid grid-cols-1 gap-3">
                {audit.issues.filter(i => i.category === 'automation' || i.id === 'iss-2').map(issue => (
                  <div key={issue.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <h5 className="font-bold text-slate-800 text-sm">{issue.title}</h5>
                    </div>
                    <p className="text-xs text-slate-500">{issue.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[11px] border-t border-slate-200/50">
                      <p className="text-rose-400"><strong>Co hrozí:</strong> {issue.whyItHurts}</p>
                      <p className="text-green-400"><strong>CRM Automatizace:</strong> {issue.howWeFixIt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CUSTOMER EXPERIENCE & GOOGLE REVIEWS */}
        {activeTab === 'cx' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center font-bold text-lg">
                  {audit.customerExperienceScore}%
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Zákaznická zkušenost a hodnocení (CX)</h3>
                  <p className="text-xs text-slate-500">Jak je hodnocena vaše práce a jak prezentujete výsledky.</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(audit.customerExperienceScore)}`}>
                {getScoreBadgeText(audit.customerExperienceScore)}
              </span>
            </div>

            {/* Google Reviews extraction visual module */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Google Moje Firma - Analýza Recenzí
                </h4>
                <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">Extrahováno z Google Maps API</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white/50 rounded-2xl border border-slate-200 flex flex-col justify-center items-center">
                  <p className="text-4xl font-black text-amber-400">{audit.googleReviewsRating} ★</p>
                  <p className="text-xs text-slate-500 mt-1">{audit.googleReviewsCount} celkových hodnocení</p>
                  <div className="flex gap-1 mt-2 text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Shrnutí zákaznického sentimentu:</span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-white/20 p-3.5 rounded-xl border border-slate-200/60">
                    "{audit.googleReviewsSummary}"
                  </p>
                  <div className="flex gap-3 text-[10px] pt-1">
                    <span className="text-green-400 flex items-center gap-1 bg-green-950/40 px-2 py-1 rounded-md border border-green-900/30">
                      <ThumbsUp className="w-3 h-3" /> Vysoká řemeslná kvalita
                    </span>
                    <span className="text-rose-400 flex items-center gap-1 bg-rose-950/40 px-2 py-1 rounded-md border border-rose-900/30">
                      <ThumbsDown className="w-3 h-3" /> Pomalé reakce na nacenění
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personalized Recommendations list inside specific category */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Navržená strategická opatření:</h4>
              <div className="grid grid-cols-1 gap-3">
                {audit.recommendations.map(rec => (
                  <div key={rec.id} className="p-4 bg-slate-50/40 border border-slate-200/80 rounded-2xl flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
                          Doporučení
                        </span>
                        <h5 className="font-bold text-slate-900 text-xs">{rec.title}</h5>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">{rec.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-right">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                        Dopad: {rec.impact}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Složitost: {rec.effort}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROI Calculator Sliders (Common for overall value explanation) */}
        <div className="px-6 sm:px-8 pb-4">
          <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                Interaktivní simulátor ztrát & ROI
              </h4>
              <span className="text-xs text-blue-400 font-mono font-bold animate-pulse">Živá simulace</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Slider 1: Leads */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Poptávek z webu / měsíc:</span>
                  <span className="font-bold text-slate-900">{sliderLeads}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={sliderLeads}
                  onChange={(e) => setSliderLeads(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Slider 2: Project Value */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Průměrná cena zakázky:</span>
                  <span className="font-bold text-slate-900">{sliderProjectValue.toLocaleString('cs-CZ')} CZK</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="1000000"
                  step="10000"
                  value={sliderProjectValue}
                  onChange={(e) => setSliderProjectValue(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Slider 3: Employees */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Počet pracovníků v terénu:</span>
                  <span className="font-bold text-slate-900">{sliderEmployees}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={sliderEmployees}
                  onChange={(e) => setSliderEmployees(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculations metrics summary */}
            <div className="p-4 bg-white/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ROČNÍ ZACHRÁNĚNÉ TRŽBY</p>
                <p className="text-xl sm:text-2xl font-black text-green-400">{annualRecoverableRevenue.toLocaleString('cs-CZ')} CZK</p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Při automatickém zachycení poptávek do 5 minut a eliminaci odchodů klientů.
                </p>
              </div>

              <div className="flex gap-4 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 text-center sm:text-left shrink-0">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Ušetřený čas</p>
                  <p className="text-lg font-black text-indigo-400">{hoursSavedPerWeek} h / týdně</p>
                  <p className="text-[10px] text-slate-500">Administrativa</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Ztracené leady</p>
                  <p className="text-lg font-black text-rose-400">~{missedLeadsPerMonth} / měs</p>
                  <p className="text-[10px] text-slate-500">Bez CRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strong CTA with Pulse & Hover effects */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <button
            onClick={onNewURL}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            ← Zadat jinou webovou stránku
          </button>

          <button
            onClick={onProceedToCRM}
            className="relative group px-8 py-4.5 rounded-2xl text-sm font-black text-slate-900 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden cursor-pointer"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {/* Soft backdrop glow on hover */}
            <div className="absolute inset-0 bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10 flex items-center gap-3">
              <span>Vstoupit do vygenerovaného CRM ({branding.name})</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
