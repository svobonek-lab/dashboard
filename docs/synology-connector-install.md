# Instalace konektoru StavbaFlow BYODB na Synology

Konektor je určen pro řízený pilot PostgreSQL, MySQL/MariaDB nebo Microsoft SQL Serveru. V režimu BYODB je schválená firemní databáze zdrojem pravdy pro namapovaná firemní a zakázková pole. Konektor čte změny přes odchozí HTTPS a provádí jen výslovně schválené, parametrizované zápisy z fronty; neotevírá příchozí port NASu. Managed Cloud nadále používá Supabase.

## Rychlé nasazení: příprava a tři kroky v DSM

Nejdřív připravte NAS a soubory podle následujícího předletového seznamu. Samotné vytvoření projektu pak v Container Manageru projde třemi obrazovkami/pracovními kroky. Počet potvrzovacích kliknutí se může mezi verzemi DSM lišit.

### Před otevřením Container Manageru

- Z dashboardu vlastníka vytvořte konektor pro zvolený databázový ovladač a stáhněte jeho personalizovaný ZIP. ZIP obsahuje pouze `docker-compose.synology.yml` a `config.json` se zvoleným ovladačem a URL aplikace; neobsahuje hesla, enrollment kód ani HMAC secret.
- Stáhněte kontrolovaný GitHub release a ověřte `connector-manifest.json`. Použijte přesný neměnný digest image z manifestu; image tag `latest` nepoužívejte.
- Vytvořte na NASu adresář `/volume1/docker/stavbaflow` a podadresáře `config`, `state` a `secrets`. ZIP rozbalte a zkopírujte `config.json` do `config/`.
- V `config.json` nastavte adresu a název zdrojové databáze, schéma, databázové uživatele a zapnutí TLS podle certifikátu zdroje. Čtecí a omezené zápisové heslo vložte do souborů `secrets/source-db-password` a `secrets/source-db-write-password`.
- Enrollment kód z dashboardu uložte do `secrets/enrollment-code`; jednorázový `connectorSecret` uložte beze změny do `secrets/connector-identity`. Tyto hodnoty nevkládejte do `config.json`, `.env`, Compose YAML ani do chatu.
- V adresáři projektu vedle Compose souboru vytvořte `.env` pouze s `DB_HOST` (adresa dosažitelná z kontejneru) a `DB_PORT`. Nepřidávejte do něj žádná hesla ani klíče. Omezte oprávnění složky `secrets` na správce NASu a účet Container Manageru.

### Tři kroky v Container Manageru

1. Otevřete **Container Manager → Projekt → Vytvořit**.
2. Jako název zadejte `stavbaflow-connector`, jako cestu `/volume1/docker/stavbaflow` a jako zdroj nahrajte personalizovaný `docker-compose.synology.yml`.
3. Zkontrolujte souhrn, zvolte **Dokončit** a po výzvě potvrďte spuštění projektu.

Po spuštění ověřte stav kontejneru a podepsaný heartbeat v dashboardu. Kód enrollmentu se spotřebuje jednou; smažte jeho soubor z NASu po úspěšném připojení. Namapujte nejdřív firemní profil a zakázky, proveďte dry-run bez zápisu a neschvalujte mapování, dokud není dokončena staging acceptance.

