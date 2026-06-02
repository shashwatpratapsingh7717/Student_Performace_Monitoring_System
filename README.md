# 🎓 AI-Powered Student Performance Monitoring System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)

An enterprise-grade, full-stack web application designed to help academic mentors track student performance, manage assignments, and conduct dynamic AI-driven oral examinations (Viva) using Generative AI. 

## 🚀 Core Features

* **🤖 Dynamic AI Viva Examiner:** Integrates Google Gemini (2.5 Flash) to conduct real-time, context-aware oral exams based on specific course syllabi.
* **🎙️ Voice-to-Text Integration:** Built-in speech recognition allows students to answer AI questions using their microphone for a seamless viva experience.
* **📊 Data Analytics Dashboard:** Interactive data visualization (Recharts) to track attendance, MST marks, and identify at-risk students instantly.
* **📧 Automated Evaluation & Reporting:** Generates highly detailed, multi-parametric diagnostic reports of the student's performance and automatically emails them to parents via secure SMTP.
* **📁 Bulk Data Management:** Supports bulk uploading of student records via CSV for rapid onboarding.
* **🔒 Secure Architecture:** Modular and secure REST API backend with unique, user-specific local storage management on the frontend to prevent data bleeding.

## 🛠️ Tech Stack

**Frontend (Client):**
* React.js (Vite)
* Recharts (Data Visualization)
* Lucide React (Icons)
* Web Speech API (Voice input)

**Backend (Server):**
* Python 3 & FastAPI
* Google Generative AI SDK (`google-generativeai`)
* PostgreSQL (psycopg2)

## ⚙️ Local Setup & Installation

Follow these steps to run the project locally on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/Student_Performace_Monitoring_System.git](https://github.com/your-username/Student_Performace_Monitoring_System.git)
cd Student_Performace_Monitoring_System
2. Backend Setup
Navigate to the backend directory, create a virtual environment, and install dependencies.

Bash
cd Backend
python -m venv venv
source venv/Scripts/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
Create a .env file in the Backend directory and add your credentials:

Code snippet
GEMINI_API_KEY=your_google_gemini_api_key_here
DATABASE_URL=your_postgresql_connection_string
Start the FastAPI server:

Bash
uvicorn app.main:app --reload
The backend will run at http://localhost:8000

3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install node modules.

Bash
cd frontend
npm install
Start the Vite development server:

Bash
npm run dev
The frontend will run at http://localhost:5173
🎯 Future Enhancements
[ ] Integration with a predictive machine learning model to forecast final semester grades.
[ ] Multi-language support for the AI Viva examiner.
[ ] Dockerization for streamlined cloud deployment.
Built with ❤️ for optimizing academic mentorship through Artificial Intelligence and Data Analytics.
