# Revize českých textů

Stav k větvi `codex/czech-copy-review`. Inventář níže vzniká z `src/` příkazem `node scripts/copy-inventory.mjs`. Doplňkový průchod `rg -n -i 'Odeslat|Submit|Error|Chyba' src` zachytává také dynamické chybové větve, které statický rozbor neumí převést na text.

## Pravidla

- Akční tlačítko začíná slovesem v infinitivu. Během čekání používá stejné sloveso v přítomném čase; potvrzení pojmenuje dokončenou akci.
- Navigační záložka označuje cíl nebo filtr, nikoli změnu dat. Její název se při čekání nemění.
- Chyba říká, co se nestalo, a nabízí další krok. Texty z výjimek, odpovědí služeb a interní kódy se nevypisují přímo uživateli.
- Prázdný stav obsahuje jednu větu o stavu a jednu dostupnou akci. Stav vypnuté funkce není prázdný seznam.

## Tabulka změn

| Místo | Původní text | Nový text / průběh |
| --- | --- | --- |
| Přihlášení | Surové `err.message` / „Neznámá chyba“ | „Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo a zkuste to znovu.“ |
| Registrace | Surové `err.message` | „Účet se nevytvořil. Zkontrolujte údaje a zkuste to znovu.“ |
| Nastavení hesla | Surové `err.message` | „Heslo se nenastavilo. Zkontrolujte odkaz a zkuste to znovu.“ |
| Pozvánka zaměstnance | „Odeslat pozvánku“ → „Vytvářím…“ → „Pozvánka byla vytvořena…“ | „Vytvořit pozvánku“ → „Vytvářím pozvánku…“ → „Pozvánka vytvořena a zařazena k odeslání.“ |
| Obnova hesla zaměstnance | „Obnova hesla“ | „Obnovit heslo“ → „Odkaz pro obnovu hesla zařazen k odeslání.“ |
| Přiřazení zakázky | „Uložit přiřazení“ → „Ukládám…“; surová chyba | „Uložit přiřazení“ → „Ukládám přiřazení…“ → „Přiřazení uloženo“; při chybě „Přiřazení se neuložilo. Zkontrolujte připojení a zkuste to znovu.“ |
| Údaje ze stavby | „Uložit údaje ze stavby“ → „Ukládám…“; surová chyba | „Uložit údaje ze stavby“ → „Ukládám údaje ze stavby…“ → „Údaje ze stavby uloženy.“ |
| Přílohy | Surové chyby načtení, uložení a smazání | Konkrétní neúspěšná akce a „zkuste to znovu“; „Nahrát soubor“ → „Soubor nahrán.“ |
| Fotografie zaměstnance | „Vyfotit / nahrát“ → „Nahrávám…“; surové chyby | „Nahrát fotografii“ → „Nahrávám fotografii…“ → „Fotografie nahrána k zakázce.“ |
| CSV import | „Importuji data do CRM...“; `res.message` / `e.message` | „Importovat N poptávek“ → „Importuji poptávky…“ → počet zpracovaných poptávek; při chybě další krok bez technického textu |
| Export | „Připravuji export…“; surová chyba | „Stáhnout CSV“ → „Připravuji CSV ke stažení…“; při chybě znovu stáhnout |
| Platební stránka | „Přejít k platbě“ → „Otevírám platbu…“ | „Otevřít platební stránku“ → „Otevírám platební stránku…“ |
| Veřejná poptávka a kontakt | „Odesílám…“, „Otevírám kontakt...“ | „Odeslat poptávku“ → „Odesílám poptávku…“; „Otevřít rezervační kalendář“ → „Otevírám rezervační kalendář…“; „Připravit e-mail s žádostí“ → „Připravuji e-mail s žádostí…“ |
| Nedostupný veřejný formulář | „Odkaz není platný nebo firma příjem poptávek zatím neaktivovala.“ | „Formulář se pro tento odkaz neotevřel. Požádejte firmu o nový odkaz.“ |
| Nastavení profilu a plateb | „Zkusit znovu“, „Spravovat platbu“, „Ukládám…“ | „Ověřit režim znovu“ → „Ověřuji režim…“; „Otevřít správu plateb“ → „Otevírám správu plateb…“; „Uložit profil“ → „Ukládám profil…“ |
| Konektor | Surové chyby mapování a příkazu; viditelné „image digest“ | Popis neuloženého mapování nebo nepotvrzené změny, výzva k opravě či opakování; text o schváleném vydání |
| Admin firmy | „Nová firma“, „Zakládám…“, „Vytvářím…“; surové chyby akcí | „Založit firmu“, „Zakládám firmu a zvu vlastníka…“, „Spouštím podporu…“; chyba vždy popíše neprovedenou akci a další krok |
| Navigace a filtry | „Přehled“, „Poptávky“, „Dokončeno“, „K vyřízení“ | „Zobrazit přehled“, „Zobrazit poptávky“, „Zobrazit dokončené“, „Zobrazit k vyřízení“ |
| Veřejná patička | „Přihlášení“, „Interaktivní demo“, „VOP“ | „Přihlásit se“, „Otevřít demo“, „Otevřít VOP“ |
| Pracovní stav zakázky | „Tento krok není v pracovním postupu povolený.“ | „Stav zakázky se nezměnil. Vyberte následující povolený krok.“ |
| Chybné firemní čtení | Zpráva s názvem služby nebo interní tabulky | „Firemní data se nenačetla. Obnovte stránku nebo kontaktujte podporu.“ |
| Prázdné seznamy | Dvě věty bez akce | Jedna věta a akce pro obnovení, vymazání hledání, otevření poptávek nebo vytvoření pozvánky |

## Inventář ze `src/`

Následující tabulky zachycují staticky zjistitelné popisky. `[dynamic/icon]` znamená ikonu nebo popisek složený až za běhu; přístupná jména jsou dále v tabulce atributů. `error-candidate` zahrnuje i interní `throw new Error`, které se nemusejí zobrazovat. `error-visible` mapuje obsah oblastí `role="alert"`; u dynamických hodnot je třeba ověřit také místo, kde se nastavují.

### button

