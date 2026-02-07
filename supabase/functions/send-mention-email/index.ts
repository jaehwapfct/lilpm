import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const FUNCTION_VERSION = '2026-02-07.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MentionEmailRequest {
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    mentionerName: string;
    mentionerEmail: string;
    prdId: string;
    prdTitle: string;
}

// Generate beautiful HTML email template for mention notification
function generateMentionEmailHtml(mentionerName: string, prdTitle: string, prdLink: string, recipientEmail: string): string {
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
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Lil PM</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">You've been mentioned</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">@Mentioned in a PRD 📝</h2>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong style="color: #0891b2;">${mentionerName}</strong> mentioned you in a PRD document.
              </p>
              
              <!-- PRD Info Box -->
              <div style="background-color: #f0fdfa; border-radius: 8px; padding: 20px; margin: 0 0 24px 0; border-left: 4px solid #0891b2;">
                <p style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Document</p>
                <p style="color: #18181b; font-size: 18px; font-weight: 600; margin: 0;">${prdTitle}</p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${prdLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); 
                          color: #ffffff; text-decoration: none; padding: 16px 48px; 
                          border-radius: 8px; font-size: 16px; font-weight: 600;
                          box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">
                  View PRD
                </a>
              </div>
              
              <!-- Link fallback -->
              <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                Or copy and paste this link:<br>
                <a href="${prdLink}" style="color: #0891b2; word-break: break-all;">${prdLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                This email was sent to ${recipientEmail}.<br>
                You received this because someone mentioned you in a PRD document.
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

// Send email via Gmail SMTP
async function sendGmailEmail(
    gmailUser: string,
    gmailPassword: string,
    to: string,
    subject: string,
    htmlContent: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = new SMTPClient({
            connection: {
                hostname: 'smtp.gmail.com',
                port: 465,
                tls: true,
                auth: {
                    username: gmailUser,
                    password: gmailPassword,
                },
            },
        });

        await client.send({
            from: `Lil PM <${gmailUser}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        await client.close();
        return { success: true };
    } catch (error) {
        console.error('Gmail SMTP error:', error);
        return { success: false, error: (error as Error).message };
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const siteUrl = Deno.env.get('SITE_URL') || 'https://lilpmaiai.vercel.app';
        const gmailUser = Deno.env.get('GMAIL_USER');
        const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const {
            recipientId,
            recipientEmail,
            recipientName,
            mentionerName,
            mentionerEmail,
            prdId,
            prdTitle
        }: MentionEmailRequest = await req.json();

        console.log(`[${FUNCTION_VERSION}] Processing mention notification for ${recipientEmail} from ${mentionerName}`);

        const prdLink = `${siteUrl}/prd/${prdId}`;
        let emailSent = false;

        // Send email via Gmail SMTP
        if (gmailUser && gmailPassword) {
            console.log(`Sending mention email to ${recipientEmail} via Gmail SMTP`);

            const emailHtml = generateMentionEmailHtml(mentionerName, prdTitle, prdLink, recipientEmail);
            const subject = `${mentionerName} mentioned you in "${prdTitle}"`;

            const result = await sendGmailEmail(gmailUser, gmailPassword, recipientEmail, subject, emailHtml);

            if (result.success) {
                emailSent = true;
                console.log(`Mention email sent successfully to ${recipientEmail}`);
            } else {
                console.error('Gmail send failed:', result.error);
            }
        } else {
            console.log('Gmail credentials not configured - skipping email');
        }

        return new Response(
            JSON.stringify({
                success: true,
                emailSent,
                message: emailSent ? 'Mention email sent' : 'Email skipped (no Gmail credentials)',
                version: FUNCTION_VERSION
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error sending mention email:', error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message || 'Internal server error',
                version: FUNCTION_VERSION
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
