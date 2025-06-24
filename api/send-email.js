// File: api/send-email.js

const nodemailer = require("nodemailer");
const validator = require("validator");
const rateLimit = require("express-rate-limit");

// Configurar límite de envíos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Manejar preflight
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  // Aplicar rate limiter manualmente
  await new Promise((resolve, reject) => {
    limiter(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  // Validación de dominios sospechosos (opcional)
  const domain = email.split("@")[1];
  if (["test.com", "example.com"].includes(domain)) {
    return res.status(400).json({ success: false, message: "Email domain not accepted." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Correo al admin
    await transporter.sendMail({
      from: `${name} <${email}>`,
      to: process.env.EMAIL_USER,
      subject,
      html: `
        <h2>Nuevo mensaje recibido desde el formulario</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Correo:</strong> ${email}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <p><strong>Mensaje:</strong><br>${message}</p>
        <hr>
        <p style="font-size: 0.9em; color: gray;">
          Enviado desde <a href="https://nkjconstructionllc.com" target="_blank">nkjconstructionllc.com</a>.
        </p>
      `,
    });

    // Correo de confirmación al cliente
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `We received your message: ${subject}`,
      html: `
        <h3>Hello ${name},</h3>
        <p>Thank you for reaching out to NKJ Construction LLC.</p>
        <p>We’ve received your message and will respond as soon as possible.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <br>
        <p style="font-size: 0.9em; color: gray;">
          This is an automatic response from <a href="https://nkjconstructionllc.com" target="_blank">nkjconstructionllc.com</a>.
        </p>
      `,
    });

    res.status(200).json({ success: true, message: "✅ Email sent successfully" });
  } catch (error) {
    console.error("❌ Email error:", error);
    res.status(500).json({ success: false, message: "❌ Failed to send email", error });
  }
};
