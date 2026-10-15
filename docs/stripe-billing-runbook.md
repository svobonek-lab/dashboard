# Stripe billing webhook runbook

Tento dokument popisuje bezpečnou aktivaci endpointu `POST /api/stripe-webhook`. SQL v repozitáři je reviewovatelný stagingový návrh a nesmí se automaticky aplikovat do produkce.

## Datový kontrakt

`supabase/staging/20261015_stripe_billing_contract.sql` přidává do `app_companies`:

- `subscription_status`: `not_configured`, `pilot`, `trial`, `active`, `past_due` nebo `canceled`;
- `stripe_customer_id` a `stripe_subscription_id` s unikátní vazbou na firmu;
- `current_period_end`;
- `stripe_event_created_at`, který brání starší události přepsat novější stav.

Tabulka `app_stripe_webhook_events` uchovává pouze Stripe event ID a provozní metadata potřebná pro idempotenci. Browser role k ní ani k zapisovacímu RPC nemají přístup. RPC je dostupné pouze `service_role` a každá jeho operace je atomická.

## Stripe Checkout

Při serverovém vytváření subscription Checkout Session nastavte oba údaje:

```ts
client_reference_id: tenantId,
subscription_data: {
  metadata: { tenant_id: tenantId },
},
```

`client_reference_id` sváže první `checkout.session.completed` s firmou. Metadata subscription umožní stejnou kontrolu u pozdějších událostí. Hodnota musí být interní UUID `app_companies.id`; neposílejte ji z libovolného browserového formuláře bez serverového ověření členství.

## Vercel prostředí

Nastavte jako server-only proměnné na dashboard projektu:

- `STRIPE_WEBHOOK_SECRET`: signing secret konkrétního endpointu z Stripe Workbench, začíná `whsec_`;
- `SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.

Žádná z těchto hodnot nesmí mít prefix `VITE_` ani být dostupná browseru. Stripe API secret key endpoint nepotřebuje, protože nevolá Stripe API; podpis ověřuje endpoint signing secret.

## Stripe Workbench

Vytvořte HTTPS webhook na `https://<dashboard-host>/api/stripe-webhook` a povolte jen:

- `checkout.session.completed`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`.

Signing secret testovacího a produkčního endpointu je odlišný. Nezaměňujte je. Po změně secretu aktualizujte Vercel proměnnou a vytvořte nový deployment.

## Bezpečné uvedení do provozu

1. Review SQL a spusťte jej pouze v izolovaném stagingu.
2. Spusťte disposable SQL kontrakt z CI a všechny aplikační kontroly.
3. Nastavte stagingový Stripe webhook a stagingový signing secret.
4. Odešlete testovací checkout, update a delete; zkontrolujte stav firmy a právě jeden řádek pro každé event ID.
5. Zopakujte stejnou událost a ověřte odpověď `duplicate` bez druhé změny.
6. Odešlete starší podepsanou událost a ověřte odpověď `stale` bez návratu stavu zpět.
7. Produkční SQL, secret a webhook aktivujte až po samostatném schválení. Nikdy nekopírujte stagingový secret.

Neplatný podpis vrací `400`. Databázová chyba nebo neplatná tenant vazba vrací `500`, takže Stripe doručení zopakuje. Odpovědi a logy neobsahují podpis, secret ani zákaznický payload.
