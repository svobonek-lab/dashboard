import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY není nakonfigurován na serveru.' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify caller authorization via MANDATORY Bearer token
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chybí povinná autorizační hlavička Authorization: Bearer <token>.' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Autorizační token je prázdný.' });
    }

    const { data: { user: callerUser }, error: callerErr } = await supabase.auth.getUser(token);
    if (callerErr || !callerUser) {
      return res.status(401).json({ error: 'Neplatný autorizační token uživatele.' });
    }

    const { data: callerDbUser, error: dbUserErr } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (dbUserErr || !callerDbUser) {
      return res.status(403).json({ error: 'Uživatel nemá oprávnění v systému.' });
    }

    if (callerDbUser.role !== 'owner' && callerDbUser.role !== 'super_admin' && callerDbUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Operace je povolena pouze pro role owner nebo super_admin.' });
    }

    if (callerDbUser.role !== 'super_admin' && callerDbUser.role !== 'superadmin') {
      if (!callerDbUser.organization_id || callerDbUser.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Nemáte oprávnění zvát zaměstnance do jiné organizace než vlastní.' });
      }
    }

    const inviteToken = 'inv_' + crypto.randomBytes(24).toString('hex');
    const invitedAt = new Date().toISOString();

    let createdAuthUserId: string | null = null;

    // 1. Try Supabase Auth Admin invite
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

    // 2. Check if employee record already exists in database
    const { data: existingEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    let employeeId = existingEmp?.id;

    if (existingEmp) {
      // Update existing record (try full schema first, fallback to base columns if columns not migrated)
      let updatePayload: any = {
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
      };
      let { error: updateErr } = await supabase
        .from('employees')
        .update(updatePayload)
        .eq('id', existingEmp.id);

      if (updateErr) {
        // Fallback to base columns
        const basePayload: any = { name, specialization, phone, capacity };
        const { error: fallbackErr } = await supabase
          .from('employees')
          .update(basePayload)
          .eq('id', existingEmp.id);
        if (fallbackErr) {
          throw new Error(`Chyba při aktualizaci zaměstnance: ${fallbackErr.message}`);
        }
      }
    } else {
      // Insert new employee record (try full schema first, fallback to base columns if needed)
      let insertPayload: any = {
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
      };
      let { data: insertedEmp, error: insertErr } = await supabase
        .from('employees')
        .insert(insertPayload)
        .select()
        .single();

      if (insertErr) {
        // Fallback to base columns
        const baseInsert: any = {
          organization_id: organizationId,
          name,
          email: normalizedEmail,
          specialization,
          phone,
          capacity
        };
        const { data: fbEmp, error: fbInsertErr } = await supabase
          .from('employees')
          .insert(baseInsert)
          .select()
          .single();
        if (fbInsertErr) {
          throw new Error(`Chyba při vkládání zaměstnance: ${fbInsertErr.message}`);
        }
        insertedEmp = fbEmp;
      }
      employeeId = insertedEmp?.id;
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
