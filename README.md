# InsightLoop - Team Performance Dashboard

A modern web application for tracking and managing team member performance and contributions. The application features a clean, intuitive interface for adding team members, recording their contributions, and analyzing meeting transcriptions using AI.

## Features

- Team member management (add, view, delete)
- Performance note tracking
- AI-powered meeting transcription analysis
- Real-time updates
- Modern, responsive UI

## Tech Stack

### Frontend

- React.js
- Modern CSS with CSS variables
- Responsive design

### Backend

- Go (Golang)
- Gin web framework
- OpenAI API integration

## Prerequisites

- Go 1.16 or higher
- Node.js 14 or higher
- npm or yarn
- OpenAI API key

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd InsightLoop
```

2. Set up the backend:

```bash
# Create a .env file in the root directory
echo "OPENAI_API_KEY=your-api-key-here
PORT=8080
FRONTEND_URL=http://localhost:3000" > .env

# Install Go dependencies
go mod tidy

# Start the backend server
go run main.go
```

3. Set up the frontend:

```bash
cd Dashboard

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## API Endpoints

- `GET /api/team-members` - Get all team members
- `POST /api/team-members` - Add a new team member
- `PUT /api/team-members/:id/notes` - Add a note to a team member
- `DELETE /api/team-members/:id` - Delete a team member
- `POST /api/process-transcription` - Process meeting transcription

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your-api-key-here
PORT=8080
FRONTEND_URL=http://localhost:3000
```

## Development

### Frontend Development

The frontend is built with React and uses modern CSS features. The main components are:

- `App.js` - Main application component
- `TeamMemberCard.js` - Component for displaying team member information
- `App.css` - Styling for the application

### Backend Development

The backend is built with Go and uses the Gin framework. Key files:

- `main.go` - Main application file with API endpoints
- `go.mod` - Go module file with dependencies

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
