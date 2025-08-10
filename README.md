# Bin There, Done That 🚮

A full-stack garbage management and reporting system for smarter, cleaner cities.

## System Architecture

```plantuml
@startuml
!theme toy
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Segoe UI"
skinparam defaultFontSize 11

skinparam rectangle {
    BackgroundColor<<user>> #FF6B6B
    BackgroundColor<<frontend>> #4ECDC4
    BackgroundColor<<api>> #45B7D1
    BackgroundColor<<ai>> #FFA07A
    BackgroundColor<<db>> #98D8C8
    BackgroundColor<<map>> #F7DC6F
    BorderColor #2C3E50
    FontColor white
    RoundCorner 15
}

skinparam arrow {
    Color #E74C3C
    FontColor #2C3E50
    Thickness 3
}

left to right direction

rectangle "👤\nUser\n(Citizen/Worker/Admin)" as user <<user>>
rectangle "⚛️\nReact Frontend\n(UI/UX)" as frontend <<frontend>>
rectangle "🚀\nNode.js API\n(Express Server)" as api <<api>>
rectangle "🤖\nFlask AI\n(MobileNet)" as ai <<ai>>
rectangle "🗄️\nMongoDB\n(Database)" as db <<db>>
rectangle "🗺️\nGeo Mapping\n(Ward Data)" as map <<map>>

user -[#E74C3C,thickness=3]-> frontend : Upload Image\n& Report Issue
frontend -[#3498DB,thickness=3]-> api : API Calls\n(Auth, CRUD)
api -[#F39C12,thickness=3]-> ai : Image Analysis\n(Clean/Dirty)
api -[#27AE60,thickness=3]-> db : Store Data\n(Users, Complaints)
api -[#9B59B6,thickness=3]-> map : Location Mapping\n(Ward Assignment)

ai -[#E67E22,thickness=3]-> api : Classification\nResults
db -[#16A085,thickness=3]-> api : Query\nResults
map -[#8E44AD,thickness=3]-> api : Geospatial\nData

api -[#2980B9,thickness=3]-> frontend : Response\nData
frontend -[#C0392B,thickness=3]-> user : Dashboard\n& Notifications

note right of user #FFE5B4
  🏠 Landing Page
  📝 Registration
  📊 Dashboards
  📸 Image Upload
end note

note right of ai #E8F6FF
  🧠 MobileNet Model
  🔍 Image Classification
  ✅ Clean/Dirty Detection
  📈 Accuracy Results
end note

note right of map #F0FFF0
  🌍 Ward Boundaries
  📍 GPS Coordinates
  🗺️ KML/GeoJSON Files
  📊 Spatial Analytics
end note

@enduml
```

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Overview
This project enables users to report garbage issues, upload images for AI-based cleanliness detection, and manage municipal operations with geospatial mapping. It includes:
- A React frontend
- A Node.js/Express backend for API and file management
- A Flask backend for AI/model inference
- Geospatial data for mapping

---

## Features
- User authentication (citizen, government employee, worker)
- Image upload & classification (clean/dirty street detection)
- Complaint reporting & tracking
- Admin and worker dashboards
- Geospatial mapping of wards and complaints
- Email notifications

---

## Tech Stack
- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js (Express), Python (Flask)
- **Database:** MongoDB
- **AI/ML:** PyTorch (MobileNet)
- **Mapping:** GeoJSON, KML

---

## Project Structure
```
client/           # React frontend
flask-backend/    # Python Flask AI backend
server/           # Node.js/Express backend
Map-Operation/    # Geospatial data & scripts
```

---

## Setup
1. Clone the repo and install dependencies in each subproject:
   - `npm install` (Node.js projects)
   - `pip install -r requirements.txt` (Python)
2. Configure `.env` files as needed
3. Start Flask backend: `python app.py`
4. Start Node.js server: `npm start` or `node servers.js`
5. Start React client: `npm start` in `client/`

---

## Usage
- Register/login as a user
- Report garbage issues with images
- View and manage complaints on dashboards
- Admins and workers can update status and view geospatial data

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
MIT (or specify your license)

---

## Author
aadilnawaz shaikh
