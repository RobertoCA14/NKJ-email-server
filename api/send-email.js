const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const validator = require('validator');

// Habilitar CORS (permitir todas las solicitudes por ahora)
const app = express();
app.use(cors());
app.use(express.json());  // Para que se pueda leer el cuerpo JSON

// Ruta para el formulario de contacto
app.post('/api/send-email', async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validaciones
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
 
  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }

  try {
    // Configuración de Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Tu correo de Gmail
        pass: process.env.EMAIL_PASS,  // Tu contraseña de Gmail o App Password
      },
    });

    // Enviar correo
    await transporter.sendMail({
      from: `${name} <${email}>`,
      to: process.env.EMAIL_USER,  // Correo destino
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

    res.status(200).json({ success: true, message: '✅ Email sent successfully.' });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: '❌ Failed to send email.', error });
  }
});

// Puerto para escuchar las solicitudes
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
