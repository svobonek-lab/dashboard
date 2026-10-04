import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

function secretsMatch(provided: string, expected: string): boolean {
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

// Server-side email scheduler & outbox worker
// Implements the audit recommendation: DB event -> app_email_outbox -> scheduler worker -> Resend.
export default async function outboxSchedulerHandler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed. Use GET or POST.' });
    return;
  }

  // Check Cron Secret (fail-closed: return 500 if CRON_SECRET is not configured)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const providedSecret = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!cronSecret || !providedSecret || !secretsMatch(providedSecret, cronSecret)) {
    res.status(401).json({ error: 'Neautorizovaný přístup.' });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!resendApiKey || !emailFrom) {
    res.status(503).json({ success: false, code: 'EMAIL_PROVIDER_NOT_CONFIGURED', error: 'Odesílání e-mailů není nakonfigurované.' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ 
      success: false, 
      error: 'Chybí konfigurace SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY na serveru.' 
    });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  try {
    // 1. Fetch pending emails in outbox
    const { data: pendingEmails, error: fetchErr } = await supabase
      .from('app_email_outbox')
      .select('*')
      .in('status', ['pending', 'retry'])
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchErr) {
      // If table doesn't exist yet, return informative status
      return res.status(503).json({
        success: false,
        message: 'Outbox není dostupný.',
        processedCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Žádné čekající e-maily k odeslání.',
        processedCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    let processedCount = 0;
    const results = [];

    // 2. Process each email
    for (const email of pendingEmails) {
      try {
        // Claim conditionally so concurrent workers cannot send the same row.
        const { data: claimed, error: claimError } = await supabase
          .from('app_email_outbox')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', email.id)
          .in('status', ['pending', 'retry'])
          .select('id')
          .maybeSingle();
        if (claimError) {
          results.push({ id: email.id, status: 'claim_failed', error: claimError.message });
          continue;
        }
        if (!claimed) {
          results.push({ id: email.id, status: 'skipped' });
          continue;
        }

        let providerMessageId: string;

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
            'Idempotency-Key': `outbox/${email.id}`,
          },
          body: JSON.stringify({
            from: emailFrom,
            to: email.recipient || email.to,
            subject: email.subject,
            html: email.body_html || email.body
          })
        });
        const resendData = await resendResponse.json();
        if (!resendResponse.ok) {
          throw new Error(`Resend API error (${resendResponse.status}): ${JSON.stringify(resendData)}`);
        }
        if (!resendData?.id) throw new Error('E-mailová služba nepotvrdila přijetí zprávy.');
        providerMessageId = resendData.id;

        // Mark as delivered
        const { data: delivered, error: deliveryUpdateError } = await supabase
          .from('app_email_outbox')
          .update({ 
            status: 'delivered', 
            delivered_at: new Date().toISOString(),
            provider_message_id: providerMessageId,
            attempts: (email.attempts || 0) + 1
          })
          .eq('id', email.id)
          .eq('status', 'processing')
          .select('id')
          .maybeSingle();
        if (deliveryUpdateError || !delivered) {
          throw new Error(deliveryUpdateError?.message || 'Stav odeslaného e-mailu se nepodařilo uložit.');
        }

        processedCount++;
        results.push({ id: email.id, status: 'delivered', providerMessageId });
      } catch (sendErr: any) {
        const nextAttempts = (email.attempts || 0) + 1;
        const newStatus = nextAttempts >= 3 ? 'failed' : 'retry';
        await supabase
          .from('app_email_outbox')
          .update({
            status: newStatus,
            last_error: sendErr.message || 'Chyba odeslání',
            attempts: nextAttempts,
            scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Retry backoff: 5 minutes
          })
          .eq('id', email.id)
          .eq('status', 'processing');
        
        results.push({ id: email.id, status: newStatus, error: sendErr.message });
      }
    }

    res.status(200).json({
      success: true,
      processedCount,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Chyba ve zpracování outboxu: ' + (err.message || err)
    });
  }
}
