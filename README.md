# PPR Frontend

A modern Next.js 15 frontend for the PPR (Programa de Participación Regional) platform, providing role-based dashboards for project funding management, evidence tracking, and contribution monitoring.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.x | React framework (App Router) |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Styling |
| **Keycloak JS** | 26.x | Authentication |
| **Recharts** | 3.x | Data visualization |
| **Motion** | 12.x | Animations |
| **Headless UI** | 2.x | Accessible UI primitives |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Protected routes
│   │   ├── sponsor/        # Sponsor dashboard
│   │   ├── provider/       # Provider dashboard
│   │   ├── user/           # User dashboard
│   │   └── verifier/       # Verifier dashboard
│   └── (auth)/             # Auth routes (login, register)
├── components/             # Reusable UI components
│   ├── grids/              # Grid layouts
│   ├── tables/             # Data tables
│   ├── dashboards/         # Dashboard components
│   ├── sidebars/           # Navigation sidebars
│   └── ...                 # Modals, forms, etc.
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and API services
└── types/                  # TypeScript types
```

### Key Components

| Component | Description |
|-----------|-------------|
| `sidebar.tsx` | Role-based navigation sidebar |
| `projects-table.tsx` | Project listing and management |
| `contribution-modal.tsx` | Contribution entry |
| `evidence-detail-modal.tsx` | Evidence viewing |
| `audit-modal.tsx` | Verification workflows |
| `keycloak-provider.tsx` | Auth context provider |

## User Roles

| Role | Dashboard | Capabilities |
|------|-----------|--------------|
| **Sponsor** | `/sponsor` | Create projects, manage funding, add collaborators |
| **Provider** | `/provider` | Deliver services, upload evidence, track phases |
| **User** | `/user` | View projects, track benefits |
| **Verifier** | `/verifier` | Audit evidence, approve phases |

## Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later
- Access to the PPR Backend API
- Keycloak server for authentication

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API & Auth

- API base URL: `src/lib/api-config.ts`
- Keycloak config: `src/lib/keycloak.ts`

### 3. Run development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Build for production

```bash
npm run build
npm run start
```

## Configuration Notes

- The runtime reads API and Keycloak config from `src/lib/api-config.ts` and `src/lib/keycloak.ts`.

### Variables de entorno (`env.js`)

La aplicación **no usa `.env` directamente en runtime**. En su lugar, utiliza el archivo `public/env.js`, que expone las variables en `window.__ENV`.

**En el pipeline (CI/CD):**
- El pipeline genera automáticamente `public/env.js` a partir de las variables definidas en Cloud Run.
- El archivo `.env` se mantiene en el repositorio como referencia de las variables necesarias y es utilizado por el pipeline para la generación de `env.js` usado en la **promoción de imágenes** entre los ambientes (`develop`, `staging`, `main`).

**En local (desarrollo):**
- Como no hay pipeline, `public/env.js` debe crearse **manualmente**.
- Los valores se obtienen del archivo `.env.local` y se escriben en `public/env.js` con el formato:

```js
window.__ENV = {
  API_URL: '<valor de NEXT_PUBLIC_API_URL del .env.local>',
  KEYCLOAK_URL: '<valor de NEXT_PUBLIC_KEYCLOAK_URL del .env.local>',
  KEYCLOAK_REALM: '<valor de NEXT_PUBLIC_KEYCLOAK_REALM del .env.local>',
  KEYCLOAK_CLIENT_ID: '<valor de NEXT_PUBLIC_KEYCLOAK_CLIENT_ID del .env.local>',
  INSTANCE_NAME: '<valor de NEXT_PUBLIC_INSTANCE_NAME del .env.local>',
  WEBSITE_TITLE: '<valor de NEXT_PUBLIC_WEBSITE_TITLE del .env.local>',
  SIDEBAR_LOGO: '<valor de NEXT_PUBLIC_SIDEBAR_LOGO del .env.local>',
  SHOW_IMPORT_EVIDENCE: '<valor de NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE del .env.local>',
}
```

> **Nota:** hoy `public/env.js` **está versionado** en el repositorio, apuntando al entorno de desarrollo, pese a que
> el pipeline lo regenera en despliegue. Si ese paso falla, la imagen queda sirviendo la configuración de dev. Ver
> [`docs/auditoria-2026-09-22.md`](./docs/auditoria-2026-09-22.md).

## Docker

> **Importante:** `npm run build` requiere las variables `NEXT_PUBLIC_*` presentes en tiempo de compilación, porque
> `src/lib/app-config.ts` las lee desde `process.env` al prerenderizar `/forgot-password` y `/register`. El
> `Dockerfile` no declara ningún `ARG`/`ENV`, así que el comando de abajo falla en un checkout limpio hasta que se
> inyecten. Detalle y arreglo propuesto en [`docs/auditoria-2026-09-22.md`](./docs/auditoria-2026-09-22.md).

### Build and run

```bash
# Build image
docker build -t ppr-frontend .

