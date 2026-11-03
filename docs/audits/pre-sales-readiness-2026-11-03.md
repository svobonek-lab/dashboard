# Předprodejní audit StavbaFlow

**Datum:** 3. 11. 2026

**Rozsah:** aktuální větev PR #161, lokální aplikace a konektor, dostupné staging Playwright záznamy a read-only produkční prohlídka.

**Omezení:** Produkční Supabase zůstala read-only. Nečetl jsem hodnoty secrets ani zákaznické řádky; nepoužil jsem přihlášení do produkce, nezměnil prostředí, nenasadil aplikaci a neaplikoval SQL.

## Rozhodnutí

**NO-GO pro běžný samoobslužný placený provoz.** Zatím lze ukazovat výslovně označené read-only demo. Uživatelské aplikaci, billing, emailům a konektoru chybí několik aktuálních end-to-end důkazů nebo produkční konfigurace. Tento závěr neznamená, že všechny tyto funkce chybí v kódu; rozlišuje implementaci od ověřeného provozu.

## Ověření tohoto checkoutu

- Dashboard po opravách: `npm test` — 581/581 prošlo; `npm run lint` a `npm run build` prošly.
- Lokální Playwright smoke běžel nad falešnou Supabase URL a blokoval veškeré požadavky mimo localhost. Ověřil českou 404 obrazovku, přesměrování nepřihlášeného `/employee/jobs` při nakonfigurovaném testovacím klientu, vypnutou registraci a SPA načtení `/widget-iframe`. Při chybějící Supabase konfiguraci aplikace zobrazí explicitní „čeká na připojení“ stránku ještě před route guardem; v tomto stavu není prokázáno přesměrování na `/login`, ale workspace zůstává uzavřený. Nebyly žádné uncaught page errors; auth pokusy šly jen na neexistující host a byly přerušeny. Produkce ani staging nebyly kontaktovány.
- Connector: 84 testů prošlo, 11 databázových integračních testů bylo přeskočeno, protože nejsou připojeny izolované databázové fixture. Konektorový lint a build prošly.
- `npm audit --omit=dev`: žádné runtime zranitelnosti. Celý root dependency strom hlásil 7 moderate nálezů v nástrojích pro vývoj/lint, bez automaticky dostupné opravy. Connector dependency audit: žádné nálezy.
- Produkční Playwright audit ze stejného dne navštívil 31 tras v čisté nepřihlášené session. Nenastala žádná neblokovaná mutace. Zjištěn jeden 404 na `/widget-iframe.html`; přihlášené produkční toky tím ověřeny nebyly.
- Nejnovější staging E2E běh `41639187873`: 7 úspěchů, 4 selhání. Tenant REST/Storage izolace, zaměstnanecké scope a veřejný intake prošly. Owner A měl zrušené předplatné, takže owner navigace a závislé kroky včetně Sentry nebyly potvrzeny.

## Stav funkcí

| Oblast | Co kód umí | Co je doloženo | Stav pro zákazníka |
|---|---|---|---|
| Owner a lead workflow | Tenantově omezené čtení, lead detail, přiřazení a řízená změna stavu | Unit/kontraktní testy; staging owner A v posledním běhu zablokovalo zrušené předplatné | Další aktuální owner E2E nutný |
| Employee | Přiřazené leady/zakázky, omezené změny, oddělení firmy | Zaměstnanecké a cross-tenant testy prošly v posledním staging běhu | Nezávisle je nutné zopakovat po změnách PR |
| Tenant izolace | RLS/REST/Storage obrany a oddělené role | V posledním běhu prošly negativní kontroly company A proti B | Dobrý důkaz pro testovaný staging scénář, ne certifikace produkční RLS |
| Poznámky a soubory | Aplikační UI a privátní Storage kontrakty | Metadata snapshot 30. 10. uvádí tabulky `app_notes`, `app_lead_files`, dva privátní buckety a úspěšný Storage round trip | Staging evidence existuje; ověřit proti přesnému aktuálnímu buildu |
| Veřejný intake | Tenant-key formulář, idempotence, rate limit, ochrana proti oversized/honeypot požadavkům | Staging E2E/load acceptance prošly; produkční formulář na auditu hlásil nedostupný stav | Produkční intake zatím zákazníkům neslibovat |
| CSV import/export | Dry-run, mapování, idempotence, export s tenant filtrem | Unit testy a staging rollback existují; poslední owner průchod se zastavil na subscription gate | Aktuální plný owner zápis/import acceptance chybí |
| BYODB / Synology | UI průvodce, metadata inspekce, mapování, dry-run a queue kontrakty | 84 connector testů; 11 integračních případů přeskočeno | Žádný immutable image digest ani úspěšný customer-like Synology acceptance; zatím neveřejná pilotní funkce |
| Stripe | Checkout, webhook, billing portal a stavy předplatného | TEST průchody v stagingu prokázaly checkout, webhook/cancellation; jedna testovací firma byla aktivní před nákupem, proto není prokázána příčinná vazba „platba udělila přístup“ | Produkční Stripe ceny, webhook a tenant plan mapping nejsou doložené |
| E-mail / pozvánky | Nový šifrovaný outbox, retry a bezpečné odkazy v PR #161 | Lokální testy; staging SQL ani skutečné doručení této verze neověřeny | Nezapínat před staging acceptance; Vercel worker běží jen jednou denně |
| Sentry | Omezené tagy a error boundary v kódu | Dřívější 11/11 staging běh Sentry test prošel; poslední běh se zastavil dřív kvůli owner A subscription gate | Zopakovat na aktivním syntetickém ownerovi |
| Demo/landing | Syntetická read-only ukázka a marketingová stránka | Playwright ověřil render a mobilní šířky; žádné demo zápisy | Vhodné jako označená ukázka, ne důkaz funkcí CRM |
| Další moduly | Kalendář, analytika, nabídky, dokumenty, komunikace a portál jsou viditelně blokované | Kód je označuje jako nedostupné | Neprezentovat jako zahrnuté funkce |

