# AGENTS.md

This file contains guidelines for agentic coding agents working in this repository.

## Project Structure

This is an archive management system with the following structure:
- `archive-management/`: **Main working directory & actual product** - Next.js 15 backend API with React frontend (TypeScript)
- `archive-management-ui/`: **High-fidelity UI design mockups only** - Vue 3 + TypeScript frontend (design reference, not the actual product)
- `attachment/`: **Test files** - CSV field definitions, PDF datasheets for testing
- `documents/`: **PRD and deployment manuals** - Product requirements and deployment documentation

## Build & Test Commands

### Next.js Backend (archive-management/)

**Development:**
```bash
cd archive-management
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
```

**Testing:**
```bash
npm run test                   # Run Vitest unit tests
npm run test:ui                # Run Vitest with UI
npm run test path/to/file.test.ts  # Run single test file
```

**End-to-End:**
```bash
npm run test:e2e              # Run Playwright tests
npm run test:e2e:ui           # Run Playwright with UI
```

**Linting & Type Checking:**
```bash
npm run lint                   # Run ESLint
npm run typecheck              # TypeScript type checking
```

**Database:**
```bash
npm run db:seed               # Seed database with sample data
npx prisma migrate deploy     # Run migrations
npx prisma generate           # Generate Prisma client
```

### Vue Frontend (archive-management-ui/)

**Development:**
```bash
cd archive-management-ui
npm run dev                   # Start development server
npm run build                 # Build for production
npm run preview               # Preview production build
```

**Linting & Formatting:**
```bash
npm run lint                  # Run ESLint with auto-fix
npm run format                # Format with Prettier
npm run type-check           # TypeScript type checking
```

**Note**: This directory contains UI design mockups only and does not need to be built for production deployment.

### Docker Commands (archive-management/)

```bash
make init                    # Initialize environment
make up                      # Start all services
make dev                     # Start only middleware (postgres, redis, meilisearch)
make down                    # Stop all services
make db-shell               # Enter PostgreSQL shell
make logs                   # View logs
make health                 # Check application health
```

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript with strict mode enabled
- Import style: `import { function } from 'module'` for named imports, `import Default from 'module'` for default imports
- Use ES6+ syntax (arrow functions, destructuring, async/await)
- Prefer `const` over `let`, only use `let` when reassignment is needed
- Function naming: camelCase for functions, PascalCase for classes/components
- File naming: kebab-case for files (except React components which use PascalCase)

### React/Next.js (archive-management/)
- Use functional components with TypeScript
- Use Next.js App Router (`app/` directory)
- Prefer Server Components by default, use Client Components (`'use client'`) only when necessary
- Use Tailwind CSS for styling (avoid inline styles)
- Component structure: Props interface, then component function
- Use NextAuth.js for authentication
- Use Prisma for database operations
- API routes follow RESTful conventions in `app/api/` directory

### Vue 3 (archive-management-ui/)
- **Note**: Only used in high-fidelity UI mockups, not in actual product
- Use Composition API with `<script setup lang="ts">`
- Use TypeScript with proper type definitions
- Component naming: PascalCase
- Use Element Plus for UI components
- Use Pinia for state management
- Use Vue Router for navigation
- Props should have TypeScript interfaces

### Database (Prisma)
- Use Prisma schema in `prisma/schema.prisma`
- Model names: PascalCase
- Field names: camelCase
- Always include `id`, `createdAt`, `updatedAt` fields
- Use proper foreign key relationships
- Run migrations after schema changes

### Testing
- Unit tests: Vitest with jsdom environment
- E2E tests: Playwright
- Test files: `.test.ts` or `.spec.ts` suffix
- Mock external dependencies (databases, APIs)
- Use descriptive test names with `describe` and `it`
- Follow AAA pattern (Arrange, Act, Assert)

