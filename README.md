# Corporate Tracking System 🚀

**Solución integral para el seguimiento de indicadores corporativos y gestión avanzada de cotizaciones.**

Este proyecto es una plataforma robusta diseñada para centralizar el monitoreo de KPIs, asegurar el cumplimiento de procesos y proporcionar visibilidad en tiempo real sobre la interacción de clientes con propuestas comerciales.

---

## 📋 Tabla de Contenidos

- [1. Propósito y Problema solved](#-propósito-y-problema-resuelto)
- [2. Tabla de Contenidos](#-tabla-de-contenidos)
- [3. Características Principales](#-características-principales)
- [4. Arquitectura](#-arquitectura)
- [5. Estructura de Carpetas](#-estructura-de-carpetas)
- [6. Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [7. Requisitos Previos](#-requisitos-previos)
- [8. Instalación](#-instalación)
- [9. Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
- [10. Uso del Proyecto](#-uso-del-proyecto)
- [11. Endpoints Documentados](#-endpoints-documentados)
- [12. Testing](#-testing)
- [13. Deployment](#-deployment)
- [14. Buenas Prácticas Implementadas](#-buenas-prácticas-implementadas)
- [15. Contribución](#-contribución)
- [16. Licencia](#-licencia)

---

## 🎯 Propósito y Problema Resuelto

En entornos empresariales, la dispersión de datos de rendimiento y la falta de seguimiento sobre las propuestas comerciales generan ineficiencias. **Corporate Tracking System** resuelve esto mediante:
- **Centralización de KPIs**: Un único punto de verdad para los indicadores de proceso.
- **Tracking Activo**: Notificación en tiempo real (vía Webhooks) cuando un cliente interactúa con una cotización.
- **Gobernanza de Datos**: Control granular de acceso basado en roles (RBAC) para proteger información sensible.

---

## ✨ Características Principales

- **Dashboard de Rendimiento**: Visualizaciones dinámicas de cumplimiento histórico y métricas clave.
- **Gestión de Cotizaciones**: Sistema de carga de archivos (PDF) con generación de enlaces únicos de seguimiento.
- **Autenticación Segura**: Sistema de login con bloqueo preventivo tras intentos fallidos y gestión de sesiones mediante JWT.
- **Notificaciones Real-time**: Registro de IP, User-Agent y alertas inmediatas al abrir documentos.
- **Visualización Avanzada**: Gráficos interactivos 3D y componentes de alto impacto visual.

---

## 🏗️ Arquitectura

El proyecto adopta una arquitectura de **Monorepo Modular**:
- **Backend (NestJS)**: Sigue patrones de inyección de dependencias y modularidad por dominio. Utiliza guardias (Guards) para el control de acceso y servicios especializados para la lógica de negocio.
- **Frontend (React 19)**: Arquitectura basada en componentes funcionales, hooks personalizados para la gestión de estado y un sistema de servicios centralizado para la comunicación con la API.
- **Persistencia**: Integración nativa con **Supabase** para base de datos PostgreSQL, almacenamiento de archivos y autenticación.

---

## 📂 Estructura de Carpetas

```text
tracking-main/
├── apinpx/                # 🔙 Backend API (NestJS)
│   ├── src/
│   │   ├── auth/          # Seguridad: JWT, Passport, RBAC (vRules/Guards)
│   │   ├── cotizaciones/  # Núcleo: Tracking de PDFs, Webhooks, Almacenamiento
│   │   ├── database/      # Integración: Proveedores de Supabase/DB
│   │   └── tracking/      # Servicios: Lógica de indicadores y métricas
│   └── test/              # Pruebas: Unitarias (Jest) y E2E
├── frontend/              # 💻 Frontend Web App (React + Vite)
│   ├── src/
│   │   ├── components/    # UI: Componentes compartidos y Layouts
│   │   ├── pages/         # Vistas: Dashboard, Reportes, Panel Admin
│   │   ├── services/      # API: Cliente Axios e Interceptores de JWT
│   │   └── hooks/         # Lógica: Custom hooks para estado global
└── README.md              # Documentación raíz
```

---

## 🛠️ Tecnologías Utilizadas

### Backend (Core API)
- **Runtime**: Node.js 20+
- **Framework**: NestJS (TypeScript)
- **Seguridad**: Passport.js, JWT, Bcrypt
- **Manejo de Archivos**: Multer

### Frontend (User Interface)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Gráficos**: Recharts, Three.js, React Three Fiber
- **Navegación**: React Router 7

### Infraestructura & DevOps
- **Base de Datos**: PostgreSQL (Supabase)
- **Storage**: Supabase Buckets (avatars, cotizaciones)
- **Autenticación**: Supabase Auth
- **Entorno**: Docker ready

---

## ⚓ Requisitos Previos

- **Node.js**: v20.10.0 o superior (LTS recomendada).
- **npm**: v10.x o superior.
- **Supabase Project**: Acceso a un proyecto activo en Supabase.

---

## 🚀 Instalación

1. **Clonar Repositorio**:
   ```bash
   git clone https://github.com/JoseDarkx/tracking.git
   cd tracking-main
   ```

2. **Backend**:
   ```bash
   cd apinpx
   npm install
   ```

3. **Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

---

## ⚙️ Configuración de Variables de Entorno

Debe configurar los archivos `.env` en cada módulo (use los `.env.example` como referencia).

### `apinpx/.env`
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_anon_key
JWT_SECRET=your_complex_jwt_secret
```

### `frontend/.env`
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
```

---

## 🖥️ Uso del Proyecto

### Desarrollo
Para iniciar ambos servicios simultáneamente, se recomienda abrir dos terminales:

**Terminal 1 (Backend):**
```bash
cd apinpx
npm run start:dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## � Endpoints Documentados

| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Autenticación y retorno de JWT | Público |
| `POST` | `/cotizaciones/crear` | Carga de PDF y generación de slug | Autenticado |
| `GET` | `/cotizaciones/:slug` | Tracking de apertura y redirección | Público |
| `GET` | `/tracking/metrics` | Obtención de métricas para Dashboard | Admin/Líder |

---

## 🧪 Testing

El proyecto utiliza **Jest** para garantizar la integridad del código.

```bash
# Correr pruebas unitarias (Backend)
cd apinpx
npm run test

# Pruebas con cobertura
npm run test:cov
```

---

## � Deployment

### Producción (Backend)
Compila el proyecto a JavaScript nativo:
```bash
npm run build
npm run start:prod
```

### Docker
El backend puede ser dockerizado fácilmente (Dockerfile incluido en planes de despliegue).
```bash
docker build -t tracking-api .
```

---

## 🛡️ Buenas Prácticas Implementadas

- **SOLID Principles**: Código desacoplado y orientado a interfaces.
- **Seguridad**: Interceptores de tokens, sanitización de entradas y bloqueo de fuerza bruta en Auth.
- **Optimización**: Fast Refresh con Vite y compilación eficiente en NestJS.
- **UX/UI**: Retroalimentación inmediata mediante `react-hot-toast` y layouts responsive.

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, asegúrese de:
1. Abrir un Issue para discutir cambios mayores.
2. Seguir el estándar de commits convencionales.
3. Asegurar que los tests pasen antes de enviar un PR.

---

## 📄 Licencia

Este proyecto es propiedad privada de surcompany s.a.s. Uso bajo los términos de la licencia especificada en el archivo `package.json`.

---

