import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL, withGeminiBackoff } from '../lib/gemini.js';
import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';
import dns from 'dns';
import net from 'net';

export interface WebsiteAnalysisConfidence {
  companyName: number;
  logo: number;
  colors: number;
  contacts: number;
  services: number;
}

export interface WebsiteAnalysisResult {
  companyName: string;
  website: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  email: string;
  address: string;
  services: string[];
  heroImageUrl: string;
  socialLinks: string[];
  confidence: WebsiteAnalysisConfidence;
  branding?: any;
  audit?: any;
}

// Helper to determine if an IP is private, local, or link-local
function isPrivateIp(ip: string): boolean {
  if (!ip) return false;

  // IPv4 validation
  if (net.isIPv4(ip)) {
    if (ip === '0.0.0.0' || ip === '255.255.255.255') return true;
    if (ip.startsWith('127.')) return true; // 127.0.0.0/8 Loopback
    if (ip.startsWith('10.')) return true; // 10.0.0.0/8 Private
    if (ip.startsWith('192.168.')) return true; // 192.168.0.0/16 Private
    if (ip.startsWith('169.254.')) return true; // 169.254.0.0/16 Link-Local / Metadata
    if (ip.startsWith('100.')) {
      // 100.64.0.0/10 Carrier-grade NAT
      const parts = ip.split('.').map(Number);
      if (parts[1] >= 64 && parts[1] <= 127) return true;
    }
    if (ip.startsWith('172.')) {
      // 172.16.0.0/12 Private
      const parts = ip.split('.').map(Number);
      if (parts[1] >= 16 && parts[1] <= 31) return true;
    }
    return false;
  }

  // IPv6 validation
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true;
    if (lower.startsWith('::ffff:')) {
      const v4Part = lower.substring(7);
      return isPrivateIp(v4Part);
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 Unique Local
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10 Link-Local
    return false;
  }

  return false;
}

// 1. Security & URL Validation with SSRF guards
function validateAndNormalizeUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string; isSsrf?: boolean } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Chybí nebo je neplatný parametr URL.' };
  }

  let trimmed = rawUrl.trim();

  // If a protocol scheme is specified, only allow http or https
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    if (!/^https?:\/\//i.test(trimmed)) {
      return { valid: false, error: 'Jsou podporovány pouze protokoly HTTP a HTTPS.', isSsrf: true };
    }
  } else {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Zadaná URL není platná webová adresa.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Jsou podporovány pouze protokoly HTTP a HTTPS.', isSsrf: true };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF Protection: Block localhost and private / internal IP ranges
  const isPrivateOrLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.arpa') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) || // AWS/GCP/Azure link-local metadata
    /^fc00:/i.test(hostname) ||
    /^fe80:/i.test(hostname) ||
    isPrivateIp(hostname);

  if (isPrivateOrLocal) {
    return { valid: false, error: 'Přístup k lokálním a privátním síťovým cílům je z bezpečnostních důvodů zablokován.', isSsrf: true };
  }

  return { valid: true, normalized: parsed.href };
}

// DNS resolution check to prevent DNS rebinding or domains pointing to private IPs
async function checkDnsResolution(hostname: string): Promise<{ safe: boolean; error?: string; isSsrf?: boolean }> {
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: 'Doménové jméno se nepodařilo v DNS vyhledat.' };
    }
    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return { safe: false, error: 'Přístup k lokálním a privátním síťovým cílům je z bezpečnostních důvodů zablokován.', isSsrf: true };
      }
    }
    return { safe: true };
  } catch (dnsErr: any) {
    return { safe: false, error: 'Doménové jméno se nepodařilo v DNS vyhledat: ' + (dnsErr?.code || dnsErr?.message) };
  }
}

