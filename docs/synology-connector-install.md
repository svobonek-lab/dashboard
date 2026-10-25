# Instalace read-only konektoru StavbaFlow na Synology

Tento postup je určen pro řízený pilot. Konektor pouze čte vybrané tabulky z PostgreSQL, MySQL/MariaDB nebo Microsoft SQL Serveru a odesílá mapované záznamy přes HTTPS do jedné firmy ve StavbaFlow. Neotevírá port NASu a do zdrojové databáze nezapisuje.

## Předpoklady

- Synology Container Manager na `linux/amd64` nebo `linux/arm64`;
- vyhrazená složka `/volume1/docker/stavbaflow` (číslo volume lze změnit);
- DNS, správný čas a odchozí HTTPS k aplikaci StavbaFlow a GHCR;
- samostatný databázový uživatel s pouze `SELECT` na povolených tabulkách;
- zkontrolovaný image digest a jednorázový enrollment kód s platností 15 minut.

Nevystavujte databázi do internetu. Konektor má běžet v síti, ze které dosáhne na databázi. Heslo se ukládá jen do souboru Docker secret na NASu.

## Read-only databázový účet

Použijte nový účet pouze pro StavbaFlow. Povolte mu přihlášení z adresy NASu, `SELECT` jen na mapovaných tabulkách a čtení potřebných metadata katalogů. Nepřidělujte `INSERT`, `UPDATE`, `DELETE`, DDL, správu uživatelů ani replikační oprávnění. Vestavěný startovací test připojení selže uzavřeně, pokud nedokáže prokázat čtení nebo zákaz zápisu.

## Soubory na NASu

1. Stáhněte z kontrolovaného GitHub release `docker-compose.synology.yml`, `config.example.json`, instalační a aktualizační skripty a `connector-manifest.json`. Release obsahuje image s neměnným digestem i soubory pro instalaci.
2. Zkopírujte vzor konfigurace do `/volume1/docker/stavbaflow/config/config.json`.
3. Nastavte v `config.json` ovladač (`mariadb` pro Synology MariaDB 10+, jinak `mysql`, `postgres` nebo `mssql`), název databáze, schéma, `CUSTOMER_READ_ONLY_USER` a přesnou HTTPS adresu aplikace. Hodnoty `database.host` a `database.port` v souboru slouží jako záloha; Compose je přepíše proměnnými `DB_HOST` a `DB_PORT`.
4. Uložte databázové heslo bez konce řádku do `/volume1/docker/stavbaflow/secrets/source-db-password`.
5. V dashboardu vlastníka vytvořte jednorázový kód a uložte jej do `/volume1/docker/stavbaflow/secrets/enrollment-code`.
6. Omezte přístup ke složkám `secrets` a `state` pouze na správce NASu a účet Container Manageru.

Před spuštěním instalačního skriptu nastavte `STAVBAFLOW_CONNECTOR_IMAGE` na hodnotu `image@digest` z manifestu. Skript odmítne jinou cílovou cestu, chybějící secrets, neplatný Compose soubor i neúspěšné spuštění. Hodnoty secrets nevypisuje.

## Projekt v Synology Container Manageru

V **Container Manager → Projekt → Vytvořit** vyberte složku `/volume1/docker/stavbaflow` a nahrajte `docker-compose.synology.yml`. V proměnných projektu nastavte:

| Proměnná | Příklad | Význam |
| --- | --- | --- |
| `STAVBAFLOW_CONNECTOR_IMAGE` | `ghcr.io/svobonek-lab/stavbaflow-connector@sha256:<ověřený digest>` | Přesně zkontrolovaný image z release. |
| `DB_HOST` | `192.168.1.20` | Adresa databáze dostupná z kontejneru; pro databázi přímo na NASu použijte LAN adresu NASu, nikoli `localhost`. |
| `DB_PORT` | `3306` | TCP port MariaDB/MySQL; pro PostgreSQL zpravidla `5432`, pro SQL Server `1433`. |
| `CONNECTOR_SECRET` | `/volume1/docker/stavbaflow/secrets/enrollment-code` | **Cesta k souboru** s jednorázovým registračním kódem; nejde o hodnotu tajemství ani sdílený HMAC klíč. |

Heslo databáze je v samostatném souboru `/volume1/docker/stavbaflow/secrets/source-db-password`. Oba soubory musí být čitelné pro Container Manager; jejich obsah nepatří do proměnných projektu ani do Compose YAML. Agent nepublikuje žádný port a do cloudu navazuje jen odchozí HTTPS spojení. Po spotřebování registračního kódu smažte jeho soubor.

Požadavek v původním návrhu na `CONNECTOR_SECRET` jako HMAC klíč neodpovídá nasazenému protokolu: každý agent si vytváří vlastní Ed25519 klíč a server ověřuje podpis podle registrovaného veřejného klíče konektoru. Sdílený HMAC klíč pro všechny firmy se nepoužívá.

## První připojení

Po startu konektor lokálně vytvoří Ed25519 identitu, spotřebuje jednorázový kód a odešle první podepsaný heartbeat. V dashboardu musí být vidět nový konektor a metadata tabulek/sloupců bez zákaznických řádků. Pokud kód vypršel, vytvořte nový; starý nelze znovu použít.

Vyberte jednu tabulku a explicitně namapujte sloupce. První běh je vždy dry-run. Zkontrolujte počty platných/chybných záznamů a názvy chybných polí. Import se povolí teprve po výslovném schválení vlastníkem a jen při nulovém počtu chyb dry-runu.

## Přijetí instalace

Před prvním firemním nasazením dokončete ruční workflow **connector-staging-acceptance** na větvi `main`. GitHub Actions variables musí obsahovat `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_PROJECT_REF` a `STAGING_PREVIEW_URL`. Staging ref musí být samostatný Supabase projekt; workflow odmítne ref použitý produkčním webem a URL, která neodpovídá deklarovanému staging refu. Do **Actions secrets** patří `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_OWNER_A_EMAIL`, `STAGING_OWNER_A_PASSWORD`, `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_EMPLOYEE_A_PASSWORD`, `STAGING_OWNER_B_EMAIL` a `STAGING_OWNER_B_PASSWORD`; `STAGING_PREVIEW_BYPASS_TOKEN` je volitelný secret. Všechny účty musí být syntetické. Volitelná variable `CONNECTOR_EXPECTED_ID` zpřísní Preview kontrolu na konkrétní staging konektor.

Workflow používá syntetické účty a kontroluje dvě firmy, zamítnutí zaměstnance, Preview endpoint a bezpečný tvar odpovědi. Vydání image vyžaduje ID úspěšného staging běhu pro stejný commit. Workflow nepoužívá service-role klíč ani neaplikuje SQL. Kontrakt v `supabase/staging/20261004_connector_contract.sql` musí předtím samostatně zkontrolovat a ručně aplikovat správce izolovaného staging projektu.

Instalace na firemním NASu je přijatá pouze když:

- image běží pod neprivilegovaným uživatelem a NAS nemá nový veřejný port;
- read-only kontrola adaptéru vybraného pro tento pilot projde (CI ověřuje všechny tři podporované motory);
- dashboard zaznamená čerstvý podepsaný heartbeat;
- dry-run nevypíše zdrojové hodnoty ani přihlašovací údaje;
- vlastník jiné syntetické firmy stav konektoru nevidí;
- po schválení se uloží jen kanonická mapovaná data a opakovaný request nevytvoří duplicitu.

Bez těchto důkazů neaktivujte `VITE_CONNECTOR_ENABLED` pro zákaznické nasazení.
