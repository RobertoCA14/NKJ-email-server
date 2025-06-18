// File: api/send-email.js (Vercel structure)

const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const validator = require("validator");

let limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: "Too many requests. Try again later." });
  },
});

// Export a Vercel Serverless Function
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // Call rate limiter manually
  await new Promise((resolve, reject) => {
    limiter(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required (name, email, subject, message)." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address format." });
  }

  // Optional: Basic domain-level verification (not real inbox validation)
  const domain = email.split('@')[1];
  const isSuspiciousDomain = ["example.com", "test.com"].includes(domain);
  if (isSuspiciousDomain) {
    return res.status(400).json({ success: false, message: "Untrusted email domain." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email to site owner
    await transporter.sendMail({
      from: `${name} <${email}>`,
      to: process.env.EMAIL_USER,
      subject: subject,
      html: `
        <h2>New message received from nkjconstructionllc.com by</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
        <hr>
        <p style="font-size: 0.9em; color: gray;">
          This message was sent from the contact form on
          <a href="https://nkjconstructionllc.com" target="_blank">nkjconstructionllc.com</a>.
        </p>
      `,
    });

    // Send confirmation email to client
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `We received your message: ${subject}`,
      html: `
        <h3>Hello ${name},</h3>
        <p>Thank you for contacting NKJ Construction LLC. We have received your message and will get back to you shortly.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <br>
        <p style="font-size: 0.9em; color: gray;">
          This is an automatic confirmation from <a href="https://nkjconstructionllc.com" target="_blank">nkjconstructionllc.com</a>.
        </p>
      `,
    });

    console.log(`Email sent by ${name} <${email}> with subject: ${subject}`);
    res.status(200).json({ success: true, message: "Email sent successfully ✅" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send email ❌", error });
  }
};
