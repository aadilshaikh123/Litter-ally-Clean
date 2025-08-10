# Project Documentation: Garbage Management System

## Overview
This project is a full-stack garbage management and reporting system. It consists of a React frontend, a Flask-based backend for AI/model inference, a Node.js/Express backend for API and file management, and geospatial data for mapping operations. The system is designed to help users report garbage issues, upload images, and manage municipal operations efficiently.

---

## Project Structure

- **client/**: React frontend application
  - `public/`: Static assets (HTML, icons, manifest)
  - `src/`: Source code
    - `components/`: Reusable UI components (e.g., Navbar, ImageUploader, PostForm)
    - `pages/`: Page-level components (e.g., Login, Register, Dashboards)
    - `App.js`, `index.js`: Main entry points
    - `styles.css`, `App.css`: Styling

- **flask-backend/**: Python backend for AI/model inference
  - `app.py`: Main Flask app
  - `helper.py`: Helper functions for model inference
  - `best_model_mobilenet.pth`: Trained model file
  - `__pycache__/`: Python cache

- **server/**: Node.js/Express backend for API, authentication, and file management
  - `config/`: Configuration files (DB, mappings)
  - `controllers/`: Route controllers (auth, complaints, images, etc.)
  - `middleware/`: Authentication middleware
  - `models/`: Mongoose models (User, Complaint, GovEmployee)
  - `routes/`: API route definitions
  - `uploads/`: Uploaded images (user reports)
  - `completeimages/`: Processed/cleaned images
  - `utils/`: Utility functions (e.g., mailer)
  - `.env`: Environment variables

- **Map-Operation/**: Geospatial data and scripts
  - `.kml`, `.geojson`, `.pdf`: Map files for wards and stations
  - `map.py`: Python script for map operations

---

## Key Features
- User authentication and registration (citizen, government employee, worker)
- Image upload and classification (clean/dirty street detection)
- Complaint reporting and tracking
- Admin and worker dashboards
- Geospatial mapping of wards and complaints
- Email notifications

---

## Technologies Used
- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js (Express), Python (Flask)
- **Database**: MongoDB
- **AI/ML**: PyTorch (MobileNet model)
- **Mapping**: GeoJSON, KML

---

## Setup & Deployment
1. Install dependencies in each subproject (`npm install` for Node, `pip install -r requirements.txt` for Python)
2. Configure environment variables in `.env` files
3. Start the Flask backend (`python app.py`)
4. Start the Node.js server (`npm start` or `node servers.js`)
5. Start the React client (`npm start` in `client/`)

---

## File Exclusions
- Uploaded/generated images, model files, build artifacts, and system files are excluded via `.gitignore`.

---


## Authors & License
- Author: aadilnawaz shaikh
- License: MIT (or specify your license)

---

## For more details, see the README.md file.
