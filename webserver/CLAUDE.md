# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cosmic Watch measurement data server - a dual-language application with Node.js server backend and Python data collection client. The system collects cosmic ray measurement data from hardware detectors and provides web-based visualization and management.

## Architecture

### Core Components
- **server.js**: Express.js server handling authentication, data upload, and API endpoints
- **cosmic-watch-measurement-webserver.py**: Python client for serial communication with cosmic ray detectors
- **setup-user.js**: CLI utility for creating user accounts
- **cosmicray-data/**: Directory structure organizing measurement data by user ID and date
- **users.json**: User authentication and configuration data

### Data Flow
1. Python client connects to detector via serial port
2. Authenticates with Node.js server using JWT tokens
3. Buffers and uploads measurement data in batches
4. Server stores data in organized directory structure by ID and date
5. Web interface provides data viewing and download

### Authentication System
- JWT-based authentication with user roles (user/admin)
- User registration/login endpoints
- Admin-only user management endpoints
- Token-based API access for data uploads
- 24-hour token expiration with refresh capability

### Data Processing Architecture
- **Real-time Collection**: Python client reads serial data continuously from cosmic ray detectors
- **Local Backup**: Data saved locally in `./data/{measurement_id}/` directory with timestamped files
- **Buffered Upload**: `DataUploader` class manages batched server uploads (60-second intervals)
- **Retry Logic**: Exponential backoff for failed uploads (1s, 2s, 4s delays, max 3 attempts)
- **Thread Safety**: Separate upload thread with deque-based buffer management
- **Port Auto-detection**: Automatic COM port selection for serial communication

## Development Commands

### Node.js Server
```bash
# Install dependencies
npm install

# Start production server
npm start

# Start development server with auto-reload
npm run dev
```

### Python Client
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run measurement client (interactive setup)
python cosmic-watch-measurement-webserver.py
```

### User Management
```bash
# Create new user account
node setup-user.js <user_id> <password> [comment] [gps_lat] [gps_lon]

# Example: Create test user with GPS coordinates
node setup-user.js testuser mypassword "Test measurement" "35.6762" "139.6503"

# Check existing users (requires admin access via API)
curl -H "Authorization: Bearer <admin_token>" http://localhost:3000/admin/users
```

### Testing & Debugging
```bash
# Check server health
curl http://localhost:3000/health

# View server logs (when running)
tail -f output.log

# Test authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"testuser","password":"mypassword"}'
```

## Data Storage Structure

```
cosmicray-data/
├── sendai/
│   ├── config.json
│   ├── 2025-08-25.dat
│   └── [other date files]
├── waseda/
│   └── [similar structure]
└── test/
    └── [similar structure]
```

### Data File Format
Tab-separated values: `EVENT\tDATE\tTIME\tADC\tSIPM\tDEADTIME\tTEMP`
Example: `24	2022-10-02-21-28-18.578727	24305	117	23.34	4866	30.14`

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `GET /auth/verify` - Token verification
- `GET /auth/validate` - Token validation (alias for verify)
- `POST /auth/refresh` - Token refresh

### Data Management
- `POST /upload-data/:id` - Upload measurement data (authenticated)
- `GET /latest-data/:id` - Get recent measurements (last 10 entries)
- `GET /api/files/:id` - List data files for user
- `GET /api/data/:id/:filename` - Get specific data file
- `GET /api/download/:id/:filename` - Download data file

### Setup & Configuration
- `POST /setup-id` - Setup measurement ID on server (authenticated)
- `GET /check-id/:id` - Check if ID exists and get config
- `GET /list-ids` - List all measurement IDs with user info

### Admin Endpoints
- `GET /admin/users` - List all users (admin only)
- `POST /admin/users` - Create user (admin only)
- `PUT /admin/users/:id` - Update user (admin only) 
- `DELETE /admin/users/:id` - Delete user (admin only)

### Utility
- `GET /health` - Health check endpoint

## Configuration

### Environment Variables
- `JWT_SECRET`: JWT signing secret (defaults to development key)
- Server runs on port 3000 by default

### Python Client Config
The client creates/uses `config.json` with:
- User ID and authentication token
- Measurement metadata (comment, GPS coordinates)
- Created timestamp

## Key Features

### Real-time Data Collection
- Continuous serial port monitoring with automatic COM port selection
- Buffered batch uploads to server (60-second intervals)
- Local backup files for data integrity in `./data/{measurement_id}/`
- Automatic retry with exponential backoff (up to 3 attempts per data point)

### Multi-user Support  
- Individual data directories per user
- Role-based access control (user/admin)
- User can only access own data (except admins)
- Admin cannot delete root user

### Data Integrity
- Local and server-side data storage
- Thread-safe data buffering with deque structures
- Atomic file operations with proper error handling
- Failed data queued for retry on next upload cycle

### Security Features
- Bcrypt password hashing with 10 salt rounds
- JWT token authentication with Bearer scheme (24-hour expiration)
- User isolation - users can only upload to their own measurement ID
- Admin-only endpoints protected by role middleware
- Input validation and sanitization for all API endpoints
- Protected user directory access with role-based permissions

## Important Implementation Details

### Error Handling & Logging
- Server logs output to `output.log` file
- Comprehensive error handling for serial communication failures
- Graceful degradation when network connectivity is lost
- Failed data points are queued and retried automatically

### Client-Server Communication
- Python client authenticates once, reuses JWT token for all uploads
- Automatic token refresh when approaching expiration
- Batch uploads reduce server load and improve efficiency
- Local data buffering ensures no data loss during network interruptions

### File Naming Conventions
- Daily data files: `YYYY-MM-DD.dat` format
- Temporary upload files: `YYYY-MM-DDTHH:MM:SS.sssZ.dat` format
- Config files: `config.json` in each user directory
- Invalid date handling creates `invalid-date.dat` or `NaN-NaN-NaN.dat` files