# HabitHero Teacher Portal

A web application for teachers to manage courses, modules, exercises, and track student progress in a gamified education platform.

## Tech Stack

- **React 18** with TypeScript
- **React Router** for navigation
- **Vite** for build tooling
- CSS modules for styling

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

- **Authentication**: Teacher login and registration
- **Dashboard**: Overview of course statistics and recent activity
- **Modules Management**: Create, edit, and manage course modules
- **Exercises Management**: Create and edit exercises within modules
- **Student Progress**: View student progress with filtering and sorting
- **Student Details**: Detailed view of individual student progress
- **Profile & Settings**: Manage teacher profile and course settings

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # React Router configuration
├── context/        # React Context for state management
├── data/           # Mock data
├── types/          # TypeScript type definitions
└── theme/          # Theme constants (colors, spacing, typography)
```

## Mock Data

The app currently uses in-memory mock data. All CRUD operations update local state. The code is structured to easily replace mock data with API calls to a backend service.
