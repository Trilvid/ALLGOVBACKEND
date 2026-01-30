// const nodemailer = require('nodemailer');

// class EmailService {
//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: process.env.SMTP_PORT,
//       secure: true,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS
//       }
//     });
//   this.sendEmail = this.sendEmail.bind(this);
//   this.sendWelcomeEmail = this.sendWelcomeEmail.bind(this);
//   this.sendPaymentReceipt = this.sendPaymentReceipt.bind(this);
//   this.sendExpiryReminder = this.sendExpiryReminder.bind(this);
//   this.sendPasswordResetEmail = this.sendPasswordResetEmail.bind(this);
//   this.sendKYCStatusEmail = this.sendKYCStatusEmail.bind(this);
//   }


//   // Send email
//   async sendEmail(options) {
//     try {
//       const mailOptions = {
//         from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//         to: options.email,
//         subject: options.subject,
//         html: options.html || options.message || options.text
//       };

//       const info = await this.transporter.sendMail(mailOptions);
//       console.log('Email sent:', info.messageId);
//       return { success: true, messageId: info.messageId };
//     } catch (error) {
//       console.error('Email error:', error);
//       return { success: false, error: error.message };
//     }
//   }

//   // Welcome email
//   async sendWelcomeEmail(user) {
//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
//           .content { padding: 20px; background: #f9fafb; }
//           .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
//           .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>Welcome to ALL GOV PAY!</h1>
//           </div>
//           <div class="content">
//             <h2>Hello ${user.firstname}!</h2>
//             <p>Thank you for registering with us. Your account has been successfully created.</p>
//             <p><strong>Your Tax ID:</strong> ${user.taxId}</p>
//             <p>You can now:</p>
//             <ul>
//               <li>Fund your wallet</li>
//               <li>Pay your taxes online</li>
//               <li>Manage subscriptions</li>
//               <li>Track payment history</li>
//             </ul>
//             <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
//             <p>If you have any questions, feel free to contact our support team.</p>
//           </div>
//           <div class="footer">
//             <p>&copy; ${new Date().getFullYear()} ALL GOV PAY. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     return await this.sendEmail({
//       email: user.email,
//       subject: 'Welcome to ALL GOV PAY',
//       html
//     });
//   }

// async sendVerificationEmail(email, token) {
//   const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

//   const htmlContent = `
//   <div style="font-family: Arial, sans-serif; padding: 20px; background: #f6f8fa;">
//     <div style="max-width: 500px; margin: auto; background: white; border-radius: 8px; padding: 20px;">
//       <h2 style="color: #0F58E8; text-align: center;">Verify Your Email Address</h2>
//       <p>Hello,</p>
//       <p>Thank you for registering. Please verify your email to activate your account.</p>

//       <a href="${verifyUrl}" 
//         style="
//           display: block;
//           width: fit-content;
//           padding: 12px 20px;
//           background: #0F58E8;
//           color: white;
//           border-radius: 6px;
//           text-decoration: none;
//           margin: 20px auto;
//           text-align: center;
//       ">
//         Verify Email
//       </a>

//       <p>If the button above does not work, click the link below:</p>
//       <p style="word-wrap: break-word;">
//         <a href="${verifyUrl}">${verifyUrl}</a>
//       </p>

//       <p style="margin-top: 30px; font-size: 12px; color: #666;">
//         If you did not create this account, please ignore this message.
//       </p>
//     </div>
//   </div>
//   `;

//     return await this.sendEmail({
//       email,
//       subject: 'Verify Your Email Address',
//       html: htmlContent
//     });
// }



//   // Payment receipt email
//   async sendPaymentReceipt(user, payment) {
//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background: #10b981; color: white; padding: 20px; text-align: center; }
//           .content { padding: 20px; background: #f9fafb; }
//           .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
//           .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
//           .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>✓ Payment Successful</h1>
//           </div>
//           <div class="content">
//             <h2>Hello ${user.username},</h2>
//             <p>Your tax payment has been processed successfully.</p>
//             <div class="receipt">
//               <h3>Payment Receipt</h3>
//               <div class="receipt-row">
//                 <span>Reference:</span>
//                 <strong>${payment.reference}</strong>
//               </div>
//               <div class="receipt-row">
//                 <span>Tax Type:</span>
//                 <strong>${payment.taxType}</strong>
//               </div>
//               <div class="receipt-row">
//                 <span>Amount:</span>
//                 <strong>₦${payment.amount.toLocaleString()}</strong>
//               </div>
//               <div class="receipt-row">
//                 <span>Date:</span>
//                 <strong>${new Date(payment.paidDate).toLocaleDateString()}</strong>
//               </div>
//               <div class="receipt-row">
//                 <span>Status:</span>
//                 <strong style="color: #10b981;">Completed</strong>
//               </div>
//             </div>
//             <p>Thank you for using our service!</p>
//           </div>
//           <div class="footer">
//             <p>&copy; ${new Date().getFullYear()} ALL GOV PAY. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     return await this.sendEmail({
//       email: user.email,
//       subject: 'Payment Receipt - ALL GOV PAY',
//       html
//     });
//   }

