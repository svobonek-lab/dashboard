import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Server-side endpoint: reset employee password or send recovery email
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nepovolena. Použijte POST.' });
  }

  try {
    const { employeeId, email, organizationId, newPassword } = req.body || {};

    if (!employeeId && !email) {
      return res.status(400).json({ error: 'Chybí povinné údaje: employeeId nebo email.' });
    }

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

    // Verify caller authorization via Bearer token if provided
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: { user: callerUser }, error: callerErr } = await supabase.auth.getUser(token);
      if (callerErr || !callerUser) {
        return res.status(401).json({ error: 'Neplatný autorizační token uživatele.' });
      }

      // Check caller's role and organization membership
      const { data: callerDbUser } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('id', callerUser.id)
        .maybeSingle();

      if (callerDbUser?.role !== 'super_admin') {
        if (organizationId && callerDbUser?.organization_id !== organizationId) {
          return res.status(403).json({ error: 'Nemáte oprávnění spravovat hesla v této organizaci.' });
        }
      }
    }

    // 1. Fetch employee details if needed
    let targetEmail = email;
    if (!targetEmail && employeeId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('email, name, user_id, organization_id')
        .eq('id', employeeId)
        .maybeSingle();

      if (emp) {
        targetEmail = emp.email;
      }
    }

    if (!targetEmail) {
      return res.status(404).json({ error: 'Zaměstnanec nenalezen v databázi.' });
    }

    targetEmail = String(targetEmail).trim().toLowerCase();

    // 2. If new password is provided
    if (newPassword) {
      try {
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users?.find((u: any) => u.email?.toLowerCase() === targetEmail);
        if (user) {
          await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
        }
      } catch (adminErr: any) {
        console.warn('Admin password update error:', adminErr.message);
      }
    } else {
      // Send secure reset email via Supabase Auth
      try {
        await supabase.auth.resetPasswordForEmail(targetEmail);
      } catch (authErr: any) {
        console.warn('resetPasswordForEmail notice:', authErr.message);
      }
    }

    // 3. Issue cryptographically secure reset token
    const resetToken = 'rst_' + crypto.randomBytes(24).toString('hex');
    if (employeeId) {
      try {
        await supabase
          .from('employees')
          .update({
            invite_token: resetToken,
            invitation_status: 'Pending'
          })
          .eq('id', employeeId);
      } catch (tokenUpdateErr) {
        console.warn('Employee token update notice:', tokenUpdateErr);
      }
    }

    const appUrl = process.env.APP_URL || '';
    const resetLink = `${appUrl}/login?resetToken=${resetToken}&email=${encodeURIComponent(targetEmail)}`;

    return res.status(200).json({
      success: true,
      email: targetEmail,
      resetLink,
      message: `Odkaz pro obnovu hesla pro ${targetEmail} byl úspěšně vygenerován.`
    });
  } catch (error: any) {
    console.error('API Error /api/reset-employee-password:', error);
    return res.status(500).json({ error: error?.message || 'Interní chyba serveru při obnově hesla.' });
  }
}
