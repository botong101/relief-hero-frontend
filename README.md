# Frontend Setup Instructions

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment (optional)**
   Edit `src/environments/environment.ts` if needed

3. **Start development server**
   ```bash
   npm start
   # or
   ng serve
   ```

   Open browser to `http://localhost:4200`

## Build for Production

```bash
npm run build
# or
ng build --configuration production
```

Output will be in `dist/` folder.

## Project Structure

```
src/
├── app/
│   ├── core/           # Core services, guards, interceptors
│   │   ├── guards/     # Auth and role guards
│   │   ├── interceptors/ # HTTP interceptors
│   │   ├── models/     # Data models and interfaces
│   │   └── services/   # API services
│   ├── features/       # Feature modules
│   │   ├── auth/       # Login, register components
│   │   ├── dashboard/  # Dashboard component
│   │   ├── donations/  # Donation management
│   │   └── map/        # Location tracking map
│   ├── shared/         # Shared components
│   │   └── components/ # Reusable components
│   └── app.component.ts
├── assets/             # Static assets
├── environments/       # Environment configurations
└── styles.css         # Global styles
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run watch` - Build in watch mode

## User Roles

### Donator
- Can create donations
- View and manage their donations
- Assign recipients

### Affected
- View donations
- Share location
- Create emergency requests

## Components

### Auth Components
- **Login** - User login
- **Register** - User registration with role selection

### Dashboard
- Overview of donations
- Quick statistics
- Recent activities

### Donations
- **List** - View all donations with filters
- **Detail** - View donation details and tracking
- **Form** - Create new donation

### Map
- Interactive map with Leaflet
- Real-time location tracking
- Location sharing for affected users

## Routing

- `/login` - Login page (public)
- `/register` - Registration page (public)
- `/dashboard` - Dashboard (protected)
- `/donations` - Donations list (protected)
- `/donations/create` - Create donation (donator only)
- `/donations/:id` - Donation details (protected)
- `/map` - Location tracking map (protected)
