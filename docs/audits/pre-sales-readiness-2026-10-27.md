# Předprodejní audit StavbaFlow

**Datum:** 27. 10. 2026
**Zdroj:** aktuální větev `codex/sales-readiness-prompts-1-10-resume`, zdrojový kód, smluvní testy a dostupné CI/Playwright záznamy.
**Hranice auditu:** lokální syntetické testy prokazují chování kódu v testovaném scénáři. Samy o sobě nepotvrzují aktuální nasazení, produkční RLS, nastavení Vercelu/Supabase, doručování e-mailů ani bezpečné použití zákaznické databáze.

## Shrnutí

Aplikace má skutečné implementované části pro práci s poptávkami, přidělování zaměstnancům, řízené změny stavů, poznámky/přílohy, veřejný příjem poptávky, CSV import a export a oddělení rolí. Jejich produkční použitelnost závisí na povolených release příznacích, schváleném `app_*` schématu/RLS a správném prostředí. Není doložen end-to-end provoz těchto částí proti aktuální staging databázi.

Některé viditelné položky jsou záměrně nedostupné; jejich route je v `src/shared/lib/pilotScope.ts` označena jako mimo rozsah pilotu. BYODB má implementované UI i podstatnou část klient/server/connector kontraktů, ale připojení zákaznické databáze není doloženo jako nasazená a akceptovaná služba. Nabízet ho jako „kliknutím připravenou“ produkční integraci by bylo předčasné.

## Funkce: skutečná implementace vs. důkaz

| Oblast | Co je skutečně v kódu | Co důkaz potvrzuje | Stav pro zákaznický prodej |
| --- | --- | --- | --- |
| Majitel: přehled, poptávky, kanban, detail | Čtení a ukládání jsou vedené přes aplikační datové rozhraní; změny se zobrazí až po potvrzení uložení. | Unit/kontrakt testy pokrývají persistence-before-UI, přechody stavů, přidělování a tenant filtr. Historický Playwright průchod otevřel tyto stránky read-only. | Implementováno; současné živé zápisy a RLS vyžadují acceptance na izolovaném stagingu. |
| Zaměstnanec: přiřazené zakázky a postup práce | Seznam je omezen na přiřazení a tenant; role má povolené přechody stavů. | Testy ověřují skrytí cizích/nepřiřazených zakázek a odmítnutí nepovolených změn. Historický Playwright průchod ověřil zobrazení syntetického účtu, bez změny záznamu. | Logika implementována; autentizované zápisy nebyly v posledním role-based průchodu živě otestovány. |
| Poznámky a přílohy zakázky | Tenant-scoped poznámky a soubory, author stamp, privátní Storage a řízené mazání (owner nebo autor do 15 minut). | Disposable SQL acceptance a UI kontrakty jsou v CI; obrazovka nepředstírá úspěšný upload. | **V aktuálním staging snapshotu chybí `app_lead_notes` i `app_lead_files`**, proto živá persistence není potvrzena a tento tok nelze pro staging ani prodej označit za funkční. Vyžaduje schema reconciliation, separátní review, staging rollout a skutečný syntetický upload. |
| Veřejný formulář | Tenant-bound příjem, validace, idempotence a serverová ochrana proti zneužití jsou připraveny v API/SQL návrhu. | Lokální testy ověřují hranici API a SQL kontrakty. | Nová migrace rate limitu je jen zdrojový návrh; nebyla aplikována na staging. Bez jejího bezpečného rollout/acceptance nedávat formulář do placené kampaně. |
| CSV import | Parsování CSV, kontrola hlaviček/mapování, dry-run a stabilní fingerprint pro idempotentní opakování. | Syntetické unit testy. | CSV cesta je k dispozici; provozní přijetí na stagingu a limity reálného souboru je potřeba projít před prvním onboardováním. Přímé SQL/Sheets importy jsou výslovně nedostupné. |
| Export firmy | Owner-only kontrola aktivního členství, přímé dotazy přihlášeným Supabase klientem pod RLS, leads/zaměstnanci/dostupná historie; bez ID, tokenů a hashů v CSV; ošetření CSV formulí. | Syntetické testy konstrukce i zdrojového tenant filtru prošly. | Implementováno v kódu, živé RLS ověření na stagingu chybí. Historie se může označit jako nedostupná, pokud tabulka/kontrakt chybí. |
| Logout a cache | Mazání verzovaných tenant cache i starých workspace cache při odhlášení. | Regresní test pokrývá vymazání a zachování uživatelských preferencí. | Implementováno; přihlášení druhým syntetickým tenantem ověřit v staging E2E. |
| Integrace zákaznické SQL DB (BYODB) | UI průvodce, bezpečné enrollment, metadata-only inspekce, mapování, dry-run, explicitní schválení a fronta omezených zápisů; tajemství nejsou určena do klientského bundle. | Kontrakty a syntetické testy pokrývají tenant scope, replay/idempotenci, mapování a provozní stavy. UI má testy, že je ovladatelné a ukazuje stav. | **Nasazení není akceptováno:** chybí doložený immutable image release, oddělený staging source, dokončený acceptance běh na Synology a ověřené recovery/rollback. Databázi zákazníka zatím nepřipojovat jako hotovou službu. |
| Admin: přehled a adresář firem | Skutečné admin API a ochranné role; mobilní karty a desktopová tabulka. | Testy autorizačních hranic a Playwright test rozložení 375/1280 px bez odeslání změn. | UI použitelné; založení firmy/invitace a placené onboardování potřebují staging acceptance a právní/platební release brány. |
| Platby a fakturace | Stripe webhook ověřuje podpis, tenant vazbu, idempotenci a odmítá neuhrazené checkouty. | Unit/contract testy. | Testované v kódu; není doložen celý živý test-mode nákup, webhook, zrušení a opakování na Preview. Nezapínat reálné účtování bez této brány. |
| E-mail a outbox | Scheduler, retry/error handling a nová durable run-evidence tabulka s agregovanými počty. | Kód a disposable SQL CI kontrakt; lokální testy 27. 10. | Nová migrace je pouze zdrojový kód. Dokud není schváleně aplikována v cílovém prostředí a otestováno doručení, scheduler má fail-closed a e-mailové upozornění není provozně potvrzeno. |
| Sentry | Inicializace jen s DSN, tagy omezené na interní UUID firmy a schválenou roli. | Kontrakt testy. | Konfigurace alertů, release a syntetická událost v prostředí nejsou doloženy. |

