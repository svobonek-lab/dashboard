import { CompanyBranding } from '../types';

export type BrandArchetype = 
  | 'modern_pergolas' 
  | 'industrial_roofing' 
  | 'wood_houses' 
  | 'luxury_construction' 
  | 'family_business' 
  | 'general_contractor';

export interface BrandPalette {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  primarySubtle: string;
  primaryBorder: string;
  primaryRing: string;
  primaryGlow: string;
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  secondaryBorder: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  surface: string;
  surfaceDark: string;
  backgroundLight: string;
  backgroundDark: string;
  textOnPrimary: string;
  textOnSecondary: string;
  textOnAccent: string;
  textMain: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  gradientPrimary: string;
  gradientHero: string;
  gradientCard: string;
  gradientSidebar: string;
  radiusCard: string;
  radiusButton: string;
  shadowGlow: string;
  shadowCard: string;
}

export interface BrandDNA {
  archetype: BrandArchetype;
  archetypeName: string;
  tagline: string;
  welcomeGreeting: string;
  cardRadius: string;
  buttonRadius: string;
  heroGradient: string;
  sidebarBackground: string;
  sidebarTextColor: string;
  trustBadges: string[];
  kpiHighlightColor: string;
  patternOverlay?: string;
  featuresHeader: string;
}

/**
 * Parses a hex color into { r, g, b }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#2563eb').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 37, g: 99, b: 235 }; // fallback blue
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Formats RGB to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

/**
 * Adjusts color brightness (+/- percent)
 */
export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);
  return rgbToHex(r + amt, g + amt, b + amt);
}

/**
 * Returns either dark or light text color to ensure WCAG AA contrast against a given background
 */
export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // Perceptive luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0F172A' : '#FFFFFF';
}

/**
 * Converts RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts HSL to Hex
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * Generates an automatic harmonic accent or secondary color based on hue shift
 */
export function generateHarmonicColor(baseHex: string, hueShift: number, lightnessAdj: number = 0): string {
  const { r, g, b } = hexToRgb(baseHex);
  const hsl = rgbToHsl(r, g, b);
  const newHue = (hsl.h + hueShift + 360) % 360;
  const newLight = Math.min(90, Math.max(15, hsl.l + lightnessAdj));
  return hslToHex(newHue, hsl.s, newLight);
}

/**
 * Infers company Brand Archetype from name or services if not explicitly configured
 */
export function detectBrandArchetype(name: string = '', services: string[] = []): BrandArchetype {
  const text = (name + ' ' + (services || []).join(' ')).toLowerCase();
  if (text.includes('pergola') || text.includes('terasa') || text.includes('stínic') || text.includes('hliník')) {
    return 'modern_pergolas';
  }
  if (text.includes('ocel') || text.includes('hala') || text.includes('konstrukce') || text.includes('průmysl') || text.includes('střecha')) {
    return 'industrial_roofing';
  }
  if (text.includes('dřev') || text.includes('srub') || text.includes('tesař') || text.includes('rouben') || text.includes('masiv')) {
    return 'wood_houses';
  }
  if (text.includes('luxus') || text.includes('vila') || text.includes('design') || text.includes('architekt')) {
    return 'luxury_construction';
  }
  if (text.includes('rodinn') || text.includes('novák') || text.includes('syn') || text.includes('bratři')) {
    return 'family_business';
  }
  return 'general_contractor';
}

/**
 * Generates Brand DNA presets based on archetype
 */
