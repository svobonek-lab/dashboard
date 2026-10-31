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
  const subscriptionMismatches = [];
  if (subscription?.livemode !== false) subscriptionMismatches.push('test mode');
  if (subscription?.status !== 'active') subscriptionMismatches.push('active status');
  if (subscription?.id !== company.stripe_subscription_id) subscriptionMismatches.push('company subscription binding');
  if (idOf(subscription?.customer) !== customer.id) subscriptionMismatches.push('customer binding');
  if (subscription?.metadata?.tenant_id !== companyId) subscriptionMismatches.push('tenant metadata');
  if (subscription?.metadata?.plan !== company.plan) subscriptionMismatches.push('plan metadata');
  if (idOf(subscription?.test_clock) !== idOf(customer.test_clock)) subscriptionMismatches.push('test clock binding');
  if (subscriptionMismatches.length) {
    throw new Error(`Active Stripe TEST subscription mismatch: ${subscriptionMismatches.join(', ')}.`);
  }
  const checkoutMismatches = [];
  if (checkout?.livemode !== false) checkoutMismatches.push('test mode');
  if (checkout?.status !== 'complete') checkoutMismatches.push('completed status');
  if (checkout?.mode !== 'subscription') checkoutMismatches.push('subscription mode');
  if (checkout?.metadata?.tenant_id !== companyId) checkoutMismatches.push('tenant metadata');
  if (checkout?.metadata?.plan !== company.plan) checkoutMismatches.push('plan metadata');
  if (idOf(checkout?.customer) !== customer.id) checkoutMismatches.push('customer binding');
  if (idOf(checkout?.subscription) !== subscription?.id) checkoutMismatches.push('subscription binding');
  if (checkoutMismatches.length) {
    throw new Error(`Checkout session mismatch: ${checkoutMismatches.join(', ')}.`);
  }
  return true;
}
