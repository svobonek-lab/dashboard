import { createClient } from '@supabase/supabase-js';

// Server-side endpoint: invite employee with Supabase Admin / Service Role
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nepovolena. Použijte POST.' });
  }

  try {
    const { 
      organizationId, 
      name, 
      email, 
      role = 'Montážník', 
      specialization = 'Stavební práce',
      phone = '',
      capacity = 100 
    } = req.body || {};

    if (!organizationId || !email || !name) {
      return res.status(400).json({ error: 'Chybí povinné údaje: organizationId, email nebo name.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'Supabase není nakonfigurován na serveru. Zkontrolujte environment variables.' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const inviteToken = 'inv_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const invitedAt = new Date().toISOString();

    let createdAuthUserId: string | null = null;

    // 1. Try Supabase Auth Admin invite if service role key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
          data: {
            name,
            organization_id: organizationId,
            role: 'employee'
          }
        });

        if (!authError && authData?.user?.id) {
          createdAuthUserId = authData.user.id;
        }
      } catch (authErr: any) {
        console.warn('Supabase auth.admin.inviteUserByEmail notice:', authErr.message);
      }
    }

    // 2. Check if employee record already exists in database
    const { data: existingEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    let employeeId = existingEmp?.id;

    if (existingEmp) {
      // Update existing record
      const { error: updateErr } = await supabase
        .from('employees')
        .update({
          name,
          role,
          specialization,
          phone,
          capacity,
          invite_token: inviteToken,
          invited_at: invitedAt,
          invitation_status: 'Pending',
          user_id: createdAuthUserId || undefined,
          active: true
        })
        .eq('id', existingEmp.id);

      if (updateErr) {
        throw new Error(`Chyba při aktualizaci zaměstnance: ${updateErr.message}`);
      }
    } else {
      // Insert new employee record
      const { data: insertedEmp, error: insertErr } = await supabase
        .from('employees')
        .insert({
          organization_id: organizationId,
          name,
          email: normalizedEmail,
          role,
          specialization,
          phone,
          capacity,
          invite_token: inviteToken,
          invited_at: invitedAt,
          invitation_status: 'Pending',
          user_id: createdAuthUserId || undefined,
          status: 'Green',
          avatar: '',
          active: true
        })
        .select()
        .single();

      if (insertErr) {
        throw new Error(`Chyba při vkládání zaměstnance: ${insertErr.message}`);
      }
      employeeId = insertedEmp.id;
    }

    // 3. Construct secure invitation URL
    const appUrl = process.env.APP_URL || '';
    const inviteLink = `${appUrl}/login?inviteToken=${inviteToken}&email=${encodeURIComponent(normalizedEmail)}`;

    return res.status(200).json({
      success: true,
      employeeId,
      email: normalizedEmail,
      inviteToken,
      inviteLink,
      invitedAt,
      message: `Pozvánka pro zaměstnance ${name} (${normalizedEmail}) byla úspěšně vytvořena.`
    });
  } catch (error: any) {
    console.error('API Error /api/invite-employee:', error);
    return res.status(500).json({ error: error?.message || 'Interní chyba serveru při pozvání zaměstnance.' });
  }
}
