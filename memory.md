# Development Memory & Notes

## Backend Server Management
- **IMPORTANT**: Always inform the user when backend server needs to be restarted after code changes
- Backend changes (Java files, configuration, dependencies) require server restart
- Frontend changes (TypeScript, HTML, CSS) are hot-reloaded automatically via Angular dev server
- **LAST RESTART**: Fixed CORS configuration to allow any localhost port (was blocking login from port 59994)

## Project Structure Notes
- Backend: Spring Boot (Java) - requires manual restart
- Frontend: Angular - hot reload enabled
- Mobile: React Native

## Common Restart Scenarios
- Java source code changes
- application.properties modifications
- Maven dependency updates (pom.xml)
- New REST endpoints or controllers

## Recent Fixes
- Fixed CORS to use `allowedOriginPatterns` with wildcard: `http://localhost:*`
- This allows the Angular dev server to connect from any port (e.g., 59994, 4200, 4201)
