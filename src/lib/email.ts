import { Resend } from 'resend';
import fetch from 'node-fetch';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, code: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Crowdfunding Platform <noreply@yourdomain.com>',
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Crowdfunding Platform!</h2>
          <p>Please use the following code to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

// Mailgun email sender
export async function sendMailgunEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) throw new Error('Mailgun API key or domain not set');
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  const form = new URLSearchParams();
  form.append('from', `Crowdfunding Platform <noreply@${domain}>`);
  form.append('to', to);
  form.append('subject', subject);
  form.append('html', html);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailgun error: ${text}`);
  }
  return await res.json();
} 