// Fetch with manual redirect checking and SSRF validation on each hop (max 3 redirects)
async function fetchWithSafeRedirects(initialUrl: string, maxRedirects: number = 3): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirectsRemaining = maxRedirects;

  while (true) {
    const urlCheck = validateAndNormalizeUrl(currentUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
      const err: any = new Error(urlCheck.error || 'Neplatná URL');
      err.isSsrf = urlCheck.isSsrf;
      throw err;
    }

    const parsed = new URL(urlCheck.normalized);
    const dnsCheck = await checkDnsResolution(parsed.hostname);
    if (!dnsCheck.safe) {
      const err: any = new Error(dnsCheck.error || 'DNS validace selhala');
      err.isSsrf = dnsCheck.isSsrf;
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    let res: Response;
    try {
      res = await fetch(urlCheck.normalized, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual', // Never auto-follow redirects!
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'cs-CZ,cs;q=0.9,sk;q=0.8,en;q=0.7'
        }
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Check for HTTP redirect status codes (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        throw new Error('Přesměrování neobsahuje hlavičku Location.');
      }
      if (redirectsRemaining <= 0) {
        throw new Error('Byl překročen maximální počet přesměrování (3).');
      }
      redirectsRemaining--;

      // Resolve redirect destination URL against current URL
      const nextUrl = new URL(location, currentUrl).href;
      currentUrl = nextUrl;
      continue;
    }

    if (!res.ok) {
      throw new Error(`Server vrátil stav ${res.status} (${res.statusText})`);
    }

    const cl = res.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 5 * 1024 * 1024) {
      throw new Error('Dokument přesahuje limit 5MB.');
    }

    const fullText = await res.text();
    return {
      html: fullText.substring(0, 2500000),
      finalUrl: currentUrl
    };
  }
}

// 2. HTML Helper Utilities
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .trim();
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  if (!relativeOrAbsolute) return '';
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute.startsWith('http') ? relativeOrAbsolute : '';
  }
}

// 3. Color Utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function isNeutralColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  // If saturation is low (grayscale/monochrome)
  if (delta < 18) return true;
  // Pure or near pure white/black
  if (r > 245 && g > 245 && b > 245) return true;
  if (r < 25 && g < 25 && b < 25) return true;
  return false;
}