| Soubor | Řádek | Text |
| --- | ---: | --- |
| src/app/App.tsx | 375 | Zkusit znovu |
| src/app/App.tsx | 420 | Vrátit se na dashboard |
| src/app/App.tsx | 568 | ✕ |
| src/app/providers/ErrorBoundary.tsx | 84 | Obnovit stránku |
| src/app/providers/ErrorBoundary.tsx | 92 | Zkopírováno \| Kopírovat diagnostiku |
| src/app/providers/ErrorBoundary.tsx | 100 | Vymazat mezipaměť |
| src/app/RoleGuard.tsx | 87 | Přejít na můj dashboard |
| src/app/RoleGuard.tsx | 95 | Vrátit se |
| src/app/SubscriptionGuard.tsx | 65 | Otevírám platební stránku… \| Otevřít platební stránku |
| src/features/employee-workflow/ui/EmployeeDashboard.tsx | 62 | Otevřít detail |
| src/features/employee-workflow/ui/EmployeeDashboard.tsx | 63 | Ukládám stav zakázky… |
| src/features/employee-workflow/ui/EmployeeDashboard.tsx | 69 | Obnovit zakázky |
| src/features/export-company-data/ui/CompanyDataExport.tsx | 41 | Připravuji CSV ke stažení… \| Stáhnout CSV |
| src/features/import-leads/ui/CSVImportModal.tsx | 128 | ✕ |
| src/features/import-leads/ui/CSVImportModal.tsx | 195 | Zkontrolovat mapování ( \| ) |
| src/features/import-leads/ui/CSVImportModal.tsx | 203 | ✕ |
| src/features/import-leads/ui/CSVImportModal.tsx | 311 | Zavřít |
| src/features/import-leads/ui/CSVImportModal.tsx | 320 | Importuji poptávky… \| `Importovat ${parsedData.totalRows} poptávek` |
| src/features/import-leads/ui/SmartFieldMappingModal.tsx | 101 | Navrhnout pole znovu |
| src/features/import-leads/ui/SmartFieldMappingModal.tsx | 109 | ✕ |
| src/features/import-leads/ui/SmartFieldMappingModal.tsx | 207 | Zrušit |
| src/features/import-leads/ui/SmartFieldMappingModal.tsx | 214 | Potvrdit mapování ( \| polí) |
| src/features/import-leads/ui/TablePreviewModal.tsx | 34 | [dynamic/icon] |
| src/features/import-leads/ui/TablePreviewModal.tsx | 83 | Zavřít náhled |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 99 | ✕ |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 186 | Spustit nahrávání hlasu |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 195 | Ukončit nahrávání & analyzovat |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 205 | Nahrát znovu |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 213 | Uložit poznámku k zakázce |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 222 | Vytvořit novou zakázku na Kanban |
| src/features/manage-employees/ui/EmployeesPage.tsx | 62 | Pozvat zaměstnance |
| src/features/manage-employees/ui/EmployeesPage.tsx | 79 | Obnovit pozvánku |
| src/features/manage-employees/ui/EmployeesPage.tsx | 79 | Obnovit heslo |
| src/features/manage-employees/ui/EmployeesPage.tsx | 83 | Vytvořit pozvánku |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 80 | Obnovit připojení |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 90 | Zkontrolovat a upravit pole |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 91 | Obnovit připojení |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 93 | Uložit a spustit kontrolní běh |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 97 | Schválit kontrolní běh |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 74 | Připravit napojení |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 81 | [dynamic/icon] |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 84 | Připravuji balíček ke stažení… \| Stáhnout balíček pro Synology |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 72 | Synchronizovat |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 74 | Obnovit |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 75 | Pozastavit |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 77 | Potvrdit odpojení |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 78 | Zrušit |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 79 | Odpojit |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 93 | Obnovit stav |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 95 | Zkusit bezpečně znovu |
| src/features/manage-integrations/ui/SmartFieldMappingModal.tsx | 53 | Zrušit |
| src/features/manage-integrations/ui/SmartFieldMappingModal.tsx | 53 | Použít mapování |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 94 | Uložit poznámku |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 98 | [dynamic/icon] |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 102 | [dynamic/icon] |
| src/features/manage-leads/ui/lead-tabs/TeamTab.tsx | 109 | Ukládám přiřazení… \| Uložit přiřazení |
| src/features/manage-leads/ui/lead-tabs/TeamTab.tsx | 120 | Otevřít tým |
| src/features/manage-leads/ui/LeadDetail.tsx | 57 | Vrátit se k poptávkám |
| src/features/manage-leads/ui/LeadDetail.tsx | 83 | Ukládám přiřazení… \| Uložit přiřazení |
| src/features/manage-leads/ui/LeadDetail.tsx | 96 | Ukládám údaje ze stavby… \| Uložit údaje ze stavby |
| src/features/manage-leads/ui/LeadDetail.tsx | 103 | Obnovit historii |
| src/features/manage-leads/ui/LeadsKanban.tsx | 112 | Přidat poptávku |
| src/features/manage-leads/ui/LeadsKanban.tsx | 130 | ✕ |
| src/features/manage-leads/ui/LeadsKanban.tsx | 219 | Zrušit |
| src/features/manage-leads/ui/LeadsKanban.tsx | 226 | Vytvářím zakázku… \| Vytvořit zakázku |
| src/features/manage-leads/ui/LeadsKanban.tsx | 246 | [dynamic/icon] |
| src/features/manage-leads/ui/LeadsKanban.tsx | 398 | Otevřít |
| src/features/manage-leads/ui/LeadsKanban.tsx | 415 | Zobrazit nové poptávky \| Přidat poptávku |
| src/features/onboarding-checklist/ui/OnboardingChecklist.tsx | 28 | Krok \| Hotovo \| Pokračovat |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 151 | Odesílám poptávku… \| Odeslat poptávku |
| src/pages/admin/companies/ui/Companies.tsx | 80 | Založit firmu |
| src/pages/admin/companies/ui/Companies.tsx | 82 | [dynamic/icon] |
| src/pages/admin/companies/ui/Companies.tsx | 101 | Nastavit tarif |
| src/pages/admin/companies/ui/Companies.tsx | 102 | Obnovit pozvánku |
| src/pages/admin/companies/ui/Companies.tsx | 103 | Kopírovat odkaz |
| src/pages/admin/companies/ui/Companies.tsx | 104 | Zadat důvod podpory |
| src/pages/admin/companies/ui/Companies.tsx | 107 | Vymazat hledání \| Obnovit seznam firem |
| src/pages/admin/companies/ui/Companies.tsx | 109 | Nastavit tarif |
| src/pages/admin/companies/ui/Companies.tsx | 109 | Obnovit pozvánku |
| src/pages/admin/companies/ui/Companies.tsx | 109 | Kopírovat odkaz formuláře |
| src/pages/admin/companies/ui/Companies.tsx | 109 | Zadat důvod podpory |
| src/pages/admin/companies/ui/Companies.tsx | 109 | Vymazat hledání \| Obnovit seznam firem |
| src/pages/admin/companies/ui/Companies.tsx | 110 | [dynamic/icon] |
| src/pages/admin/companies/ui/Companies.tsx | 110 | Zrušit |
| src/pages/admin/companies/ui/Companies.tsx | 110 | Zakládám firmu a zvu vlastníka… \| Založit a pozvat vlastníka |
| src/pages/admin/companies/ui/Companies.tsx | 111 | [dynamic/icon] |
| src/pages/admin/companies/ui/Companies.tsx | 111 | Zrušit |
| src/pages/admin/companies/ui/Companies.tsx | 111 | Spouštím podporu… \| Spustit podporu |
| src/pages/admin/dashboard/ui/Dashboard.tsx | 17 | Zkontrolovat firmy |
| src/pages/admin/support-session/ui/SupportSession.tsx | 80 | Vrátit se do Adminu |
| src/pages/auth/login/ui/LoginPage.tsx | 322 | Obnovit heslo |
| src/pages/auth/login/ui/LoginPage.tsx | 328 | Přihlásit se \| Založit firmu \| Odeslat bezpečný odkaz \| Nastavit heslo a pokračovat \| Uložit nové heslo |
| src/pages/auth/login/ui/LoginPage.tsx | 352 | Založit firemní účet |
| src/pages/auth/login/ui/LoginPage.tsx | 365 | Přihlásit se |
| src/pages/auth/login/ui/LoginPage.tsx | 376 | Vrátit se k přihlášení |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 118 | Přihlašuji… \| Ověřuji e-mail… \| Přihlásit se \| Ověřit e-mail |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 119 | Vytvořit nový účet \| Přihlásit se s ověřeným účtem |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 123 | Kontroluji aktivaci… \| Zkontrolovat aktivaci |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 131 | Otevírám platební stránku… \| Tarif Profi se připravuje \| Otevřít platební stránku |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 132 | Zkontrolovat aktivaci po platbě |
| src/pages/employee/jobs/ui/Jobs.tsx | 52 | Zobrazit dnešní ( \| ) |
| src/pages/employee/jobs/ui/Jobs.tsx | 60 | Zobrazit plánované ( \| ) |
| src/pages/employee/jobs/ui/Jobs.tsx | 68 | Zobrazit předané ( \| ) |
| src/pages/employee/jobs/ui/Jobs.tsx | 130 | Vyfotit |
| src/pages/employee/jobs/ui/Jobs.tsx | 141 | Obnovit zakázky |
| src/pages/employee/photos/ui/Photos.tsx | 72 | [dynamic/icon] |
| src/pages/employee/schedule/ui/Schedule.tsx | 46 | akce |
| src/pages/employee/schedule/ui/Schedule.tsx | 70 | Obnovit harmonogram |
| src/pages/employee/schedule/ui/Schedule.tsx | 104 | Zobrazit trasu |
| src/pages/owner/billing-return/ui/BillingReturn.tsx | 23 | Zkontrolovat aktivaci \| Zpět k předplatnému |
| src/pages/owner/integrations/ui/Integrations.tsx | 185 | Nahrát CSV |
| src/pages/owner/integrations/ui/Integrations.tsx | 200 | Zkopírováno \| Kopírovat |
| src/pages/owner/integrations/ui/Integrations.tsx | 217 | Zkopírováno \| Kopírovat |
| src/pages/owner/integrations/ui/Integrations.tsx | 233 | Vybrat CSV soubor |
| src/pages/owner/integrations/ui/Integrations.tsx | 250 | Připojit vlastní databázi |
| src/pages/owner/integrations/ui/Integrations.tsx | 251 | Stáhnout Synology Docker Compose |
| src/pages/owner/integrations/ui/Integrations.tsx | 252 | Spravovat mapování polí |
| src/pages/owner/integrations/ui/Integrations.tsx | 264 | Upravit konfiguraci |
| src/pages/owner/integrations/ui/Integrations.tsx | 283 | [dynamic/icon] |
| src/pages/owner/integrations/ui/Integrations.tsx | 285 | Připojit vlastní databázi |
| src/pages/owner/projects/ui/Projects.tsx | 28 | Zobrazit realizace \| aktivních zakázek |
| src/pages/owner/projects/ui/Projects.tsx | 30 | Zobrazit dokončené \| uložených zakázek |
| src/pages/owner/projects/ui/Projects.tsx | 33 | Zobrazit realizace |
| src/pages/owner/projects/ui/Projects.tsx | 34 | Zobrazit dokončené |
| src/pages/owner/projects/ui/Projects.tsx | 37 | Dokončeno \| V realizaci \| Cena neuvedena \| Otevřít zakázku |
| src/pages/owner/projects/ui/Projects.tsx | 43 | Otevřít poptávky |
| src/pages/owner/settings/ui/Settings.tsx | 94 | Ověřuji režim… \| Ověřit režim znovu |
| src/pages/owner/settings/ui/Settings.tsx | 101 | Otevírám správu plateb… \| Otevřít správu plateb |
| src/pages/owner/settings/ui/Settings.tsx | 112 | Vybrat logo |
| src/pages/owner/settings/ui/Settings.tsx | 134 | Ukládám profil… \| Ověřuji režim… \| Uložit profil |
| src/pages/public/demo/ui/PublicDemoWorkspace.tsx | 100 | Zobrazit přehled |
| src/pages/public/demo/ui/PublicDemoWorkspace.tsx | 101 | Zobrazit poptávky |
| src/pages/public/embed/ui/EmbedWidgetPage.tsx | 51 | Kopírovat |
| src/pages/public/embed/ui/EmbedWidgetPage.tsx | 58 | Kopírovat kód |
| src/pages/public/landing/ui/LandingPage.tsx | 161 | Přihlásit se |
| src/pages/public/landing/ui/LandingPage.tsx | 169 | Domluvit ukázku |
| src/pages/public/landing/ui/LandingPage.tsx | 194 | Prohlédnout s námi |
| src/pages/public/landing/ui/LandingPage.tsx | 380 | Ověřit výpočet na osobní ukázce (20 min) |
| src/pages/public/landing/ui/LandingPage.tsx | 504 | Přihlásit se |
| src/pages/public/landing/ui/LandingPage.tsx | 505 | Otevřít demo |
| src/pages/public/landing/ui/LandingPage.tsx | 506 | Domluvit ukázku (20 min) |
| src/pages/public/landing/ui/LandingPage.tsx | 507 | Otevřít VOP |
| src/pages/public/landing/ui/LandingPage.tsx | 508 | Otevřít zásady soukromí |
| src/pages/public/landing/ui/LandingPage.tsx | 509 | Otevřít zpracovatelskou smlouvu |
| src/pages/public/landing/ui/LandingPage.tsx | 541 | [dynamic/icon] |
| src/pages/public/landing/ui/LandingPage.tsx | 608 | [dynamic/icon] |
| src/pages/public/landing/ui/LandingPage.tsx | 717 | Otevírám rezervační kalendář… \| Připravuji e-mail s žádostí… \| Otevřít rezervační kalendář \| Připravit e-mail s žádostí |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 55 | Skrýt postup \| Otevřít postup |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 56 | CSV staženo \| Stáhnout CSV |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 57 | Přidat poptávku |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 70 | [dynamic/icon] |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 81 | [dynamic/icon] |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 85 | Zobrazit |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 94 | Otevřít poptávky |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 95 | Zobrazit všech \| poptávek |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 108 | Otevřít |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 114 | Spravovat tým |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 114 | Otevřít tým |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 119 | [dynamic/icon] |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 119 | Zakázka dokončena \| Posunout na další krok |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 119 | Otevřít plný detail |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 125 | [dynamic/icon] |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 126 | Posunout |
| src/shared/ui/common.tsx | 37 | [dynamic/icon] |
| src/shared/ui/common.tsx | 206 | &times; |
| src/shared/ui/PhotoLightbox.tsx | 23 | [dynamic/icon] |
| src/widgets/command-palette/ui/CommandPalette.tsx | 72 | [dynamic/icon] |
| src/widgets/command-palette/ui/CommandPalette.tsx | 86 | [dynamic/icon] |
| src/widgets/command-palette/ui/CommandPalette.tsx | 113 | [dynamic/icon] |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 86 | [dynamic/icon] |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 157 | • |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 207 | Vymazat hledání |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 215 | Založit novou firmu |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 49 | Otevřít poptávky |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 53 | Zobrazit nové poptávky \| čeká na první reakci |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 56 | Zobrazit realizace \| právě probíhá |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 59 | Zobrazit otevřené zakázky \| bez dokončených a nezískaných |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 70 | Zobrazit k vyřízení ( \| ) |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 76 | `, ${lead.city}` \| Cena neuvedena |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 83 | Vymazat hledání \| Zobrazit všechny zakázky \| Otevřít poptávky |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 85 | Zobrazit celý přehled |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 90 | [dynamic/icon] |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 91 | Otevřít poptávky |
| src/widgets/sidebar/ui/Sidebar.tsx | 99 | [dynamic/icon] |
| src/widgets/sidebar/ui/Sidebar.tsx | 124 | Otevřít generátor dema |
| src/widgets/sidebar/ui/Sidebar.tsx | 156 | Otevřít nastavení |
| src/widgets/sidebar/ui/Sidebar.tsx | 168 | Odhlásit |
| src/widgets/workspace-readiness/ui/WorkspaceReadinessPanel.tsx | 45 | Pokračovat |
| src/widgets/workspace-readiness/ui/WorkspaceReadinessPanel.tsx | 83 | [dynamic/icon] |
| src/widgets/workspace-readiness/ui/WorkspaceReadinessPanel.tsx | 110 | Otevřít krok |
| src/widgets/workspace-shell/ui/EmployeeLayout.tsx | 27 | Odhlásit |
| src/widgets/workspace-shell/ui/EmployeeLayout.tsx | 31 | [dynamic/icon] |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 166 | ← Vrátit se do Adminu |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 251 | [dynamic/icon] |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 323 | Otevřít nastavení |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 334 | Vrátit se do Adminu \| Odhlásit |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 359 | [dynamic/icon] |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 392 | Hledat zakázky, klienty... \| ⌘K |
| src/widgets/workspace-shell/ui/SuperAdminLayout.tsx | 27 | [dynamic/icon] |
| src/widgets/workspace-shell/ui/SuperAdminLayout.tsx | 33 | Odhlásit se |
| src/widgets/workspace-shell/ui/SuperAdminLayout.tsx | 36 | [dynamic/icon] |

