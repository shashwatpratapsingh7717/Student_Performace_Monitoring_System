from fastapi import APIRouter, HTTPException
from google import genai
import psycopg2.extras
from app.database import get_db_connection
from app.schemas import QuestionRequest, EvaluationRequest, EmailSendRequest
from app.services.email_service import send_report_email
import os
router = APIRouter()


# Api is in .env file and not hardcoded for security reasons. Make sure to set GEMINI_API_KEY in your environment variables.
# Api is in .env file and not hardcoded for security reasons. Make sure to set GEMINI_API_KEY in your environment variables.
google_api_key = os.getenv("GEMINI_API_KEY") 
client = genai.Client(api_key=google_api_key) # Initialize the Gemini API client with the API key from environment variables

@router.post("/chatbot/get-question")
def chatbot_get_question(req: QuestionRequest):
    try:
        formatted_history = ""
        for chat in req.previous_chat_history:
            role = "AI Examiner" if chat.get("role") == "examiner" else "Student"
            formatted_history += f"{role}: {chat.get('text')}\n"

        context = f"""
        You are an AI Viva Examiner for the following subjects and their respective syllabuses:
        {req.combined_syllabus_context}
        Rule: You must ask exactly ONE short technical question picking any concept from the provided syllabus context. Do not write anything else except the question. Do not praise or reply to the previous answer.
        Current round: {req.current_round} out of 10.
        Previous Conversation History:
        {formatted_history}
        """
        response = client.models.generate_content(model='gemini-2.5-flash', contents=context)
        return {"question": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chatbot/evaluate")
def chatbot_evaluate(req: EvaluationRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor if hasattr(psycopg2, 'extras') else None)
        cursor.execute("SELECT u.name, sp.attendance_percentage, sp.mst1_marks, sp.mst2_marks FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE u.id = %s;", (req.student_id,))
        student = cursor.fetchone()
        cursor.execute("SELECT status FROM assignments WHERE student_id = %s;", (req.student_id,))
        assigns = cursor.fetchall()
        submitted = sum(1 for a in assigns if a['status'] in ['Submitted', 'Graded'])
        cursor.close()
        conn.close()

        formatted_history = ""
        for chat in req.chat_history:
            role = "AI Examiner" if chat.get("role") == "examiner" else "Student"
            formatted_history += f"{role}: {chat.get('text')}\n"

        evaluation_prompt = f"""
        Generate a HIGHLY DETAILED College Academic & Viva Report for {student['name']}.
        --- SUBJECTS & SYLLABUS COVERED ---
        {req.combined_syllabus_context}
        --- ACADEMIC DATABASE RECORDS ---
        Attendance: {student['attendance_percentage']}% | MST 1: {student['mst1_marks']}/30 | MST 2: {student['mst2_marks']}/30
        Assignments Completed: {submitted} out of {len(assigns)}
        --- VIVA TRANSCRIPT ---
        {formatted_history}
        
        FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:
        ==================================================
        STUDENT PERFORMANCE & DIAGNOSTIC REPORT
        ==================================================
        PART 1: ACADEMIC RECORD ANALYSIS
        PART 2: VIVA VOCE EVALUATION
        PART 3: WEAKNESSES & KNOWLEDGE GAPS
        PART 4: ACTIONABLE IMPROVEMENT PLAN
        PART 5: PLACEMENT READINESS & CAREER PREDICTOR 🚀
        FINAL VIVA SCORE: [Give score out of 50]
        """
        response = client.models.generate_content(model='gemini-2.5-flash', contents=evaluation_prompt)
        return {"success": True, "report": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chatbot/send-email")
def chatbot_send_email(req: EmailSendRequest):
    success = send_report_email(req.sender_email, req.sender_password, req.to_email, req.student_name, req.report_text)
    if success: return {"success": True, "message": f"Report successfully sent to {req.to_email}"}
    raise HTTPException(status_code=500, detail="Failed to send email.")