## Blokátory pro placený provoz

### P0 — vyřešit před zákaznickým workspace

1. **Vlastní HTTPS doména:** produkční inventář 3. 11. neobsahuje `PUBLIC_APP_URL` ani `PUBLIC_LANDING_URL`; dřívější kontrola nepotvrdila DNS `stavbaflow.cz`. Bez ověřené domény nelze spolehlivě ověřit pozvánky, reset hesla a návrat z plateb. Audit doménu ani nekupoval.
2. **Produkční databázový důkaz:** poslední připsatelná produkční metadata/migration snapshot chybí. Inventáře z 2. a 3. 11. si odporují v dostupných informacích o `VITE_PILOT_WRITES`; účinný stav proto zůstává neznámý. Zápisy nepovolovat a netvrdit, že je flag vypnutý, dokud read-only ověření nepotvrdí efektivní produkční hodnotu a člověk samostatně neschválí zápisy. Produkční Supabase inspection MCP z `AGENTS.md` v této relaci není dostupný.
3. **Produkční billing:** Stripe produkční proměnné/ceny nebyly potvrzeny. Staging TEST není důkazem produkční ceny, webhooku, přístupu po platbě, obnovení ani správného plánu. Produkční konfiguraci neprovádět bez schváleného obchodního nastavení.
4. **Pozvánky:** PR #161 přidává šifrovaný outbox a SQL návrhy, které nejsou v cílovém prostředí nasazeny. Při současném denním cron rozvrhu může e-mail čekat téměř den. Doručení, odkaz, resend, retry i přijetí je nutné ověřit na stagingu a rozhodnout o bezpečné worker frekvenci.
5. **Aktuální staging owner acceptance:** připravit aktivní syntetický účet a zopakovat přesný build po změnách; současný owner A účet je zrušený. Neaktivovat `VITE_PILOT_WRITES` ani neměnit subscription řádek ručně kvůli testu.
6. **Customer database konektor:** před veřejným příslibem vydat digest-pinned image a projít instalační, síťovou, read-only, mapovací, idempotentní importní a recovery cestu na izolované Synology/SQL fixture.

### P1 — před širším prodejem

- Doplnit schválenou firemní identitu, obchodní podmínky a datové informace před uzavřením skutečných smluv/plateb. Jejich odklad je záměrný, ale neznamená, že je lze vynechat při zahájení prodeje.
- Připravit funkční zákaznický kontaktní/onboarding postup. Samostatná registrace a produkční intake jsou nyní nedostupné.
- Ověřit zálohu a skutečný restore drill, retenci, export/delete požadavky, incident kontakty a podporu. Repozitář obsahuje runbooky; běžný restore drill není důkazem aktuálního backupu.
- Připravit tenant/role acceptance matici pro exporty, přílohy, změny stavu, pozvánky, fakturaci a konektor při opětovném ověření aktuálního produkčního schématu.
- Zopakovat syntetickou Sentry událost a ověřit produkční alert routing po přihlášení na stagingu; nepoužívat osobní ani zákaznické údaje v tagách.

## Opravy provedené v této větvi

- Route guard chrání chráněné cesty při nakonfigurované aplikaci a veřejné cesty jsou explicitní allowlist; při chybějící Supabase konfiguraci se zobrazí uzavřená setup-required stránka před vyhodnocením tras. Podobně pojmenované widget URL se nepovažují za veřejné.
- Neznámé cesty dostanou českou stránku „Tahle stránka neexistuje“ místo pádu do dashboardu.
- `/widget-iframe.html` trvale přesměruje na podporovanou extensionless cestu `/widget-iframe` a zachová query parametry tenant klíče, aby zděděný embed nevracel Vercel 404 ani neztratil tenant kontext.
- Stránka `/register-paid` přestává označovat uživatelskou registraci za testovací a přestává odkazovat na kontrolu testovací ceny Stripe.

Tyto změny jsou pouze v revizní větvi. Vercel Preview je pro tuto větev výslovně vypnutý, protože její prostředí nebylo ověřeno jako oddělené od produkce; změny nejsou nasazené a nemají produkční Playwright důkaz.

## Doporučené pořadí dalších kroků

1. Autoritativně potvrdit produkční write flag a schéma/RLS/grants přes schválený read-only kanál; nic nezapisovat.
2. Zprovoznit a ověřit owner/employee, e-mail a Sentry na aktivním syntetickém staging tenantovi pro přesný commit.
3. Vyřešit doménu a zákaznický kontakt bez automatického nákupu domény; připravit produkční Stripe až po schválení identity/cen.
4. Vydat a otestovat BYODB image/digest před nabídkou reálného zákaznického konektoru.
5. Opakovat Playwright na nové produkční verzi pouze pro veřejné/read-only obrazovky a autentizované scénáře na izolovaném stagingu.

## Důkazy a odkazy

- [Read-only production Playwright audit](../playwright-production-readonly-2026-11-03.md)
- [Production readiness metadata report](../production-readiness-2026-11-03.md)
- [Prompt acceptance 1–8 evidence, dated 31 Oct](../prompt-acceptance-status.md)
- [Current work plan and connector acceptance blockers](../../WORKPLAN.md)
- [StavbaCore staging schema drift / Storage acceptance, 30 Oct](../stavbacore-staging-schema-drift-2026-10-30.md)
- [Billing TEST acceptance](../billing-acceptance.md)
- Review branch: [PR #161](https://github.com/svobonek-lab/dashboard/pull/161), open and unmerged. At audit time GitHub reported no check runs for the head commit.
