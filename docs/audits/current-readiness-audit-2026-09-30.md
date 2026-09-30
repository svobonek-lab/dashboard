# StavbaCore — audit připravenosti k prodeji

Datum auditu: 2026-09-30  
Auditovaný commit `main`: `21591b6` (`feat: add fail-closed production identity boundary (#44)`)

## Ověřeno jako hotové

- `npm test`: **47/47 testů prošlo**.
- `npm run lint` (`tsc --noEmit`): **prošlo**.
- `npm run build`: **prošel produkční Vite build**.
- `git diff --check`: **bez chyb**.
- CI workflow `.github/workflows/verify.yml` spouští na pull requestu i na `main` `npm ci`, testy, lint a build.
- Vercel preview kontrola posledního bezpečnostního PR #44 prošla pro obě plochy: dashboard i jobflow-pro.
- Produkční identita je fail-closed: při `VITE_APP_SCHEMA_READS=true` se členství řeší přes `app_members` + `app_companies`, pouze pro přihlášeného uživatele a aktivní firmu. Neověřené členství nepouští uživatele do workspace.
- Zaměstnanec je omezen na aktivní členství, vlastní firmu a přiřazené leady. Test pokrývá i kolizi stejného ID mezi dvěma firmami.
- Role a průchod lead → kontakt → termín → nabídka → zakázka mají validované přechody; zaměstnanec nemůže přeskočit komerční krok ani znovu otevřít dokončenou práci.
- Owner dashboard a sales cockpit zobrazují stav firmy odděleně podle tenant/company scope.
- Lokální demo/mock autentizace a lokální datový fallback jsou v produkčním buildu vypnuté.
- Dvě Vercel plochy jsou oddělené: veřejná landing stránka a přihlašovací aplikace. Chybějící konfigurace aplikace skončí bezpečnou setup obrazovkou.
- V repozitáři nebyl nalezen skutečný API/service secret. `.env.example` obsahuje pouze prázdné názvy proměnných a `.gitignore` ignoruje `.env*`, klíče a privátní adresáře.

## Zbývající blokátory před ostrým prodejem

### P0 — Supabase granty, RLS a security advisor

Metadata audit produkčního schématu eviduje `app_companies`, `app_members`, `app_leads` a další `app_*` tabulky s RLS, ale není doloženo, že všechny potřebné SELECT/INSERT/UPDATE granty a policy predicate jsou ověřené pro reálný onboarding, pozvánky a lead lifecycle. Bez tohoto důkazu musí zůstat app-schema zápisy vypnuté.

Poslední bezpečnostní snapshot navíc uvádí:

- 22 `SECURITY DEFINER` funkcí spustitelných rolí `authenticated`, včetně administrativních a zapisovacích funkcí;
- vypnutou `auth_leaked_password_protection`.

To je provozní blokátor. Náprava vyžaduje změnu nastavení/policy přímo v Supabase a následný advisor/RLS/grant recheck. Tento audit nic do produkce nezapisuje a migrace nespouští.

### P0 — app-schema zápisový adaptér

Čtení identity, členů a leadů přes `app_*` je připravené a opt-in. Zápisy leadů, pozvánek, nabídek, úkolů, rozpočtů, faktur a onboardingových změn stále používají legacy tabulky nebo nejsou připojené k ověřenému `app_*` RPC kontraktu. Aplikace je proto při `VITE_APP_SCHEMA_READS=true` záměrně fail-closed a nepředstírá uložení dat.

### P1 — úklid starých draftů

GitHub stále obsahuje otevřené PR #37, #18, #20, #5 a #4. Jejich změny jsou zastaralé, překrývají se s již integrovanými commity nebo jsou ve stavu `DIRTY`. Nejsou součástí aktuálního `main`; je potřeba je ručně uzavřít nebo označit jako superseded, aby nepletly release proces. Audit je neuzavírá automaticky.

### P1 — první placený pilot

Před prodejem je potřeba jeden řízený pilot s reálnou firmou: přihlášení ownera, pozvání zaměstnance, ověření omezeného seznamu zakázek, vytvoření/posun leadu a kontrola, že druhá firma data nevidí. Pilot má být proveden až po ověření P0 grantů/RLS, bez použití zákaznických řádků v tomto auditu.

## Verdikt

Kód a CI jsou v ověřeném stavu pro bezpečný preview/demo provoz. Produkt **není ještě doložen jako připravený pro ostré více-tenantové zápisy do produkční Supabase**. Nejbližší bezpečný krok je dodat a ověřit app-schema write kontrakt a současně uzavřít security advisor nálezy; teprve potom přepnout produkční `VITE_APP_SCHEMA_READS` a provést pilotní smoke test.
