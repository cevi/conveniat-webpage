Please adhere to the following architectural principles, coding conventions, and best practices. Your main goal is to
help me write clean, maintainable, and consistent code that aligns with our established patterns.

## Our tech stack is:

- Framework: Next.js 16 (App Router + Cache Components) Hint: Next.js 16 has renamed middleware.ts to proxy.ts, Next.js 16 has also introduced the 'use cache' directive for cache components; we are using the 'use cache' directive for cache components.
- Language: TypeScript
- CMS: Payload CMS
- UI: React, Tailwind CSS, shadcn/ui, Headless UI
- Icons: lucide-react
- i18n: next-i18n-router

## Project Architecture

Our codebase follows a strict feature-based modular architecture to ensure scalability and separation of concerns.
Please respect these boundaries when suggesting code or refactoring.

### Feature-Based Modularity

- Most application logic resides within the src/features directory.
- Each subdirectory in src/features represents a distinct feature (e.g., chat, map, payload-cms).
- Encapsulation: Code within a feature folder should primarily relate to that specific feature.
- Structure within Features: A feature can internally have its own components, hooks, api, types, and utils
  subdirectories, scoped to that feature.
- Import Restrictions: ESLint rules (import/no-restricted-paths in eslint.config.mjs) enforce unidirectional
  dependencies:
  - app can import from features and shared directories (components, hooks, etc.).
  - features cannot import from app or shared directories.
  - Features generally should not import directly from other features. Exceptions are explicitly defined (e.g.,
    payload-cms can be imported more broadly).
  - Shared directories (components, hooks, lib, types, utils) should not import from app or features.
- Payload CMS Exception: The payload-cms feature is central and can be imported by other parts of the application as it
  defines the core data structures used throughout the app.

## Core Coding Conventions

These are strict rules. Please enforce them in all code suggestions and reviews.

- follow standard naming conventions:
  - Use camelCase for variables, functions, and methods.
  - Use PascalCase for React components and TypeScript interfaces.
  - Use UPPER_SNAKE_CASE for constants.
- include JSDoc for all public classes and methods
- follow clean code principles:
  - Keep functions small and focused on a single task.
  - Avoid deeply nested code; use early returns to simplify logic.
  - Use descriptive names for variables, functions, and components.
- use TypeScript for all code:
  - Use type annotations for function parameters and return types.
  - Use interfaces for complex data structures.
  - Avoid using any type; prefer unknown or specific types.
- For all code, follow these additional conventions:
  - use ES6+ syntax and the built-in `fetch` for HTTP requests
  - always use `import` statements, never use `require`
  - use logger.log() for output, not console.log()

### Styling with Tailwind CSS & cn()

All styling must be done with Tailwind CSS. For conditional or combined classes, always use the cn() utility from
lib/utils (the one installed by shadcn/ui). Do not use string concatenation or template literals.

#### ✅ Do:

```tsx
import { cn } from '@/lib/utils';

const someCondition = true;

<div className={cn('bg-background p-4', { 'rounded-md': someCondition })} />;
```

#### ❌ Don't:

```tsx
// Avoid this!
<div className={`bg-background p-4 ${someCondition ? 'rounded-md' : ''}`} />
```

### Icons: lucide-react Only

We exclusively use icons from the lucide-react library. Do not suggest or import icons from any other library (e.g.,
Heroicons, Font Awesome).

#### ✅ Do:

```tsx
import { Search } from 'lucide-react';

// ...
<Search className="h-4 w-4" />;
```

### Logic: Use Custom Hooks over Inline useEffect

To promote reusability and separation of concerns, extract component logic into custom hooks whenever possible,
especially when dealing with useEffect.

#### ✅ Do (Custom Hook):

```tsx
// src/features/some-feature/hooks/use-feature-data.ts
export function useFeatureData(id: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // ... fetch logic for the feature ...
    fetchData(id).then(setData);
  }, [id]);

  return data;
}

// src/features/some-feature/components/my-component.tsx
const data = useFeatureData(props.id);
```

#### ❌ Don't (Inline Effect):

```tsx
// Avoid this inside a component file
useEffect(() => {
  // ... fetch logic for the feature ...
  fetchData(props.id).then(setData);
}, [props.id]);
```

### TypeScript: import type for React

When typing React components or other types, use a type-only import to keep our bundle clean.

#### ✅ Do:

```tsx
import type React from 'react';

interface MyComponentProps {
  // ...
}

export const MyComponent: React.FC<MyComponentProps> = (
  {
    /* ... */
  },
) => {
  // ...
};
```

#### ❌ Don't:

```tsx
import React from 'react'; // Avoid this for type usage

export const MyComponent: React.FC<MyComponentProps> = (
  {
    /* ... */
  },
) => {
  // ...
};
```

### Internationalization (i18n)

All hardcoded user-facing strings are forbidden. Use the following patterns for static translations.

1. Define a StaticTranslationString object.

```tsx
// Define this object near the component that uses it or in a shared types file.
import type { StaticTranslationString } from '@/types/i18n';

const searchButtonText: StaticTranslationString = {
  de: 'Suchen',
  en: 'Search',
  fr: 'Chercher',
};
```

2. Access the current locale. The method depends on the component type:

Client Components ('use client'):

```tsx
import { useCurrentLocale } from 'next-i18n-router/client';
import { i18nConfig } from 'i18n.config.mjs'; // Your i18n config file

const locale = useCurrentLocale(i18nConfig);
const buttonText = searchButtonText[locale];
```

Server Components:

```tsx
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';

const locale = await getLocaleFromCookies();
const buttonText = searchButtonText[locale];
```

## tRPC

We exclusively use tRPC to fetch date from client components. For mutations, we prefer tRPC over Server Actions
unless the mutation is every simple and not part of a larger workflow which includes subsequent data fetching.

- Example which is a valid use case for Server Actions: a simple form submission of the contact form.
- Example which is not a valid use case for Server Actions: send a chat message, where we prefer to use tRPC mutations.

### Naming Conventions for tRPC Mutations and Queries

- Use camelCase for all tRPC query and mutation names.
- For queries, use the format `get[[Feature]][Data]` (e.g., `getContacts`, `getChatMessages`). Fetches by uuid.
- For mutations, use the format `update[[Feature]][Data]`, `create[[Feature]][Data]`, or `delete[[Feature]][Data]` (
  e.g.,
  `updateUser`, `createChatMessage`, `deleteChatMessage`).
- For queries that fetch lists, use the format `get[[Feature][Data]List` (e.g., `getChatPreviewsList`, `getUserList`).
- Special actions that do not fit the above patterns should be named descriptively, using a verb that describes the
  action followed by the feature name (e.g., `archiveChat`, `markChatAsRead`).

## React & Next.js 15 Best Practices

Follow these guidelines for writing modern, high-quality code.

- Server Components by Default: Keep components as Server Components whenever possible. Only add the 'use client'
  directive if you need interactivity, state, or browser-only APIs (useState, useEffect, event listeners).

- Component Composition: Prefer passing components as props (using children or other named props) over prop drilling.
  This is a powerful pattern for building flexible and reusable UIs.

- Data Fetching:
  - Fetch data directly in Server Components using async/await.
  - Use Server Actions for data mutations (POST, PUT, DELETE) to avoid creating API route handlers for simple form
    submissions. For complex operations we use react-query paired with Server Actions.

- Keep Components Small: A component should have a single responsibility. If it gets too large or complex, break it down
  into smaller components.

- Clear Prop Naming: Use descriptive and unambiguous names for props. Avoid generic names like data or item if a more
  specific name like user or product is available.
