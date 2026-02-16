# RationQueue - Digital Queue Management for Ration Shops

## Problem Statement
Build a full-stack web application for managing digital queues in ration shops. Users generate tokens online, see live counter. Shopkeepers manage tokens from admin dashboard.

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

## What's Been Implemented

### Phase 1 (Feb 15, 2026)
- [x] Backend API: shops, tokens, admin auth, queue management
- [x] 2 seeded shops with admin accounts (admin1/admin123, admin2/admin123)
- [x] Public pages: Home, Join Queue, Token Status, Live Counter
- [x] Admin pages: Login, Dashboard with full queue management
- [x] JWT authentication for admin routes
- [x] Auto-polling (5s) for live updates
- [x] Estimated wait time calculation
- [x] Mobile-first responsive design

### Phase 2 (Feb 15, 2026)
- [x] Token persistence in localStorage (auto-resume on revisit)
- [x] Duplicate ration card detection (redirect to existing token)
- [x] Token expiry on queue reset (via queue_reset_version)
- [x] Shop operating time settings (admin configurable start/end time)
- [x] Queue status toggle (LIVE/STOPPED) in admin panel
- [x] Queue status displayed on all public pages
- [x] "Next Day" indicator for tokens beyond closing time
- [x] Admin dashboard scroll fix (queue table scrolls independently)
- [x] Skip Current button beside Next Token in admin dashboard

## Prioritized Backlog
### P1 (Important)
- Hindi/regional language support
- Sound alert on counter page when token changes
- SMS/notification when token is near

### P2 (Nice to have)
- QR code for token
- Daily analytics/reports for admin
- Multiple admin roles
- Shop registration flow
- Print token receipt
