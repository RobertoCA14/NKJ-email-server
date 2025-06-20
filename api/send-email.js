const nodemailer = require("nodemailer");

const allowedOrigins = [
  "https://nkjconstructionllc.com", // tu dominio real
  "https://tu-frontend.vercel.app", // reemplaza con el que estés usando
  "https://codesandbox.io",         // si estás probando desde ahí
];

module.exports = async (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Manejo del preflight (CORS pre-check)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `${name} <${email}>`,
      to: process.env.EMAIL_USER,
      subject: subject,
      html: `
        <h2>New message received</h2>
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

    return res.status(200).json({ success: true, message: "✅ Message sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ success: false, message: "❌ Failed to send message", error });
  }
};
