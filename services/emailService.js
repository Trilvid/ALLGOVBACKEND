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
        <p>Hello ${user.username},</p>
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