Oficiální kroky průvodce Synology: [Container Manager — Project](https://kb.synology.com/en-global/DSM/help/ContainerManager/docker_project?version=7).

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

1. Z kontrolovaného GitHub release získejte `connector-manifest.json`, instalační/aktualizační skripty a příklad konfigurace. Z dashboardu vlastníka získejte personalizovaný ZIP s připnutým image digestem; pro vytvoření projektu použijte Compose a `config.json` z tohoto ZIPu, nikoli obecný Compose soubor z release.
2. V `/volume1/docker/stavbaflow/config/config.json` nastavte pouze spojení a ovladač: `mariadb` pro Synology MariaDB 10+, jinak `mysql`, `postgres` nebo `mssql`, název databáze, schéma, `CUSTOMER_READ_ONLY_USER`, `writeUsername` pro omezený zápisový účet a přesnou HTTPS adresu aplikace. `passwordFile` a `writePasswordFile` ponechte jako cesty k Docker secrets. `DB_HOST` a `DB_PORT` se nastavují v `.env` vedle Compose souboru a přepíší hodnoty host/port z configu.
3. Vložte hesla, enrollment kód a jednorázový `connectorSecret` do čtyř oddělených souborů v `/volume1/docker/stavbaflow/secrets/` přesně podle předchozího seznamu. Omezte přístup k `secrets` a `state` pouze na správce NASu a účet Container Manageru.

Personalizovaný Compose soubor už obsahuje digest image i cestu k enrollment souboru. Obecný šablonový Compose v GitHub release místo něj vyžaduje nastavit `STAVBAFLOW_CONNECTOR_IMAGE` na `image@digest` z manifestu a `CONNECTOR_SECRET` na absolutní cestu enrollment souboru. Instalační skript odmítne jinou cílovou cestu, chybějící secrets, neplatný Compose soubor i neúspěšné spuštění; hodnoty secrets nevypisuje.

## Projekt v Synology Container Manageru

Pokud používáte personalizovaný ZIP z dashboardu, vyberte složku `/volume1/docker/stavbaflow` a nahrajte jeho `docker-compose.synology.yml`. `DB_HOST` a `DB_PORT` načte Compose z `.env` v této složce. Vygenerovaný soubor už má digest image a cestu enrollment souboru. Obecná šablona z repozitáře používá tyto proměnné:

| Proměnná | Příklad | Význam |
| --- | --- | --- |
| `STAVBAFLOW_CONNECTOR_IMAGE` | `ghcr.io/svobonek-lab/stavbaflow-connector@sha256:<ověřený digest>` | Přesně zkontrolovaný image z release. |
| `DB_HOST` | `192.168.1.20` | Adresa databáze dostupná z kontejneru; pro databázi přímo na NASu použijte LAN adresu NASu, nikoli `localhost`. |
| `DB_PORT` | `3306` | TCP port MariaDB/MySQL; pro PostgreSQL zpravidla `5432`, pro SQL Server `1433`. |
| `CONNECTOR_SECRET` | `/volume1/docker/stavbaflow/secrets/enrollment-code` | Cesta k souboru s jednorázovým enrollment kódem (jen pro obecnou šablonu). |

Hesla jsou v souborech `source-db-password` a `source-db-write-password`; identita je v `connector-identity`. Jejich obsah nepatří do proměnných projektu ani do Compose YAML. Konektor nepublikuje žádný port a do cloudu navazuje jen odchozí HTTPS spojení. Po úspěšném enrollmentu smažte soubor enrollment kódu. HMAC secret je unikátní pro tento konektor a server ho drží šifrovaný; nikdy jej nesdílejte mezi firmami.

## První připojení

Po startu konektor spotřebuje jednorázový enrollment kód a odešle první HMAC podepsaný heartbeat. V dashboardu musí být vidět nový konektor a metadata tabulek/sloupců bez zákaznických řádků. Pokud kód vypršel, vytvořte nový; starý nelze znovu použít.

Vyberte zdrojovou tabulku s právě jedním řádkem pro profil firmy a tabulku zakázek. Explicitně namapujte firemní pole i zakázky. První běh mapování je vždy dry-run. Zkontrolujte počty platných/chybných záznamů a názvy chybných polí; dry-run nesmí zobrazit zákaznické hodnoty. Import i zápisy se povolí teprve po výslovném schválení vlastníkem. Aktivace odmítne nulový nebo nejednoznačný firemní profil. Konflikty zdrojových verzí se zobrazí jako konflikty a samy se nepřepisují.

## Přijetí instalace

Před prvním firemním nasazením dokončete ruční workflow **connector-staging-acceptance** na větvi `main`. GitHub Actions variables musí obsahovat `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_PROJECT_REF` a `STAGING_PREVIEW_URL`. Staging ref musí být samostatný Supabase projekt; workflow odmítne ref použitý produkčním webem a URL, která neodpovídá deklarovanému staging refu. Do **Actions secrets** patří `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_OWNER_A_EMAIL`, `STAGING_OWNER_A_PASSWORD`, `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_EMPLOYEE_A_PASSWORD`, `STAGING_OWNER_B_EMAIL` a `STAGING_OWNER_B_PASSWORD`; `STAGING_PREVIEW_BYPASS_TOKEN` je volitelný secret. Všechny účty musí být syntetické. Volitelná variable `CONNECTOR_EXPECTED_ID` zpřísní Preview kontrolu na konkrétní staging konektor.

Workflow používá syntetické účty a kontroluje izolaci dvou firem, zamítnutí zaměstnance, Preview API a bezpečný tvar odpovědi. Playwright se přihlásí staging owner účtem, ověří otevření setupu jedním kliknutím, Compose release gate a modal mapování; enrollment neodesílá. Vydání image vyžaduje ID úspěšného staging běhu pro stejný commit. Workflow nepoužívá service-role klíč ani neaplikuje SQL. Kontrakty v `supabase/staging/20261004_connector_contract.sql` a `supabase/staging/20261025_byodb_operations.sql` musí předtím správce zkontrolovat a ručně aplikovat pouze v izolovaném staging projektu.

**Aktuální stav (2026-10-25):** GitHub Actions už obsahuje oddělený staging projekt `xwzweltjvreqhjpbjrxa`, staging publishable key, Preview URL a syntetické účty. Produkční projekt `oncmtmrhmjlerbwkrecv` zůstává oddělený. První ruční acceptance běh `40233268156` se zastavil, protože workflow nepředalo `STAGING_PREVIEW_URL` prvnímu staging testu; oprava je připravena v PR #121 a po jejím sloučení je potřeba acceptance znovu ručně spustit. Zatím není úspěšný staging běh ani publikovaný image digest, takže Synology balíček a aktivaci BYODB nepoužívejte. Produkci nepoužívejte jako náhradu stagingu a další Supabase projekt nevytvářejte.

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