//   // Subscription expiry reminder
//   async sendExpiryReminder(user, subscription, daysLeft) {
//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
//           .content { padding: 20px; background: #f9fafb; }
//           .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
//           .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>⚠️ Subscription Expiring Soon</h1>
//           </div>
//           <div class="content">
//             <h2>Hello ${user.username},</h2>
//             <p>Your <strong>${subscription.name}</strong> subscription will expire in <strong>${daysLeft} days</strong>.</p>
//             <p><strong>Expiry Date:</strong> ${new Date(subscription.expiryDate).toLocaleDateString()}</p>
//             <p>Renew now to avoid service interruption and stay compliant with tax regulations.</p>
//             <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Renew Now</a>
//           </div>
//           <div class="footer">
//             <p>&copy; ${new Date().getFullYear()} ALL GOV PAY. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     return await this.sendEmail({
//       email: user.email,
//       subject: `Subscription Expiring Soon - ${subscription.name}`,
//       html
//     });
//   }

//   // Password reset email
//   async sendPasswordResetEmail(user, resetToken) {
//     const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
//           .content { padding: 20px; background: #f9fafb; }
//           .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
//           .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
//           .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>Password Reset Request</h1>
//           </div>
//           <div class="content">
//             <h2>Hello ${user.username},</h2>
//             <p>You requested to reset your password. Click the button below to reset it:</p>
//             <a href="${resetUrl}" class="button">Reset Password</a>
//             <p>This link will expire in 1 hour.</p>
//             <div class="warning">
//               <p><strong>⚠️ Security Notice:</strong></p>
//               <p>If you didn't request this password reset, please ignore this email and ensure your account is secure.</p>
//             </div>
//           </div>
//           <div class="footer">
//             <p>&copy; ${new Date().getFullYear()} ALL GOV PAY. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     return await this.sendEmail({
//       email: user.email,
//       subject: 'Password Reset Request',
//       html
//     });
//   }

//   // KYC verification status email
//   async sendKYCStatusEmail(user, status, reason = '') {
//     const statusColors = {
//       verified: '#10b981',
//       rejected: '#ef4444',
//       pending: '#f59e0b'
//     };

//     const statusMessages = {
//       verified: 'Your KYC verification has been approved! You now have full access to all features.',
//       rejected: `Your KYC verification was rejected. Reason: ${reason}. Please resubmit your documents.`,
//       pending: 'Your KYC documents are being reviewed. We will notify you once the review is complete.'
//     };

//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background: ${statusColors[status]}; color: white; padding: 20px; text-align: center; }
//           .content { padding: 20px; background: #f9fafb; }
//           .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
//           .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>KYC Verification ${status.toUpperCase()}</h1>
//           </div>
//           <div class="content">
//             <h2>Hello ${user.username},</h2>
//             <p>${statusMessages[status]}</p>
//             <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
//           </div>
//           <div class="footer">
//             <p>&copy; ${new Date().getFullYear()} ALL GOV PAY. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     return await this.sendEmail({
//       email: user.email,
//       subject: `KYC Verification ${status.charAt(0).toUpperCase() + status.slice(1)}`,
//       html
//     });
//   }
// }

// module.exports = new EmailService();

