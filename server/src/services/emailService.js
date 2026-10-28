const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

class EmailService {
  /**
   * Lazy-initialize nodemailer transporter
   */
  static getTransporter() {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT) || 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      } else {
        this.transporter = null;
      }
    }
    return this.transporter;
  }

  /**
   * Build branded HTML template using platform palette:
   * Forest: #1F4D3A, Sage: #A9BFA8, Warm-White: #FAF7F0, Amber: #E0A030, Charcoal: #2B2B2B
   */
  static buildHtmlTemplate({ title, subtitle, mainContent, actionButton, footerNote }) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const actionHtml = actionButton
      ? `
        <div style="margin: 28px 0; text-align: center;">
          <a href="${actionButton.url.startsWith('http') ? actionButton.url : clientUrl + actionButton.url}" 
             style="background-color: #1F4D3A; color: #FAF7F0; font-family: 'Manrope', Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; padding: 13px 28px; border-radius: 10px; display: inline-block; border: 1px solid #1F4D3A; box-shadow: 0 4px 6px rgba(31,77,58,0.2);">
            ${actionButton.text}
          </a>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2B2B2B; line-height: 1.6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF7F0; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 2px solid #A9BFA8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(43, 43, 43, 0.05);" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td style="background-color: #1F4D3A; padding: 24px 32px; text-align: left; border-bottom: 3px solid #E0A030;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="font-family: 'Manrope', Arial, sans-serif; font-size: 22px; font-weight: 800; color: #FAF7F0; letter-spacing: -0.5px;">
                            Campus <span style="color: #E0A030;">Auction</span>
                          </span>
                        </td>
                        <td align="right">
                          <span style="background-color: rgba(250, 247, 240, 0.15); color: #FAF7F0; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">
                            Verified Campus
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px;">
                    <h1 style="margin: 0 0 8px 0; font-family: 'Manrope', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1F4D3A;">
                      ${title}
                    </h1>
                    ${subtitle ? `<p style="margin: 0 0 20px 0; font-size: 14px; color: #666666;">${subtitle}</p>` : ''}
                    
                    <div style="font-size: 15px; color: #2B2B2B; line-height: 1.6;">
                      ${mainContent}
                    </div>

                    ${actionHtml}

                    ${footerNote ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ECE7DD; font-size: 13px; color: #777777;">${footerNote}</div>` : ''}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #FAF8F4; padding: 20px 32px; text-align: center; border-top: 1px solid #A9BFA8; font-size: 12px; color: #888888;">
                    <p style="margin: 0 0 6px 0;">This email was sent to your registered campus address by Campus Auction.</p>
                    <p style="margin: 0;">100% Student Verified &bull; Anti-Sniping &bull; Zero Hidden Defects</p>
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

  /**
   * Send 6-Digit Email OTP (for signup verification or login)
   */
  static async sendOtpEmail(email, otpCode, purpose = 'signup') {
    const isSignup = purpose === 'signup';
    const title = isSignup ? 'Verify Your Campus Email' : 'Your Campus Auction Login Code';
    const subtitle = isSignup
      ? 'Welcome to Campus Auction! Please confirm your email address.'
      : 'Use this one-time code to securely log in to your account.';

    const mainContent = `
      <p style="margin: 0 0 16px 0;">Your verification code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
      
      <div style="background-color: #FAF8F4; border: 2px dashed #1F4D3A; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1F4D3A; display: inline-block;">
          ${otpCode}
        </span>
      </div>

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #666666;">
        If you did not request this verification code, you can safely ignore this email.
      </p>
    `;

    const html = this.buildHtmlTemplate({
      title,
      subtitle,
      mainContent,
      footerNote: 'Need help? Chat with our AI Assistant in the bottom right corner of the website.',
    });

    return this.dispatchEmail({
      to: email,
      subject: `${otpCode} is your Campus Auction verification code`,
      html,
      devLog: `OTP [${purpose.toUpperCase()}]: ${otpCode} for ${email}`,
    });
  }

  /**
   * Send General Alert Email (Unsold notice, price approval, outbid, handover)
   */
  static async sendAlertEmail(email, subject, message, link = null, actionText = 'View in Campus Auction') {
    const mainContent = `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #2B2B2B; line-height: 1.6;">
        ${message}
      </p>
    `;

    const actionButton = link ? { url: link, text: actionText } : null;

    const html = this.buildHtmlTemplate({
      title: subject,
      mainContent,
      actionButton,
      footerNote: 'Stay informed! You can adjust notification settings or inspect active auctions anytime on your dashboard.',
    });

    return this.dispatchEmail({
      to: email,
      subject: `[Campus Auction] ${subject}`,
      html,
      devLog: `Alert sent to ${email}: "${subject}" -> ${message}`,
    });
  }

  /**
   * Internal dispatcher with graceful SMTP fallback for development and testing
   */
  static async dispatchEmail({ to, subject, html, devLog }) {
    const from = process.env.EMAIL_FROM || '"Campus Auction" <noreply@campusauction.edu>';
    const transporter = this.getTransporter();

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        return { success: true, messageId: info.messageId, mode: 'smtp' };
      } catch (err) {
        console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
        // Fall back to dev log if SMTP error happens
        if (process.env.NODE_ENV !== 'production' && devLog) {
          console.log(`[EmailService Dev Fallback] ${devLog}`);
        }
        return { success: false, error: err.message, mode: 'fallback' };
      }
    } else {
      // SMTP not configured - console log in development/test
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EmailService] (Dev Mode - No SMTP) ${devLog}`);
      }
      return { success: true, mode: 'dev_mock' };
    }
  }
}

module.exports = EmailService;
