# Fitness Command Center - Platform Documentation

This directory houses the foundational system architecture, scope requirements, and master domain specifications for the **Fitness Command Center / SWEAT Platform**.

## Document Index

| Document | Format | Description |
| :--- | :--- | :--- |
| [`AI FITNESS-Scope.pdf`](./AI%20FITNESS-Scope.pdf) | PDF | Defines the functional scope, modules, business requirements, and operational flows across tenant administration, member management, coaching, and billing. |
| [`AI FITNESS-ARCHITECTURE-PLAN-.pdf`](./AI%20FITNESS-ARCHITECTURE-PLAN-.pdf) | PDF | Outlines the system architecture plan, multi-tenant database topology, backend domain boundaries, and API integration strategy. |
| [`AI_Fitness_Platform_Master_Architecture_NEW.pdf`](./AI_Fitness_Platform_Master_Architecture_NEW.pdf) | PDF | Comprehensive master architecture blueprint including frontend state hydration, enterprise RBAC/ABAC models, and microservice integration design. |

## Structure Overview

- **Frontend (SWEAT-FE)**: TanStack Start / React 19 / Vite single-page & SSR enterprise application.
- **Backend (SWEAT-BE)**: Django REST Framework multi-tenant API (`backend/`).
- **Dev Tooling**: Located in `scripts/` (cross-platform launch scripts).
