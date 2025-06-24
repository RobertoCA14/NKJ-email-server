// /api/docs.js
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const swaggerPath = path.join(process.cwd(), 'public', 'swagger.json');
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

  res.setHeader('Content-Type', 'text/html');
  res.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>NKJ Construction API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          const ui = SwaggerUIBundle({
            url: '/swagger.json',
            dom_id: '#swagger-ui'
          });
        </script>
      </body>
    </html>
  `);
  res.end();
};
