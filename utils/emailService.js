import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid email service initialized');
} else {
  console.warn('⚠️  SendGrid API key not configured. Emails will be logged to console only.');
}

// Generate secure random token
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Send email verification
export const sendVerificationEmail = async (email, firstName, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'noreply@wisedeep.com',
    subject: 'Verify Your WiseDeep Account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WiseDeep!</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Thank you for registering with WiseDeep, your trusted mental health companion.</p>
              <p>To complete your registration and start your wellness journey, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with WiseDeep, please ignore this email.</p>
              <p>Best regards,<br>The WiseDeep Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} WiseDeep. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
      console.log('✅ Verification email sent to:', email);
    } else {
      console.log('📧 [DEV MODE] Verification email would be sent to:', email);
      console.log('🔗 Verification URL:', verificationUrl);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification email:', error.response ? error.response.body : error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, firstName, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'noreply@wisedeep.com',
    subject: 'Reset Your WiseDeep Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>We received a request to reset your WiseDeep account password.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password will remain unchanged</li>
                </ul>
              </div>
              <p>Best regards,<br>The WiseDeep Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} WiseDeep. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
      console.log('✅ Password reset email sent to:', email);
    } else {
      console.log('📧 [DEV MODE] Password reset email would be sent to:', email);
      console.log('🔗 Reset URL:', resetUrl);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.response ? error.response.body : error);
    throw new Error('Failed to send password reset email');
  }
};

// Send password changed confirmation
export const sendPasswordChangedEmail = async (email, firstName) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'noreply@wisedeep.com',
    subject: 'Your WiseDeep Password Has Been Changed',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Password Changed Successfully</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>This is a confirmation that your WiseDeep account password has been successfully changed.</p>
              <div class="warning">
                <strong>⚠️ Didn't make this change?</strong>
                <p>If you did not change your password, please contact our support team immediately at support@wisedeep.com</p>
              </div>
              <p>Best regards,<br>The WiseDeep Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} WiseDeep. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
      console.log('✅ Password changed confirmation sent to:', email);
    } else {
      console.log('📧 [DEV MODE] Password changed confirmation would be sent to:', email);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password changed email:', error.response ? error.response.body : error);
    // Don't throw error for confirmation emails
    return { success: false };
  }
};
