import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const FUNCTION_VERSION = '2026-02-08.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType =
    | 'issue_assigned'
    | 'issue_mentioned'
    | 'comment_added'
    | 'due_date_reminder'
    | 'status_changed'
    | 'team_invite'
    | 'prd_mentioned';

interface NotificationEmailRequest {
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    type: NotificationType;
    data: {
        actorName?: string;
        entityTitle?: string;
        entityId?: string;
        entityType?: 'issue' | 'prd' | 'project';
        message?: string;
        dueDate?: string;
    };
}

// Notification type configurations
const NOTIFICATION_CONFIG: Record<NotificationType, { subject: string; emoji: string; title: string }> = {
    issue_assigned: { subject: 'New issue assigned', emoji: '📋', title: 'Issue Assigned' },
    issue_mentioned: { subject: 'You were mentioned in an issue', emoji: '@', title: 'Mentioned in Issue' },
    comment_added: { subject: 'New comment on your issue', emoji: '💬', title: 'New Comment' },
    due_date_reminder: { subject: 'Due date reminder', emoji: '⏰', title: 'Due Date Reminder' },
    status_changed: { subject: 'Issue status changed', emoji: '🔄', title: 'Status Changed' },
    team_invite: { subject: 'Team invitation', emoji: '👥', title: 'Team Invitation' },
    prd_mentioned: { subject: 'You were mentioned in a PRD', emoji: '📝', title: 'Mentioned in PRD' },
};

// Generate HTML email template for notifications
function generateNotificationEmailHtml(
    type: NotificationType,
    data: NotificationEmailRequest['data'],
    recipientEmail: string,
    siteUrl: string
): string {
    const config = NOTIFICATION_CONFIG[type];
    const entityLink = data.entityId
        ? `${siteUrl}/${data.entityType || 'issue'}/${data.entityId}`
        : siteUrl;

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
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">${config.title}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">${config.emoji} ${config.title}</h2>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${data.actorName ? `<strong style="color: #0891b2;">${data.actorName}</strong> ` : ''}${data.message || 'You have a new notification.'}
              </p>
              
              ${data.entityTitle ? `
              <!-- Entity Info Box -->
              <div style="background-color: #f0fdfa; border-radius: 8px; padding: 20px; margin: 0 0 24px 0; border-left: 4px solid #0891b2;">
                <p style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${data.entityType?.toUpperCase() || 'Item'}</p>
                <p style="color: #18181b; font-size: 18px; font-weight: 600; margin: 0;">${data.entityTitle}</p>
              </div>
              ` : ''}
              
              ${data.dueDate ? `
              <!-- Due Date -->
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 0 0 24px 0; text-align: center;">
                <p style="color: #dc2626; font-size: 14px; margin: 0;">Due: <strong>${data.dueDate}</strong></p>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${entityLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); 
                          color: #ffffff; text-decoration: none; padding: 16px 48px; 
                          border-radius: 8px; font-size: 16px; font-weight: 600;
                          box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">
                  View Details
                </a>
              </div>
              
              <!-- Link fallback -->
              <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                Or copy and paste this link:<br>
                <a href="${entityLink}" style="color: #0891b2; word-break: break-all;">${entityLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                This email was sent to ${recipientEmail}.<br>
                <a href="${siteUrl}/settings" style="color: #0891b2;">Manage notification preferences</a>
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
        const siteUrl = Deno.env.get('SITE_URL') || 'https://lilpmaiai.vercel.app';
        const gmailUser = Deno.env.get('GMAIL_USER');
        const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

        const {
            recipientId,
            recipientEmail,
            recipientName,
            type,
            data
        }: NotificationEmailRequest = await req.json();

        console.log(`[${FUNCTION_VERSION}] Processing ${type} notification for ${recipientEmail}`);

        if (!NOTIFICATION_CONFIG[type]) {
            throw new Error(`Unknown notification type: ${type}`);
        }

        let emailSent = false;

        // Send email via Gmail SMTP
        if (gmailUser && gmailPassword) {
            console.log(`Sending ${type} email to ${recipientEmail} via Gmail SMTP`);

            const config = NOTIFICATION_CONFIG[type];
            const emailHtml = generateNotificationEmailHtml(type, data, recipientEmail, siteUrl);
            const subject = data.actorName
                ? `${data.actorName}: ${config.subject}`
                : config.subject;

            const result = await sendGmailEmail(gmailUser, gmailPassword, recipientEmail, subject, emailHtml);

            if (result.success) {
                emailSent = true;
                console.log(`Notification email sent successfully to ${recipientEmail}`);
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
                type,
                message: emailSent ? 'Notification email sent' : 'Email skipped (no Gmail credentials)',
                version: FUNCTION_VERSION
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error sending notification email:', error);
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
