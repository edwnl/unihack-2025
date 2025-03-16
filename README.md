# Shuffl - Accessible Card Games Platform

Card games should be for everyone—no matter where you are, what your skill level is, or what challenges you face. 🃏✨ That's why we created *Shuffl*.

Shuffl precisely tracks gameplay, powered by speech recognition models, RFID modules, and an Arduino system, while an AI-powered personal coach helps players master the rules and refine their strategy. We're kicking things off with our flagship game poker, but our vision? A world where any card game can be played without limits.

Try it out at: https://shuffl.monashcoding.com/

## Features

- **Hybrid Gameplay**: Play together whether you're online or in-person
- **Accessibility First**: Designed with visually impaired players in mind
- **Intuitive Interface**: Simple, responsive design for all devices
- **Real-time Game State**: Synchronized gameplay through WebSockets
- **Voice Recognition**: Dealers can call out player actions
- **Smart Card Detection**: RFID technology tracks physical cards (optional)

## Tech Stack

### Frontend
- Next.js 14 with TypeScript
- TailwindCSS with ShadCN UI components
- WebSocket client (STOMP.js)
- Azure Speech Services for voice recognition
- Framer Motion for animations

### Backend
- Spring Boot (Java)
- WebSockets for real-time communication
- RESTful APIs for game management
- Lombok for reducing boilerplate code

## Development

The project uses Docker for development and deployment:

```bash
# Start development environment
docker compose up --build
```

Frontend will be available at http://localhost:3000
Backend will be available at http://localhost:8080

## Testing

You don't need the RFID hardware to test the app! The dealer interface includes options to:
- Add fake players to simulate a full table
- Scan random cards on behalf of players
- Process voice commands for in-person players

## Deployment

The application is containerized and deployed on Azure Container Apps with automatic CI/CD pipelines.

## Getting Started

1. Choose to be a player or dealer
2. Players can join using a game code
3. Dealers create a room and start the game when ready
4. Enjoy an accessible poker experience!
