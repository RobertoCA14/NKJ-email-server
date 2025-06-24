const nodemailer = require("nodemailer");
const validator = require("validator");

function handleCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 1. Correo hacia la empresa
    await transporter.sendMail({
      from: `${name} <${email}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject,
      html: `
        <h2>New message from contact form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
        <hr>
        <p style="font-size: 0.9em; color: gray;">
          Sent from <a href="https://nkjconstructionllc.com" target="_blank">nkjconstructionllc.com</a>
        </p>
      `,
    });

    // 2. Respuesta automática al usuario
    await transporter.sendMail({
      from: `NKJ Construction <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "We received your message!",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting <strong>NKJ Construction</strong>. We’ve received your message and will get back to you as soon as possible.</p>
        <p>If your inquiry is urgent, feel free to call us directly.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>NKJ Construction Team</strong></p>
        <p><a href="https://nkjconstructionllc.com">nkjconstructionllc.com</a></p>
      `,
    });

    res.status(200).json({ success: true, message: "✅ Email sent successfully." });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: "❌ Failed to send email.", error });
  }
};
