# RationQueue - Digital Queue Management for Ration Shops

## Problem Statement
Build a full-stack web application for managing digital queues in ration shops. Users generate tokens online and see a live counter. Shopkeepers manage tokens from an admin dashboard.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT-based (python-jose + passlib/bcrypt)
- **Real-time**: Polling (5-second intervals)

## User Personas
1. **Public Users**: Rural/semi-urban visitors to ration shops, limited tech literacy
2. **Shop Admins**: Shopkeepers managing daily token queues

## Core Requirements
- Token generation with name & ration card number
- Live counter showing current token being served
- Admin dashboard for queue management (next/skip/serve/reset)
- Multi-shop support (2 default shops seeded)
- Estimated wait time (8 min default, avg of last 5 served tokens)

## What's Been Implemented (Feb 15, 2026)
- [x] Backend API: shops, tokens, admin auth, queue management
- [x] 2 seeded shops with admin accounts (admin1/admin123, admin2/admin123)
- [x] Public pages: Home, Join Queue, Token Status, Live Counter
- [x] Admin pages: Login, Dashboard with full queue management
- [x] JWT authentication for admin routes
- [x] Auto-polling (5s) for live updates
- [x] Estimated wait time calculation
- [x] Mobile-first responsive design
- [x] Clean, accessible UI with large touch targets

## Prioritized Backlog
### P0 (Critical)
- All core features implemented ✅

### P1 (Important)
- SMS/notification when token is near
- Hindi/regional language support
- Sound alert on counter page when token changes

### P2 (Nice to have)
- QR code for token
- Daily analytics/reports for admin
- Multiple admin roles
- Shop registration flow
- Print token receipt
