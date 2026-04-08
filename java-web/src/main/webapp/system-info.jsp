<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>TA Recruitment — System info</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f4f4f4; padding: 0.1em 0.35em; border-radius: 4px; }
    h1 { font-size: 1.35rem; }
  </style>
</head>
<body>
  <h1>International School TA Recruitment</h1>
  <p>This page is rendered with <strong>JSP</strong> (course requirement: Servlet/JSP web application).</p>
  <p><strong>Server time (JSP):</strong> <%= new java.util.Date() %></p>
  <p>Structured data is stored as <strong>JSON</strong> and <strong>CSV</strong> exports under the configured data directory.
     CV file bodies are stored as <strong>UTF-8 text files</strong> containing Base64 (under <code>cv_payloads/</code>).</p>
  <p><a href="<%= request.getContextPath() %>/">Back to application</a></p>
</body>
</html>
