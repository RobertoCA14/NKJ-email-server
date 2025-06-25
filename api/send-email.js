const dns = require('dns');
const nodemailer = require('nodemailer');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const xssFilters = require('xss-filters');

// Configuración de Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limitar a 5 solicitudes por IP
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Validación de correo
const validateEmail = (email) => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  const allowedDomains = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com"
  ];
  
  if (!emailRegex.test(email)) return false; // Si el formato del correo no es válido, es inválido.
  
  const domain = email.split('@')[1]; // Extraemos el dominio después del '@'
  
  // Si es uno de los dominios permitidos, lo dejamos pasar
  if (allowedDomains.includes(domain)) {
    return true;
  }
  
  // Si no es un dominio permitido, verificamos si tiene un registro MX válido en DNS
  return checkMXRecord(domain);
};

// Verificar si el dominio tiene un registro MX válido
const checkMXRecord = (domain) => {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        reject(new Error('Invalid domain or no MX records found'));
      } else {
        resolve(true);
      }
    });
  });
};

module.exports = async (req, res) => {
  // Aplicar Rate Limiting
  await new Promise((resolve, reject) => {
    limiter(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });

  // Validar campos
  const { name, email, subject, message } = req.body;

  // Validar campos vacíos
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // Validar formato de email y dominio
  try {
    const emailIsValid = await validateEmail(email);
    if (!emailIsValid) {
      return res.status(400).json({ success: false, message: "Invalid email format or domain." });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  // Filtrar el contenido del mensaje
  const sanitizedMessage = xssFilters.inHTMLData(message);  // Filtrar contenido potencialmente malicioso
  const sanitizedName = xssFilters.inHTMLData(name);  // Filtrar nombre

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
      to: process.env.EMAIL_USER,
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
};
