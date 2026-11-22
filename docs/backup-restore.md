# Stav záloh a zkouška obnovy StavbaFlow

## Stav u poskytovatele k 22. listopadu 2026

| Oblast | Aktuální důkaz | Retence a správce |
| --- | --- | --- |
| Databáze staging | Připojený Supabase MCP vrátil `StavbaCore Staging`, `ACTIVE_HEALTHY`, `eu-central-1`, PostgreSQL 17 a tarif `free` pro `svobonek-lab's Org`. Tarif Free neposkytuje plánované denní zálohy. [Pokus číst katalog přes zavedený stagingový kanál](https://github.com/svobonek-lab/dashboard/actions/runs/45000760843) vrátil 22. listopadu HTTP 401. Katalog proto nebylo možné ověřit. | Pravidelná retence a jmenovitý správce pravidelných záloh nejsou doloženi. |
| Databáze produkce | Schválený `supabase-ci` v režimu read-only vrátil PostgreSQL 17.11 a `archive_mode=on`. Katalog záloh, stav PITR, retence a přístupy ke správě záloh přes tento MCP dostupné nejsou. Historický snímek z 3. listopadu uváděl tarif Free. | Aktuální inventář, ruční kopie, retence a jmenovitý správce nejsou ověřeni. |
| Supabase Storage | Databázové zálohy Supabase obsahují metadata Storage. Data objektů vyžadují samostatnou kopii. Stagingový objekt byl zkopírován a obnoven v tomto cvičení. | Pravidelná kopie bajtů, její retence a odpovědná osoba pro produkci ani staging nejsou doloženy. |

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

[Běh 45000760843](https://github.com/svobonek-lab/dashboard/actions/runs/45000760843) ověřil stagingový projekt ve Vercel Preview `dpl_AhVYQvFuLnJhas6zhCA75nGzmEvD` z commitu `db41176`. Playwright zachytil obálku SDK s `environment=staging` bez uživatelského kontextu a zastavil přenos před sítí. Sentry projekt je `4512095430049872`. Přihlášení do Sentry Dashboardu je podmínkou pro ověření konkrétního pravidla a příjemce. Syntetická událost pro tuto přejímku zatím nebyla odeslána. [Izolované Vercel Preview](https://dashboard-nlxovhix8-svobonek-6462s-projects.vercel.app/login)

Po ověření pravidla nastav pro `node scripts/staging-sentry-alert-event.mjs` `STAGING_PREVIEW_URL` na přesný ověřený origin, `STAGING_SENTRY_PROJECT_ID` na ID projektu, `SENTRY_DRILL_ID` na unikátní UUID a `SENTRY_DRILL_RECEIPT` na nový soubor mimo Git. Skript před odesláním zapisuje pokus do souboru. Při nejasném výsledku hledej ID události z tohoto souboru, než se rozhodneš o dalším kroku. [Ověření alertu, doručení a incident](runbook-incident.md#8-sentry-alert-a-cesta-k-incidentu)