### button-attribute

| Soubor | Řádek | Text |
| --- | ---: | --- |
| src/app/App.tsx | 568 | Zavřít oznámení |
| src/app/providers/ErrorBoundary.tsx | 103 | Vymaže mezipaměť a obnoví tovární stav |
| src/features/import-leads/ui/CSVImportModal.tsx | 129 | Zavřít import |
| src/features/import-leads/ui/CSVImportModal.tsx | 205 | Vybrat jiný soubor |
| src/features/import-leads/ui/CSVImportModal.tsx | 212 | Vybrat jiný soubor |
| src/features/import-leads/ui/SmartFieldMappingModal.tsx | 110 | Zavřít mapování |
| src/features/import-leads/ui/TablePreviewModal.tsx | 35 | Zavřít náhled |
| src/features/lead-files/ui/VoiceNotesModal.tsx | 99 | Zavřít hlasové poznámky |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 81 | Kopírovat kód |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 98 | Smazat poznámku |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 102 | Smazat soubor |
| src/features/manage-leads/ui/LeadsKanban.tsx | 131 | Zavřít formulář zakázky |
| src/features/onboarding-checklist/ui/OnboardingChecklist.tsx | 28 | `Otevřít krok ${title}` |
| src/pages/admin/companies/ui/Companies.tsx | 82 | Obnovit adresář |
| src/pages/admin/companies/ui/Companies.tsx | 102 | Znovu poslat pozvánku |
| src/pages/admin/companies/ui/Companies.tsx | 103 | Kopírovat odkaz formuláře |
| src/pages/admin/companies/ui/Companies.tsx | 110 | Zavřít |
| src/pages/admin/companies/ui/Companies.tsx | 111 | Zavřít |
| src/pages/auth/login/ui/LoginPage.tsx | 261 | #2563eb |
| src/pages/employee/photos/ui/Photos.tsx | 72 | Smazat fotografii |
| src/pages/owner/integrations/ui/Integrations.tsx | 185 | CSV import do firemní databáze není podporovaný. |
| src/pages/owner/integrations/ui/Integrations.tsx | 200 | Kopírovat webhook AI dispečera |
| src/pages/owner/integrations/ui/Integrations.tsx | 217 | Kopírovat kód webového formuláře |
| src/pages/owner/integrations/ui/Integrations.tsx | 283 | Zavřít průvodce databází |
| src/pages/owner/settings/ui/Settings.tsx | 119 | Posílat e-mailová upozornění |
| src/pages/public/landing/ui/LandingPage.tsx | 163 | Přihlásit se |
| src/pages/public/landing/ui/LandingPage.tsx | 171 | Domluvit ukázku StavbaFlow |
| src/pages/public/landing/ui/LandingPage.tsx | 267 | Počet měsíčních poptávek |
| src/pages/public/landing/ui/LandingPage.tsx | 284 | Podíl poptávek s nabídkou |
| src/pages/public/landing/ui/LandingPage.tsx | 301 | Podíl získaných nabídek |
| src/pages/public/landing/ui/LandingPage.tsx | 318 | Průměrná marže zakázky v Kč |
| src/pages/public/landing/ui/LandingPage.tsx | 336 | Hodiny administrativy týdně |
| src/pages/public/landing/ui/LandingPage.tsx | 542 | Zavřít právní dokument |
| src/pages/public/landing/ui/LandingPage.tsx | 610 | Zavřít konzultaci |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 119 | Zavřít detail zakázky |
| src/pages/public/sales/ui/SalesWorkspace.tsx | 125 | `Otevřít detail zakázky ${lead.title}` |
| src/shared/ui/common.tsx | 206 | Zavřít okno |
| src/shared/ui/PhotoLightbox.tsx | 24 | Zavřít fotografii |
| src/widgets/command-palette/ui/CommandPalette.tsx | 72 | Zavřít hledání |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 88 | Skrýt seznam firem |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 88 | Zobrazit seznam firem |
| src/widgets/company-switcher/ui/CompanySwitcher.tsx | 159 | `Přepnout na firmu ${org.name}` |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 76 | `Otevřít zakázku ${lead.title \|\| lead.customerName}` |
| src/widgets/owner-dashboard/ui/OwnerDashboard.tsx | 90 | `Otevřít zakázku ${item.client}` |
| src/widgets/sidebar/ui/Sidebar.tsx | 170 | Odhlásit se |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 254 | Zavřít menu |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 342 | Odhlásit se |
| src/widgets/workspace-shell/ui/OwnerLayout.tsx | 365 | Otevřít menu navigace |
| src/widgets/workspace-shell/ui/SuperAdminLayout.tsx | 23 | Zavřít menu |
| src/widgets/workspace-shell/ui/SuperAdminLayout.tsx | 27 | Zavřít menu |
| src/widgets/workspace-shell/ui/SuperAdminLayout.tsx | 36 | Otevřít menu |