export function getBrandDNA(
  archetype: BrandArchetype = 'modern_pergolas',
  primaryHex: string = '#2563eb',
  companyName: string = 'Stavební Firma'
): BrandDNA {
  const { r, g, b } = hexToRgb(primaryHex);

  switch (archetype) {
    case 'modern_pergolas':
      return {
        archetype,
        archetypeName: 'Moderní bioklimatické stavby & pergoly',
        tagline: 'Špičkový design, hliníkové systémy a inteligentní stínění',
        welcomeGreeting: `Vítejte v operačním systému ${companyName}`,
        cardRadius: '24px',
        buttonRadius: '14px',
        heroGradient: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(${r},${g},${b},0.08) 50%, rgba(${r},${g},${b},0.15) 100%)`,
        sidebarBackground: '#0B111E',
        sidebarTextColor: '#E2E8F0',
        trustBadges: ['5 let záruka na konstrukci', 'Certifikované hliníkové profily', '3D vizualizace zdarma'],
        kpiHighlightColor: primaryHex,
        featuresHeader: 'Přehled montáží a bioklimatických zakázek'
      };

    case 'industrial_roofing':
      return {
        archetype,
        archetypeName: 'Ocelové konstrukce, haly & průmyslové střechy',
        tagline: 'Robustní inženýrská řešení s maximální odolností',
        welcomeGreeting: `Dispečink a řízení projektů ${companyName}`,
        cardRadius: '16px',
        buttonRadius: '10px',
        heroGradient: `linear-gradient(135deg, #1E293B 0%, #0F172A 60%, rgba(${r},${g},${b},0.3) 100%)`,
        sidebarBackground: '#090D16',
        sidebarTextColor: '#CBD5E1',
        trustBadges: ['Statický posudek v ceně', 'EN 1090 certifikace svařování', 'Expresní montážní party'],
        kpiHighlightColor: '#38BDF8',
        featuresHeader: 'Průmyslové zakázky a harmonogram prací'
      };

    case 'wood_houses':
      return {
        archetype,
        archetypeName: 'Dřevostavby, sruby & zakázkové tesařství',
        tagline: 'Poctivé řemeslo, masivní dřevo a přírodní materiály',
        welcomeGreeting: `Řemeslný portál a dílna ${companyName}`,
        cardRadius: '28px',
        buttonRadius: '16px',
        heroGradient: `linear-gradient(135deg, #FFFDF8 0%, rgba(217,119,6,0.06) 60%, rgba(${r},${g},${b},0.14) 100%)`,
        sidebarBackground: '#1C1917',
        sidebarTextColor: '#F5F5F4',
        trustBadges: ['České certifikované dřevo', '100% přírodní izolace', 'Celoživotní záruka na nosné prvky'],
        kpiHighlightColor: '#D97706',
        featuresHeader: 'Přehled dřevostaveb a tesařských děl'
      };

    case 'luxury_construction':
      return {
        archetype,
        archetypeName: 'Prémiové rezidence & zakázková architektura',
        tagline: 'Exkluzivní stavební realizace bez kompromisů',
        welcomeGreeting: `Executive Suite & Management ${companyName}`,
        cardRadius: '24px',
        buttonRadius: '14px',
        heroGradient: `linear-gradient(135deg, #0F172A 0%, #020617 70%, rgba(${r},${g},${b},0.25) 100%)`,
        sidebarBackground: '#020617',
        sidebarTextColor: '#F8FAFC',
        trustBadges: ['Diskrétní přístup', 'Osobní stavbyvedoucí 24/7', 'Materiály nejvyšší jakosti'],
        kpiHighlightColor: '#F59E0B',
        featuresHeader: 'Klientské rezidenční projekty'
      };

    case 'family_business':
      return {
        archetype,
        archetypeName: 'Rodinná stavební firma s tradicí',
        tagline: 'Osobní přístup, spolehlivost a desítky let zkušeností',
        welcomeGreeting: `Vítejte u rodinné firmy ${companyName}`,
        cardRadius: '20px',
        buttonRadius: '12px',
        heroGradient: `linear-gradient(135deg, #FFFFFF 0%, rgba(${r},${g},${b},0.05) 70%, rgba(16,185,129,0.08) 100%)`,
        sidebarBackground: '#0F172A',
        sidebarTextColor: '#E2E8F0',
        trustBadges: ['Platba až po převzetí etap', 'Pojištění odpovědnosti na 20 mil. Kč', 'Rychlá domluva'],
        kpiHighlightColor: '#10B981',
        featuresHeader: 'Aktivní stavby a rodinné zakázky'
      };

    default:
      return {
        archetype: 'general_contractor',
        archetypeName: 'Generální dodavatel stavebních děl',
        tagline: 'Kompletní realizace staveb od projektu po kolaudaci',
        welcomeGreeting: `Operační systém stavby ${companyName}`,
        cardRadius: '20px',
        buttonRadius: '12px',
        heroGradient: `linear-gradient(135deg, #FFFFFF 0%, rgba(${r},${g},${b},0.08) 100%)`,
        sidebarBackground: '#0F172A',
        sidebarTextColor: '#E2E8F0',
        trustBadges: ['Stavební dozor garantován', 'Termínová záruka s penále', 'Komplexní inženýring'],
        kpiHighlightColor: primaryHex,
        featuresHeader: 'Přehled aktivních zakázek'
      };
  }
}

