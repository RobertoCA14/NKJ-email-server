const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../swagger.json");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>NKJ API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function () {
            SwaggerUIBundle({
              url: '/swagger.json',
              dom_id: '#swagger-ui',
            });
          };
        </script>
      </body>
    </html>
  `);
};
