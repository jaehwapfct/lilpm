/**
 * Centralized environment variable access for all Edge Functions
 * Provides typed getters with sensible defaults
 */

export const env = {
  get supabaseUrl(): string {
    return Deno.env.get('SUPABASE_URL')!;
  },

  get supabaseServiceKey(): string {
    return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  },

  get supabaseAnonKey(): string {
    return Deno.env.get('SUPABASE_ANON_KEY') || '';
  },

  get siteUrl(): string {
    return Deno.env.get('SITE_URL') || 'https://lilpmaiai.vercel.app';
  },

  get gmailUser(): string | undefined {
    return Deno.env.get('GMAIL_USER');
  },

  get gmailPassword(): string | undefined {
    return Deno.env.get('GMAIL_APP_PASSWORD');
  },

  get resendApiKey(): string | undefined {
    return Deno.env.get('RESEND_API_KEY');
  },

  get senderEmail(): string {
    return Deno.env.get('SENDER_EMAIL') || Deno.env.get('GMAIL_USER') || '';
  },

  /** Check if Gmail SMTP credentials are configured */
  get hasGmailConfig(): boolean {
    return !!(this.gmailUser && this.gmailPassword);
  },
} as const;
