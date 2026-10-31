const COMPANY_B_SLUG = 'e2e-synthetic-company-b';
const BILLING_PURPOSE = 'staging-past-due-acceptance';

function idOf(value) {
  return typeof value === 'string' ? value : value?.id;
}

export function assertCompanyBCheckoutAcceptance({
  companyId,
  company,
  customer,
  subscription,
  checkout,
  webhookEvents,
}) {
  if (!companyId || company?.id !== companyId || company?.slug !== COMPANY_B_SLUG ||
      company?.active !== true || company?.subscription_status !== 'active') {
    throw new Error('Synthetic company B is not active after its TEST Checkout.');
  }
  if (customer?.deleted || customer?.livemode !== false || customer?.id !== company.stripe_customer_id ||
      customer?.metadata?.tenant_id !== companyId || customer?.metadata?.purpose !== BILLING_PURPOSE ||
      !customer?.test_clock) {
    throw new Error('Stripe TEST customer does not match synthetic company B.');
  }
  if (subscription?.livemode !== false || subscription?.status !== 'active' ||
      subscription?.id !== company.stripe_subscription_id || idOf(subscription.customer) !== customer.id ||
      subscription?.metadata?.tenant_id !== companyId || subscription?.metadata?.purpose !== BILLING_PURPOSE ||
      subscription?.test_clock !== customer.test_clock) {
    throw new Error('Active Stripe TEST subscription does not match the company B binding.');
  }
  if (checkout?.livemode !== false || checkout?.status !== 'complete' || checkout?.mode !== 'subscription' ||
      checkout?.metadata?.tenant_id !== companyId || checkout?.metadata?.plan !== company.plan ||
      idOf(checkout.customer) !== customer.id || idOf(checkout.subscription) !== subscription.id) {
    throw new Error('Checkout session is not bound to the active company B subscription.');
  }
  if (!Array.isArray(webhookEvents) || !webhookEvents.some((event) =>
    event.event_type === 'checkout.session.completed' && event.result === 'applied')) {
    throw new Error('No applied checkout webhook event is recorded for synthetic company B.');
  }
  return true;
}