function colorDistance(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 0;
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

// 4. Server-Side Scraper & Extractor
async function fetchAndParseWebsite(normalizedUrl: string): Promise<WebsiteAnalysisResult> {
  const emptyConfidence: WebsiteAnalysisConfidence = {
    companyName: 0,
    logo: 0,
    colors: 0,
    contacts: 0,
    services: 0
  };

  const emptyResult: WebsiteAnalysisResult = {
    companyName: '',
    website: normalizedUrl,
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '',
    secondaryColor: '',
    phone: '',
    email: '',
    address: '',
    services: [],
    heroImageUrl: '',
    socialLinks: [],
    confidence: emptyConfidence
  };

  let html = '';
  let finalUrl = normalizedUrl;

  try {
    const fetched = await fetchWithSafeRedirects(normalizedUrl, 3);
    html = fetched.html;
    finalUrl = fetched.finalUrl;
  } catch (err: any) {
    if (err?.isSsrf) {
      throw err;
    }
    console.warn(`Safe fetch for ${normalizedUrl} failed:`, err?.message);
    return emptyResult;
  }

  if (!html) {
    return emptyResult;
  }

  const urlObj = new URL(finalUrl);
  const domainOrigin = urlObj.origin;
  const domainHost = urlObj.hostname.replace(/^www\./, '');
  const domainPart = domainHost.split('.')[0];

  // A. Parse JSON-LD Structured Data
  let jsonLdName = '';
  let jsonLdLogo = '';
  let jsonLdPhone = '';
  let jsonLdEmail = '';
  let jsonLdAddress = '';
  const jsonLdSocials: string[] = [];

  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const type = String(item['@type'] || '');
        if (/Organization|LocalBusiness|Store|Corporation|HomeAndConstructionBusiness|Company/i.test(type)) {
          if (item.name && !jsonLdName) jsonLdName = String(item.name).trim();
          if (item.legalName && !jsonLdName) jsonLdName = String(item.legalName).trim();
          if (item.telephone && !jsonLdPhone) jsonLdPhone = String(item.telephone).trim();
          if (item.email && !jsonLdEmail) jsonLdEmail = String(item.email).trim();

          if (item.logo && !jsonLdLogo) {
            jsonLdLogo = typeof item.logo === 'string' ? item.logo : item.logo.url || '';
          }

          if (item.address && !jsonLdAddress) {
            if (typeof item.address === 'string') {
              jsonLdAddress = item.address.trim();
            } else if (typeof item.address === 'object') {
              const parts = [
                item.address.streetAddress,
                item.address.postalCode,
                item.address.addressLocality,
                item.address.addressCountry
              ].filter(Boolean);
              jsonLdAddress = parts.join(', ').trim();
            }
          }

          if (item.sameAs) {
            const sameAsList = Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs];
            for (const s of sameAsList) {
              if (typeof s === 'string') jsonLdSocials.push(s.trim());
            }
          }
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks
    }
  }

  // B. Parse HTML Title & Meta Tags
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1]) : '';

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const ogTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]) : '';

  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const ogImage = ogImageMatch ? resolveUrl(ogImageMatch[1].trim(), domainOrigin) : '';

  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const metaDescription = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1]) : '';

  // C. Favicon Extraction
  let faviconUrl = '';
  const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i) ||
                    html.match(/<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i);
  if (iconMatch) {
    faviconUrl = resolveUrl(iconMatch[1].trim(), domainOrigin);
  }
  if (!faviconUrl && html) {
    faviconUrl = `${domainOrigin}/favicon.ico`;
  }

  // D. Logo Extraction
  let logoUrl = '';
  let logoConfidence = 0;
  let logoAltText = '';

  if (jsonLdLogo) {
    logoUrl = resolveUrl(jsonLdLogo, domainOrigin);
    logoConfidence = 95;
  }

  if (!logoUrl) {
    const imgRegex = /<img\b([^>]+)>/gi;
    let match: RegExpExecArray | null;
    const candidates: Array<{ src: string; alt: string; score: number }> = [];

    while ((match = imgRegex.exec(html)) !== null) {
      const attrs = match[1];
      const hasLogoInClass = /class=["'][^"']*(?:logo|brand)[^"']*["']/i.test(attrs);
      const hasLogoInId = /id=["'][^"']*(?:logo|brand)[^"']*["']/i.test(attrs);
      const hasLogoInAlt = /alt=["'][^"']*(?:logo|brand)[^"']*["']/i.test(attrs);
      const hasLogoInSrc = /src=["'][^"']*(?:logo|brand)[^"']*["']/i.test(attrs);

      if (hasLogoInClass || hasLogoInId || hasLogoInAlt || hasLogoInSrc) {
        const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
        const alt = altMatch ? decodeHtmlEntities(altMatch[1]).replace(/\b(logo|loga|logotyp)\b/gi, '').trim() : '';

        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const srcSetMatch = attrs.match(/srcSet=["']([^"'\s,]+)/i);
        const dataSrcMatch = attrs.match(/data-src=["']([^"']+)["']/i) || attrs.match(/data-original=["']([^"']+)["']/i);

        let candidateSrc = '';
        if (srcMatch && !srcMatch[1].startsWith('data:image/gif;base64')) {
          candidateSrc = srcMatch[1];
        } else if (dataSrcMatch) {
          candidateSrc = dataSrcMatch[1];
        } else if (srcSetMatch) {
          candidateSrc = srcSetMatch[1];
        }

        if (candidateSrc) {
          let score = 50;
          if (hasLogoInClass) score += 25;
          if (hasLogoInId) score += 20;
          if (hasLogoInAlt) score += 15;
          if (hasLogoInSrc) score += 20;
          if (/header|navbar|top/i.test(attrs)) score += 10;
          candidates.push({ src: candidateSrc, alt, score });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      logoUrl = resolveUrl(candidates[0].src, domainOrigin);
      logoConfidence = 90;
      if (candidates[0].alt) {
        logoAltText = candidates[0].alt;
      }
    }
  }

  // Fallback check: og:image if it specifically mentions logo
  if (!logoUrl && ogImage && /logo|brand/i.test(ogImage)) {
    logoUrl = ogImage;
    logoConfidence = 70;
  }

  // If no logo is found, return empty string and 0 confidence (DO NOT FABRICATE DEMO IMAGES)
  if (!logoUrl) {
    logoConfidence = 0;
  }

  // E. Company Name Extraction
  let companyName = '';
  let companyConfidence = 0;

  if (jsonLdName) {
    companyName = jsonLdName;
    companyConfidence = 95;
  } else if (logoAltText && logoAltText.length >= 2 && logoAltText.length <= 40) {
    companyName = logoAltText;
    companyConfidence = 90;
  } else if (ogTitle || rawTitle) {
    const fullTitle = ogTitle || rawTitle;
    const segments = fullTitle.split(/[-|–•/»:]/).map(s => s.trim()).filter(Boolean);
    const blacklistWords = /^(domů|úvod|hlavní strana|home|homepage|welcome|vítejte|oficiální stránky)$/i;

    const filteredSegments = segments.filter(s => !blacklistWords.test(s));
    if (filteredSegments.length > 0) {
      companyName = filteredSegments[0];
      companyConfidence = 85;
    } else {
      companyName = fullTitle;
      companyConfidence = 70;
    }
  }

  if (!companyName) {
    companyConfidence = 0;
  }

  // F. Colors Extraction (Theme-color, CSS Variables, Dominant Vibrant Colors)
  let primaryColor = '';
  let secondaryColor = '';
  let colorsConfidence = 0;

  // 1. theme-color meta tag
  const themeColorMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
  if (themeColorMatch && themeColorMatch[1].startsWith('#')) {
    primaryColor = themeColorMatch[1].toLowerCase();
    colorsConfidence = 90;
  }

  // 2. CSS variables
  const cssVarMatches = html.matchAll(/--(?:primary|brand|color-primary|theme-color|accent)[a-zA-Z0-9_-]*\s*:\s*(#[0-9a-fA-F]{3,8})/gi);
  for (const cv of cssVarMatches) {
    const hex = cv[1].toLowerCase();
    if (!isNeutralColor(hex)) {
      if (!primaryColor) {
        primaryColor = hex;
        colorsConfidence = 92;
      } else if (!secondaryColor && colorDistance(primaryColor, hex) > 40) {
        secondaryColor = hex;
      }
    }
  }

  // 3. Scan HTML / inline styles for hex colors
  const hexColorMatches = [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)].map(m => m[0].toLowerCase());
  const colorCounts: Record<string, number> = {};
  for (const hex of hexColorMatches) {
    if (!isNeutralColor(hex)) {
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
  }

  const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  if (sortedColors.length > 0) {
    if (!primaryColor) {
      primaryColor = sortedColors[0][0];
      colorsConfidence = 80;
    }
    for (const [col] of sortedColors) {
      if (col !== primaryColor && colorDistance(primaryColor, col) > 40) {
        secondaryColor = col;
        break;
      }
    }
  }

  if (!primaryColor) {
    colorsConfidence = 0;
  }

  // G. Contact Info Extraction (tel:, mailto:, international/CZ regex)
  let phone = '';
  let email = '';
  let contactsConfidence = 0;

  // JSON-LD contacts
  if (jsonLdPhone) phone = jsonLdPhone;
  if (jsonLdEmail) email = jsonLdEmail;

  // tel: links
  if (!phone) {
    const telMatches = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => m[1].trim());
    if (telMatches.length > 0) {
      phone = telMatches[0].replace(/\s+/g, ' ');
    }
  }

  // mailto: links
  if (!email) {
    const mailMatches = [...html.matchAll(/href=["']mailto:([^"?']+)["']/gi)].map(m => m[1].trim());
    const validMails = mailMatches.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !/sentry|webpack|example\.com/i.test(e));
    if (validMails.length > 0) {
      email = validMails[0];
    }
  }

  // Regex phone search - prioritize numbers with explicit country prefix (+420, +421, etc.) or spacing
  if (!phone) {
    const prefixedPhoneRegex = /(?:\+420|\+421|00420|00421)\s?[1-9][0-9]{1,2}[\s.-]?[0-9]{3}[\s.-]?[0-9]{3,4}/g;
    const prefMatches = [...html.matchAll(prefixedPhoneRegex)].map(m => m[0].trim());
    if (prefMatches.length > 0) {
      phone = prefMatches[0];
    }
  }

  if (!phone) {
    const spacedPhoneRegex = /(?:\+420|\+421)?\s?[1-9][0-9]{2}\s[0-9]{3}\s[0-9]{3}/g;
    const spacedMatches = [...html.matchAll(spacedPhoneRegex)].map(m => m[0].trim());
    if (spacedMatches.length > 0) {
      phone = spacedMatches[0];
    }
  }

  // Regex email search if still missing
  if (!email) {
    const textEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = [...html.matchAll(textEmailRegex)]
      .map(m => m[0].toLowerCase().trim())
      .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg') && !/sentry|example\.com|w3\.org|schema\.org/i.test(e));

    if (emailMatches.length > 0) {
      email = emailMatches[0];
    }
  }

  if (phone && email) {
    contactsConfidence = 95;
  } else if (phone || email) {
    contactsConfidence = 75;
  } else {
    contactsConfidence = 0;
  }

  // H. Address Extraction
  let address = jsonLdAddress || '';

  if (!address) {
    const addressTagMatch = html.match(/<address[^>]*>([\s\S]*?)<\/address>/i);
    if (addressTagMatch) {
      const cleanAddr = addressTagMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanAddr.length > 5 && cleanAddr.length < 150) {
        address = cleanAddr;
      }
    }
  }

  if (!address) {
    const pscPattern = /([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž\s.-]+(?:\s\d+[\/\d]*[a-zA-Z]?))[\s,]+(\d{3}\s?\d{2})\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž\s.-]+)/;
    const pscMatch = html.match(pscPattern);
    if (pscMatch) {
      address = `${pscMatch[1].trim()}, ${pscMatch[2]} ${pscMatch[3].trim()}`;
    }
  }

  // I. Navigation & Services Extraction
  const detectedServices: string[] = [];
  let servicesConfidence = 0;

  // 1. Navigation items (filtering out navigation boilerplate)
  const navBlocks = [...html.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/gi)];
  const nonServiceNavWords = /^(domů|úvod|home|o nás|o společnosti|kdo jsme|about|kontakt|kontakty|contact|kariéra|kariera|blog|aktuality|novinky|reference|projekty|galerie|ceník|ke stažení|přihlášení|login|košík|e-shop|cookies|gdpr|podmínky|obchodní podmínky)$/i;

  for (const nb of navBlocks) {
    const navLinks = [...nb[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const nl of navLinks) {
      const linkText = decodeHtmlEntities(nl[1].replace(/<[^>]+>/g, '').trim());
      if (linkText.length >= 3 && linkText.length <= 40 && !nonServiceNavWords.test(linkText)) {
        if (!detectedServices.includes(linkText)) {
          detectedServices.push(linkText);
        }
      }
    }
  }

  // 2. Specific construction trade patterns verified in HTML
  const serviceKeywords = [
    { name: 'Pergoly & Terasy', regex: /\b(pergola|pergoly|terasa|terasy|bioklimatick[a-z]*)\b/i },
    { name: 'Střechy & Krovy', regex: /\b(střech[a-z]*|krov[a-z]*|tesař[a-z]*|klempíř[a-z]*|pokrývač[a-z]*)\b/i },
    { name: 'Dřevostavby na klíč', regex: /\b(dřevostavb[a-z]*|roubenk[a-z]*|srub[a-z]*)\b/i },
    { name: 'Rekonstrukce & Zednictví', regex: /\b(rekonstrukc[a-z]*|zednick[a-z]*|zedník[a-z]*|bytov[a-z]* jadr[a-z]*)\b/i },
    { name: 'Fasády & Zateplení', regex: /\b(fasád[a-z]*|zateplen[a-z]*|etics)\b/i },
    { name: 'Interiéry & Sádrokartony', regex: /\b(sádrokarton[a-z]*|sdk příčk[a-z]*|podhled[a-z]*)\b/i },
    { name: 'Zemní & Základové práce', regex: /\b(zemní prác[a-z]*|výkopov[a-z]*|základov[a-z]* desk[a-z]*)\b/i },
    { name: 'Dopravní & Inženýrské stavby', regex: /\b(dopravní stavb[a-z]*|inženýrsk[a-z]* stavb[a-z]*|most[a-z]*)\b/i },
    { name: 'Pozemní stavby', regex: /\b(pozemní stavb[a-z]*|výstavba budov|průmyslové stavby)\b/i }
  ];

  for (const sk of serviceKeywords) {
    if (sk.regex.test(html) || sk.regex.test(metaDescription)) {
      if (!detectedServices.includes(sk.name)) {
        detectedServices.push(sk.name);
      }
    }
  }

  if (detectedServices.length > 0) {
    servicesConfidence = 85;
  } else {
    servicesConfidence = 0;
  }

  // J. Social Links
  const socialLinks: string[] = [];
  if (jsonLdSocials.length > 0) {
    socialLinks.push(...jsonLdSocials);
  }

  const socialRegex = /href=["'](https?:\/\/(?:www\.)?(?:facebook\.com|instagram\.com|linkedin\.com|youtube\.com|twitter\.com|x\.com|tiktok\.com|pinterest\.com)\/[^"'#\s]+)["']/gi;
  const foundSocials = [...html.matchAll(socialRegex)].map(m => m[1]);
  for (const s of foundSocials) {
    if (!socialLinks.includes(s)) {
      socialLinks.push(s);
    }
  }

  // K. Hero Image
  const heroImageUrl = ogImage || '';

  return {
    companyName,
    website: normalizedUrl,
    logoUrl,
    faviconUrl,
    primaryColor,
    secondaryColor,
    phone,
    email,
    address,
    services: detectedServices,
    heroImageUrl,
    socialLinks,
    confidence: {
      companyName: companyConfidence,
      logo: logoConfidence,
      colors: colorsConfidence,
      contacts: contactsConfidence,
      services: servicesConfidence
    }
  };
}

// 5. Optional Server-Side Gemini AI Refinement (Strictly Grounded, No Hallucinations)
async function refineWithGemini(extracted: WebsiteAnalysisResult): Promise<WebsiteAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return extracted;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const prompt = `Analyze this extracted website data:
URL: ${extracted.website}
Extracted Company Name: ${extracted.companyName}
Extracted Phone: ${extracted.phone}
Extracted Email: ${extracted.email}
Extracted Address: ${extracted.address}
Extracted Services: ${extracted.services.join(', ')}

INSTRUCTIONS:
1. Verify and refine the extracted company details based purely on the given facts.
2. DO NOT INVENT or fabricate any data. If phone or email or address was not found, KEEP THEM EMPTY ("").
3. DO NOT use generic placeholders like "Průmyslová 12" or "+420 774 889 100".
4. Return strictly a JSON object with this shape:
{
  "companyName": "${extracted.companyName}",
  "phone": "${extracted.phone}",
  "email": "${extracted.email}",
  "address": "${extracted.address}",
  "city": "",
  "services": ${JSON.stringify(extracted.services)}
}`;

    const response = await withGeminiBackoff(() => ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    }));

    const text = response.text || '{}';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Only refine if field was already detected; NEVER fabricate from empty
    if (parsed.companyName && extracted.companyName && typeof parsed.companyName === 'string') {
      extracted.companyName = parsed.companyName.trim();
    }
    if (parsed.phone && extracted.phone && parsed.phone !== '+420 774 889 100') {
      extracted.phone = parsed.phone.trim();
    }
    if (parsed.email && extracted.email && !parsed.email.includes('example.com')) {
      extracted.email = parsed.email.trim();
    }
    if (parsed.address && extracted.address && !parsed.address.includes('Průmyslová 12')) {
      extracted.address = parsed.address.trim();
    }
  } catch {
    // Non-blocking fallback to scraped data
  }

  return extracted;
}

