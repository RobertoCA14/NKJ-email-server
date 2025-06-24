{
  "openapi": "3.0.0",
  "info": {
    "title": "NKJ Email API",
    "version": "1.0.0",
    "description": "Send emails using the contact form of nkjconstructionllc.com"
  },
  "paths": {
    "/api/send-email": {
      "post": {
        "summary": "Send contact email",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "email": { "type": "string" },
                  "subject": { "type": "string" },
                  "message": { "type": "string" }
                },
                "required": ["name", "email", "subject", "message"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Email sent successfully"
          },
          "400": {
            "description": "Validation error"
          }
        }
      }
    }
  }
}
