# Land Secure Backend 🏢🔒

## Overview
Land Secure is a robust backend application built with NestJS, designed to power a real estate platform that facilitates property management, virtual tours, geographic information system (GIS) integration, user notifications, and caching. The platform connects buyers, sellers, and administrators in a secure, scalable environment, leveraging Supabase for database management and Redis for performance optimization.

## Project Scope
- **Authentication** 🔐: Handles user registration, login, password reset, and JWT-based authentication with role-based access control (RBAC) for admin, seller, and buyer roles.
- **Users** 👥: Manages user profiles, including seller document verification (e.g., Ghana Card, selfie), soft deletion, and admin-controlled user management.
- **Properties** 🏘️: Manages property listings with CRUD operations, image uploads, and ownership tracking.
- **Tours** 🔎: Facilitates virtual property tours with scheduling, joining, and GIS-enhanced location data.
- **GIS** 🌍: Provides geospatial functionality for property location mapping and proximity searches.
- **Notifications** 📧: Sends email or in-app notifications for account updates, tour schedules, and property status changes.
- **Redis** ⚡: Implements caching for user sessions and property data to improve performance.

## Objectives
- Enable secure user management with role-specific permissions ✅
- Support a full property ecosystem for listings, tours, and ownership 🏠
- Provide interactive virtual tours with geospatial integration 🗺️
- Keep users informed via notifications 🔔
- Optimize performance with Redis caching 🚀
- Ensure scalability and data integrity with Supabase and RBAC 📊

## Current Status
- **Completed** ✅: `auth` and `user` modules are fully functional, with endpoints for login, profile updates, and admin operations tested successfully. An admin user (`admin@landsecure.com`) and a seller (`myclean.app@gmail.com`) are seeded and activated.
- **In Progress** ⏳: Development of `property`, `tour`, `gis`, `notification`, and `redis` modules is ongoing.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended) 📌
- npm or yarn 📦
- Supabase account and project setup 🗄️
- Redis server (local or remote) 🔄
- Gmail account for email notifications 📨

### Installation
1. **Clone the Repository** 📂
  ```bash
  git clone https://github.com/officialjwise/land-secure-backend.git
  cd land-secure-backend
  ```

2. **Install Dependencies** 🔧
  ```bash
  npm install
  ```

3. **Configure Environment Variables** ⚙️
  Create a `.env` file in the root directory with the following:
  ```
  SUPABASE_URL=https://<your-supabase-project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
  EMAIL_USER=<your-gmail-username>
  EMAIL_PASS=<your-gmail-app-password>
  JWT_SECRET=<your-jwt-secret>
  PORT=3000
  REDIS_URL=redis://localhost:6379
  ```
  - Obtain SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from your Supabase dashboard.
  - Use an App Password for Gmail if 2FA is enabled.

4. **Set Up Database** 🗃️
  - Create users and roles tables in Supabase as per the schema in seeds/admin.seeder.ts.
  - Run the admin seeder:
  ```bash
  npx ts-node src/seeds/admin.seeder.ts
  ```

5. **Run the Application** 🚀
  ```bash
  npm run start:dev
  ```
  The server will start on http://localhost:3000.

## Project Structure 📁
```
src/
  ├── auth/                  # Authentication module
  │   ├── dto/              # DTOs for auth
  │   ├── strategies/       # Passport strategies
  │   ├── auth.controller.ts
  │   ├── auth.module.ts
  │   └── auth.service.ts
  ├── common/               # Shared utilities
  ├── gis/                  # Geospatial module (in progress)
  ├── notification/         # Notification module (in progress)
  ├── property/             # Property module (in progress)
  │   ├── dto/             # DTOs for properties
  │   ├── entities/        # Entities for properties
  │   ├── property.controller.ts
  │   ├── property.module.ts
  │   └── property.service.ts
  ├── redis/                # Redis caching module (in progress)
  ├── seeds/                # Seeding scripts
  ├── tour/                 # Tour module (in progress)
  │   ├── dto/             # DTOs for tours
  │   ├── entities/        # Entities for tours
  │   ├── tour.controller.ts
  │   ├── tour.module.ts
  │   └── tour.service.ts
  ├── user/                 # User module
  │   ├── dto/             # DTOs for users
  │   ├── entities/        # Entities for users
  │   ├── roles.guard.ts   # RBAC guard
  │   ├── user.controller.ts
  │   ├── user.module.ts
  │   └── user.service.ts
  ├── app.controller.spec.ts
  ├── app.controller.ts
  ├── app.module.ts
  ├── app.service.ts
  └── main.ts
```

## API Endpoints 🛣️

### Authentication
- POST `/auth/login`: Authenticate and get JWT token 🔑
- POST `/auth/reset-password`: Reset password (via token) 🔄

### Users
- GET `/users/me`: Retrieve current user profile 👤
- PUT `/users/me`: Update current user profile (with optional documents for sellers) ✏️
- GET `/users`: List all users (admin only) 📋
- POST `/users`: Create a new user (admin only) ➕
- PUT `/users/:id`: Update user (admin only) 🔄
- DELETE `/users/:id`: Soft delete user (admin only) 🗑️
- PUT `/users/roles/permissions`: Update role permissions (admin only) 🛡️

## Development Roadmap 🗺️
1. **Property Module** 🏠: Implement CRUD for properties, image uploads, and ownership tracking.
2. **Tour Module** 🔍: Add tour scheduling, joining, and GIS integration.
3. **GIS Module** 🌐: Integrate location-based features (e.g., proximity search).
4. **Notification Module** 📱: Enable email and in-app notifications.
5. **Redis Module** ⚡: Configure caching for performance.
6. **Testing** 🧪: Add unit and integration tests.
7. **Deployment** 🚀: Set up CI/CD and hosting (e.g., Heroku, Vercel).

## Contributing 👥
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/new-feature`).
3. Commit changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a Pull Request.

## License 📄
This project is licensed under the MIT License - see the LICENSE file for details.

## Contact 📞
For support or contributions, contact the project maintainer at officialjwise20@gmail.com.

## Acknowledgments 🙏
- Built with NestJS 🔷
- Database powered by Supabase 🗄️
- Caching with Redis 🚀
## Developed By
This project is developed and maintained by Officialjwise.

## Contact 📞
For support or contributions, contact the project maintainer at officialjwise20@gmail.com.