## Obrazovky a funkce záměrně nedostupné v pilotu

`src/shared/lib/pilotScope.ts` explicitně označuje tyto cesty jako unavailable: `/calendar`, `/analytics`, `/quotes`, `/documents`, `/communication`, `/integrations/synology` a `/portal`. Nesmí se prezentovat jako hotové funkce. Přímý SQL a Google Sheets import jsou podle import runbooku také vypnuté; dostupná je řízená CSV cesta. Paid onboarding zůstává za release bránou.

To, že route/menu, formulář, karty integrace či tlačítko existují, prokazuje pouze existenci UI. Funkční tok vyžaduje navazující API/RPC, potvrzenou persistenci a test tenant/role oprávnění v reálném neprodukčním prostředí.

### Co je skutečně obsloužené kódem a co je pouze obrazovka

- **Implementovaný tok v kódu, bez potvrzené live acceptance:** majitelova nástěnka a poptávky; změna stavu a přiřazení; přehled zakázek odvozený z uložených poptávek; zaměstnanecký seznam přiřazených zakázek; CSV dry-run/import/export; pozvánky a profil firmy; e-mailový outbox; platformní adresář a onboarding firem. Tyto toky mají repository/API/SQL kontrakty a testy, ale aktuální staging účet se zastaví na `NO_ACTIVE_MEMBERSHIP`, takže tento audit nepotvrzuje jejich živý zápis.
- **Konkrétní UI nad připraveným, ale v stagingu chybějícím DB kontraktem:** poznámky a přílohy; uploader v kódu po potvrzeném uložení umí zobrazit soubor, ale staging snapshot nemá odpovídající dvě tabulky. Žádné nahrání do živého stagingu se nezkoušelo.
- **Obrazovka s bezpečným placeholderem, nikoli hotová funkce:** kalendář, analytika, nabídky, dokumenty jako samostatný modul, komunikace, portál a cesta `/integrations/synology`. Nejsou součástí povoleného pilotního rozsahu.
- **Prodejní demo:** statická sada syntetických dat pouze pro čtení; interaktivní kalkulačka počítá v prohlížeči z modelových hodnot; kontakt otevře e-mailový draft nebo přesměruje na nakonfigurovaný externí booking. Samo o sobě nevytváří rezervaci ani serverový lead.
- **Synology/BYODB:** stránka Integrace nabízí skutečný setup průvodce (stav konektoru, enrollment, schéma, mapování, dry-run a explicitní schválení) a connector server má testované kontrakty. Konkrétní připojení ale nebylo přijato na Synology ani vydáno s immutable image digestem; karta/uživatelský průvodce tedy neznamená, že zákazník už může bezpečně nasadit produkční zdroj.

