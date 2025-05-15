# Dental Clinic Management System

This project is a comprehensive dental clinic management system with a frontend interface connected to a backend server.

## Project Structure

```
/dentist/
├── frontend/           # Frontend HTML, CSS, and JavaScript files
│   ├── api.js          # API service to handle all server requests
│   ├── login.html      # Login and registration page
│   ├── login.js        # Login functionality
│   ├── home.html       # Home page
│   ├── home.js         # Home page functionality
│   ├── dashboard.html  # User dashboard
│   ├── dashboard.js    # Dashboard functionality
│   ├── dashboard.css   # Dashboard styles
│   ├── appointment.html # Appointment booking page
│   ├── appointment.js   # Appointment booking functionality
│   ├── appointment.css  # Appointment styles
│   ├── profile.html     # User profile page
│   ├── profile.js       # Profile management functionality
│   ├── profile.css      # Profile styles
│   └── images/          # Images used in the frontend
│
├── src/                # Backend server code
│   ├── index.js        # Main server entry point
│   ├── routes/         # API routes
│   ├── models/         # Database models
│   └── middleware/     # Middleware functions
│
└── package.json        # Project dependencies and scripts
```

## Frontend-Server Integration

The frontend and server are integrated using a REST API. The frontend uses the `api.js` service to make HTTP requests to the server.

### API Service

The API service (`api.js`) provides the following functions:

- **Authentication**
  - `login(email, password)`: Authenticate user and get JWT token
  - `register(userData)`: Register a new user
  - `getCurrentUser()`: Get the current user's profile
  - `logout()`: Log out the current user

- **Users**
  - `update(userData)`: Update user profile
  - `updatePassword(passwordData)`: Update user password

- **Appointments**
  - `getAll()`: Get all appointments for the current user
  - `getById(id)`: Get a specific appointment
  - `create(appointmentData)`: Create a new appointment
  - `update(id, appointmentData)`: Update an existing appointment
  - `cancel(id)`: Cancel an appointment

- **Services**
  - `getAll()`: Get all available dental services
  - `getById(id)`: Get a specific service

### Authentication Flow

1. User logs in or registers through the login page
2. Server validates credentials and returns a JWT token
3. Frontend stores the token in localStorage
4. All subsequent API requests include the token in the Authorization header
5. If the token is invalid or expired, the user is redirected to the login page

### Pages and Functionality

- **Home Page**: Landing page with general information about the clinic
- **Login/Register Page**: User authentication and registration
- **Dashboard**: View upcoming and past appointments
- **Appointment Booking**: Schedule new appointments
- **Profile Management**: Update personal information and password

## Running the Project

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Running the Server

```
npm run dev
```

The server will start on port 8080 (or the port specified in your .env file).

### Accessing the Frontend

Open your browser and navigate to the frontend files. You can use a simple HTTP server like `http-server` to serve the frontend files:

```
cd frontend
npx http-server
```

Then open your browser and go to `http://localhost:8080`.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=8080
MONGODB_URI=mongodb://localhost:27017/dental-clinic
JWT_SECRET=your_jwt_secret
```

## API Endpoints

### Authentication
- `POST /api/auth/login`: Login user
- `POST /api/auth/register`: Register new user
- `GET /api/auth/me`: Get current user profile
- `POST /api/auth/logout`: Logout user

### Users
- `PUT /api/users/profile`: Update user profile
- `PUT /api/users/password`: Update user password

### Appointments
- `GET /api/appointments`: Get all appointments
- `GET /api/appointments/:id`: Get appointment by ID
- `POST /api/appointments`: Create new appointment
- `PUT /api/appointments/:id`: Update appointment
- `DELETE /api/appointments/:id`: Cancel appointment

### Services
- `GET /api/services`: Get all services
- `GET /api/services/:id`: Get service by ID 