import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, env, createAdminClient, sendGmailEmail, versionedResponse, versionedError } from '../_shared/mod.ts';

const FUNCTION_VERSION = '2026-02-10.2'; // Refactored to use shared modules

interface AcceptInviteRequest {
  token: string;
  userId?: string; // Optional - if provided, user is already authenticated
}

interface AcceptInviteResponse {
  success: boolean;
  action: 'accepted' | 'needs_auth' | 'needs_signup' | 'error';
  teamId?: string;
  teamName?: string;
  userExists?: boolean;
  email?: string;
  magicLinkSent?: boolean;
  error?: string;
  version: string;
}

// Generate Magic Link email HTML
function generateMagicLinkEmailHtml(teamName: string, magicLink: string, email: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Lil PM</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Join Your Team</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Join ${teamName} 🚀</h2>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Click the button below to join <strong style="color: #18181b;">${teamName}</strong>. 
                This link will log you in automatically.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                          color: #ffffff; text-decoration: none; padding: 16px 48px; 
                          border-radius: 8px; font-size: 16px; font-weight: 600;
                          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                  Join Team Now
                </a>
              </div>
              
              <!-- Link fallback -->
              <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                Or copy and paste this link:<br>
                <a href="${magicLink}" style="color: #6366f1; word-break: break-all;">${magicLink}</a>
              </p>
              
              <p style="color: #ef4444; font-size: 13px; margin: 16px 0 0 0;">
                ⚠️ This link expires in 1 hour and can only be used once.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                This email was sent to ${email}.<br>
                If you weren't expecting this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseAdmin = createAdminClient();
    const { token, userId }: AcceptInviteRequest = await req.json();

    console.log(`[${FUNCTION_VERSION}] Processing invite acceptance for token: ${token.substring(0, 8)}...`);

    // STEP 1: Validate invite token (service role bypasses RLS)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('*, teams(id, name)')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      console.error('Invite lookup failed:', inviteError);
      return versionedResponse(
        { success: false, action: 'error', error: 'Invitation not found or expired' } as Partial<AcceptInviteResponse>,
        FUNCTION_VERSION, 404
      );
    }

    // Check invite status
    if (invite.status === 'cancelled') {
      return versionedResponse(
        { success: false, action: 'error', error: 'This invitation has been cancelled' } as Partial<AcceptInviteResponse>,
        FUNCTION_VERSION, 400
      );
    }

    if (invite.status === 'accepted') {
      return versionedResponse(
        { success: false, action: 'error', error: 'This invitation has already been accepted' } as Partial<AcceptInviteResponse>,
        FUNCTION_VERSION, 400
      );
    }

    // Check expiry (24 hours from creation)
    const createdAt = new Date(invite.created_at);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreated > 24) {
      return versionedResponse(
        { success: false, action: 'error', error: 'This invitation has expired (valid for 24 hours)' } as Partial<AcceptInviteResponse>,
        FUNCTION_VERSION, 400
      );
    }

    const teamId = invite.team_id;
    const teamName = invite.teams?.name || 'Unknown Team';
    const inviteEmail = invite.email;

    // STEP 2: Check if user exists by email (using service role)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', inviteEmail)
      .maybeSingle();

    const userExists = !!existingProfile;

    // STEP 3: Handle based on authentication state

    // CASE A: User provided userId (authenticated) - Accept immediately
    if (userId) {
      console.log(`User ${userId} is authenticated, accepting invite directly`);

      // Add user to team
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role: invite.role || 'member',
        });

      if (memberError) {
        if (memberError.code === '23505') {
          console.log('User is already a team member');
        } else {
          console.error('Failed to add team member:', memberError);
          return versionedResponse(
            { success: false, action: 'error', error: 'Failed to join team' } as Partial<AcceptInviteResponse>,
            FUNCTION_VERSION, 500
          );
        }
      }

      // Mark invite as accepted
      await supabaseAdmin
        .from('team_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      // STEP 3.5: Handle project-specific assignments
      if (invite.project_ids && Array.isArray(invite.project_ids) && invite.project_ids.length > 0) {
        try {
          const { data: teamProjects } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('team_id', teamId);

          if (teamProjects) {
            const selectedSet = new Set(invite.project_ids);
            const projectIdsToRemove = teamProjects
              .map((p: any) => p.id)
              .filter((id: string) => !selectedSet.has(id));

            if (projectIdsToRemove.length > 0) {
              await supabaseAdmin
                .from('project_members')
                .delete()
                .eq('user_id', userId)
                .in('project_id', projectIdsToRemove);
              console.log(`Removed ${projectIdsToRemove.length} auto-assigned project(s) not in invite selection`);
            }
          }
        } catch (projectErr) {
          console.warn('Failed to clean up project assignments:', projectErr);
        }
      }

      // STEP 4: Send notification emails to existing team members (non-blocking)
      if (env.hasGmailConfig) {
        try {
          const [{ data: newMemberProfile }, { data: teamMembers }] = await Promise.all([
            supabaseAdmin.from('profiles').select('name, email').eq('id', userId).single(),
            supabaseAdmin.from('team_members').select('user_id, profiles(email, name)').eq('team_id', teamId).neq('user_id', userId),
          ]);

          const newMemberName = newMemberProfile?.name || newMemberProfile?.email || 'A new member';

          const notificationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 New Team Member!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">${newMemberName} joined ${teamName}</h2>
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Great news! <strong style="color: #18181b;">${newMemberName}</strong> has accepted the invitation and joined <strong style="color: #18181b;">${teamName}</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${env.siteUrl}/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                          color: #ffffff; text-decoration: none; padding: 16px 48px; 
                          border-radius: 8px; font-size: 16px; font-weight: 600;
                          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                You received this email because you're a member of ${teamName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          // Send emails in parallel instead of sequentially
          const emailPromises = (teamMembers || [])
            .map((member: any) => (member.profiles as any)?.email)
            .filter(Boolean)
            .map((memberEmail: string) =>
              sendGmailEmail(memberEmail, `🎉 ${newMemberName} joined ${teamName}!`, notificationHtml)
                .then(() => console.log(`Notification email sent to ${memberEmail}`))
                .catch((err: Error) => console.warn(`Failed to send to ${memberEmail}:`, err))
            );

          await Promise.allSettled(emailPromises);
        } catch (emailError) {
          console.warn('Failed to send team notification emails:', emailError);
        }
      }

      return versionedResponse(
        { success: true, action: 'accepted', teamId, teamName } as Partial<AcceptInviteResponse>,
        FUNCTION_VERSION
      );
    }

    // CASE B: User exists but not authenticated - Send Magic Link
    if (userExists && existingProfile) {
      console.log(`Existing user ${inviteEmail} needs to authenticate, sending magic link`);

      const redirectUrl = `${env.siteUrl}/invite/accept?token=${token}&auto=true`;

      const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: inviteEmail,
        options: { redirectTo: redirectUrl },
      });

      if (magicLinkError) {
        console.error('Failed to generate magic link:', magicLinkError);
        return versionedResponse(
          { success: true, action: 'needs_auth', userExists: true, email: inviteEmail, teamName, error: 'Could not send login link. Please log in manually.' } as Partial<AcceptInviteResponse>,
          FUNCTION_VERSION
        );
      }

      // Send magic link via email
      if (env.hasGmailConfig && magicLinkData?.properties?.action_link) {
        const emailHtml = generateMagicLinkEmailHtml(teamName, magicLinkData.properties.action_link, inviteEmail);
        const result = await sendGmailEmail(inviteEmail, `Join ${teamName} - Click to Login`, emailHtml);

        if (result.success) {
          console.log(`Magic link sent to ${inviteEmail}`);
          return versionedResponse(
            { success: true, action: 'needs_auth', userExists: true, email: inviteEmail, teamName, magicLinkSent: true } as Partial<AcceptInviteResponse>,
            FUNCTION_VERSION
          );
        }
      }

      return versionedResponse(
        { success: true, action: 'needs_auth', userExists: true, email: inviteEmail, teamName, magicLinkSent: false } as Partial<AcceptInviteResponse>,
        FUNCTION_VERSION
      );
    }

    // CASE C: New user - Needs to sign up
    console.log(`New user ${inviteEmail} needs to sign up`);
    return versionedResponse(
      { success: true, action: 'needs_signup', userExists: false, email: inviteEmail, teamName } as Partial<AcceptInviteResponse>,
      FUNCTION_VERSION
    );
  } catch (error) {
    console.error('Error in accept-invite-v2:', error);
    return versionedResponse(
      { success: false, action: 'error', error: (error as Error).message || 'Internal server error' } as Partial<AcceptInviteResponse>,
      FUNCTION_VERSION, 500
    );
  }
});
