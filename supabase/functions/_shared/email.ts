/**
 * Shared email sending utilities for all Edge Functions
 * Supports Gmail SMTP and Resend API as fallback
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { env } from './env.ts';

export interface EmailResult {
  success: boolean;
  error?: string;
  provider?: 'gmail' | 'resend';
}

/**
 * Send email via Gmail SMTP
 */
export async function sendGmailEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<EmailResult> {
  const { gmailUser, gmailPassword } = env;

  if (!gmailUser || !gmailPassword) {
    return { success: false, error: 'Gmail credentials not configured' };
  }

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
      to,
      subject,
      html: htmlContent,
    });

    await client.close();
    return { success: true, provider: 'gmail' };
  } catch (error) {
    console.error('Gmail SMTP error:', error);
    return { success: false, error: (error as Error).message, provider: 'gmail' };
  }
}

/**
 * Send email via Resend API (fallback)
 */
export async function sendResendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<EmailResult> {
  const { resendApiKey, senderEmail } = env;

  if (!resendApiKey) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [to],
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      console.error('Resend error:', result);
      return { success: false, error: JSON.stringify(result), provider: 'resend' };
    }

    return { success: true, provider: 'resend' };
  } catch (error) {
    console.error('Resend API error:', error);
    return { success: false, error: (error as Error).message, provider: 'resend' };
  }
}

/**
 * Send email with automatic fallback
 * Tries Gmail first, then Resend API
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<EmailResult> {
  // Try Gmail first
  if (env.hasGmailConfig) {
    const result = await sendGmailEmail(to, subject, htmlContent);
    if (result.success) return result;
    console.warn('Gmail failed, trying Resend fallback...');
  }

  // Try Resend as fallback
  if (env.resendApiKey) {
    return await sendResendEmail(to, subject, htmlContent);
  }

  return { success: false, error: 'No email service configured' };
}
