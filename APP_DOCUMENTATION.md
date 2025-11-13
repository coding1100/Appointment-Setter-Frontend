# Appointment Setter Frontend - Application Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Core Features](#core-features)
5. [User Workflows](#user-workflows)
6. [Component Structure](#component-structure)
7. [API Integration](#api-integration)
8. [Authentication & Authorization](#authentication--authorization)
9. [State Management](#state-management)
10. [Testing Considerations](#testing-considerations)

---

## Application Overview

**Appointment Setter Frontend** is a React-based SaaS platform designed for managing AI-powered voice agents that handle appointment scheduling for service-based businesses (primarily plumbing services). The application enables businesses to:

- Create and manage multiple tenants (businesses)
- Configure AI voice agents for different service types
- Integrate with Twilio for phone call handling
- Manage appointments and customer interactions
- Test voice agents using LiveKit (browser-based) or Twilio (real phone calls)
- Track call history and agent performance

### Key Value Propositions
- **24/7 Availability**: AI agents answer calls at any time, including after-hours emergencies
- **Intelligent Triage**: Automatically classifies urgency and routes calls appropriately
- **Automated Scheduling**: Books appointments directly into calendar systems
- **Multi-tenant Support**: Manage multiple businesses from a single account

---

## Technology Stack

### Frontend Framework
- **React 18.2.0**: Core UI framework
- **React Router DOM 6.8.1**: Client-side routing
- **React Scripts 5.0.1**: Build tooling and development server

### Styling
- **Tailwind CSS 3.4.18**: Utility-first CSS framework
- **PostCSS 8.5.6**: CSS processing
- **Lucide React 0.263.1**: Icon library

### Voice/Communication
- **LiveKit Client 2.15.13**: Real-time voice communication for browser testing
- **LiveKit Components React 2.9.15**: React components for LiveKit integration
- **LiveKit Components Styles 1.1.6**: Styling for LiveKit components

### HTTP Client
- **Axios 1.3.4**: HTTP client for API requests

### Build & Development
- **TypeScript 4.9.5**: Type definitions (dev dependency)
- **Autoprefixer 10.4.21**: CSS vendor prefixing

---

## Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routing    │  │   Context    │  │  Components  │  │
│  │  (Router)    │  │  (Auth)      │  │  (UI)        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    API Service Layer                      │
│              (Axios with Interceptors)                    │
├─────────────────────────────────────────────────────────┤
│                    Backend API                            │
│              (FastAPI - Port 8001)                        │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── components/          # React components organized by feature
│   ├── Agents/         # Agent management components
│   ├── Appointments/    # Appointment listing and management
│   ├── Auth/            # Login and registration forms
│   ├── Dashboard/       # Main dashboard with statistics
│   ├── Layout/          # Navigation and layout components
│   ├── Tenants/         # Tenant management
│   ├── TwilioIntegration/ # Twilio setup and configuration
│   ├── VoiceAgent/      # Voice agent testing components
│   └── ErrorBoundary.js # Error handling component
├── contexts/            # React Context providers
│   └── AuthContext.js   # Authentication state management
├── services/            # API service layer
│   └── api.js          # Axios configuration and API endpoints
├── App.js              # Main application component with routing
├── App.css             # Global application styles
├── index.js            # Application entry point
└── index.css           # Base styles
```

---

## Core Features

### 1. Authentication & User Management
- **User Registration**: Create new accounts with email and password
- **User Login**: Secure authentication with JWT tokens
- **Token Management**: Automatic token refresh and storage
- **Session Persistence**: Maintains user session across page refreshes

### 2. Tenant Management
- **Create Tenants**: Set up new business entities
- **List Tenants**: View all tenants in a grid layout
- **Tenant Status**: Activate/deactivate tenants
- **Tenant Configuration**: Manage business information and agent settings

### 3. Agent Management
- **Create Agents**: Configure AI voice agents with:
  - Name and service type (Plumbing, Electrician, Painter, etc.)
  - Language selection
  - Voice selection
  - Greeting messages
  - System prompts
- **Agent Status**: Activate/deactivate agents
- **Agent List**: View all agents for a tenant
- **Agent Editing**: Update agent configurations

### 4. Appointment Management
- **View Appointments**: List all appointments for selected tenant
- **Filter Appointments**: Filter by status (scheduled, confirmed, completed, cancelled)
- **Search Appointments**: Search by customer name, phone, or service type
- **Appointment Details**: View comprehensive appointment information

### 5. Voice Agent Testing
- **Test Mode (LiveKit)**: Browser-based voice testing without phone calls
- **Live Mode (Twilio)**: Real phone call testing
- **Call Controls**: Start/end calls, mute, recording
- **Call History**: View past test calls and sessions
- **Session Management**: Track active and completed sessions

### 6. Twilio Integration
- **Account Connection**: Connect Twilio account with credentials
- **Phone Number Management**:
  - Use existing Twilio numbers
  - Purchase new numbers from tenant account
  - Purchase numbers from system account (no credentials needed)
- **Number Assignment**: Assign phone numbers to agents
- **Number Search**: Search available numbers by country, type, area code

### 7. Dashboard
- **Statistics Overview**:
  - Total tenants count
  - Total appointments count
  - Upcoming appointments
  - Today's appointments
- **Recent Appointments**: Display latest appointment activity

---

## User Workflows

### Workflow 1: New User Onboarding

1. **Registration** (`/register`)
   - User fills registration form (email, password, name)
   - System creates account
   - User redirected to login

3. **Login** (`/login`)
   - User enters credentials
   - System authenticates and issues JWT tokens
   - User redirected to dashboard

4. **Dashboard** (`/dashboard`)
   - User sees overview statistics
   - User navigates to create first tenant

### Workflow 2: Setting Up a Tenant and Agent

1. **Create Tenant** (`/tenants/create`)
   - User enters tenant details:
     - Name
     - Timezone
     - Status
   - System creates tenant record

2. **Create Agent** (`/agents`)
   - User selects tenant
   - User clicks "Create Agent"
   - User configures agent:
     - Name
     - Service type
     - Language
     - Voice
     - Greeting message
     - System prompt
   - System creates agent

3. **Configure Twilio** (`/twilio-integration`)
   - User enters Twilio credentials (optional)
   - User searches/purchases phone numbers
   - User assigns phone number to agent

4. **Test Agent** (`/voice-agent`)
   - User selects tenant and agent
   - User chooses test mode (LiveKit) or live mode (Twilio)
   - User initiates call
   - User tests conversation flow
   - User ends call and reviews session

### Workflow 3: Managing Appointments

1. **View Appointments** (`/appointments`)
   - User selects tenant from dropdown
   - System fetches appointments for tenant
   - User can filter by status
   - User can search by customer details

2. **Appointment Status Updates**
   - User views appointment details
   - User can update status (scheduled → confirmed → completed)
   - User can cancel or reschedule appointments

### Workflow 4: Voice Agent Call Flow

#### Test Mode (LiveKit)
1. User navigates to `/voice-agent`
2. User selects tenant and agent
3. User enables "Test Mode" checkbox
4. User clicks "Start Call"
5. LiveKit component loads in browser
6. User grants microphone permissions
7. Voice agent conversation begins
8. User can mute/unmute, record
9. User ends call
10. Session data saved

#### Live Mode (Twilio)
1. User navigates to `/voice-agent`
2. User selects tenant and agent
3. User disables "Test Mode" checkbox
4. User enters destination phone number
5. System validates Twilio integration exists
6. System validates agent has phone number assigned
7. User clicks "Start Call"
8. System initiates Twilio call
9. System polls for call status
10. User can view call status updates
11. User ends call
12. Call history updated

---

## Component Structure

### Authentication Components

#### `LoginForm.js`
- **Purpose**: User authentication
- **Features**:
  - Email/password input
  - Remember me checkbox
  - Password visibility toggle
  - Error handling
- **State**: Form data, loading, error, password visibility
- **API Calls**: `authAPI.login()`

#### `RegisterForm.js`
- **Purpose**: New user registration
- **Features**: User registration form
- **API Calls**: `authAPI.register()`

### Tenant Components

#### `TenantList.js`
- **Purpose**: Display all tenants
- **Features**:
  - Grid layout of tenant cards
  - Status badges (active/inactive)
  - Activate/deactivate buttons
  - Create tenant link
- **API Calls**: `tenantAPI.listTenants()`, `tenantAPI.activateTenant()`, `tenantAPI.deactivateTenant()`

#### `TenantCreateForm.js`
- **Purpose**: Create new tenant
- **Features**: Tenant creation form
- **API Calls**: `tenantAPI.createTenant()`

### Agent Components

#### `AgentManagement.js`
- **Purpose**: Container for agent management
- **Features**:
  - Tenant selection dropdown
  - Renders `AgentList` component
- **API Calls**: `tenantAPI.listTenants()`

#### `AgentList.js`
- **Purpose**: Display and manage agents
- **Features**:
  - Grid layout of agent cards
  - Create/edit/delete agents
  - Activate/deactivate agents
  - Agent details display
- **API Calls**: `agentAPI.listAgents()`, `agentAPI.createAgent()`, `agentAPI.updateAgent()`, `agentAPI.deleteAgent()`, `agentAPI.activateAgent()`, `agentAPI.deactivateAgent()`

#### `AgentForm.js`
- **Purpose**: Create/edit agent form
- **Features**: Comprehensive agent configuration form
- **API Calls**: `agentAPI.createAgent()`, `agentAPI.updateAgent()`, `agentAPI.getAvailableVoices()`

### Appointment Components

#### `AppointmentList.js`
- **Purpose**: Display appointments
- **Features**:
  - Tenant selection
  - Status filtering
  - Search functionality
  - Appointment cards with details
- **API Calls**: `appointmentAPI.listAppointments()`, `tenantAPI.listTenants()`

### Voice Agent Components

#### `VoiceAgentTest.js`
- **Purpose**: Test voice agents
- **Features**:
  - Tenant and agent selection
  - Test mode toggle (LiveKit vs Twilio)
  - Call controls (start/end, mute, record)
  - Call status display
  - Call history
- **API Calls**: `voiceAgentAPI.startSession()`, `voiceAgentAPI.endSession()`, `voiceAgentAPI.getSessionStatus()`, `voiceAgentAPI.getCallHistory()`, `agentAPI.listAgents()`, `phoneNumberAPI.getPhoneByAgent()`

#### `LiveKitVoiceAgent.js`
- **Purpose**: LiveKit browser-based voice agent
- **Features**: Real-time voice communication using LiveKit SDK

### Twilio Integration Components

#### `TwilioIntegration.js`
- **Purpose**: Manage Twilio integration
- **Features**:
  - Step 1: Connect Twilio account (credentials)
  - Step 2: Manage phone numbers (search, purchase, assign)
  - Step 3: View phone number assignments
  - Test credentials functionality
- **API Calls**: Multiple Twilio integration endpoints

### Dashboard Component

#### `Dashboard.js`
- **Purpose**: Main dashboard with statistics
- **Features**:
  - Statistics cards (tenants, appointments, upcoming, today)
  - Recent appointments list
  - Error handling and retry
- **API Calls**: `tenantAPI.listTenants()`, `appointmentAPI.listAppointments()`

### Layout Components

#### `Navbar.js`
- **Purpose**: Navigation bar
- **Features**:
  - Navigation links
  - User menu
  - Logout functionality

---

## API Integration

### API Configuration

The application uses Axios for HTTP requests with the following configuration:

- **Base URL**: Configurable via `REACT_APP_API_URL` environment variable (default: `http://localhost:8001`)
- **Timeout**: 30 seconds
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (added automatically)

### Request Interceptors

1. **Authentication**: Automatically adds JWT token from localStorage
2. **URL Normalization**: Removes trailing slashes to prevent redirect issues

### Response Interceptors

1. **Token Refresh**: Automatically refreshes expired tokens
2. **Error Handling**: Standardizes error response format
3. **Redirect on Auth Failure**: Redirects to login on 401 errors

### API Endpoints

#### Authentication (`authAPI`)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh access token

#### Tenants (`tenantAPI`)
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/tenants` - List tenants
- `GET /api/v1/tenants/{id}` - Get tenant
- `PUT /api/v1/tenants/{id}` - Update tenant
- `POST /api/v1/tenants/{id}/activate` - Activate tenant
- `POST /api/v1/tenants/{id}/deactivate` - Deactivate tenant
- Business info and agent settings endpoints

#### Agents (`agentAPI`)
- `POST /api/v1/agents/tenant/{tenantId}` - Create agent
- `GET /api/v1/agents/tenant/{tenantId}` - List agents
- `GET /api/v1/agents/{id}` - Get agent
- `PUT /api/v1/agents/{id}` - Update agent
- `DELETE /api/v1/agents/{id}` - Delete agent
- `POST /api/v1/agents/{id}/activate` - Activate agent
- `POST /api/v1/agents/{id}/deactivate` - Deactivate agent
- `GET /api/v1/agents/voices/list` - Get available voices
- `GET /api/v1/agents/voices/preview/{voiceId}` - Get voice preview

#### Appointments (`appointmentAPI`)
- `POST /api/v1/appointments` - Create appointment
- `GET /api/v1/appointments/{id}` - Get appointment
- `GET /api/v1/appointments/tenant/{tenantId}` - List appointments
- `PUT /api/v1/appointments/{id}/status` - Update status
- `PUT /api/v1/appointments/{id}/cancel` - Cancel appointment
- `PUT /api/v1/appointments/{id}/reschedule` - Reschedule appointment
- `PUT /api/v1/appointments/{id}/complete` - Complete appointment
- `GET /api/v1/appointments/tenant/{tenantId}/upcoming` - Get upcoming appointments
- `GET /api/v1/appointments/tenant/{tenantId}/date-range` - Get appointments by date range
- `GET /api/v1/appointments/tenant/{tenantId}/available-slots` - Get available slots
- `POST /api/v1/appointments/tenant/{tenantId}/hold-slot` - Hold slot
- `DELETE /api/v1/appointments/hold/{holdId}` - Release slot hold

#### Voice Agent (`voiceAgentAPI`)
- `POST /api/v1/voice-agent/start-session` - Start voice session
- `POST /api/v1/voice-agent/end-session/{sessionId}` - End session
- `GET /api/v1/voice-agent/session-status/{sessionId}` - Get session status
- `GET /api/v1/voice-agent/tenant/{tenantId}/sessions` - Get tenant sessions
- `GET /api/v1/voice-agent/tenant/{tenantId}/agent-stats` - Get agent statistics

#### Twilio Integration
- `POST /api/v1/twilio-integration/tenant/{tenantId}/create` - Create integration
- `GET /api/v1/twilio-integration/tenant/{tenantId}` - Get integration
- `PUT /api/v1/twilio-integration/tenant/{tenantId}/update` - Update integration
- `DELETE /api/v1/twilio-integration/tenant/{tenantId}` - Delete integration
- `POST /api/v1/twilio-integration/test-credentials` - Test credentials
- `GET /api/v1/twilio-integration/tenant/{tenantId}/unassigned` - Get unassigned numbers
- `POST /api/v1/twilio-integration/search-available` - Search available numbers
- `POST /api/v1/twilio-integration/tenant/{tenantId}/purchase` - Purchase number
- `POST /api/v1/twilio-integration/system/purchase` - Purchase via system account

#### Phone Numbers (`phoneNumberAPI`)
- `POST /api/v1/phone-numbers/tenant/{tenantId}` - Create phone number
- `GET /api/v1/phone-numbers/tenant/{tenantId}` - List phone numbers
- `GET /api/v1/phone-numbers/{id}` - Get phone number
- `GET /api/v1/phone-numbers/agent/{agentId}` - Get phone by agent
- `PUT /api/v1/phone-numbers/{id}` - Update phone number
- `DELETE /api/v1/phone-numbers/{id}` - Delete phone number
- `POST /api/v1/phone-numbers/tenant/{tenantId}/assign` - Assign phone to agent
- `DELETE /api/v1/phone-numbers/agent/{agentId}/unassign` - Unassign phone from agent

---

## Authentication & Authorization

### Authentication Flow

1. **User Registration**
   - User submits registration form
   - Backend creates user account
   - User redirected to login

2. **User Login**
   - User submits credentials
   - Backend validates and returns:
     - `access_token` (JWT)
     - `refresh_token` (JWT)
     - `user` object
   - Tokens stored in localStorage
   - User redirected to dashboard

3. **Token Management**
   - Access token included in all API requests via Authorization header
   - Token automatically refreshed when expired (401 response)
   - Tokens cleared on logout

4. **Protected Routes**
   - Routes wrapped in `ProtectedRoute` component
   - Checks authentication status
   - Redirects to login if not authenticated
   - Shows loading spinner during auth check

### Authorization

- All API requests require valid JWT token
- Token validated on backend for each request
- User context available via `AuthContext`

---

## State Management

### React Context

#### `AuthContext`
- **Purpose**: Global authentication state
- **State**:
  - `user`: Current user object
  - `token`: Access token
  - `loading`: Authentication loading state
  - `isAuthenticated`: Boolean authentication status
- **Methods**:
  - `login(credentials)`: Authenticate user
  - `register(userData)`: Register new user
  - `logout()`: Clear session and tokens
- **Persistence**: Tokens stored in localStorage

### Component State

Most components use React `useState` for local state management:
- Form data
- Loading states
- Error messages
- UI state (modals, dropdowns, etc.)

### Data Fetching Patterns

- **useEffect hooks**: Fetch data on component mount
- **useCallback hooks**: Memoize fetch functions to prevent infinite loops
- **Dependency arrays**: Carefully managed to control re-fetching

---

## Testing Considerations

### Functional Testing Areas

#### 1. Authentication
- [ ] User registration with valid/invalid data
- [ ] User login with correct/incorrect credentials
- [ ] Token refresh on expiration
- [ ] Logout functionality
- [ ] Protected route access control
- [ ] Session persistence across page refresh

#### 2. Tenant Management
- [ ] Create tenant with valid data
- [ ] Create tenant with invalid data (validation)
- [ ] List tenants
- [ ] Activate/deactivate tenant
- [ ] Tenant status updates reflected in UI

#### 3. Agent Management
- [ ] Create agent with all required fields
- [ ] Create agent with missing fields (validation)
- [ ] List agents for tenant
- [ ] Edit agent details
- [ ] Delete agent (with confirmation)
- [ ] Activate/deactivate agent
- [ ] Voice selection and preview

#### 4. Appointment Management
- [ ] List appointments for tenant
- [ ] Filter appointments by status
- [ ] Search appointments
- [ ] View appointment details
- [ ] Update appointment status
- [ ] Handle empty states

#### 5. Voice Agent Testing
- [ ] Test mode (LiveKit) initialization
- [ ] Live mode (Twilio) call initiation
- [ ] Call controls (mute, record, end)
- [ ] Call status updates
- [ ] Call history display
- [ ] Error handling for missing Twilio integration
- [ ] Error handling for missing phone number assignment

#### 6. Twilio Integration
- [ ] Connect Twilio account with valid credentials
- [ ] Connect with invalid credentials (error handling)
- [ ] Test credentials functionality
- [ ] Search available phone numbers
- [ ] Purchase phone numbers (tenant/system account)
- [ ] Assign phone numbers to agents
- [ ] Unassign phone numbers
- [ ] View phone number assignments

#### 7. Dashboard
- [ ] Statistics calculation accuracy
- [ ] Recent appointments display
- [ ] Error handling and retry
- [ ] Loading states

#### 8. Navigation & Routing
- [ ] All routes accessible when authenticated
- [ ] Protected routes redirect when not authenticated
- [ ] Public routes redirect when authenticated
- [ ] Navigation links work correctly
- [ ] Browser back/forward buttons

### UI/UX Testing

- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states displayed appropriately
- [ ] Error messages clear and actionable
- [ ] Success messages displayed
- [ ] Form validation feedback
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Consistent styling and branding

### Integration Testing

- [ ] API error handling (network errors, 4xx, 5xx)
- [ ] Token expiration handling
- [ ] Concurrent user actions
- [ ] Data consistency across components
- [ ] Real-time updates (call status, etc.)

### Performance Testing

- [ ] Initial page load time
- [ ] Component render performance
- [ ] API response time impact on UI
- [ ] Large data sets (many tenants, agents, appointments)
- [ ] Memory leaks (especially with LiveKit)

### Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Security Testing

- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Token storage security
- [ ] Sensitive data exposure (console logs, network tab)
- [ ] Input validation and sanitization

### Edge Cases

- [ ] Empty states (no tenants, no agents, no appointments)
- [ ] Network disconnection during API calls
- [ ] Rapid clicking/button mashing
- [ ] Very long text inputs
- [ ] Special characters in inputs
- [ ] Concurrent modifications (two users editing same resource)

---

## Environment Configuration

### Required Environment Variables

- `REACT_APP_API_URL`: Backend API base URL (default: `http://localhost:8001`)

### Development Setup

1. Install dependencies: `npm install`
2. Set environment variables (create `.env` file)
3. Start development server: `npm start`
4. Application runs on `http://localhost:3000`

### Production Build

1. Build for production: `npm run build`
2. Output in `build/` directory
3. Deploy static files to web server

---

## Error Handling

### Global Error Handling

- **ErrorBoundary Component**: Catches React component errors
- **API Error Interceptors**: Standardize error responses
- **User-Friendly Messages**: Display clear error messages

### Error States

- Network errors: "Failed to connect to server"
- Authentication errors: Redirect to login
- Validation errors: Display field-specific messages
- Server errors: Display generic error with retry option

---

## Known Limitations & Considerations

1. **LiveKit Browser Requirements**: Requires modern browser with WebRTC support
2. **Microphone Permissions**: Browser may prompt for microphone access
3. **Token Storage**: Tokens stored in localStorage (consider security implications)
4. **Real-time Updates**: Some data requires manual refresh (no WebSocket)
5. **Phone Number Format**: Twilio phone numbers must be in E.164 format
6. **Concurrent Sessions**: Multiple voice agent sessions not explicitly handled

---

## Future Enhancements (Potential)

- WebSocket integration for real-time updates
- Advanced appointment calendar view
- Agent performance analytics dashboard
- Multi-language support for UI
- Dark mode theme
- Export functionality (appointments, call history)
- Bulk operations (bulk agent creation, bulk appointment updates)

---

## Support & Documentation

For additional information:
- Backend API documentation: Check backend repository
- LiveKit documentation: https://docs.livekit.io/
- Twilio documentation: https://www.twilio.com/docs
- React documentation: https://react.dev/

---

**Document Version**: 1.0  
**Last Updated**: 2025  
**Maintained By**: Development Team

