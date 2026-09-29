# Contributing to PPR Frontend

Thank you for your interest in contributing to the PPR (Programa de Participación Regional) Frontend! This project is part of the [LACNet](https://lacnet.com/) ecosystem and we welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Security Vulnerabilities](#security-vulnerabilities)
- [License](#license)

## Code of Conduct

This project adheres to the [LACNet Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@lacnet.com](mailto:conduct@lacnet.com).

## Getting Started

1. **Fork the repository** on GitLab
2. **Clone your fork** locally:
   ```bash
   git clone https://gitlab.com/your-username/ppr-frontend-next.git
   cd ppr-frontend-next
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://gitlab.com/lacnet/ppr-frontend-next.git
   ```

## Development Setup

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Access to PPR Backend API
- Keycloak server (for authentication)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your .env.local file

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

> **About configuration.** Every variable is read through [`src/lib/config.ts`](./src/lib/config.ts) (and
> `config.server.ts` for server-only access). Do not add `process.env` access in other files. `.env.example`
> documents all keys.
>
> The browser does not read `.env`: it gets its values from `public/env.js`, which the pipeline generates on each
> deploy. Locally that file has to be maintained by hand. See [`docs/architecture.md`](./docs/architecture.md).

### Building for Production

```bash
npm run build
npm run start
```

## How to Contribute

### Types of Contributions

We welcome the following types of contributions:

- 🐛 **Bug fixes** - Help us squash bugs
- ✨ **New features** - Propose and implement new functionality
- 📚 **Documentation** - Improve or add documentation
- 🧪 **Tests** - Add missing tests or improve existing ones
- 🎨 **UI/UX improvements** - Enhance the user experience
- ♿ **Accessibility** - Improve accessibility (WCAG compliance)
- 🌐 **Translations** - Help translate the project

### Before You Start

1. **Check existing issues** to avoid duplicating work
2. **Open an issue** to discuss major UI/UX changes before implementing
3. **Follow the coding standards** outlined below

## Pull Request Process

### 1. Create a Feature Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, maintainable code
- Test your changes in different browsers
- Ensure accessibility requirements are met
- Update documentation if required

### 3. Commit Your Changes

Follow our [commit message guidelines](#commit-message-guidelines).

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create a Merge Request (MR) on GitLab targeting the `develop` branch.

### 5. PR Requirements

- [ ] All CI/CD checks pass
- [ ] Code follows project coding standards
- [ ] No console errors or warnings
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Documentation is updated if needed
- [ ] At least one maintainer approval

## Coding Standards

### TypeScript Style

- Use **TypeScript strict mode**
- Use **Prettier** for formatting (`prettier.config.mjs`)

> **Nota:** el proyecto todavía no tiene configuración de ESLint, por lo que `npm run lint` no es ejecutable. Ver
> [`docs/auditoria-2026-09-22.md`](./docs/auditoria-2026-09-22.md).

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Protected routes
│   │   ├── sponsor/        # Sponsor dashboard
│   │   ├── provider/       # Provider dashboard
│   │   ├── user/           # User dashboard
│   │   └── verifier/       # Verifier dashboard
│   └── (auth)/             # Auth routes
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and API services
└── types/                  # TypeScript types
```

### Component Guidelines

1. **One component per file** - Keep components focused
2. **Use TypeScript interfaces** - Define props explicitly
3. **Prefer functional components** - Use hooks for state
4. **Keep components small** - Extract when >200 lines
5. **Use Headless UI** - For accessible primitives

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectCard.tsx` |
| Files | kebab-case | `project-card.tsx` |
| Hooks | camelCase with `use` prefix | `useFetchProjects` |
| Types | PascalCase | `Project`, `ApiProject` |
| Constants | SCREAMING_SNAKE | `MAX_ITEMS` |

### Styling Guidelines

- Use **Tailwind CSS** for styling
- Follow the **design system** tokens when available
- Use **clsx** for conditional classes
- Keep styles **co-located** with components

### Accessibility (A11y)

All contributions must maintain accessibility:

- Use semantic HTML elements
- Include proper `aria-*` attributes
- Ensure keyboard navigation works
- Maintain color contrast ratios (WCAG AA)
- Test with screen readers when possible

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `test` | Adding/updating tests |
| `chore` | Build, config, etc. |
| `perf` | Performance improvement |
| `a11y` | Accessibility improvement |

### Examples

```bash
feat(dashboard): add project statistics chart

fix(modal): resolve focus trap issue on close

docs(readme): update environment variables section

a11y(button): add proper aria-label for icon buttons
```

## Issue Guidelines

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots or recordings if applicable

### Feature Requests

Include:
- Problem description
- Proposed solution with mockups if possible
- Alternative solutions considered
- Accessibility considerations

### Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `feature` | New feature request |
| `enhancement` | Improvement to existing feature |
| `a11y` | Accessibility issue |
| `ui/ux` | Design-related issue |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |

## Security Vulnerabilities

**Do not open public issues for security vulnerabilities.**

Please report security issues directly to [security@lacnet.com](mailto:security@lacnet.com) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project. See the [LICENSE](./LICENSE.md) file for details.

---

## Questions?

If you have questions about contributing, please:
- Open a discussion in the repository
- Contact the maintainers at [ppr@lacnet.com](mailto:ppr@lacnet.com)
- Join the LACNet community channels

Thank you for contributing to PPR! 🎉