// Simple in-memory sliding window rate limiter
const ipRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (ipRequests.size > 500) {
    for (const [key, values] of ipRequests) {
      if (!values.some(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS)) ipRequests.delete(key);
    }
  }
  const timestamps = ipRequests.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequests.set(ip, validTimestamps);
    return false; // rate limited
  }

  validTimestamps.push(now);
  ipRequests.set(ip, validTimestamps);
  return true;
}

// 6. Main API Handler
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const token = String(req.headers?.authorization || req.headers?.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) {
    return res.status(401).json({ error: 'Pro analýzu webu je nutné přihlášení.' });
  }
  const authClient = createServerlessSupabaseClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Přihlášení pro analýzu webu není platné.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const ipKey = Array.isArray(clientIp) ? clientIp[0] : String(clientIp).split(',')[0].trim();
  
  if (!checkRateLimit(ipKey)) {
    return res.status(429).json({ error: 'Příliš mnoho požadavků na analýzu webu. Zkuste to prosím za chvíli.' });
  }

  const { url } = req.body || {};

  const validation = validateAndNormalizeUrl(url);
  if (!validation.valid || !validation.normalized) {
    return res.status(400).json({ error: validation.error || 'Neplatná URL' });
  }

  try {
    let analysis = await fetchAndParseWebsite(validation.normalized);
    analysis = await refineWithGemini(analysis);

    // Derive city from address if possible
    let derivedCity = '';
    if (analysis.address) {
      const cityMatch = analysis.address.match(/\d{3}\s?\d{2}\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž\s.-]+)/);
      if (cityMatch) {
        derivedCity = cityMatch[1].trim();
      }
    }

    const overallScore = Math.round(
      (analysis.confidence.companyName +
       analysis.confidence.logo +
       analysis.confidence.colors +
       analysis.confidence.contacts +
       analysis.confidence.services) / 5
    );

    // Backward-compatible branding object for existing UI components
    const branding = {
      name: analysis.companyName,
      website: analysis.website,
      logoUrl: analysis.logoUrl,
      primaryColor: analysis.primaryColor || '',
      phone: analysis.phone,
      email: analysis.email,
      city: derivedCity,
      address: analysis.address,
      services: analysis.services,
      confidenceScore: overallScore,
      faviconUrl: analysis.faviconUrl,
      heroImageUrl: analysis.heroImageUrl
    };

    // Clean audit object without fabricated claims or ratings
    const audit = {
      url: analysis.website,
      companyName: analysis.companyName,
      score: overallScore,
      websiteUxScore: analysis.confidence.colors > 0 ? 70 : 0,
      leadCaptureScore: analysis.confidence.contacts > 0 ? 60 : 0,
      responseAutomationScore: 0,
      customerExperienceScore: 0,
      googleReviewsRating: null,
      googleReviewsCount: 0,
      googleReviewsSummary: '',
      issues: [],
      recommendations: [],
      upgradedBenefits: [],
      analysisFailed: !analysis.companyName
    };

    // Return the EXACT JSON shape required by the user prompt at top-level
    const responsePayload = {
      companyName: analysis.companyName,
      website: analysis.website,
      logoUrl: analysis.logoUrl,
      faviconUrl: analysis.faviconUrl,
      primaryColor: analysis.primaryColor,
      secondaryColor: analysis.secondaryColor,
      phone: analysis.phone,
      email: analysis.email,
      address: analysis.address,
      services: analysis.services,
      heroImageUrl: analysis.heroImageUrl,
      socialLinks: analysis.socialLinks,
      confidence: analysis.confidence,
      branding,
      audit
    };

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    if (err?.isSsrf) {
      return res.status(400).json({ error: 'Přístup k lokálním a privátním síťovým cílům je z bezpečnostních důvodů zablokován.' });
    }
    console.error('Analyzer error:', err);
    return res.status(500).json({ error: 'Chyba při analýze webových stránek: ' + err?.message });
  }
}
