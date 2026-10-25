# Instalace konektoru StavbaFlow BYODB na Synology

Konektor je určen pro řízený pilot PostgreSQL, MySQL/MariaDB nebo Microsoft SQL Serveru. V režimu BYODB je schválená firemní databáze zdrojem pravdy pro namapovaná firemní a zakázková pole. Konektor čte změny přes odchozí HTTPS a provádí jen výslovně schválené, parametrizované zápisy z fronty; neotevírá příchozí port NASu. Managed Cloud nadále používá Supabase.

## Rychlý postup ve třech krocích

1. **Připravte zdroj:** založte omezený čtecí a zápisový účet, vytvořte složku projektu na NASu a uložte oba SQL secrets do souborů.
2. **Vytvořte projekt:** v Container Manageru zvolte **Projekt → Vytvořit**, nahrajte `docker-compose.synology.yml`, doplňte dosažitelný `DB_HOST` a `DB_PORT` a připněte release digest.
3. **Připojte a schvalte:** vložte enrollment kód a jednorázový HMAC secret jako NAS soubory, spusťte konektor, namapujte firmu i zakázky, ověřte dry-run a schvalte pouze po staging acceptance.

Podrobnosti a bezpečnostní kontroly následují níže.

## Předpoklady

- Synology Container Manager na `linux/amd64` nebo `linux/arm64`;
- vyhrazená složka `/volume1/docker/stavbaflow` (číslo volume lze změnit);
- DNS, správný čas a odchozí HTTPS k aplikaci StavbaFlow a GHCR;
- dva databázové účty: čtecí s `SELECT` a zápisový s nejmenšími potřebnými oprávněními jen na schválené tabulky;
- zkontrolovaný image digest a jednorázový enrollment kód s platností 15 minut.

Nevystavujte databázi do internetu. Konektor má běžet v síti, ze které dosáhne na databázi. Obě hesla i identita konektoru se ukládají jen jako Docker secrets na NASu. Nezapínejte BYODB, dokud není ověřený staging, schválené mapování i image připnutý na neměnný digest.

## Databázové účty

Vytvořte oddělené účty pouze pro StavbaFlow. Čtecí účet smí číst jen mapované tabulky a potřebná metadata. Zápisový účet smí provádět pouze operace, které vyžaduje schválené mapování; nepřidělujte mu DDL, správu uživatelů ani přístup k jiným schématům. Pokud databáze neumí tato oprávnění dostatečně omezit, nepovolujte zápisy BYODB. Uživatelé musí být dostupní pouze z adresy NASu. Zápisy vznikají až po zapnutí BYODB vlastníkem a po schválení mapování; změny mimo povolená pole konektor odmítá.

## Soubory na NASu

1. Stáhněte z kontrolovaného GitHub release `docker-compose.synology.yml`, `config.example.json`, instalační a aktualizační skripty a `connector-manifest.json`. Release obsahuje image s neměnným digestem i soubory pro instalaci.
2. Zkopírujte vzor konfigurace do `/volume1/docker/stavbaflow/config/config.json`.
3. Nastavte v `config.json` ovladač (`mariadb` pro Synology MariaDB 10+, jinak `mysql`, `postgres` nebo `mssql`), název databáze, schéma, `CUSTOMER_READ_ONLY_USER`, `writeUsername` pro omezený zápisový účet a přesnou HTTPS adresu aplikace. `passwordFile` i `writePasswordFile` ponechte jako cesty k Docker secrets. Hodnoty `database.host` a `database.port` v souboru slouží jako záloha; Compose je přepíše proměnnými `DB_HOST` a `DB_PORT`.
4. Uložte heslo čtecího účtu do `/volume1/docker/stavbaflow/secrets/source-db-password` a heslo zápisového účtu do `/volume1/docker/stavbaflow/secrets/source-db-write-password`.
5. V dashboardu vlastníka vytvořte jednorázový kód a uložte jej do `/volume1/docker/stavbaflow/secrets/enrollment-code`.
6. Uložte jednorázový `connectorSecret` do `/volume1/docker/stavbaflow/secrets/connector-identity`; nejde o enrollment kód. Omezte přístup ke složkám `secrets` a `state` pouze na správce NASu a účet Container Manageru.

Před spuštěním instalačního skriptu nastavte `STAVBAFLOW_CONNECTOR_IMAGE` na hodnotu `image@digest` z manifestu. Skript odmítne jinou cílovou cestu, chybějící secrets, neplatný Compose soubor i neúspěšné spuštění. Hodnoty secrets nevypisuje.

## Projekt v Synology Container Manageru

V **Container Manager → Projekt → Vytvořit** vyberte složku `/volume1/docker/stavbaflow` a nahrajte `docker-compose.synology.yml`. V proměnných projektu nastavte:

