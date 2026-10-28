import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { validateK6StagingEnvironment } from './validate-staging.js';
import { assertK6StagingPreviewTarget } from './assert-staging-preview.js';

const accepted = new Counter('public_intake_accepted');
const rateLimited = new Counter('public_intake_rate_limited');
const unexpected = new Rate('public_intake_unexpected_responses');

export const options = {
  scenarios: {
    publicIntake: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 30,
      maxVUs: 100,
    },
  },
  thresholds: {
    public_intake_unexpected_responses: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },
};

function validateStaging() {
  const target = validateK6StagingEnvironment(__ENV);
  if (!__ENV.STAGING_PUBLIC_TENANT_KEY) throw new Error('Missing synthetic staging public tenant key.');
  return { previewUrl: target.previewUrl, tenantKey: __ENV.STAGING_PUBLIC_TENANT_KEY };
}

export function setup() {
  const environment = validateStaging();
  assertK6StagingPreviewTarget(environment.previewUrl, __ENV.STAGING_SUPABASE_PROJECT_REF, __ENV.PRODUCTION_SUPABASE_PROJECT_REF);
  return environment;
}

export default function (data) {
  const unique = `${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2, 10)}`;
  const response = http.post(`${data.previewUrl}/api/public-intake`, JSON.stringify({
    public_key: data.tenantKey,
    request_key: `k6-${unique}`,
    customer: 'Synthetic Load Customer',
    phone: '+420700000000',
    email: `k6-${unique}@example.invalid`,
    title: `Synthetic public load ${unique}`,
    description: 'Synthetic load acceptance request. No customer data.',
    value: 0,
    website: '',
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'public_intake' },
  });

  const isAccepted = response.status === 200 || response.status === 202;
  const isRateLimited = response.status === 429;
  accepted.add(isAccepted ? 1 : 0);
  rateLimited.add(isRateLimited ? 1 : 0);
  const valid = isAccepted || isRateLimited;
  unexpected.add(!valid);
  check(response, { 'public intake accepts or rate-limits without server failure': () => valid });
}