## Veřejný vstupní bod

Dashboard Preview `/` vrací přihlašovací/onboarding obrazovku. Samostatný sales projekt `jobflow-pro` má živou produkční stránku [jobflow-pro-brown.vercel.app](https://jobflow-pro-brown.vercel.app/), která při Playwright read-only načtení vrátila HTTP 200 a vykreslila obsah. Interaktivní demo CTA otevřelo [dashboard-tau-snowy-61.vercel.app/demo](https://dashboard-tau-snowy-61.vercel.app/demo) s viditelným označením „Pouze pro čtení / Syntetická data“. Kalkulačka přepočítá své modelové hodnoty v prohlížeči a sama je správně označená jako orientační scénář; kontaktní modal se otevře, ale zdrojový handler připravuje `mailto` nebo externí booking handoff, nikoli rezervaci uloženou na serveru. Odkazy VOP, GDPR i DPA v živé produkci otevřely pouze stav „Právní dokumenty připravujeme“, takže smluvní dokumenty nejsou připravené k uzavření pilotu. Žádný veřejný formulář nebyl odeslán.

Veřejná produkční landing stále obsahuje formulace „ověřený pilotní tok“ a „funkce ověřené ve stagingu“. Dashboard login má navíc badge „Ověřený firemní pilot“. Nejnovější owner-only staging acceptance skončil `NO_ACTIVE_MEMBERSHIP`, takže tato tvrzení jsou v přesném nasazeném stavu silnější než aktuální důkazy. V tomto draft PR je copy změněno na „scénář pilotu / plánované funkce pro první nasazení“, login badge na „Firemní pilot StavbaFlow“ a přidána podmínka staging přejímky před zákaznickými daty. Změny zatím nejsou nasazeny do produkce.

Landing Preview pro commit nemohl být živě ověřen: Vercel deploy sice prošel, ale po otevření přesměroval na Vercel login/SSO a `/api/jwt` vrátil 403. Repository secret `STAGING_PREVIEW_BYPASS_TOKEN` chybí. Registrace nového workspace je ve výchozím nastavení vypnutá; onboarding CTA připravuje e-mailový draft a uživatel ho musí dokončit ve své e-mailové aplikaci. Před prodejním spuštěním dokončit staging acceptance, ověřit novou copy na Preview a ověřit kontaktní cestu bez předstírání rezervace.

## Release blokery před prvním zákazníkem

1. **Staging acceptance:** dokončit owner, employee, public-intake, odhlášení/cache a izolaci dvou firem se syntetickými účty. Owner-only Playwright acceptance `40475134128` 27. 10. 2026 ověřil, že Supabase Auth přijalo syntetické owner přihlašovací údaje (`/auth/v1/token` HTTP 200), ale aplikace vrátila `NO_ACTIVE_MEMBERSHIP` a průvodce se neotevřel. Účet tedy existuje v Auth; aktivní členství firmy není potvrzené. Dvou-tenant E2E navíc nemá v GitHub proměnných požadovaná fixture IDs a public intake key.
2. **Databázové kontrakty:** aktuální `app_*` schéma se liší od historických číslovaných migrací. JWT/RLS návrh zůstává návrhem, dokud není reconciliován proti čerstvým metadata-only údajům. Žádná migrace z tohoto auditu nebyla aplikována na staging nebo produkci.
3. **Veřejný intake:** dokončit izolovaný PostgreSQL acceptance pro navrženou rate-limit migraci, provést separátní kontrolu a následně ověřit pouze na schváleném stagingu.
4. **Outbox:** novou `20261027000000_app_email_outbox_runs.sql` ověřit v GitHub disposable CI; teprve po revizi rozhodnout o migraci do cílového prostředí a o testovací zprávě.
5. **BYODB:** získat samostatný staging zdroj s umělými daty, publikovat neměnný image digest, instalovat na testovací Synology a prokázat inspekci, dry-run, schválený zápis, tenant izolaci, replay a obnovu.
6. **Prodejní identita a provoz:** potvrdit IČO/sídlo a právní dokumenty, provider env proměnné, backup/restore, e-mail, Sentry a Stripe test mode podle `docs/go-live-checklist.md`.
7. **CI/Preview a token:** Vercel a verify byly naposledy ověřeny jako zelené na starších commitech uvedených níže; živý stav kontrol aktuální draft větve se nepodařilo načíst kvůli opakovaným GitHub API TLS timeoutům. Push do větve PR proběhl. GitHub Actions secret `SUPABASE_ACCESS_TOKEN` existuje a metadata-only workflow `40462790973` s ním prošel. Protože byl PAT vložen do konverzace v otevřeném textu, zneplatni/rotuj ho a nahraď v Actions novým scoped tokenem. Staging schema drift je popsán níže.

## Doporučená posloupnost nabídky

- **Pilot s osobní asistencí:** poptávky, tým, přiřazení, řízené stavy, CSV import a export lze představit jako hlavní rozsah, ale nejdříve projít jejich zápisy a tenant izolaci na stagingu.
- **Druhá fáze:** přílohy, e-mailová upozornění, platby a zákaznický BYODB nabídnout až po odpovídajícím provozním acceptance. BYODB výslovně prodávat až po Synology acceptance na neměnném vydání.
- **Neprodávat jako dostupné:** portál, kalendář, analytiku, nabídky, dokumenty, komunikaci, přímý SQL/Sheets import ani paid self-service onboarding, dokud release scope v kódu a staging acceptance nezmění stav.

## Reprodukovatelné lokální ověření v této relaci

- `npm test` — poslední lokální běh 410/410 prošel; `npm run lint` a `npm run build` také prošly po úpravě sales/login copy a opravě retry ověření režimu firmy v nastavení (27. 10. 2026).
- GitHub Actions verify run `40466262183` na starším PR head `016994267407a358624925ca2175df613ace05ce` prošel, včetně izolovaných PostgreSQL kontraktů, testů, lint a buildu. To není důkaz pro pozdější změny na tomto PR. Vercel Preview `dashboard` i `jobflow-pro` byly ověřeny jako success na commitu `7cc5590`; aktuální head musí mít vlastní zelené kontroly před schválením. Poslední lokální kontrola větve: root `npm test` 408/408, lint/build prošly; `connector` npm test 83 prošlo, 6 databázových integrací přeskočeno, lint/build prošly.
- Playwright smoke test stejného dashboard Preview na šířkách 375 a 1280 px prošel pro `/`, `/login`, `/owner/login`, `/employee/login`, `/dashboard`, `/employee`, `/admin` a `/integrations`: HTTP 200, přítomný e-mail/heslo formulář, žádná JavaScript page error. Chráněné cesty bez session skončily na `/login`. Tím se potvrzuje pouze načtení a přesměrování, ne přihlášení, tenant data ani živé zápisy.
- Produkční landing a veřejné demo byly read-only ověřeny přes Playwright. V draft PR byla upravena landing copy a dashboard login badge; lokální Playwright na 375/1280 px potvrdil absenci horizontálního overflow, otevření kontaktního modalu, změnu ROI kalkulačky a žádné JS chyby. Dodatečný desktopový průchod na 1280 px ověřil nový badge „Firemní pilot StavbaFlow“; landing build (`VITE_DEPLOYMENT_SURFACE=landing`) na `/` vykreslil upravenou copy bez starých staging tvrzení a bez page errors. Změna copy zatím není v produkci; interaktivní přihlášení ani zápis nebyly odeslány.
- GitHub Actions staging secrets obsahují syntetické přihlašovací údaje owner A, employee A a owner B a staging publishable key; v aktuálním seznamu proměnných ale chyběly `PRODUCTION_BASE_URL`, `STAGING_COMPANY_A_ID`, `STAGING_COMPANY_B_ID`, `STAGING_EMPLOYEE_A_ID` a `STAGING_PUBLIC_TENANT_KEY`. `STAGING_PREVIEW_BYPASS_TOKEN` také nebyl v seznamu secrets. Staging dvou-tenant E2E proto z tohoto nastavení nelze bezpečně spustit. GitHub CLI kontrola tohoto inventáře byla při posledním pokusu blokována TLS timeoutem; hodnoty secretů nebyly čteny ani vypisovány.
- Užší owner-only Playwright acceptance (`connector-owner-ui`, workflow run `40466843417`) selhal před otevřením BYODB: účet se ověřil přes izolovaný staging Auth, ale chybí aktivní členství.
- Následná owner-only kontrola na aktuálním headu (`40475134128`) zopakovala stejný stav. Workflow, který používá staging heslo a Preview bypass token, nyní běží pouze ručně po výslovném potvrzení `confirm_isolated_staging`; PR kód ho nespouští automaticky. Kontrola zůstává striktní: chybějící členství je selhání acceptance, nikoli úspěšně přeskočená obrazovka.
- Neprovedeno: staging/produkční DB přístupy či zápisy, live owner/employee mutace, skutečné e-maily, Stripe transakce, živé napojení Synology a zákaznická data.

## Ověřené externí kontrolní rámce

Tohle nejsou právní stanoviska ani certifikace. Před prodejem má právník potvrdit konkrétní roli StavbaFlow (zpracovatel/správce), znění DPA, seznam sub-zpracovatelů, dobu uchování a offboarding/export. ÚOOÚ uvádí, že IT/cloud poskytovatel může být zpracovatelem, DPA má pokrýt náležitosti čl. 28 GDPR a sub-zpracovatele; incidentní postup má popsat rychlé předání informací správci. [ÚOOÚ – Zpracovatel](https://uoou.gov.cz/poradna/poradna-gdpr/zpracovatel), [GDPR na EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679).

Předprodejní provozní kontrola by měla obsahovat prokazatelný restore test a periodické posouzení technických/organizačních opatření; GDPR čl. 32 mezi příklady uvádí důvěrnost, dostupnost a odolnost, obnovení dostupnosti a pravidelné testování. Incident runbook má mít jasné kontaktní místo a postup pro rychlé vyrozumění zákazníka; ÚOOÚ připomíná, že správce hlásí příslušná porušení pokud možno do 72 hodin, zatímco zpracovatel informuje správce bez zbytečného odkladu. [GDPR čl. 32–33](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679), [ÚOOÚ – porušení zabezpečení](https://uoou.gov.cz/profesional/poruseni-zabezpeceni-osobnich-udaju).

Pro multi-tenant CRM doporučuje OWASP odvozovat tenant kontext z ověřené identity/členství, testovat cross-tenant zamítnutí pro tabulky i úložiště a automatizovat autorizační regresní matici při každé změně. To odpovídá zdejšímu hlavnímu release blockeru: unit/SQL kontrakty jsou přítomné, ale je třeba doložit čerstvý dvou-tenant acceptance v přesném staging buildu. [OWASP Multi-Tenant Security](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html), [OWASP Authorization Regression Testing](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html).


## Fresh staging metadata-only snapshot (27. 10. 2026, 06:43 UTC)

Workflow `verify.yml` run `40462790973` succeeded. It queried only `pg_catalog` / `information_schema` metadata and read Supabase Auth config; it did not select customer rows or execute writes. Staging ref `xwzweltjvreqhjpbjrxa` differed from production `oncmtmrhmjlerbwkrecv`.

- 20 `public.app_*` relations; every relation has RLS enabled, none has FORCE RLS. Exact relation set: `app_audit`, `app_companies`, `app_costs`, `app_demo_requests`, `app_email_outbox`, `app_handovers`, `app_imports`, `app_integrations`, `app_invites`, `app_invoices`, `app_job_budgets`, `app_leads`, `app_members`, `app_notes`, `app_quotes`, `app_rate_limits`, `app_reminders`, `app_requests`, `app_tasks`, `app_time_entries`.
- This set contains neither `app_lead_notes` nor `app_lead_files`; do not infer that the separately tested notes/files migration exists in staging. The observed schema drift blocks treating the related UI as a live feature there.
- 202 columns and 36 policies were returned. The read-only query returned empty table-grant and column-grant inventories; verify the grant-query behavior before treating that as proof that grants are absent.
- 32 function signatures were returned, including `public.app_role(uuid)` and `public.app_can_lead(uuid, uuid)`; no matching `app_private.app_role` helper was reported.
- Supabase Auth reported custom access-token hook disabled and unconfigured.

This conflicts with `20261025000000_secure_jwt_auth_hook.sql`, which expects 19 different `app_*` relations and helpers in `app_private`. Keep it unapplied; revise its schema matrix/preflight only after the actual metadata output has been reconciled, and retain separate review plus staging rollout evidence. Do not check this snapshot file into the repository because full policy and grant metadata could disclose security internals; the workflow run is the evidence link.
