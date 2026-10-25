# Stripe billing runbook

Tento dokument popisuje bezpečnou aktivaci Checkout, Billing Portal a endpointu `POST /api/stripe-webhook`. SQL v repozitáři je reviewovatelný stagingový návrh a nesmí se automaticky aplikovat do produkce.

## Datový kontrakt

`supabase/staging/20261015_stripe_billing_contract.sql` přidává do `app_companies` stav předplatného, unikátní Stripe Customer a Subscription ID, konec období a čas poslední události. `app_stripe_webhook_events` uchovává provozní metadata pro idempotenci. Browser role k tabulce ani zapisovacímu RPC nemají přístup.

RPC `app_apply_stripe_subscription_event` kontroluje `event_id`, zamyká řádek firmy, odmítá starší `event.created` a zapisuje událost i stav předplatného v jedné transakci. Duplicitní událost vrací `duplicate`, starší `stale`; obě dostanou HTTP 200. Databázová chyba vrací HTTP 500, aby Stripe doručení zopakoval. CI navíc spouští dvě stejná doručení současně proti jednorázové PostgreSQL instanci a ověřuje jediný zápis.

`supabase/staging/20261016_stripe_billing_completion.sql` přidává dvě service-only operace. `app_platform_set_billing_plan` dovolí ověřenému platform adminovi zvolit pouze `pilot`, `starter` nebo `growth`, ale nikdy nemění `subscription_status`. `app_bind_stripe_customer` atomicky sváže Stripe Customer s jedinou firmou. Obě funkce mají pevný `search_path` a odebraná browserová oprávnění.

## Checkout a Portal

Checkout endpoint odvodí `tenant_id` z jediné aktivní owner membership. Price ID vybere pouze ze serverového allowlistu podle `app_companies.plan`; browser cenu ani tenant neposílá. Checkout Session obsahuje:

```ts
client_reference_id: tenantId,
metadata: { tenant_id: tenantId, plan },
subscription_data: {
  metadata: { tenant_id: tenantId, plan },
},
```

Browser posílá náhodný UUID idempotency klíč v hlavičce. Existující Customer se znovu použije a nový se vytváří se stabilním serverovým idempotency klíčem. Návrat vede na `/billing/return`, který neobchází přihlášení ani placený workspace. Přístup se aktivuje až po platném webhooku.

`POST /api/stripe-portal` vytvoří krátkodobou session na přesném hostu `billing.stripe.com` pouze pro ověřeného ownera se svázaným Customerem.

## Vercel Preview prostředí

Nastavte pouze jako serverové proměnné:

- `STRIPE_WEBHOOK_SECRET`: signing secret konkrétního testovacího webhook endpointu;
- `STRIPE_SECRET_KEY`: testovací restricted nebo secret key pro Customer, Checkout a Portal;
- `STRIPE_BILLING_MODE=test`;
- `STRIPE_PRICE_PILOT_ID`, `STRIPE_PRICE_STARTER_ID`, `STRIPE_PRICE_GROWTH_ID`: povolené opakované testovací Stripe Price ID;
- `BILLING_RETURN_URL`: přesný HTTPS origin Preview dashboardu;
- `SUPABASE_URL` a `SUPABASE_SERVICE_ROLE_KEY` pro oddělený staging.

Žádná z těchto hodnot nesmí mít prefix `VITE_` ani být dostupná browseru. Testovací režim odmítne live key a live režim odmítne testovací key. Webhook používá vlastní endpoint signing secret; Checkout klíč ho nenahrazuje.

## Stripe Workbench

Vytvořte HTTPS webhook na `https://<preview-host>/api/stripe-webhook` a povolte jen:

- `checkout.session.completed`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`.

Signing secret testovacího a produkčního endpointu je odlišný. Po změně secretu aktualizujte Vercel proměnnou a vytvořte nový Preview deployment.

## Bezpečná přejímka

1. Review oba SQL návrhy a spusťte je pouze v izolovaném stagingu.
2. Spusťte disposable SQL kontrakt z CI a všechny aplikační kontroly.
3. Nastavte testovací webhook, serverové Stripe proměnné a stagingové Supabase proměnné pouze pro Preview.
4. Platform admin nastaví stagingové firmě tarif. Ověřte, že stav zůstane `not_configured`.
5. Owner otevře testovací Checkout, dokončí platbu a po aktivaci otevře Billing Portal.
6. Zkontrolujte stav firmy a právě jeden řádek pro každé event ID.
7. Zopakujte stejnou událost a ověřte `duplicate` bez druhé změny.
8. Odešlete starší podepsanou událost a ověřte `stale` bez návratu stavu zpět.
9. Ověřte zrušení/past due a rozdílnou obrazovku ownera a zaměstnance.
10. Produkční SQL, klíče a webhook aktivujte až po samostatném schválení. Nikdy nekopírujte stagingové secrets.

Neplatný podpis vrací `400`. Databázová chyba nebo neplatná tenant vazba vrací `500`, takže Stripe doručení zopakuje. Chybové odpovědi webhooku mají `Content-Type: application/problem+json` a položky `type`, `title`, `status`, `detail` a `code`. Odpovědi a logy neobsahují podpis, secret ani zákaznický payload.
