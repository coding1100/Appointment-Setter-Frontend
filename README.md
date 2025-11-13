# AI Appointment Setter Frontend

A React-based SaaS platform for managing AI-powered voice agents that handle appointment scheduling for service-based businesses. The application enables businesses to create and manage voice agents, integrate with Twilio for phone calls, and handle appointment scheduling 24/7.

## Overview

AI Appointment Setter is designed to help service businesses (primarily plumbing services) automate their appointment booking process. The platform provides:

- **24/7 Availability**: AI agents answer calls at any time, including after-hours emergencies
- **Intelligent Triage**: Automatically classifies urgency and routes calls appropriately
- **Automated Scheduling**: Books appointments directly into calendar systems
- **Multi-tenant Support**: Manage multiple businesses from a single account
- **Voice Agent Testing**: Test agents using LiveKit (browser-based) or Twilio (real phone calls)

## Technology Stack

- **React 18.2.0** - UI framework
- **React Router DOM 6.8.1** - Client-side routing
- **Tailwind CSS 3.4.18** - Styling
- **LiveKit Client** - Browser-based voice communication
- **Twilio Integration** - Phone call handling
- **Axios** - HTTP client for API requests

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API server running (default: `http://localhost:8001`)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Appointment-Setter-Frontend-1
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (optional):
```env
REACT_APP_API_URL=http://localhost:8001
```

If no `.env` file is provided, the application defaults to `http://localhost:8001` for the API URL.

## Running the Project

### Development Mode

Start the development server:
```bash
npm start
```

or

```bash
npm run dev
```

The application will open at `http://localhost:3000` in your browser.

### Production Build

Build the application for production:
```bash
npm run build
```

The production build will be created in the `build/` directory, ready for deployment.

### Running Tests

Run the test suite:
```bash
npm test
```

## Project Structure

```
src/
├── components/          # React components organized by feature
│   ├── Agents/         # Agent management
│   ├── Appointments/   # Appointment management
│   ├── Auth/          # Login and registration
│   ├── Dashboard/     # Main dashboard
│   ├── Layout/        # Navigation components
│   ├── Tenants/       # Tenant management
│   ├── TwilioIntegration/ # Twilio setup
│   └── VoiceAgent/    # Voice agent testing
├── contexts/          # React Context providers
│   └── AuthContext.js # Authentication state
├── services/          # API service layer
│   └── api.js         # Axios configuration
├── App.js             # Main application component
└── index.js           # Application entry point
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:8001` |

## Features

- **User Authentication**: Registration, login, and session management
- **Tenant Management**: Create and manage multiple business entities
- **Agent Management**: Configure AI voice agents with custom settings
- **Appointment Management**: View, filter, and manage appointments
- **Twilio Integration**: Connect Twilio accounts and manage phone numbers
- **Voice Agent Testing**: Test agents in browser (LiveKit) or via real phone calls (Twilio)
- **Dashboard**: Overview statistics and recent activity

## Available Scripts

- `npm start` - Start development server
- `npm run dev` - Alias for `npm start`
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (irreversible)

## Browser Support

- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Documentation

For detailed application documentation, see [APP_DOCUMENTATION.md](./APP_DOCUMENTATION.md).

## License

Copyright © 2025 Scheduler Labs