# Run container
docker run -p 8080:8080 ppr-frontend
```

The production container runs on port 8080.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## API Integration

The frontend connects to the backend using:

- **`src/lib/api-client.ts`**: Fetch-based HTTP client with auth for client components
- **`src/lib/api-services.ts`**: React hooks for API operations (client-side)
- **`src/lib/api-services-server.ts`**: Server-side API calls (auth from cookies)
- **`src/lib/api-mappers.ts`**: Shared API-to-domain transform functions

### Example Usage

```tsx
import { useFetchProjects, useCreateProject } from '@/lib/api-services'

function ProjectsList() {
  const fetchProjects = useFetchProjects()
  const createProject = useCreateProject()

  useEffect(() => {
    fetchProjects().then(setProjects)
  }, [])

  const handleCreate = async (data) => {
    await createProject(data)
  }
}
```

## Keycloak Login Theme

A custom Keycloak login theme is included in `keycloak-login-theme/`. Deploy to your Keycloak server's `themes/` directory.

## Keycloak Setup

The frontend requires a Keycloak server for authentication. The frontend uses `keycloak-js` and `@react-keycloak/web` for client-side authentication.

### Realm Configuration

Use the same `ppr-realm` as the backend. Ensure the following are configured:

1. **Realm name**: `ppr-realm`
2. **Login settings**: Configure as needed (registration, password policies, etc.)

### Frontend Client Configuration

Create a **public** client for the frontend (separate from the backend client):

| Setting | Value |
|---------|-------|
| **Client ID** | `ppr-frontend` |
| **Client Protocol** | `openid-connect` |
| **Access Type** | `public` (no client secret) |
| **Standard Flow Enabled** | `ON` |
| **Direct Access Grants** | `OFF` |
| **Implicit Flow Enabled** | `OFF` |

### Valid Redirect URIs

```
http://localhost:5173/*
https://ppr-frontend-next.l-net.io/*
https://dev-ppr-frontend-next.l-net.io/*
```

### Web Origins

Configure CORS for the frontend:

```
http://localhost:5173
https://ppr-frontend-next.l-net.io
https://dev-ppr-frontend-next.l-net.io
```

### Roles

The same realm roles apply:

| Role | Dashboard Route |
|------|-----------------|
| `sponsor` | `/sponsor` |
| `provider` | `/provider` |
| `user` | `/user` |
| `verifier` | `/verifier` |

Users should be assigned one role that determines their dashboard access.

### Authentication Flow

1. User navigates to the app
2. `KeycloakProvider` initializes and checks for existing session
3. If not authenticated, user is redirected to Keycloak login
4. After login, Keycloak redirects back with tokens
5. Frontend stores tokens and includes them in API requests (client + server)

### Custom Login Theme

To use the custom theme:

1. Copy `keycloak-login-theme/` to `<KEYCLOAK_HOME>/themes/ppr-theme`
2. In Keycloak Admin Console, go to **Realm Settings** → **Themes**
3. Set **Login Theme** to `ppr-theme`
