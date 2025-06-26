import dns from "dns";
import nodemailer from "nodemailer";
import validator from "validator";
import rateLimit from "express-rate-limit";
import xssFilters from "xss-filters";
import Cors from "cors";

// CORS middleware
const cors = Cors({});

// Helper para ejecutar middleware en Vercel
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// Valida dominios comunes
const validateEmail = (email) => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  const allowedDomains = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
  ];
  if (!emailRegex.test(email)) return false;
  const domain = email.split("@")[1];
  return allowedDomains.includes(domain);
};

// Verifica si el dominio tiene registros MX
const checkMXRecord = (domain) => {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        reject(new Error("Invalid domain or no MX records found"));
      } else {
        resolve(true);
      }
    });
  });
};

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    handler: (_, res) => {
      return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    },
  });

  await runMiddleware(req, res, limiter);

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  if (!validateEmail(email)) {
    try {
      const domain = email.split("@")[1];
      await checkMXRecord(domain); // Si no es de los dominios permitidos, validamos con DNS
    } catch {
      return res.status(400).json({ success: false, message: "Email domain not valid." });
    }
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
      from: `${xssFilters.inHTMLData(name)} <${xssFilters.inHTMLData(email)}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: xssFilters.inHTMLData(subject),
      html: `
        <h2>New message from contact form</h2>
        <p><strong>Name:</strong> ${xssFilters.inHTMLData(name)}</p>
        <p><strong>Email:</strong> ${xssFilters.inHTMLData(email)}</p>
        <p><strong>Subject:</strong> ${xssFilters.inHTMLData(subject)}</p>
        <p><strong>Message:</strong><br>${xssFilters.inHTMLData(message)}</p>
        <hr>
        <p style="font-size: 0.9em; color: gray;">
          Sent from <a href="https://nkjconstructionllc.com" target="_blank">nkjconstructionllc.com</a>
        </p>
      `,
    });

    // 2. Respuesta automática al usuario
    await transporter.sendMail({
      from: `NKJ Construction LLC<${process.env.EMAIL_USER}>`,
      to: email,
      subject: "We received your message!",
      html: `
        <p>Hi ${xssFilters.inHTMLData(name)},</p>
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
}
