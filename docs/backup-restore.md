# Stav záloh a zkouška obnovy StavbaFlow

## Stav u poskytovatele k 22. listopadu 2026

| Oblast | Aktuální důkaz | Retence a správce |
| --- | --- | --- |
| Databáze staging | Přihlášený Supabase Dashboard potvrdil tarif Free bez plánovaných záloh a bez PITR. Poslední plánovanou zálohu Dashboard nezobrazuje. [Scheduled backups](https://supabase.com/dashboard/project/xwzweltjvreqhjpbjrxa/database/backups/scheduled) · [Point in time](https://supabase.com/dashboard/project/xwzweltjvreqhjpbjrxa/database/backups/pitr) | Retence plánovaných záloh se neuplatňuje. Ruční provozní zálohy a jejich retence nejsou doložené. |
| Databáze produkce | Přihlášený Supabase Dashboard potvrdil tarif Free bez plánovaných záloh a bez PITR. Poslední plánovanou zálohu Dashboard nezobrazuje. Schválený `supabase-ci` dříve vrátil PostgreSQL 17.11 a `archive_mode=on`. [Scheduled backups](https://supabase.com/dashboard/project/oncmtmrhmjlerbwkrecv/database/backups/scheduled) · [Point in time](https://supabase.com/dashboard/project/oncmtmrhmjlerbwkrecv/database/backups/pitr) | Retence plánovaných záloh se neuplatňuje. Ruční provozní zálohy a jejich retence nejsou doložené. |
| Supabase Storage v obou projektech | Databázové zálohy Supabase zahrnují metadata Storage. Bajty objektů vyžadují samostatnou kopii. Vlastník nepotvrdil, zda pravidelná externí kopie existuje. Ověřená je jednorázová kopie stagingového syntetického objektu popsaná níže. | U případné pravidelné externí kopie zůstává existence, retence a držitel neověřený. Ověřená retence cvičného artefaktu je 7 dní. |

V autorizované relaci Supabase Dashboardu byl zobrazen jeden člen organizace `svobonek-lab's Org`. Přihlášený uživatel byl označen `You` a `Owner`, takže odpovědnost za oba projekty má vlastník organizace. Tato role sama nepotvrzuje držení externí kopie Storage. [Členství organizace](https://supabase.com/dashboard/org/yaequnvembyxbywofnav/team)

[Supabase Database Backups](https://supabase.com/docs/guides/platform/backups) · [Storage object downloads and metadata](https://supabase.com/docs/guides/storage/management/download-objects) · [Management API backup catalog](https://supabase.com/docs/reference/api/v1-list-all-backups)

## Doložená obnova jednoho syntetického tenantu

[Staging run 44950352353](https://github.com/svobonek-lab/dashboard/actions/runs/44950352353) vytvořil jednorázovou syntetickou firmu v projektu `xwzweltjvreqhjpbjrxa`, exportoval vybraná aplikační pole a skutečné bajty soukromého PDF a odstranil zdrojová testovací data. Následná kontrola přes staging MCP podle přesných identifikátorů vrátila nulu pro firmu, členství, Auth, poptávky, události, poznámky, metadata souborů i Storage objekty. Snímek začal 21. listopadu 2026 ve 21:13:15.308 UTC. Workflow nemá plánovaný trigger a používá pouze stagingový přístup.

Šifrovaný artefakt `encrypted-staging-recovery` má ID `14725591264`. GitHub API uvádí expiraci **28. listopadu 2026 ve 21:13:19 UTC**. Archiv je šifrovaný AES‑256‑GCM, jeho klíč je zabalen RSA‑OAEP se SHA‑256. Privátní klíč k této zkoušce spravuje lokální profil operátora `svobo` chráněný Windows DPAPI. Archiv pro cvičení je uložený mimo repozitář. Retence GitHub artefaktu se nevztahuje na místní kopii.

Obnova proběhla do odděleného loopback Supabase s vlastním PostgreSQL, GoTrue a Storage, v projektu `stavbaflow-recovery-20261121`. Automatické migrace a seed byly vypnuté. Pro prázdný cíl operátor ručně aplikoval [minimální testovací schéma](../supabase/tests/staging_recovery_target.sql) a [schválený kontrakt pro poznámky a soubory](../supabase/staging/20261013_lead_notes_files_contract.sql). Obnovené UUID jsou původní. Každý obnovený účet dostal nové náhodné heslo jen pro zkoušku. Archiv neobsahuje hesla, hashe, existující přihlašovací relace, historii událostí, nastavení celého projektu ani data jiného tenantu.

| Kontrola | Zdroj | Obnovený cíl |
| --- | ---: | ---: |
| Firmy | 1 | 1 |
| Poptávky | 1 | 1 |
| Auth identity a členství | 2 | 2 |
| Poznámky | 1 | 1 |
| Metadata souborů | 1 | 1 |
| Bajty soukromého objektu | 1 | 1 |

Hodnoty všech exportovaných polí se shodovaly. Majitel a přiřazený zaměstnanec se přihlásili pod obnovenými UUID, načetli přiřazenou poptávku a otevřeli objekt přes krátkodobou podepsanou URL. SHA‑256 souboru souhlasil. Anonymní požadavek nedostal podepsanou URL a veřejná adresa objekt nevydala.

- **Naměřené RPO cvičení 1,399 s** je stáří bodu obnovy v okamžiku simulované ztráty těsně po sběru snímku. Izolovaná fixture se po dobu sběru neměnila. Čas není garantovaným RPO průběžných záloh.
- **Naměřené RTO cvičení 16,285 s** je čas od přípravy schématu v běžícím samostatném stacku do ověření posledního přístupu k objektu a dokončení příkazu. Samotné odšifrování, obnova dat, přihlášení a testy přístupu trvaly **1,021 s**. Čas nezahrnuje start Dockeru, stažení image, získání přístupu operátora ani produkční přepnutí.

## Zopakování izolované obnovy

1. Spusť ručně staging workflow s režimem `recovery-export` z větve vymezené ve workflow. Zadej veřejný RSA SPKI klíč v Base64. Privátní klíč drž mimo Git a Actions. Ověř úspěšný export, odstranění fixture a expiraci artefaktu.
2. Založ nový lokální Supabase projekt mimo repozitář. Vypni automatické migrace i seed před startem. Ověř, že cíl používá loopback port 54321, vlastní DB, Auth a Storage a že v něm nejsou firmy. V cílové databázi ručně použij dvě SQL schémata uvedená výše.
3. Před spuštěním `node scripts/staging-recovery-restore.mjs` nastav `RECOVERY_TARGET_URL=http://127.0.0.1:54321`, lokální klíče `RECOVERY_TARGET_SERVICE_KEY` a `RECOVERY_TARGET_ANON_KEY`, cestu `RECOVERY_ARCHIVE` a privátní `RECOVERY_PRIVATE_KEY` pouze v prostředí procesu. Po běhu vyčisti procesové proměnné. Do záznamu vlož jen časy, souhrn počtů, ověření SHA‑256 a výsledek přístupových testů.
4. Pro výpadek služby postupuj podle [incident runbooku](runbook-incident.md#7-výpadek-supabase-a-obnova). Před skutečnou obnovou ověř dostupnost obou zdrojů zálohy a jejich správce. Pro produkci je nutné samostatné rozhodnutí vlastníka na základě ověřeného archivu a bezpečného cíle.

## Sentry přejímka

[Běh 45000760843](https://github.com/svobonek-lab/dashboard/actions/runs/45000760843) ověřil stagingový projekt ve Vercel Preview `dpl_AhVYQvFuLnJhas6zhCA75nGzmEvD` z commitu `db41176`. Playwright odeslal jedinou syntetickou výjimku z nepřihlášené stránky `/login`. Ingest vrátil HTTP 200 a v Sentry projektu `javascript-react` (`4512095430049872`) je událost `7af5e07fed894ff689066b4b22936f71` označená `environment=staging`. [Izolované Vercel Preview](https://dashboard-nlxovhix8-svobonek-6462s-projects.vercel.app/login)

Historie pravidla **Send a notification for high priority issues** ukazuje 22. listopadu 2026 v **09:37 UTC** jeden skutečný alert pro odpovídající issue, které Sentry při prvním výskytu označilo jako High. Pravidlo používá e-mail pro navrženého řešitele nebo nedávno aktivní členy. Tým `#dashbodard` má jediného člena s rolí Team Admin. Odpovědný příjemce v chatu potvrdil doručení e-mailu. Čas v tabulce je čas spuštění pravidla v Sentry. Z historie pravidla vede ověřený odkaz na stejný incident. [Pravidlo a jeho historie](https://dashbodard.sentry.io/monitors/alerts/828090/) · [Tým](https://dashbodard.sentry.io/settings/teams/dashbodard/members/) · [Incident JAVASCRIPT-REACT-3](https://dashbodard.sentry.io/issues/162921359/?project=4512095430049872)

Po ověření pravidla nastav pro `node scripts/staging-sentry-alert-event.mjs` `STAGING_PREVIEW_URL` na přesný ověřený origin, `STAGING_SENTRY_PROJECT_ID` na ID projektu, `SENTRY_DRILL_ID` na unikátní UUID a `SENTRY_DRILL_RECEIPT` na nový soubor mimo Git. Skript před odesláním zapisuje pokus do souboru. Při nejasném výsledku hledej ID události z tohoto souboru, než se rozhodneš o dalším kroku. [Ověření alertu, doručení a incident](runbook-incident.md#8-sentry-alert-a-cesta-k-incidentu)
