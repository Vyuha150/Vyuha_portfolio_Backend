import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS, // your email password or app-specific password
    },
  });
};

// Generate 6-digit verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, code, username) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Vyuha Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">VYUHA Innovation Foundation</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Welcome to Vyuha Innovation Foundation! To complete your registration and secure your account, please verify your email address using the code below:
          </p>
          
          <div style="background: #f8f9fa; border: 2px dashed #ff6b35; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
            <h3 style="color: #ff6b35; margin: 0 0 10px 0;">Verification Code</h3>
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${code}</span>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This code will expire in 15 minutes. If you didn't create this account, please ignore this email.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 Vyuha Innovation Foundation. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send verification email' };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, code, username) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Vyuha Account Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">VYUHA Innovation Foundation</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your password. Use the verification code below to reset your password:
          </p>
          
          <div style="background: #f8f9fa; border: 2px dashed #ff6b35; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
            <h3 style="color: #ff6b35; margin: 0 0 10px 0;">Reset Code</h3>
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${code}</span>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This code will expire in 15 minutes. If you didn't request this reset, please ignore this email and your password will remain unchanged.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 Vyuha Innovation Foundation. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send password reset email' };
  }
};