/**
 * Creates the complete dynamic Brand Palette for any tenant
 */
export function generateBrandPalette(
  primaryHex: string = '#2563eb',
  secondaryHex?: string,
  accentHex?: string
): BrandPalette {
  const primary = primaryHex || '#2563eb';
  const { r, g, b } = hexToRgb(primary);
  
  // Synthesize harmonious secondary & accent if not provided
  const secondary = secondaryHex && secondaryHex !== primary 
    ? secondaryHex 
    : generateHarmonicColor(primary, 25, -5);
  
  const accent = accentHex 
    ? accentHex 
    : generateHarmonicColor(primary, -35, 10);

  const { r: rSec, g: gSec, b: bSec } = hexToRgb(secondary);
  const { r: rAcc, g: gAcc, b: bAcc } = hexToRgb(accent);

  const primaryHover = adjustBrightness(primary, -12);
  const primaryActive = adjustBrightness(primary, -20);
  const secondaryHover = adjustBrightness(secondary, -12);
  const accentHover = adjustBrightness(accent, -12);

  return {
    primary,
    primaryHover,
    primaryActive,
    primaryLight: `rgba(${r}, ${g}, ${b}, 0.15)`,
    primarySubtle: `rgba(${r}, ${g}, ${b}, 0.08)`,
    primaryBorder: `rgba(${r}, ${g}, ${b}, 0.28)`,
    primaryRing: `rgba(${r}, ${g}, ${b}, 0.35)`,
    primaryGlow: `0 8px 24px -4px rgba(${r}, ${g}, ${b}, 0.35)`,
    secondary,
    secondaryHover,
    secondaryLight: `rgba(${rSec}, ${gSec}, ${bSec}, 0.15)`,
    secondaryBorder: `rgba(${rSec}, ${gSec}, ${bSec}, 0.25)`,
    accent,
    accentHover,
    accentLight: `rgba(${rAcc}, ${gAcc}, ${bAcc}, 0.15)`,
    surface: '#FFFFFF',
    surfaceDark: '#0B111E',
    backgroundLight: '#F8FAFC',
    backgroundDark: '#020617',
    textOnPrimary: getContrastColor(primary),
    textOnSecondary: getContrastColor(secondary),
    textOnAccent: getContrastColor(accent),
    textMain: '#0F172A',
    textMuted: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gradientPrimary: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
    gradientHero: `radial-gradient(circle at 10% 20%, rgba(${r}, ${g}, ${b}, 0.14) 0%, rgba(${rSec}, ${gSec}, ${bSec}, 0.05) 50%, transparent 80%)`,
    gradientCard: `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.06) 0%, rgba(${r}, ${g}, ${b}, 0) 100%)`,
    gradientSidebar: `linear-gradient(180deg, #0F172A 0%, #020617 100%)`,
    radiusCard: '24px',
    radiusButton: '14px',
    shadowGlow: `0 10px 30px -5px rgba(${r}, ${g}, ${b}, 0.3)`,
    shadowCard: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
  };
}

