# User Service

User authentication and authorization service for the ecommerce platform.

## Features

- User registration and login
- JWT-based authentication
- Role-based access control (Customer, Admin)
- Password hashing with bcrypt
- Profile management
- Password change functionality
- Token validation for other services

## Tech Stack

- **Language**: Go 1.21
- **Framework**: Gin
- **Database**: PostgreSQL
- **Authentication**: JWT (golang-jwt/jwt/v5)
- **Password Hashing**: bcrypt
- **Logging**: Zap

## API Endpoints

### Public Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "customer",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Validate Token
```http
POST /api/v1/auth/validate
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Protected Endpoints (Requires JWT Token)

#### Get Profile
```http
GET /api/v1/users/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1234567890"
}
```

#### Change Password
```http
POST /api/v1/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 8084 |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_NAME | Database name | users_db |
| JWT_SECRET | JWT signing secret | your-secret-key-change-in-production |
| JWT_EXPIRY_HOURS | Token expiry in hours | 24 |
| ENVIRONMENT | Environment (development/production) | development |

## Database Schema

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## Running Locally

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=users_db
export JWT_SECRET=your-secret-key
export PORT=8084

# Run the service
go run cmd/server/main.go
```

## Running with Docker

```bash
docker build -t user-service .
docker run -p 8084:8084 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e JWT_SECRET=your-secret-key \
  user-service
```

## Architecture

```
user-service/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── auth/
│   │   ├── jwt.go           # JWT generation and validation
│   │   └── password.go      # Password hashing
│   ├── config/
│   │   └── config.go        # Configuration management
│   ├── database/
│   │   ├── db.go            # Database connection
│   │   └── user_repository.go # User data access
│   ├── handlers/
│   │   └── user_handler.go  # HTTP handlers
│   ├── middleware/
│   │   └── auth.go          # Authentication middleware
│   ├── models/
│   │   └── user.go          # User models
│   ├── routes/
│   │   └── routes.go        # Route setup
│   └── services/
│       └── user_service.go  # Business logic
├── Dockerfile
├── go.mod
└── README.md
```

## Security Features

- **Password Hashing**: bcrypt with cost factor 12
- **JWT**: Secure token generation with expiry
- **Role-Based Access Control**: Admin and Customer roles
- **Input Validation**: Email and password validation
- **CORS**: Configured for frontend origins
- **Graceful Shutdown**: Proper signal handling

## Integration with Other Services

Other services can validate JWT tokens by calling:
```http
POST /api/v1/auth/validate
```

Or by implementing JWT validation using the same secret key.

## Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "user-service"
}
```
