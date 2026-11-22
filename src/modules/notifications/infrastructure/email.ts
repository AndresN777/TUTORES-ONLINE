export type EmailMessage = { to: string; subject: string; text: string };

export type EmailResult = { delivered: boolean; provider: string };

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

/**
 * Development provider: writes the message to the server log and reports
 * `delivered: false`, because nothing actually left the machine.
 * Replace with a real provider (SMTP, Resend, SES…) for production.
 */
export class LogEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    console.info(`[email:mock] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { delivered: false, provider: "log" };
  }
}

export const emailProvider: EmailProvider = new LogEmailProvider();
