# Public Works Finance Management System

A comprehensive financial management system for Public Works Departments to track projects, funds, bills, payments, and cashbook entries.

## Features

- **Project/Scheme Management**: Create and manage multiple schemes with components and contractors
- **Fund Management**: Track fund receipt, transfers, and sources (SASCI, State Budget, etc.)
- **Bill Recording**: Record contractor bills with adjustments (adhoc withheld, CSC temporary withheld)
- **Payment Processing**: Process payments with fund share breakdowns and statutory deductions
- **Cashbook**: Daily cashbook entries with monthly closings
- **Reports**: Comprehensive reports for individual and consolidated schemes
- **Multi-user Support**: Role-based access control

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL Database
- JWT Authentication
- RESTful API

### Frontend
- React 18+
- TypeScript
- Material-UI / Tailwind CSS
- Redux for state management

## Installation

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Traderjames1986/public-works-finance.git
   cd public-works-finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Initialize database**
   ```bash
   npm run db:migrate
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## API Documentation

See [API_DOCS.md](./API_DOCS.md) for detailed API endpoints.

## Database Schema

See [DATABASE.md](./DATABASE.md) for schema details.

## Contributing

Fork the repository and create a feature branch for your changes.

## License

MIT
