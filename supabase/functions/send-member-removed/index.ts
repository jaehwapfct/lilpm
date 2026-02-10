import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, sendEmail, jsonResponse, errorResponse } from '../_shared/mod.ts';

const FUNCTION_VERSION = '2026-02-10.1'; // Refactored to use shared modules

interface RemovalEmailRequest {
  email: string;
  userName: string;
  teamName: string;
  removerName: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { email, userName, teamName, removerName }: RemovalEmailRequest = await req.json();

    console.log(`[${FUNCTION_VERSION}] Sending removal email to: ${email} for team: ${teamName}`);

    // Create HTML email content
    const htmlContent = `
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
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Lil PM</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Team Update</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 24px; margin: 0 0 24px 0; text-align: center; border: 1px solid #fecaca;">
                <p style="color: #dc2626; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">You've been removed from a team</p>
                <p style="color: #18181b; font-size: 18px; font-weight: 600; margin: 0;">${teamName}</p>
              </div>
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi ${userName || 'there'},</p>
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                <strong>${removerName}</strong> has removed you from <strong>${teamName}</strong>.
              </p>
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                You no longer have access to this team's projects, issues, and documents.
              </p>
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                If you believe this was a mistake, please contact the team administrator.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                This email was sent to ${email}.<br>
                This is an automated notification from Lil PM.
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

    const subject = `You've been removed from ${teamName} - Lil PM`;
    const emailResult = await sendEmail(email, subject, htmlContent);

    if (emailResult.success) {
      console.log(`Removal email sent to ${email} via ${emailResult.provider}`);
    } else {
      console.log(`Email not sent: ${emailResult.error}`);
    }

    return jsonResponse({
      success: true,
      emailSent: emailResult.success,
      version: FUNCTION_VERSION,
    });
  } catch (error) {
    console.error('Error sending removal email:', error);
    return errorResponse((error as Error).message, 500);
  }
});
