# Bachillo 🚗

> A crowdsourced platform for mapping and avoiding street bumps in Hermosillo, Sonora.

## 📱 Overview

Bachillo is a mobile-first web application that helps drivers navigate streets more safely by:
- Allowing users to report street bumps through geotagged photos
- Displaying verified bumps on an interactive map
- Providing a moderated, community-driven database of road hazards

## ✨ Key Features

- 📸 Report bumps with photos and automatic location tagging
- 🗺️ Interactive map interface with verified bump locations
- 📱 Mobile-optimized design for easy on-the-go reporting
- ✅ Admin verification workflow to ensure data quality
- 🔄 Dynamic loading with infinite scroll
- 📍 Real-time location updates
- 🖼️ Automatic image optimization and compression

## 🏗️ Project Structure
```
bachillo/ 
├── street-bump-frontend/
│   ├── src/ 
│   │   ├── app/
│   │   │   ├── layout.tsx 
│   │   │   └── page.tsx 
│   │   ├── components/
│   │   │   ├── BumpMap.jsx 
│   │   │   └── ReportForm.jsx 
│   │   └── services/
│   │       └── bumpService.ts 
│   ├── public/
│   │   └── cerro-campana.jpg 
│   └── package.json 
├── street-bump-admin/
│   ├── src/ 
│   │   ├── app/
│   │   │   ├── layout.tsx 
│   │   │   └── page.tsx 
│   │   ├── components/
│   │   │   └── UnverifiedBumpsList.jsx 
│   │   └── services/
│   │       └── adminService.ts 
│   └── package.json 
└── street-bump-backend/
    ├── server.js
    ├── serviceAccountKey.json 
    ├── .env 
    └── package.json
```

## 🛠️ Technology Stack

### Frontend & Admin Interface
![Next.js](https://img.shields.io/badge/Next.js-13+-000000?style=flat-square&logo=next.js)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=flat-square&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=flat-square&logo=typescript)
![Google Maps](https://img.shields.io/badge/Google_Maps-API-4285F4?style=flat-square&logo=google-maps)

### Backend Services
![Express](https://img.shields.io/badge/Express-4.0-000000?style=flat-square&logo=express)
![Firebase](https://img.shields.io/badge/Firebase-Storage-FFCA28?style=flat-square&logo=firebase)
![Firestore](https://img.shields.io/badge/Firestore-Database-FFCA28?style=flat-square&logo=firebase)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Google Maps API key
- Firebase project credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/bachillo.git
cd bachillo
```

2. **Install dependencies**
# Frontend
cd street-bump-frontend && npm install

# Admin
cd ../street-bump-admin && npm install

# Backend
cd ../street-bump-backend && npm install

3. Set environment variables:
```bash
Frontend (.env.local):
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GMAPS_API_KEY=your_maps_key
Backend (.env):
PORT=3001
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
ADMIN_EMAIL=your@email.com
```

## 📝 API Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bumps` | `GET` | Retrieves a list of all verified street bumps |
| `/api/bumps` | `POST` | Creates a new street bump report |
| `/api/admin/bumps/unverified` | `GET` | Retrieves a list of pending bump verifications |
| `/api/admin/bumps/:id/verify` | `PATCH` | Approves a reported bump |
| `/api/admin/bumps/:id` | `DELETE` | Removes a bump from the database |

All endpoints return JSON responses and require appropriate authentication headers where applicable. For detailed request/response schemas, please refer to our [API Reference](./docs/api-reference.md).