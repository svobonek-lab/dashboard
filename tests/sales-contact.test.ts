import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesContact, getSalesContactMode } from '../src/app/salesContact';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../features/LandingPage.tsx', import.meta.url), 'utf8');

test('sales contact uses only a reviewed HTTPS booking URL or configured business email', () => {
  assert.deepEqual(getSalesContactMode({ VITE_BOOKING_URL: 'https://calendar.example.test/demo' }), {
    mode: 'booking',
    target: 'https://calendar.example.test/demo'
  });
  assert.deepEqual(getSalesContactMode({ VITE_BOOKING_URL: 'javascript:alert(1)', VITE_COMPANY_EMAIL: 'sales@example.test' }), {
    mode: 'email',
    target: 'sales@example.test'
  });
  assert.deepEqual(getSalesContactMode({ VITE_COMPANY_EMAIL: 'DOPLNIT' }), { mode: 'unavailable', target: '' });
});

test('email contact prepares an honest draft and does not claim delivery', () => {
  const contact = buildSalesContact('sales@example.test', {
    name: 'Jan Novák',
    company: 'Novák Stavby',
    phone: '+420 700 000 000',
    email: 'jan@example.test',
    preferredTime: 'Úterý 13:00'
  });
  assert.match(contact, /^mailto:sales@example\.test\?/);
  assert.match(decodeURIComponent(contact), /Jan Novák/);
  assert.match(decodeURIComponent(contact), /Úterý 13:00/);
});

test('landing sells only the verified founding pilot and never fakes a booking', () => {
  assert.doesNotMatch(landing, /submit_demo_booking/);
  assert.doesNotMatch(landing, /stavbacore_demo_bookings/);
  assert.doesNotMatch(landing, /Termín ukázky je zarezervován/);
  assert.doesNotMatch(landing, /SLA odpočet/);
  assert.doesNotMatch(landing, /Klient schválí položkový rozpočet/);
  assert.doesNotMatch(landing, /Terén zapisuje materiál a hodiny/);
  assert.doesNotMatch(landing, /Cena tarifu Growth/);
  assert.match(landing, /Formulář → poptávka → přiřazení → stav → historie/);
  assert.match(landing, /Vstupní cena 30denního pilotu/);
  assert.match(landing, /Přímé SQL\/ERP propojení není součástí pilotu/);
});
