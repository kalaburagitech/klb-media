# KLB Media Service

A production-ready media storage and delivery platform built with Fastify and Next.js.

## 🚀 Features

- **JWT Authentication**: Secure login and signup with refresh tokens.
- **API Key Support**: Upload and manage media programmatically.
- **S3 Integration**: Seamless file storage on any S3-compatible platform.
- **Modern Dashboard**: Responsive UI with drag-and-drop uploads and media library.
- **Swagger Documentation**: Interactive API docs at `/docs`.
- **Clean Architecture**: Organized codebase with clear separation of concerns.

## 🛠️ Tech Stack

- **Backend**: Node.js, Fastify, PostgreSQL, @aws-sdk/client-s3, Zod.
- **Frontend**: Next.js 14, Tailwind CSS 4, Framer Motion, Lucide Icons.
- **Database**: PostgreSQL (Prisma-ready, but using raw PG for performance).

## 📦 Getting Started

### 1. Database Setup
Ensure you have a PostgreSQL instance running. Create a database named `klb_media`.

### 2. Backend Configuration
Navigate to the `backend` folder and create a `.env` file based on `.env.example`:
```bash
cd backend
cp .env.example .env
# Update the variables in .env
npm install
npm run dev
```

### 3. Frontend Configuration
Navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
npm run dev
```

## 🔐 API Reference

### Auth
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Authenticate and get JWT

### Media
- `POST /api/upload` - Upload file (multipart/form-data)
- `GET /api/media` - List all media with pagination
- `DELETE /api/media/:id` - Delete a media file
- `GET /api/media/stats` - Get storage usage stats

## 📘 Documentation
Interactive Swagger UI is available at `http://localhost:5000/docs` when the backend is running.
