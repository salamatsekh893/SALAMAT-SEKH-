# Project Configuration & Preferences

## Database Settings
- **DB_HOST**: `localhost`
- **DB_USER**: `u926896353_aljooya1`
- **DB_NAME**: `u926896353_aljooya1`
- **JWT_SECRET**: `rayhan123456`

## Application Rules
1. **Always** use `aljooya` related database names/users. Avoid `rayhan` for database connection credentials unless explicitly specified otherwise.
2. Maintain the `VITE_API_URL=/api` setting for client-server communication.
3. Keep the `connectionLimit: 4` in `server.ts` to prevent "max_connections_per_hour" errors on the Hostinger shared hosting environment.

## Context
The user is building a MFI (Micro Finance Institution) management system.
Current major focus nodes:
- `CreateMember.tsx`: Simplified inputs for old members.
- `todays-collection.tsx`: React Native Expo screen for batch collections.
- `server.ts`: MySQL pool connection management for Hostinger.
