# 0001. Frontend Architecture and UI System

## Context
The HRMS system requires a high-fidelity, responsive client dashboard for university presentation and enterprise use. The client must interface with a distributed microservices backend (Auth, Operations, Reporting, and CRON) through an API Gateway, while maintaining a clean, modern aesthetic matching our design benchmark (Dribbble shot `27189909-HRMS-Dashboard-Clean-Insightful-Action-Driven`).

## Decision
We decided to build the frontend as a React 18 Single Page Application (SPA) using Vite, TypeScript, and Tailwind CSS. The interface adopts a soft ambient glassmorphism layout (pale gradient background, translucent rounded cards, left primary navigation, and right utility bar). Instead of relying on unstyled or default UI kits, individual complex components (e.g. animated calendar, metric widgets, notification drawers) will be custom-styled or sourced from curated component ecosystems (such as 21st.dev).

## Consequences
- **High visual polish**: Directly matches the Dribbble reference with custom rounded cards, ambient lighting, and high-contrast typography.
- **Strict type alignment**: TypeScript definitions will strictly mirror Spring Boot Java backend DTOs.
- **Component flexibility**: Sourcing components from 21st.dev gives access to modern micro-interactions while retaining full control over code and styling.
