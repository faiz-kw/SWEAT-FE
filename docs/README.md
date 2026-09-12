# Fitness Command Center - Platform Documentation

This directory houses the foundational system architecture, scope requirements, and master domain specifications for the **Fitness Command Center / SWEAT Platform**.

## Document Index

### System Architecture
| Document | Format | Path | Description |
| :--- | :--- | :--- | :--- |
| [`AI FITNESS-ARCHITECTURE-PLAN-.pdf`](./architecture/AI%20FITNESS-ARCHITECTURE-PLAN-.pdf) | PDF | `docs/architecture/` | Outlines the system architecture plan, multi-tenant database topology, backend domain boundaries, and API integration strategy. |
| [`AI_Fitness_Platform_Master_Architecture_NEW.pdf`](./architecture/AI_Fitness_Platform_Master_Architecture_NEW.pdf) | PDF | `docs/architecture/` | Comprehensive master architecture blueprint including frontend state hydration, enterprise RBAC/ABAC models, and microservice integration design. |

### Database & Schema Specifications
| Document | Format | Path | Description |
| :--- | :--- | :--- | :--- |
| [`schema_extracted.txt`](./database/schema_extracted.txt) | Plain Text | `docs/database/` | Textual schema definition and field inventory extracted from the canonical Phase 1 Layer 1 database design. |

### Phase Specifications & Scope
| Document | Format | Path | Description |
| :--- | :--- | :--- | :--- |
| [`Phase_1_Layer_1_Final_Schema_Design.docx`](./phases/Phase_1_Layer_1_Final_Schema_Design.docx) | Word Document | `docs/phases/` | Canonical Phase 1 Layer 1 foundational schema design document. |
| [`AI FITNESS-Scope.pdf`](./phases/AI%20FITNESS-Scope.pdf) | PDF | `docs/phases/` | Defines functional scope, modules, business requirements, and operational flows across tenant administration, member management, coaching, and billing. |

## Structure Overview

- **Frontend (SWEAT-FE)**: TanStack Start / React 19 / Vite single-page & SSR enterprise application (`src/`).
- **Backend (SWEAT-BE)**: Django REST Framework multi-tenant API (`backend/`).
- **Documentation**: Centralized architecture and database specifications (`docs/`).
- **Dev Tooling**: Located in `scripts/` (cross-platform launch scripts).
