# Pozvánky přes bezpečný e-mailový outbox

Pozvánky zaměstnanců a vlastníků se v aplikaci zařazují do `app_email_outbox`. Serverový worker vytvoří jednorázový Supabase Auth odkaz přes `generateLink` a odešle ho přes nakonfigurovaný e-mailový provider. Zařazení do fronty není potvrzení doručení.

**Aktuální stav:** kód a stagingové SQL návrhy jsou v revizi PR #160. SQL se zatím nesmí považovat za aplikované. Dokud nebude stagingový SQL schválen a aplikován, provider a klíče nastaveny a průchod ověřen, nepovolujte `APP_INVITE_WORKER_ENABLED` na zákaznickém nasazení.

## Připravení adresy

1. V Supabase otevřete **Authentication → URL Configuration**.
2. Nastavte Site URL na HTTPS dashboardu.
3. Přidejte přesné HTTPS redirect URL pro Preview `/login` a později samostatně produkční `/login`.
4. Nepovolujte široké zástupné domény, pokud stačí konkrétní URL.

## Serverové proměnné

Nastavují se v serverovém deployment secret manageru, nikdy jako `VITE_*`:

- `EMAIL_PROVIDER_API_KEY`: API key nakonfigurovaného provideru.
- `EMAIL_FROM`: odesílatel na ověřené doméně.
- `EMAIL_LINK_ENCRYPTION_KEY`: base64 reprezentace 32 náhodných bajtů; generujte například `openssl rand -base64 32`. Uložte ji jako oddělený secret.
- `AUTH_EMAIL_LINK_TTL_SECONDS`: celé číslo 300–3600 a nejvýše skutečná expirace Auth e-mailového OTP.
- `APP_URL`: přesná HTTPS adresa dashboardu.
- `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: stávající worker konfigurace. Service-role secret musí zůstat pouze na serveru.
- `APP_INVITE_WORKER_ENABLED=true`: zapněte až po dokončení staging ověření.

Chybějící šifrovací klíč, provider nebo worker konfigurace nesmí poslat odkaz přes Auth SMTP ani uložit odkaz v plaintextu. Úloha zůstane bezpečně blokovaná/ve frontě.

## Stagingové databázové návrhy

Nejdřív zkontrolujte aktuální metadata. Kód v PR #160 připravuje:

- `supabase/staging/20261103_outbox_worker_legacy_compat.sql` — doplnění worker polí a odstranění čtení outbox tabulky z `anon`/`authenticated`.
- `supabase/staging/20261103_invitation_outbox.sql` — zašifrovaná payload pole, doručení a pravdivý stav pozvánky v administraci.
- `supabase/staging/20261103_outbox_minute_scheduler.sql` — volitelný minutový worker přes Supabase Cron a pg_net; endpoint a token musí být nejdřív uloženy v Supabase Vault, nikdy vepsány do SQL.
- `supabase/staging/20261103_outbox_minute_scheduler_rollback.sql` — odregistrování úlohy.

Jde o návrhy; žádný z těchto SQL souborů nebyl v tomto úkolu aplikován. Produkce se nemění. Scheduler SQL vyžaduje samostatnou revizi a schválení.

## DNS a provider

V provider dashboardu ověřte doménu a přidejte DNS záznamy přesně podle aktuálních údajů provideru. Šablona SPF/DKIM/DMARC je v [email-setup.md](email-setup.md); názvy selectorů ani cílové hodnoty nepřebírejte z příkladů.

## Ověřovací scénář

1. Po samostatném staging schválení aplikujte staging návrhy ve správném pořadí a ověřte SQL kontrakty.
2. Nastavte výše uvedené secrets pouze pro izolované staging Preview.
3. Vytvořte syntetickou firmu a pozvánku na testovací schránku. API musí hlásit „zařazena k odeslání“.
4. Ověřte provider přijetí a teprve pak stav `sent` v adresáři; `failed` se zobrazí jako chyba a lze bezpečně založit novou pozvánku.
5. Otevřete odkaz. Uživatel musí nastavit heslo a skončit pouze ve své firmě a roli.
6. Ověřte jednorázové použití, expiraci, resend, dočasnou chybu provideru a doručení po retry.
7. Ověřte, že outbox nemá žádná oprávnění ani RLS policy pro browser role, encrypted link se vymaže po úspěchu/terminálním selhání a token není v API výstupu, logu ani run evidence.

Nepoužívejte zákaznické adresy, hesla ani Auth tokeny v testech. Ověřovací protokol ukládá pouze syntetické ID, stav a čas, nikdy odkaz ani tajný obsah.