### Error Handling
- Use try-catch blocks for async operations
- Return consistent error responses from APIs
- Log errors appropriately (don't expose sensitive data)
- Use proper HTTP status codes
- Handle validation errors with clear messages

### File Organization
```
archive-management/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                  # Utility libraries
├── prisma/               # Database schema and migrations
└── services/             # Business logic

archive-management-ui/
├── src/
│   ├── components/       # Vue components
│   ├── stores/          # Pinia stores
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript definitions
```

### Data Models (Archive System)
Based on Prisma schema - core entities:
- **Archive**: Main archive entity with archiveID (id), archiveNo (unique), metadata fields
- **ImportRecord**: Tracks file import progress and status
- **OperationLog**: Audit trail for all user actions
- **User**: User accounts with role-based permissions (admin/user)
- **License**: System licensing with device codes and auth codes

### Archive Upload Workflow
1. **PDF Upload**: Files renamed to archiveID (cuid format) for storage
2. **Initial Import**: Only archiveNo field populated, other fields left empty
3. **CSV Data Import**: Admin uploads CSV with archive metadata, mapped by archiveNo
4. **Validation**: Format validation, existence checks, async import with progress tracking

### Import Conventions
- React: `import React from 'react'`
- Next.js: `import { NextResponse } from 'next/server'`
- Prisma: `import { PrismaClient } from '@prisma/client'`
- Vue: `import { defineStore } from 'pinia'`
- Absolute imports: Use `@/` prefix (configured in both projects)

### Authentication
- Next.js: NextAuth.js with session management
- Vue: Mock authentication with localStorage (UI mockups only)
- Role-based access control (admin/user)
- Protect API routes with middleware

### Code Quality
- ESLint configuration: Next.js and Vue 3 configs
- Prettier for code formatting (Vue project)
- TypeScript strict mode enabled
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### Environment Variables
- Use `.env.local` for local development
- Never commit `.env` files
- Use proper environment variable validation
- Database connections through environment variables

## Archive System Specifics

### Archive Data Fields
Core archive fields (defined in `attachment/archive_field.csv`):
- `archiveNo`: 档号 (unique identifier)
- `fondsNo`: 全宗号
- `retentionPeriod`: 保管期限
- `retentionCode`: 保管期限代码
- `year`: 年度
- `deptCode`: 机构问题代码
- `boxNo`: 盒号
- `pieceNo`: 件号
- `title`: 题名
- `deptIssue`: 机构问题
- `responsible`: 责任者
- `docNo`: 文号
- `date`: 日期
- `pageNo`: 页号
- `remark`: 备注

### Import Validation Rules
When importing CSV archive data:
1. **Format Validation**: Check for blank or duplicate archive numbers
2. **Existence Validation**: Verify archive numbers exist in database
3. **Async Processing**: Show progress bars for import operations
4. **Error Reporting**: Detail failed records with reasons

### License & Authorization
- Device codes generate unique auth codes
- Auth codes validate legitimacy and expiration
- License middleware checks all API requests
- Local caching for performance optimization

### PDF Management
- Files stored with archiveID as filename
- PDF preview using react-pdf-viewer
- Local file system storage via Docker mounts
- Async processing for large file operations

## Testing Guidelines

### Test Coverage Areas
- API endpoint validation and error handling
- Archive import/export workflows
- Authentication and authorization
- Search functionality with Meilisearch
- PDF preview and download operations

### Mock Data
- Use `attachment/` directory for test PDFs and CSV files
- Sample archives in `prisma/seed.ts`
- Test users: admin/admin123, user/user123 (Vue mockups only)

## Running Single Tests

To run a specific test file:
```bash
cd archive-management
npm run test app/api/search/__tests__/route.test.ts
```

For watch mode:
```bash
npm run test -- app/api/search/__tests__/route.test.ts --watch
```

For coverage:
```bash
npm run test -- --coverage
```

## Code Style & Conventions

### Import Styles
- Named imports: `import { User, Role } from '@/types'`
- Default imports: `import React from 'react'`
- Avoid mixed imports in same statement
- Order imports: 1) Node.js, 2) Framework, 3) Local modules

### Naming Conventions
- Variables/functions: `camelCase`
- Classes/Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ts` (React components: `PascalCase.tsx`)
- Database models: `PascalCase` (Prisma)
- API routes: kebab-case

### Code Organization
- One export per file for main functionality
- Group related functions/classes together
- Keep functions under 50 lines when possible
- Use TypeScript interfaces for all data structures
- Place types in separate `types/` directories

### Error Handling Patterns
```typescript
// API routes
try {
  const result = await someOperation()
  return NextResponse.json(result)
} catch (error) {
  console.error('Operation failed:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

// Frontend components
const [error, setError] = useState<string | null>(null)
const handleSubmit = async () => {
  try {
    await submitData()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred')
  }
}
```

### Testing Patterns
- Use `describe` blocks to group related tests
- Write descriptive test names (`should return 401 for unauthenticated users`)
- Mock external dependencies consistently
- Test happy path and edge cases
- Use proper TypeScript typing in tests

## Testing Patterns

To run a specific test file:
```bash
cd archive-management
npm run test app/api/search/__tests__/route.test.ts
```

For watch mode:
```bash
npm run test -- app/api/search/__tests__/route.test.ts --watch
```

For coverage:
```bash
npm run test -- --coverage
```