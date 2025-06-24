const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const validator = require("validator");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace * with your domain for production
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

module.exports = async (req, res) => {
  // Apply CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Method not allowed" });

  // Rate limiter
  await new Promise((resolve, reject) => {
    limiter(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are required (name, email, subject, message).",
    });
  }

  // Check format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address." });
  }

  // Block suspicious domains
  const domain = email.split("@")[1];
  const blockedDomains = ["mailinator.com", "example.com", "test.com", "tempmail.com"];
  if (blockedDomains.includes(domain)) {
    return res.status(400).json({
      success: false,
      message: "Temporary or untrusted email domains are not allowed.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send message to admin
    await transporter.sendMail({
      from: `${name} <${email}>`,
      to: process.env.EMAIL_USER,
      subject: subject,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
        <hr>
        <p style="font-size: 0.9em; color: gray;">
          Sent from <a href="https://nkjconstructionllc.com">nkjconstructionllc.com</a>
        </p>
      `,
    });

    // Auto-response to user
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `We received your message: ${subject}`,
      html: `
        <h3>Hello ${name},</h3>
        <p>Thank you for contacting <strong>NKJ Construction LLC</strong>. We have received your message and will get back to you soon.</p>
        <hr />
        <p><strong>Your message:</strong></p>
        <blockquote>${message}</blockquote>
        <br />
        <p style="font-size: 0.9em; color: gray;">This is an automatic confirmation from <a href="https://nkjconstructionllc.com">nkjconstructionllc.com</a>.</p>
      `,
    });

    res.status(200).json({ success: true, message: "✅ Message sent successfully." });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, message: "Server error. Email not sent.", error });
  }
};