### error-candidate

| Soubor | Řádek | Text |
| --- | ---: | --- |
| src/app/App.tsx | 167 | Zakázky a zaměstnance se nepodařilo načíst. Zkontrolujte připojení a zkuste stránku obnovit. |
| src/app/App.tsx | 232 | Stav zakázky se nezměnil. Požádejte majitele firmy o přiřazení. |
| src/app/App.tsx | 299 | `Stav zakázky "${targetLead.customerName}" změněn na: ${statusLabel}` |
| src/app/App.tsx | 304 | Stav zakázky se neuložil. Zkontrolujte připojení a zkuste to znovu. |
| src/app/App.tsx | 310 | Detail zakázky se nezměnil. O úpravu požádejte majitele firmy. |
| src/app/App.tsx | 311 | Zaměstnanec nemůže měnit detail zakázky. |
| src/app/App.tsx | 328 | Změna zakázky se neuložila. Zkontrolujte připojení a zkuste to znovu. |
| src/app/App.tsx | 343 | Akce se nedokončila. Zkuste to znovu. |
| src/app/App.tsx | 343 | Změna uložena. |
| src/app/authWorkspaceUser.ts | 11 | Účet nemá aktivní členství v žádné firmě. |
| src/app/platformIdentity.ts | 28 | Účet nemá aktivní přístup do StavbaFlow. |
| src/app/providers/OrganizationProvider.tsx | 145 | Přihlášení se neobnovilo. Obnovte stránku a přihlaste se znovu. |
| src/app/providers/OrganizationProvider.tsx | 205 | Přihlášení není dostupné. Obnovte stránku a pokud problém trvá, kontaktujte podporu. |
| src/app/providers/OrganizationProvider.tsx | 304 | Účet nemá přístup k žádné aktivní firmě. Požádejte majitele firmy o pozvánku. |
| src/app/providers/OrganizationProvider.tsx | 503 | Firemní data se nenačetla. Kontaktujte podporu na support@stavbacore.cz. |
| src/app/providers/OrganizationProvider.tsx | 506 | Firemní data se nenačetla. Obnovte stránku nebo kontaktujte podporu. |
| src/app/providers/OrganizationProvider.tsx | 603 | Účet nemá aktivní členství v žádné firmě. |
| src/app/providers/OrganizationProvider.tsx | 627 | Tento zaměstnanecký účet byl deaktivován administrátorem. |
| src/app/providers/OrganizationProvider.tsx | 649 | Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo a zkuste to znovu. |
| src/app/providers/OrganizationProvider.tsx | 655 | Nastaven� hesla nen� na tomto prost�ed� dostupn�. |
| src/app/providers/OrganizationProvider.tsx | 658 | Pozv�nkov� relace vypr�ela. Po��dejte o novou pozv�nku. |
| src/app/providers/OrganizationProvider.tsx | 662 | Tento ��et ne�ek� na nastaven� hesla z pozv�nky. |
| src/app/providers/OrganizationProvider.tsx | 667 | P�ed aktivac� workspace potvr�te Obchodn� podm�nky i Zpracovatelskou smlouvu. |
| src/app/providers/OrganizationProvider.tsx | 671 | Heslo se nepoda�ilo ulo�it. |
| src/app/providers/OrganizationProvider.tsx | 675 | Pozv�nce chyb� ov��iteln� identifik�tor. Po��dejte o novou pozv�nku. |
| src/app/providers/OrganizationProvider.tsx | 680 | Pr�vn� potvrzen� se nepoda�ilo bezpe�n� ulo�it. Pozv�nka nebyla aktivov�na. |
| src/app/providers/OrganizationProvider.tsx | 688 | Pozv�nku se nepoda�ilo aktivovat pro ��dnou firmu. |
| src/app/providers/OrganizationProvider.tsx | 695 | P�ed registrac� potvr�te Obchodn� podm�nky i Zpracovatelskou smlouvu. |
| src/app/providers/OrganizationProvider.tsx | 769 | Registrace proběhla bez vytvoření uživatele |
| src/app/providers/OrganizationProvider.tsx | 777 | Účet se nevytvořil. Zkontrolujte údaje a zkuste to znovu. |
| src/app/providers/OrganizationProvider.tsx | 848 | Firma se nevytvořila. Zkontrolujte údaje a zkuste to znovu. |
| src/app/providers/OrganizationProvider.tsx | 859 | Přepnutí firmy čeká na ověřený app_* membership kontrakt. |
| src/app/providers/OrganizationProvider.tsx | 878 | Musíte být přihlášeni |
| src/app/providers/OrganizationProvider.tsx | 1087 | Organizace není vybrána |
| src/app/providers/OrganizationProvider.tsx | 1139 | Organizace není vybrána |
| src/app/providers/OrganizationProvider.tsx | 1227 | Firemní data se nenačetla. Kontaktujte podporu na support@stavbacore.cz. |
| src/app/providers/OrganizationProvider.tsx | 1234 | Zakázky se z databáze nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu. |
| src/app/providers/OrganizationProvider.tsx | 1335 | Poptávku se nepodařilo odeslat. Databáze není nakonfigurována. |
| src/app/providers/OrganizationProvider.tsx | 1420 | Poptávku se nepodařilo odeslat. Prázdná odpověď databáze. |
| src/app/providers/OrganizationProvider.tsx | 1530 | Zaměstnance se z databáze nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu. |
| src/app/providers/OrganizationProvider.tsx | 1539 | Organizace není vybrána |
| src/app/providers/OrganizationProvider.tsx | 1571 | `Pozvánka selhala: ${err.message}` |
| src/app/providers/OrganizationProvider.tsx | 1618 | Organizace není vybrána |
| src/app/providers/OrganizationProvider.tsx | 1645 | `Chyba při aktualizaci zaměstnance: ${updateError.message}` |
| src/app/providers/OrganizationProvider.tsx | 1655 | `Chyba při vkládání zaměstnance: ${insertError.message}` |
| src/app/providers/OrganizationProvider.tsx | 1661 | Zaměstnanec nebyl nalezen. |
| src/app/providers/OrganizationProvider.tsx | 1680 | Zaměstnanec nenalezen |
| src/app/providers/OrganizationProvider.tsx | 1692 | Firma není načtená. |
| src/app/providers/OrganizationProvider.tsx | 1710 | `Obnovení pozvánky selhalo: ${err.message}` |
| src/app/providers/OrganizationProvider.tsx | 1735 | Zaměstnanec nenalezen |
| src/app/providers/OrganizationProvider.tsx | 1764 | `Reset hesla selhal: ${err.message}` |
| src/app/providers/OrganizationProvider.tsx | 1776 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Aktivace zaměstnanců čeká na app_members/Auth kontrakt.` |
| src/app/providers/OrganizationProvider.tsx | 1800 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Správa zaměstnanců čeká na app_members/Auth kontrakt.` |
| src/app/providers/OrganizationProvider.tsx | 1819 | Projekty a úkoly se zatím nenačetly. Kontaktujte podporu. |
| src/app/providers/OrganizationProvider.tsx | 1848 | Organizace není vybrána |
| src/app/providers/OrganizationProvider.tsx | 1851 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Projekty čekají na ověřený app_* kontrakt.` |
| src/app/providers/OrganizationProvider.tsx | 1980 | Přehled firem se zatím nenačetl. Kontaktujte podporu. |
| src/app/providers/OrganizationProvider.tsx | 2053 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Mazání firem čeká na platform-admin kontrakt a retenční pravidla.` |
| src/app/providers/OrganizationProvider.tsx | 2098 | Firemní profil může upravit pouze majitel aktivní firmy. |
| src/app/providers/OrganizationProvider.tsx | 2102 | V BYODB jsou zatím upravitelné jen firemní údaje pokryté schválenou mapou. Barva, logo a e-mailová upozornění zůstávají v Managed Cloud. |
| src/app/providers/OrganizationProvider.tsx | 2125 | Firemní profil může upravit pouze majitel aktivní firmy. |
| src/app/providers/OrganizationProvider.tsx | 2138 | Databáze nepotvrdila uložení firemního profilu. |
| src/app/providers/OrganizationProvider.tsx | 2154 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Firemní nastavení čeká na ověřený app_companies kontrakt.` |
| src/app/providers/OrganizationProvider.tsx | 2248 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Stav firmy čeká na platform-admin kontrakt.` |
| src/app/providers/OrganizationProvider.tsx | 2298 | `${APP_SCHEMA_WRITES_BLOCKED_MESSAGE} Rychlé založení firmy bude dostupné po ověření provision RPC pro app_* schéma.` |
| src/app/providers/OrganizationProvider.tsx | 2396 | `Zápis organizace do Supabase selhal: ${orgErr?.message \|\| 'Neznámá chyba'}` |
| src/app/SubscriptionGuard.tsx | 31 | Platební stránka se neotevřela. Zkuste to znovu. |
| src/entities/lead/model/assignment.ts | 25 | Vyberte aktivního zaměstnance stejné firmy. |
| src/entities/session/model/context.ts | 9 | useOrganization must be used within an OrganizationProvider |
| src/features/employee-invitations/model/inviteContract.ts | 12 | Firma nemá platný identifikátor. |
| src/features/employee-invitations/model/inviteContract.ts | 15 | Vyplňte jméno a platný e-mail. |
| src/features/employee-invitations/model/inviteContract.ts | 25 | Server nepotvrdil vytvoření pozvánky. |
| src/features/employee-workflow/ui/EmployeeDashboard.tsx | 34 | Stav zakázky se neuložil. Zkontrolujte připojení a zkuste to znovu. |
| src/features/export-company-data/api/exportCompanyData.ts | 34 | Firemní data se nepodařilo načíst přes zabezpečené připojení. |
| src/features/export-company-data/api/exportCompanyData.ts | 83 | Firemní data se nepodařilo načíst přes zabezpečené připojení. |
| src/features/export-company-data/api/exportCompanyData.ts | 133 | Export dat je dostupný pouze vlastníkovi firmy. |
| src/features/export-company-data/api/exportCompanyData.ts | 134 | Firma pro export není platná. |
| src/features/export-company-data/api/exportCompanyData.ts | 135 | Připojení k firemnímu účtu není dostupné. |
| src/features/export-company-data/api/exportCompanyData.ts | 138 | Pro export je nutné být přihlášen jako vlastník firmy. |
| src/features/export-company-data/api/exportCompanyData.ts | 140 | Export dat je dostupný pouze aktivnímu vlastníkovi této firmy. |
| src/features/export-company-data/ui/CompanyDataExport.tsx | 29 | Export se nepřipravil. Zkontrolujte připojení a zkuste ho stáhnout znovu. |
| src/features/import-leads/lib/fileParser.ts | 19 | Pilot podporuje pouze CSV. Excel nejprve exportujte do CSV a znovu zkontrolujte mapování. |
| src/features/import-leads/lib/fileParser.ts | 30 | Soubor CSV neobsahuje žádné platné řádky. |
| src/features/import-leads/lib/fileParser.ts | 46 | `Chyba při čtení CSV souboru: ${err.message}` |
| src/features/import-leads/ui/CSVImportModal.tsx | 65 | Soubor se nepodařilo přečíst. Vyberte soubor CSV nebo Excel a zkuste to znovu. |
| src/features/lead-files/model/attachments.ts | 27 | Fotku se nepodařilo načíst pro bezpečné zmenšení. |
| src/features/lead-files/model/attachments.ts | 46 | Prohlížeč neumí fotku bezpečně zmenšit. |
| src/features/lead-files/model/attachments.ts | 50 | Fotku se nepodařilo zmenšit. |
| src/features/login/model/authRecovery.ts | 3 | Zadejte platný e-mail. |
| src/features/login/model/authRecovery.ts | 10 | Server odeslání obnovy nepotvrdil. |
| src/features/login/model/authRecovery.ts | 32 | Nové heslo musí mít alespoň 10 znaků. |
| src/features/manage-billing/api/billingClient.ts | 4 | Platba není v tomto prostředí dostupná. |
| src/features/manage-billing/api/billingClient.ts | 7 | Přihlášení vypršelo. Přihlaste se znovu. |
| src/features/manage-billing/api/billingClient.ts | 29 | Platební služba vrátila neplatný odkaz. |
| src/features/manage-billing/api/billingClient.ts | 36 | Správa plateb není v tomto prostředí dostupná. |
| src/features/manage-billing/api/billingClient.ts | 39 | Přihlášení vypršelo. Přihlaste se znovu. |
| src/features/manage-billing/api/billingClient.ts | 47 | Platební profil ještě nebyl vytvořen. |
| src/features/manage-billing/api/billingClient.ts | 47 | Správu plateb se nepodařilo otevřít. |
| src/features/manage-billing/api/billingClient.ts | 53 | Platební služba vrátila neplatný odkaz. |
| src/features/manage-employees/ui/EmployeesPage.tsx | 38 | Pozvánka se nevytvořila. Zkontrolujte údaje a zkuste to znovu. |
| src/features/manage-employees/ui/EmployeesPage.tsx | 51 | Pozvánka se neobnovila. Zkuste to znovu. |
| src/features/manage-employees/ui/EmployeesPage.tsx | 51 | Odkaz pro obnovu hesla se nevytvořil. Zkuste to znovu. |
| src/features/manage-integrations/api/connectorClient.ts | 7 | Před správou napojení se znovu přihlaste. |
| src/features/manage-integrations/api/connectorClient.ts | 10 | CONNECTOR_REQUEST_FAILED |
| src/features/manage-integrations/model/buildConnectorMapping.ts | 10 | BYODB_REQUIRED_FIELD_UNMAPPED |
| src/features/manage-integrations/model/buildConnectorPackage.ts | 20 | CONNECTOR_IMAGE_DIGEST_REQUIRED |
| src/features/manage-integrations/model/buildConnectorPackage.ts | 21 | CONNECTOR_COMPANY_ID_INVALID |
| src/features/manage-integrations/model/buildConnectorPackage.ts | 62 | CONNECTOR_DRIVER_INVALID |
| src/features/manage-integrations/model/buildConnectorPackage.ts | 64 | CONNECTOR_API_URL_INVALID |
| src/features/manage-integrations/model/buildConnectorPackage.ts | 66 | CONNECTOR_API_URL_INVALID |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 66 | Mapování se neuložilo. Zkontrolujte vybraná pole a zkuste to znovu. |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 76 | Mapování se neschválilo. Zkontrolujte kontrolní běh a zkuste to znovu. |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 33 | Připojení se nepřipravilo. Zkontrolujte nastavení a zkuste to znovu. |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 45 | Kód se nepodařilo zkopírovat. Označte ho a zkopírujte ručně. |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 58 | Instalační balíček zatím není připravený. Počkejte na schválené vydání konektoru a zkuste stažení znovu. |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 58 | Balíček se nepřipravil. Zkontrolujte nastavení a zkuste to znovu. |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 45 | Změna stavu konektoru se nepotvrdila. Obnovte stav a zkuste to znovu. |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 33 | Poznámky a soubory se nenačetly. Zkontrolujte připojení a zkuste stránku obnovit. |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 46 | Poznámka se neuložila. Zkontrolujte připojení a zkuste to znovu. |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 58 | Soubor se nenahrál. Zkontrolujte připojení a zkuste to znovu. |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 66 | Poznámka se nesmazala. Zkuste to znovu. |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 74 | Soubor se nesmazal. Zkuste to znovu. |
| src/features/manage-leads/ui/lead-tabs/TeamTab.tsx | 42 | Přiřazení se neuložilo. Zkontrolujte připojení a zkuste to znovu. |
| src/features/manage-leads/ui/LeadDetail.tsx | 40 | Přiřazení se neuložilo. Zkontrolujte připojení a zkuste to znovu. |
| src/features/manage-leads/ui/LeadDetail.tsx | 50 | Údaje ze stavby se neuložily. Zkontrolujte připojení a zkuste to znovu. |
| src/features/manage-leads/ui/LeadsKanban.tsx | 78 | Ukládání poptávek není dostupné. |
| src/features/manage-leads/ui/LeadsKanban.tsx | 94 | Poptávka se nevytvořila. Zkontrolujte údaje a zkuste to znovu. |
| src/features/paid-registration/model/paidRegistration.ts | 13 | Dokončete rozpracovanou registraci s původními údaji nebo kontaktujte podporu. |
| src/features/platform-admin/api/platformClient.ts | 48 | Správa platformy není v tomto prostředí dostupná. |
| src/features/platform-admin/api/platformClient.ts | 51 | Přihlášení správce vypršelo. Přihlaste se znovu. |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 50 | Poptávka se neodeslala. Doplňte jméno, telefon, typ práce a potvrďte souhlas. |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 54 | Poptávka se neodeslala. Zkraťte příliš dlouhé údaje a zkuste to znovu. |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 58 | Poptávka se neodeslala. Opravte e-mail a zkuste to znovu. |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 87 | `Public intake failed (${response.status})` |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 90 | Public intake is not configured |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 95 | Poptávku se nepodařilo odeslat. Zkuste to znovu nebo kontaktujte firmu telefonicky. |
| src/pages/admin/companies/ui/Companies.tsx | 35 | Seznam firem se nenačetl. Zkuste ho obnovit. |
| src/pages/admin/companies/ui/Companies.tsx | 42 | Firma se nevytvořila. Zkontrolujte údaje a zkuste to znovu. |
| src/pages/admin/companies/ui/Companies.tsx | 49 | Pozvánka se neodeslala. Zkontrolujte e-mail a zkuste to znovu. |
| src/pages/admin/companies/ui/Companies.tsx | 56 | Odkaz se nezkopíroval. Zkuste tlačítko znovu nebo odkaz zkopírujte ručně. |
| src/pages/admin/companies/ui/Companies.tsx | 64 | Tarif se nenastavil. Zkontrolujte volbu a zkuste to znovu. |
| src/pages/admin/companies/ui/Companies.tsx | 74 | Prohlížeč nemohl bezpečně uložit dočasnou relaci podpory. |
| src/pages/admin/companies/ui/Companies.tsx | 76 | Relace podpory se nevytvořila. Zkuste to znovu. |
| src/pages/admin/dashboard/ui/Dashboard.tsx | 11 | Přehled se nenačetl. Obnovte stránku a zkuste to znovu. |
| src/pages/admin/support-session/ui/SupportSession.tsx | 52 | Dočasná relace chybí nebo vypršela. Vraťte se do správy firem a spusťte podporu znovu. |
| src/pages/admin/support-session/ui/SupportSession.tsx | 53 | Dočasná relace se neověřila. Vraťte se do správy firem a spusťte podporu znovu. |
| src/pages/admin/support-session/ui/SupportSession.tsx | 56 | Relace podpory se nenačetla. Obnovte stránku a zkuste to znovu. |
| src/pages/admin/support-session/ui/SupportSession.tsx | 84 | Tato operace zatím není součástí auditovaného support workspace. |
| src/pages/auth/login/ui/LoginPage.tsx | 94 | Potvr�te pros�m Obchodn� podm�nky i Zpracovatelskou smlouvu. |
| src/pages/auth/login/ui/LoginPage.tsx | 125 | Obnova hesla není na tomto prostředí dostupná. |
| src/pages/auth/login/ui/LoginPage.tsx | 136 | Tento účet nemá oprávnění pro zvolený typ dashboardu. Přihlaste se přes správný vstup. |
| src/pages/auth/login/ui/LoginPage.tsx | 151 | Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo a zkuste to znovu. |
| src/pages/auth/login/ui/LoginPage.tsx | 151 | Heslo se nenastavilo. Zkontrolujte odkaz a zkuste to znovu. |
| src/pages/auth/login/ui/LoginPage.tsx | 151 | Účet se nevytvořil. Zkontrolujte údaje a zkuste to znovu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 33 | Rozpracovanou registraci nelze načíst. Kontaktujte podporu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 41 | Přihlaste se znovu ke svému ověřenému účtu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 44 | Aktivaci zatím nelze ověřit. Zkuste kontrolu za chvíli. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 51 | Aktivace se neověřila. Přihlaste se znovu a zopakujte kontrolu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 69 | Adresa aplikace není bezpečně nastavena. Zkuste registraci později. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 73 | Účet se nepodařilo ověřit. Zkontrolujte údaje nebo potvrzovací e-mail. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 77 | Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo a zkuste to znovu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 77 | Účet se nevytvořil. Zkontrolujte údaje a zkuste to znovu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 85 | Nejdříve ověřte svůj e-mail. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 88 | Rozpracovanou registraci nelze načíst. Kontaktujte podporu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 96 | Registraci se nepodařilo připravit. Zkuste stejné údaje znovu; případně kontaktujte podporu. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 98 | Platební odkaz není platný. |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 100 | Platební stránka se nepřipravila. Zkontrolujte údaje a zkuste to znovu. |
| src/pages/employee/photos/ui/Photos.tsx | 29 | Fotografie se nenačetly. Zkontrolujte připojení a obnovte stránku. |
| src/pages/employee/photos/ui/Photos.tsx | 44 | Fotografie se nenahrála. Zkontrolujte připojení a zkuste to znovu. |
| src/pages/employee/photos/ui/Photos.tsx | 53 | Fotografie se nesmazala. Zkuste to znovu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 56 | Připojení databáze se nenačetlo. Obnovte stránku a zkuste to znovu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 80 | AI inbox není nakonfigurovaný. |
| src/pages/owner/integrations/ui/Integrations.tsx | 83 | Před zobrazením URL se znovu přihlaste. |
| src/pages/owner/integrations/ui/Integrations.tsx | 88 | AI inbox není aktivní. |
| src/pages/owner/integrations/ui/Integrations.tsx | 91 | Příjem poptávek z e-mailu se nenačetl. Obnovte stránku nebo kontaktujte podporu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 117 | Režim databáze se nezměnil. Zkontrolujte schválené mapování a stav konektoru a zkuste to znovu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 141 | Soubor zatím není připravený. Počkejte na schválené vydání konektoru a zkuste stažení znovu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 141 | Soubor se nepřipravil. Zkontrolujte nastavení a zkuste to znovu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 154 | Import vyžaduje aktivní firmu. |
| src/pages/owner/integrations/ui/Integrations.tsx | 155 | CSV zápis do firemní databáze ještě není podporovaný. CSV import je při zapnutém BYODB vypnutý. |
| src/pages/owner/integrations/ui/Integrations.tsx | 158 | Před importem se znovu přihlaste. |
| src/pages/owner/settings/ui/Settings.tsx | 56 | status unavailable |
| src/pages/owner/settings/ui/Settings.tsx | 63 | Firemní profil se neuložil. O úpravu požádejte majitele firmy. |
| src/pages/owner/settings/ui/Settings.tsx | 69 | Firemní profil se neuložil. Zkontrolujte údaje a zkuste to znovu. |
| src/pages/owner/settings/ui/Settings.tsx | 75 | Logo se nenačetlo. Vyberte obrázek do 1 MB. |
| src/pages/owner/settings/ui/Settings.tsx | 86 | Správa plateb se neotevřela. Zkuste to znovu. |
| src/pages/public/demo/ui/PublicDemoWorkspace.tsx | 45 | Veřejné demo je pouze pro čtení. |
| src/pages/public/landing/ui/LandingPage.tsx | 98 | Žádost se nepřipravila. Zadejte jméno alespoň se dvěma znaky. |
| src/pages/public/landing/ui/LandingPage.tsx | 102 | Žádost se nepřipravila. Zadejte telefon alespoň s pěti číslicemi. |
| src/pages/public/landing/ui/LandingPage.tsx | 106 | Žádost se nepřipravila. Opravte e-mail a zkuste to znovu. |
| src/pages/public/landing/ui/LandingPage.tsx | 130 | Kontakt se neotevřel. Prohlédněte si demo a žádost zkuste později. |
| src/pages/public/landing/ui/LandingPage.tsx | 133 | Kontakt se neotevřel. Zkuste to znovu. |
| src/shared/api/data/ByodbRepository.ts | 171 | BYODB_FIELD_NOT_MAPPED |
| src/shared/api/data/ByodbRepository.ts | 175 | BYODB_COMPANY_NAME_REQUIRED |
| src/shared/api/data/ByodbRepository.ts | 184 | BYODB_VALUE_INVALID |
| src/shared/api/data/ByodbRepository.ts | 185 | BYODB_STATUS_INVALID |
| src/shared/api/data/ByodbRepository.ts | 186 | BYODB_PRIORITY_INVALID |
| src/shared/api/data/ByodbRepository.ts | 194 | BYODB_FIELD_NOT_MAPPED |
| src/shared/api/data/ByodbRepository.ts | 198 | BYODB_FIELD_NOT_MAPPED |
| src/shared/api/data/ByodbRepository.ts | 199 | BYODB_EMPLOYEE_NOT_FOUND |
| src/shared/api/data/ByodbRepository.ts | 202 | BYODB_NO_MAPPED_FIELDS |
| src/shared/api/data/ByodbRepository.ts | 214 | Pro tuto akci se znovu přihlaste. |
| src/shared/api/data/ByodbRepository.ts | 217 | Pro tuto akci se znovu přihlaste. |
| src/shared/api/data/ByodbRepository.ts | 233 | DATABASE_MODE_INVALID |
| src/shared/api/data/ByodbRepository.ts | 239 | BYODB_RECORDS_INVALID |
| src/shared/api/data/ByodbRepository.ts | 252 | BYODB_WRITE_DISABLED |
| src/shared/api/data/ByodbRepository.ts | 255 | BYODB_RECORD_NOT_FOUND |
| src/shared/api/data/ByodbRepository.ts | 268 | BYODB_PROJECTION_NOT_UPDATED |
| src/shared/api/data/ByodbRepository.ts | 271 | BYODB_OPERATION_STATUS_INVALID |
| src/shared/api/data/ByodbRepository.ts | 277 | BYODB_RECORD_NOT_FOUND |
| src/shared/api/data/ByodbRepository.ts | 284 | BYODB_WRITE_DISABLED |
| src/shared/api/data/ByodbRepository.ts | 286 | BYODB_RECORD_NOT_FOUND |
| src/shared/api/data/ByodbRepository.ts | 294 | BYODB_OPERATION_STATUS_INVALID |
| src/shared/api/data/ByodbRepository.ts | 305 | BYODB_COMPANY_RECORD_AMBIGUOUS |
| src/shared/api/data/ByodbRepository.ts | 312 | BYODB_WRITE_DISABLED |
| src/shared/api/data/ByodbRepository.ts | 314 | BYODB_COMPANY_RECORD_AMBIGUOUS |
| src/shared/api/data/ByodbRepository.ts | 324 | BYODB_OPERATION_STATUS_INVALID |
| src/shared/api/data/ByodbRepository.ts | 342 | BYODB_SOURCE_PATH_UNAVAILABLE |
| src/shared/api/data/leadFilePolicy.ts | 7 | Poznámka nesmí být prázdná. |
| src/shared/api/data/leadFilePolicy.ts | 8 | Poznámka může mít nejvýše 4000 znaků. |
| src/shared/api/data/leadFilePolicy.ts | 21 | `Neplatný identifikátor: ${label}.` |
| src/shared/api/data/leadFilePolicy.ts | 27 | Povolené jsou JPG, PNG, WebP, HEIC a PDF. |
| src/shared/api/data/leadFilePolicy.ts | 28 | Soubor musí mít nejvýše 15 MB. |
| src/shared/api/data/leadFilePolicy.ts | 29 | Soubor nemá platný název. |
| src/shared/api/data/leadStatusRpc.ts | 11 | Neplatná firma nebo zakázka. |
| src/shared/api/data/leadStatusRpc.ts | 17 | Změnu stavu se nepodařilo uložit. Obnovte stránku a zkuste to znovu. |
| src/shared/api/data/leadWritePatch.ts | 14 | Cena musí být nezáporné číslo. |
| src/shared/api/data/leadWritePatch.ts | 18 | Neplatný stav zakázky. |
| src/shared/api/data/leadWritePatch.ts | 22 | Neplatná priorita. |
| src/shared/api/data/leadWritePatch.ts | 26 | Vyberte skutečného člena firmy. |
| src/shared/api/data/leadWritePatch.ts | 30 | Zadejte platný termín. |
| src/shared/api/data/SupabaseRepository.ts | 73 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 86 | Poptávky se nepodařilo načíst. Zkuste obnovit připojení. |
| src/shared/api/data/SupabaseRepository.ts | 96 | Historii zakázek se nepodařilo načíst. |
| src/shared/api/data/SupabaseRepository.ts | 160 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 223 | Supabase připojení nebo identifikátor zakázky není platný. |
| src/shared/api/data/SupabaseRepository.ts | 230 | Supabase připojení nebo identifikátor zakázky není platný. |
| src/shared/api/data/SupabaseRepository.ts | 242 | Supabase připojení nebo identifikátor zakázky není platný. |
| src/shared/api/data/SupabaseRepository.ts | 249 | Poznámky a soubory vyžadují aktivní cloudové připojení. |
| src/shared/api/data/SupabaseRepository.ts | 252 | Neplatná firma nebo zakázka. |
| src/shared/api/data/SupabaseRepository.ts | 269 | Cloudové připojení není dostupné. |
| src/shared/api/data/SupabaseRepository.ts | 271 | Pro tuto akci se znovu přihlaste. |
| src/shared/api/data/SupabaseRepository.ts | 282 | Poznámky se nepodařilo načíst. |
| src/shared/api/data/SupabaseRepository.ts | 293 | Poznámku se nepodařilo uložit. |
| src/shared/api/data/SupabaseRepository.ts | 299 | Neplatná poznámka. |
| src/shared/api/data/SupabaseRepository.ts | 301 | Poznámku nelze smazat. Majitel ji může smazat kdykoliv, autor do 15 minut. |
| src/shared/api/data/SupabaseRepository.ts | 311 | Soubory se nepodařilo načíst. |
| src/shared/api/data/SupabaseRepository.ts | 315 | Soukromý náhled souboru se nepodařilo vytvořit. |
| src/shared/api/data/SupabaseRepository.ts | 338 | Podepsaný odkaz pro nahrání se nepodařilo vytvořit. |
| src/shared/api/data/SupabaseRepository.ts | 346 | Soubor se nepodařilo nahrát do soukromého úložiště. |
| src/shared/api/data/SupabaseRepository.ts | 361 | Soubor byl odmítnut databází a nebyl uložen. |
| src/shared/api/data/SupabaseRepository.ts | 364 | Soubor je uložen, ale náhled zatím není dostupný. |
| src/shared/api/data/SupabaseRepository.ts | 381 | Neplatný soubor. |
| src/shared/api/data/SupabaseRepository.ts | 383 | Soubor nelze smazat. Majitel jej může smazat kdykoliv, autor do 15 minut. |
| src/shared/api/data/SupabaseRepository.ts | 385 | Záznam byl odstraněn, úklid souboru je nutné zopakovat. |
| src/shared/api/data/SupabaseRepository.ts | 390 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 412 | Čekající pozvánky se nepodařilo načíst. |
| src/shared/api/data/SupabaseRepository.ts | 426 | Zaměstnance se nepodařilo načíst. |
| src/shared/api/data/SupabaseRepository.ts | 445 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 466 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 476 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 484 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/api/data/SupabaseRepository.ts | 489 | Firemní nastavení nebylo nalezeno v app_companies. |
| src/shared/api/data/SupabaseRepository.ts | 504 | Supabase připojení nebo identifikátor firmy není platný. |
| src/shared/lib/router.tsx | 17 | useRouter must be used within a RouterProvider |

