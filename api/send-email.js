const dns = require("dns");
const nodemailer = require("nodemailer");
const validator = require("validator");
const rateLimit = require("express-rate-limit");
const xssFilters = require("xss-filters");
const cors = require("cors");
const express = require("express");

const app = express();

// Habilitar CORS
app.use(cors({
  origin: 'https://rycz3p-5173.csb.app', // Cambia a tu dominio de frontend
}));

// Configuración de Rate Limiting (5 solicitudes por IP cada 15 minutos)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 solicitudes por IP
  message: { success: false, message: "Too many requests. Please try again later." },
});

app.use(limiter);

// Configurar el parsing de JSON
app.use(express.json());

// Validación de correo
const validateEmail = (email) => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  const allowedDomains = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
  ];
  
  if (!emailRegex.test(email)) return false;

  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
};

// Verificar si el dominio tiene un registro MX válido usando DNS
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

app.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validar campos obligatorios
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // Validar formato de email y dominio
  try {
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format or domain." });
    }

    // Si no es un dominio permitido, verificar registro MX
    const domain = email.split('@')[1];
    if (!['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'].includes(domain)) {
      await checkMXRecord(domain);
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  // Filtrar el contenido del mensaje y nombre (prevención de XSS)
  const sanitizedMessage = xssFilters.inHTMLData(message);
  const sanitizedName = xssFilters.inHTMLData(name);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 1. Enviar el correo a la empresa
    await transporter.sendMail({
      from: `${sanitizedName} <${email}>`,
      to: process.env.EMAIL_USER,  // El correo de destino
      replyTo: email,
      subject,
      html: `
        <h2>New message from contact form</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${sanitizedMessage}</p>
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
        <p>Hi ${sanitizedName},</p>
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
});

// Configurar el puerto del servidor (si es necesario)
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