| Proměnná | Příklad | Význam |
| --- | --- | --- |
| `STAVBAFLOW_CONNECTOR_IMAGE` | `ghcr.io/svobonek-lab/stavbaflow-connector@sha256:<ověřený digest>` | Přesně zkontrolovaný image z release. |
| `DB_HOST` | `192.168.1.20` | Adresa databáze dostupná z kontejneru; pro databázi přímo na NASu použijte LAN adresu NASu, nikoli `localhost`. |
| `DB_PORT` | `3306` | TCP port MariaDB/MySQL; pro PostgreSQL zpravidla `5432`, pro SQL Server `1433`. |
| `CONNECTOR_SECRET` | `/volume1/docker/stavbaflow/secrets/enrollment-code` | Cesta k souboru s jednorázovým enrollment kódem. |

Hesla jsou v souborech `source-db-password` a `source-db-write-password`; identita je v `connector-identity`. Jejich obsah nepatří do proměnných projektu ani do Compose YAML. Konektor nepublikuje žádný port a do cloudu navazuje jen odchozí HTTPS spojení. Po úspěšném enrollmentu smažte soubor enrollment kódu. HMAC secret je unikátní pro tento konektor a server ho drží šifrovaný; nikdy jej nesdílejte mezi firmami.

## První připojení

Po startu konektor spotřebuje jednorázový enrollment kód a odešle první HMAC podepsaný heartbeat. V dashboardu musí být vidět nový konektor a metadata tabulek/sloupců bez zákaznických řádků. Pokud kód vypršel, vytvořte nový; starý nelze znovu použít.

Vyberte zdrojovou tabulku s právě jedním řádkem pro profil firmy a tabulku zakázek. Explicitně namapujte firemní pole i zakázky. První běh mapování je vždy dry-run. Zkontrolujte počty platných/chybných záznamů a názvy chybných polí; dry-run nesmí zobrazit zákaznické hodnoty. Import i zápisy se povolí teprve po výslovném schválení vlastníkem. Aktivace odmítne nulový nebo nejednoznačný firemní profil. Konflikty zdrojových verzí se zobrazí jako konflikty a samy se nepřepisují.

## Přijetí instalace

Před prvním firemním nasazením dokončete ruční workflow **connector-staging-acceptance** na větvi `main`. GitHub Actions variables musí obsahovat `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_PROJECT_REF` a `STAGING_PREVIEW_URL`. Staging ref musí být samostatný Supabase projekt; workflow odmítne ref použitý produkčním webem a URL, která neodpovídá deklarovanému staging refu. Do **Actions secrets** patří `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_OWNER_A_EMAIL`, `STAGING_OWNER_A_PASSWORD`, `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_EMPLOYEE_A_PASSWORD`, `STAGING_OWNER_B_EMAIL` a `STAGING_OWNER_B_PASSWORD`; `STAGING_PREVIEW_BYPASS_TOKEN` je volitelný secret. Všechny účty musí být syntetické. Volitelná variable `CONNECTOR_EXPECTED_ID` zpřísní Preview kontrolu na konkrétní staging konektor.

Workflow používá syntetické účty a kontroluje dvě firmy, zamítnutí zaměstnance, Preview endpoint a bezpečný tvar odpovědi. Vydání image vyžaduje ID úspěšného staging běhu pro stejný commit. Workflow nepoužívá service-role klíč ani neaplikuje SQL. Kontrakty v `supabase/staging/20261004_connector_contract.sql` a `supabase/staging/20261025_byodb_operations.sql` musí předtím správce zkontrolovat a ručně aplikovat pouze v izolovaném staging projektu.

**Aktuální blocker:** repozitář nemá nakonfigurované oddělené staging Supabase URL/ref a publishable key, workflow nemá úspěšný staging běh a není publikovaného image digestu. Proto konektorový balíček a aktivace BYODB zůstávají vypnuté. Nepoužívejte produkční projekt jako náhradu stagingu a nevytvářejte nový projekt bez samostatného rozhodnutí.

Serverové nasazení musí mít nakonfigurovaný secret `CONNECTOR_SECRET_ENCRYPTION_KEY`; jeho hodnotu uchovávejte jen v tajném úložišti serverového prostředí, nikdy v repozitáři nebo návodu.

Instalace na firemním NASu je přijatá pouze když:

- image běží pod neprivilegovaným uživatelem a NAS nemá nový veřejný port;
- čtecí i omezená zápisová kontrola adaptéru vybraného pro tento pilot projdou na syntetických datech (CI ověřuje všechny tři podporované motory);
- dashboard zaznamená čerstvý podepsaný heartbeat;
- dry-run nevypíše zdrojové hodnoty ani přihlašovací údaje;
- vlastník jiné syntetické firmy stav konektoru nevidí;
- po schválení se uloží jen kanonická mapovaná data, zápis z aplikace dorazí do firemní databáze a opakovaný request nevytvoří duplicitu;
- offline opakování, konflikt a obnova po restartu konektoru jsou ověřeny na syntetických datech.

Bez těchto důkazů neaktivujte `VITE_CONNECTOR_ENABLED`, `VITE_BYODB_ENABLED` ani `ENABLE_BYODB_WRITES` pro zákaznické nasazení.
