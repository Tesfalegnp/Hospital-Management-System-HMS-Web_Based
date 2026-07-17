# Enterprise Hospital Management System (HMS) Rules

## 1. Do Not Hallucinate or Skip Files
- Always read existing schema and config files before suggesting modifications.
- Do not assume database field names; verify them using `server/prisma/schema.prisma`.
- When writing files, write full, production-ready code. Do not write placeholders like `// TODO: implement later` or `// rest of the code here` unless specifically authorized.

## 2. Architectural Integrity (Separation of Concerns)
Strictly follow our established modular architecture pattern for the backend:
- **Prisma Schema (`server/prisma/schema.prisma`):** Single source of truth for database models. Always verify relationships before writing business logic.
- **Repositories (`/repositories`):** Direct database operations. Keep SQL/Prisma operations isolated here so the rest of the app doesn't know about the underlying DB tech.
- **Services (`/services`):** Core business logic, transaction handling, authorization checks, and validation triggers. 
- **Controllers (`/controllers`):** HTTP request/response handling. Use the `asyncHandler` middleware for cleaner error bubbles.
- **Routes (`/routes`):** Endpoint definitions, incorporating validators and auth middleware.
- **Validators (`/validators`):** Express input validation schemas using Zod.

## 3. Strict Security & Clean Error Handling
- Use `AppError` and the custom error handling middleware (`errorHandler.ts`) to throw explicit HTTP errors with accurate status codes.
- Do not catch errors silently inside controllers or services unless transforming them into proper application errors.
- Ensure all endpoints check for authorization (e.g., verifying user roles like Admin, Doctor, Receptionist, Patient).

## 4. Work Execution Protocol
When asked to implement a new feature:
1. **Analyze:** Check `schema.prisma` first. Identify if any new schema alterations or migrations are needed.
2. **Review:** Suggest migrations *before* writing code.
3. **Plan:** Walk through the structural files intended to be modified or created in order (Repository -> Service -> Validator -> Controller -> Route).
4. **Execute:** Provide complete, clean TypeScript code fitting our setup.