const { Resend } = require("resend");

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);

    this.sendEmail = this.sendEmail.bind(this);
    this.sendWelcomeEmail = this.sendWelcomeEmail.bind(this);
    this.sendPaymentReceipt = this.sendPaymentReceipt.bind(this);
    this.sendExpiryReminder = this.sendExpiryReminder.bind(this);
    this.sendPasswordResetEmail = this.sendPasswordResetEmail.bind(this);
    this.sendKYCStatusEmail = this.sendKYCStatusEmail.bind(this);
    this.sendVerificationEmail = this.sendVerificationEmail.bind(this);
  }

  // -----------------------------
  // GENERIC SEND EMAIL FUNCTION
  // -----------------------------
  async sendEmail(options) {
    try {
      const data = await this.resend.emails.send({
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
      });

      console.log("Email sent:", data.data.id);
      return { success: true, id: data.id };
    } catch (error) {
      console.error("Email error:", error);
      return { success: false, error: error.message };
    }
  }

  // -----------------------------
  // WELCOME EMAIL
  // -----------------------------
  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial; line-height: 1.6;">
        <h2 style="color: #2563eb;">Welcome to ALL GOV PAY!</h2>
        <p>Hello ${user.firstname},</p>
        <p>Your account has been successfully created.</p>
        <p><strong>Your Tax ID:</strong> ${user.taxId}</p>

        <a href="${process.env.FRONTEND_URL}/dashboard" 
          style="display:inline-block; padding:12px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;">
          Go to Dashboard
        </a>

        <p>&copy; ${new Date().getFullYear()} ALL GOV PAY</p>
      </div>
    `;

    return this.sendEmail({
      email: user.email,
      subject: "Welcome to ALL GOV PAY",
      html,
    });
  }

  // -----------------------------
  // EMAIL VERIFICATION
  //------------------------------

  async sendVerificationEmail(email, token) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const html = `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #0F58E8;">Verify Your Email</h2>
        <p>Please click the button below to verify your email address:</p>

        <a href="${verifyUrl}" 
           style="padding: 12px 20px; background: #0F58E8; color: white; text-decoration: none; border-radius: 6px;">
          Verify Email
        </a>

        <p>If the button doesn't work, click this link:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      </div>
    `;

    return this.sendEmail({
      email,
      subject: "Verify Your Email Address",
      html,
    });
  }

  // -----------------------------
  // PAYMENT RECEIPT EMAIL
  // -----------------------------

  async sendPaymentReceipt(user, payment) {
    const html = `
      <div style="font-family: Arial; padding: 20px;">
        <h2 style="color: #10b981;">Payment Successful</h2>
        <p>Hello ${user.username}, your payment was successful.</p>

        <div style="background:white; padding:20px; border-radius:8px;">
          <p><strong>Reference:</strong> ${payment.reference}</p>
          <p><strong>Tax Type:</strong> ${payment.taxType}</p>
          <p><strong>Amount:</strong> ₦${payment.amount.toLocaleString()}</p>
          <p><strong>Date:</strong> ${new Date(payment.paidDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      email: user.email,
      subject: "Payment Receipt - ALL GOV PAY",
      html,
    });
  }

  // -----------------------------
  // SUBSCRIPTION EXPIRY REMINDER
  // -----------------------------
  async sendExpiryReminder(user, subscription, daysLeft) {
    const html = `
      <div style="font-family: Arial;">
        <h2 style="color: #f59e0b;">Subscription Expiring Soon</h2>
        <p>Hello ${user.username},</p>
        <p>Your <strong>${subscription.name}</strong> subscription expires in <strong>${daysLeft} days</strong>.</p>

        <a href="${process.env.FRONTEND_URL}/dashboard"
           style="padding: 12px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;">
          Renew Now
        </a>
      </div>
    `;

    return this.sendEmail({
      email: user.email,
      subject: `Subscription Expiring Soon - ${subscription.name}`,
      html,
    });
  }

  // -----------------------------
  // PASSWORD RESET EMAIL
  // -----------------------------
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial;">
        <h2 style="color:#2563eb;">Reset Your Password</h2>
        <p>Hello ${user.username}, click the button below to reset your password:</p>

        <a href="${resetUrl}" 
           style="padding:12px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;">
           Reset Password
        </a>

        <p>This link expires in 1 hour.</p>
      </div>
    `;

    return this.sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      html,
    });
  }

  // -----------------------------
  // KYC STATUS EMAIL
  // -----------------------------
  async sendKYCStatusEmail(user, status, reason = "") {
    const colors = {
      verified: "#10b981",
      rejected: "#ef4444",
      pending: "#f59e0b",
    };

    const messages = {
      verified: "Your KYC has been approved.",
      rejected: `Your KYC was rejected. Reason: ${reason}`,
      pending: "Your KYC is under review.",
    };

    const html = `
      <div style="font-family: Arial;">
        <h2 style="color:${colors[status]};">KYC Status: ${status.toUpperCase()}</h2>
        <p>Hello ${user.username},</p>
        <p>${messages[status]}</p>
      </div>
    `;

    return this.sendEmail({
      email: user.email,
      subject: `KYC Verification - ${status}`,
      html,
    });
  }

  // -----------------------------
  // CONTACT FORM EMAIL
  // -----------------------------
  async sendContactFormEmail({ name, email, message }) {
    const html = `
    <div style="font-family: Arial; line-height: 1.6;">
      <h2 style="color:#0F58E8;">New Contact Form Message</h2>

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>

      <hr />

      <p><strong>Message:</strong></p>
      <p>${message}</p>

      <hr />
      <p>Sent from website contact form</p>
    </div>
  `;

    return this.sendEmail({
      email: 'support@allgovpay.com', // webmail inbox
      subject: "New Contact Form Submission",
      html,
    });
  }


}

module.exports = new EmailService();