/**
 * Injects dynamic CSS variables into document root and updates favicon & browser title
 */
export function applyBrandToDOM(palette: BrandPalette, companyName?: string, logoUrl?: string): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--brand-primary', palette.primary);
  root.style.setProperty('--brand-primary-soft', palette.primaryLight);
  root.style.setProperty('--surface', palette.surface || '#ffffff');
  root.style.setProperty('--surface-secondary', palette.backgroundLight || '#f8fafc');
  root.style.setProperty('--surface-tertiary', '#f1f5f9');
  root.style.setProperty('--text', palette.textMain || '#0f172a');
  root.style.setProperty('--muted', palette.textMuted || '#64748b');
  root.style.setProperty('--border', '#e2e8f0');

  root.style.setProperty('--radius-app', '12px');
  root.style.setProperty('--shadow-app', '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)');

  root.style.setProperty('--brand-primary-hover', palette.primaryHover);
  root.style.setProperty('--brand-primary-active', palette.primaryActive);
  root.style.setProperty('--brand-primary-light', palette.primaryLight);
  root.style.setProperty('--brand-primary-subtle', palette.primarySubtle);
  root.style.setProperty('--brand-primary-border', palette.primaryBorder);
  root.style.setProperty('--brand-primary-ring', palette.primaryRing);
  root.style.setProperty('--brand-primary-glow', palette.primaryGlow);
  root.style.setProperty('--brand-secondary', palette.secondary);
  root.style.setProperty('--brand-secondary-hover', palette.secondaryHover);
  root.style.setProperty('--brand-accent', palette.accent);
  root.style.setProperty('--brand-gradient', palette.gradientPrimary);
  root.style.setProperty('--brand-hero-gradient', palette.gradientHero);
  root.style.setProperty('--brand-card-gradient', palette.gradientCard);
  root.style.setProperty('--brand-text-on-primary', palette.textOnPrimary);
  root.style.setProperty('--brand-radius-card', palette.radiusCard);
  root.style.setProperty('--brand-radius-btn', palette.radiusButton);
  root.style.setProperty('--brand-shadow-glow', palette.shadowGlow);

  // Dynamic Browser Title
  if (companyName) {
    document.title = `${companyName} | Stavební OS`;
  }

  // Dynamic Browser Favicon
  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (logoUrl && logoUrl.trim() !== '') {
    link.href = logoUrl;
  } else {
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏗️</text></svg>';
  }
}

/**
 * Returns tailored style objects for quick React style binding
 */
export function getBrandStyles(palette: BrandPalette) {
  return {
    primaryBtn: {
      backgroundColor: palette.primary,
      color: palette.textOnPrimary,
      boxShadow: `0 4px 14px 0 rgba(${hexToRgb(palette.primary).r}, ${hexToRgb(palette.primary).g}, ${hexToRgb(palette.primary).b}, 0.35)`
    },
    secondaryBtn: {
      backgroundColor: palette.primarySubtle,
      color: palette.primary,
      borderColor: palette.primaryBorder
    },
    kpiCard: {
      borderRadius: palette.radiusCard,
      borderTop: `3px solid ${palette.primary}`,
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)'
    },
    heroCard: {
      borderRadius: palette.radiusCard,
      background: `linear-gradient(135deg, #FFFFFF 0%, ${palette.primaryLight} 100%)`,
      border: `1px solid ${palette.primaryBorder}`
    },
    glassCard: {
      borderRadius: palette.radiusCard,
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(226, 232, 240, 0.8)'
    },
    activeNavItem: {
      backgroundColor: palette.primarySubtle,
      color: palette.primary,
      borderRight: `3px solid ${palette.primary}`
    },
    brandBadge: {
      backgroundColor: palette.primaryLight,
      color: palette.primary,
      border: `1px solid ${palette.primaryBorder}`
    }
  };
}
