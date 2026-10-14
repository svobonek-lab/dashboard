# Audit pravdivosti dat v přihlášené aplikaci

**Datum:** 14. 10. 2026  
**Rozsah:** přihlášený owner, employee a platform admin; datové adaptéry; integrační obrazovky.  
**Mimo rozsah:** veřejná cesta `/demo`, která je výslovně označená jako read-only ukázka se syntetickými daty.

## Odstraněné zdroje falešných dat

- Admin Billing, Logs a Domains: zobrazovaly pevné tarify, tržby, firmy, domény a provozní události bez živého zdroje.
- Analytics, komunikace, kalendář, rozpočty, náklady, faktury, časové výkazy a plánování: používaly lokální stav nebo ukázkové hodnoty bez ověřeného produkčního kontraktu.
- Lokální Synology repository a starý `lib/synology`: duplikovaly serverový `connector/` a vracely lokální úspěšné výsledky.
- Vývojový SQL endpoint `api/test-sql.ts`: neprováděl skutečné připojení.
- Lokální integrační logy a sync engine: předvyplňovaly úspěšné synchronizace, které se nestaly.
- Lokální branding vrstva: vracela smyšlené firemní kontakty a služby.
- AI asistent, export ukázkového balíčku, webhook detail a onboarding studio: byly nepoužívané a obsahovaly simulované akce nebo výsledky.
- Employee Checklist a Profile: nebyly napojené na ověřený datový základ.

## Změněné produkční chování

- Přihlášená aplikace používá jediný browserový repository: `SupabaseRepository`.
- Chybějící Supabase konfigurace, tenant nebo zápisový kontrakt končí jasnou chybou; aplikace nevrací lokální úspěch.
- Načtení prázdných dat zůstane prázdné. Nevytváří se automaticky firmy, zaměstnanci, poptávky, ceny, kontakty ani termíny.
- Veřejný intake formulář nepotvrdí přijetí, pokud nebyl lead skutečně uložen přes ověřené RPC.
- Přepínač firem používá pouze organizace z přihlášeného kontextu.
- Owner navigace obsahuje jen funkce pilotního rozsahu s reálnou datovou cestou.

## Záměrně zachováno

- `/demo` používá `lib/demoData.ts`. Je izolované od přihlášené aplikace, read-only a v UI označené jako syntetická ukázka.
- Texty v input placeholderech slouží pouze jako příklad formátu a nejsou zobrazené jako uložený zákaznický záznam.
- Veřejná cena a kontaktní údaje landing page jsou obchodní obsah, ne databázová simulace.
- Vývojový `LocalSupabaseMock` zůstává pouze jako explicitní lokální testovací harness chráněný runtime policy; produkční datová cesta jej nepoužívá.

## Automatická ochrana proti návratu simulací

`tests/integration-honesty.test.ts` kontroluje nepřítomnost odstraněných admin a konektorových cest a zakazuje simulované firmy, generátory záznamů, pevné časy a lokální repository v přihlášených admin/employee vstupech. `tests/workspace-visual-system.test.ts` kontroluje, že owner layout znovu nepřidá falešné notifikace nebo AI asistenta.
