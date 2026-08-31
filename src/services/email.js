import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'demelodybeats@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'De Melody Beats';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Send welcome email to new subscriber
export const sendWelcomeEmail = async (email, firstName) => {
  try {
    const verificationLink = `${FRONTEND_URL}/verify/${encodeURIComponent(email)}`;
    
    console.log('Sending welcome email to:', email);
    console.log('Verification link:', verificationLink);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email }],
        subject: 'Welcome to De Melody Beats! 🎵',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to De Melody Beats</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 3px solid #F28C28;
              }
              .header h1 {
                color: #1A1A1A;
                font-size: 28px;
                margin: 0;
              }
              .header h1 span {
                color: #F28C28;
              }
              .content {
                padding: 30px 0;
              }
              .content h2 {
                color: #F28C28;
                font-size: 22px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #F28C28;
                color: #1A1A1A;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
              }
              .button:hover {
                background-color: #F2C230;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #eee;
                color: #888;
                font-size: 12px;
              }
              .footer .slogan {
                color: #F2C230;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>De <span>Melody</span> Beats</h1>
              <p style="color: #F2C230; font-style: italic;">More Than Music</p>
            </div>
            
            <div class="content">
              <h2>Welcome to the Family! 🎶</h2>
              
              <p>Hello ${firstName || 'there'},</p>
              
              <p>Thank you for subscribing to the De Melody Beats mailing list! We're so excited to have you join our community.</p>
              
              <p><strong>What you can expect from us:</strong></p>
              <ul>
                <li>🎵 <strong>New Music Releases</strong> - Be the first to hear our latest songs</li>
                <li>🎤 <strong>Upcoming Shows & Events</strong> - Never miss a performance</li>
                <li>❤️ <strong>Community Outreach</strong> - Updates on our mission work</li>
                <li>📢 <strong>Exclusive Content</strong> - Behind-the-scenes, live sessions, and more</li>
              </ul>
              
              <p><strong>Please verify your email address:</strong></p>
              <p>Click the button below to confirm your subscription:</p>
              
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Confirm Subscription</a>
              </div>
              
              <p style="font-size: 14px; color: #888;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; color: #888; word-break: break-all;">${verificationLink}</p>
              
              <p style="margin-top: 30px;">We believe we can make our community a better place by contributing immensely. Through music, education, and compassion, we reach out to those in need.</p>
              
              <p>Stay blessed,</p>
              <p><strong>The De Melody Beats Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} De Melody Beats. All rights reserved.</p>
              <p><span class="slogan">More Than Music</span></p>
            </div>
          </body>
          </html>
        `,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Welcome email sent successfully');
    return response.data;
  } catch (error) {
    console.error('Error sending welcome email:', error.response?.data || error.message);
    throw error;
  }
};

// Send contact form email
export const sendContactEmail = async (name, email, subject, message) => {
  try {
    console.log('Sending contact email from:', email);

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: BREVO_SENDER_EMAIL }],
        replyTo: { email },
        subject: subject || `New message from ${name}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Contact Message</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 3px solid #F28C28;
              }
              .header h1 {
                color: #1A1A1A;
                font-size: 24px;
                margin: 0;
              }
              .header h1 span {
                color: #F28C28;
              }
              .content {
                padding: 30px 0;
              }
              .field {
                margin-bottom: 15px;
              }
              .field-label {
                font-weight: bold;
                color: #555;
              }
              .field-value {
                padding: 8px 12px;
                background: #f5f5f5;
                border-radius: 4px;
                margin-top: 4px;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #eee;
                color: #888;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>De <span>Melody</span> Beats</h1>
              <p style="color: #F2C230;">New Contact Form Message</p>
            </div>
            
            <div class="content">
              <div class="field">
                <div class="field-label">From:</div>
                <div class="field-value">${name} (${email})</div>
              </div>
              
              <div class="field">
                <div class="field-label">Subject:</div>
                <div class="field-value">${subject || 'No subject'}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Message:</div>
                <div class="field-value" style="white-space: pre-wrap;">${message}</div>
              </div>
              
              <p style="margin-top: 20px;">
                <a href="mailto:${email}" style="color: #F28C28;">Reply to ${name}</a>
              </p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} De Melody Beats. More Than Music</p>
            </div>
          </body>
          </html>
        `,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Contact email sent successfully');
    return response.data;
  } catch (error) {
    console.error('Error sending contact email:', error.response?.data || error.message);
    throw error;
  }
};