### error-visible

| Soubor | Řádek | Text |
| --- | ---: | --- |
| src/app/App.tsx | 372 | Data se nepodařilo načíst \| Zkusit znovu |
| src/app/providers/ErrorBoundary.tsx | 79 | Zkuste stránku obnovit. Pokud potíž přetrvá, zkopírujte diagnostiku a pošlete ji podpoře. |
| src/app/SubscriptionGuard.tsx | 73 | [dynamic] |
| src/features/employee-workflow/ui/EmployeeDashboard.tsx | 44 | [dynamic] |
| src/features/export-company-data/ui/CompanyDataExport.tsx | 45 | [dynamic] |
| src/features/import-leads/ui/CSVImportModal.tsx | 294 | [dynamic] |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 98 | Nejdřív opravte mapování. Import s chybami nelze schválit. |
| src/features/manage-integrations/ui/ConnectorMapping.tsx | 101 | [dynamic] |
| src/features/manage-integrations/ui/ConnectorSetup.tsx | 88 | [dynamic] |
| src/features/manage-integrations/ui/ConnectorStatus.tsx | 97 | [dynamic] |
| src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx | 89 | [dynamic] |
| src/features/manage-leads/ui/lead-tabs/TeamTab.tsx | 123 | [dynamic] |
| src/features/manage-leads/ui/LeadDetail.tsx | 65 | [dynamic] |
| src/features/manage-leads/ui/LeadsKanban.tsx | 216 | [dynamic] |
| src/features/submit-inquiry/ui/WidgetIframePage.tsx | 150 | [dynamic] |
| src/pages/admin/companies/ui/Companies.tsx | 83 | [dynamic] |
| src/pages/admin/dashboard/ui/Dashboard.tsx | 15 | [dynamic] |
| src/pages/auth/login/ui/LoginPage.tsx | 225 | [dynamic] |
| src/pages/auth/paid-registration/ui/PaidRegistration.tsx | 134 | [dynamic] |
| src/pages/employee/photos/ui/Photos.tsx | 71 | [dynamic] |
| src/pages/owner/integrations/ui/Integrations.tsx | 204 | [dynamic] |
| src/pages/owner/integrations/ui/Integrations.tsx | 275 | [dynamic] |
| src/pages/owner/settings/ui/Settings.tsx | 93 | [dynamic] |
| src/pages/owner/settings/ui/Settings.tsx | 94 | Režim databáze firmy se nepodařilo ověřit. Ověřte ho znovu a pak uložte profil. \| Ověřuji režim… \| Ověřit režim znovu |
| src/pages/owner/settings/ui/Settings.tsx | 100 | [dynamic] |
