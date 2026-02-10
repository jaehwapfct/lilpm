import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, env, sendEmail, versionedResponse, versionedError } from '../_shared/mod.ts';

const FUNCTION_VERSION = '2026-02-10.1'; // Refactored to use shared modules

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

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { recipientEmail, type, data }: NotificationEmailRequest = await req.json();

    console.log(`[${FUNCTION_VERSION}] Processing ${type} notification for ${recipientEmail}`);

    if (!NOTIFICATION_CONFIG[type]) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const config = NOTIFICATION_CONFIG[type];
    const emailHtml = generateNotificationEmailHtml(type, data, recipientEmail, env.siteUrl);
    const subject = data.actorName ? `${data.actorName}: ${config.subject}` : config.subject;

    const emailResult = await sendEmail(recipientEmail, subject, emailHtml);

    return versionedResponse({
      success: true,
      emailSent: emailResult.success,
      type,
      message: emailResult.success ? 'Notification email sent' : 'Email skipped (no email service configured)',
    }, FUNCTION_VERSION);
  } catch (error) {
    console.error('Error sending notification email:', error);
    return versionedError((error as Error).message || 'Internal server error', FUNCTION_VERSION);
  }
});
