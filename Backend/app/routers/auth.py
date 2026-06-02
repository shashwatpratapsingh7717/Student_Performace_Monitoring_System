from fastapi import APIRouter, HTTPException
import psycopg2.extras
import random
from app.database import get_db_connection
from app.schemas import MentorRegister, OTPRequest, OTPVerify

router = APIRouter()

router = APIRouter()

@router.post("/register-mentor")   # <--- KEEP ONLY THIS ONE ✅
def register_mentor(data: MentorRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO mentors (name, email, mobile, password) VALUES (%s, %s, %s, %s) RETURNING id;", 
                       (data.name, data.email, data.mobile, data.password))
        conn.commit()
        return {"success": True, "message": "Mentor Registered Successfully!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Mobile or Email already exists!")
    finally:
        cursor.close()
        conn.close()

@router.post("/login/request-otp")
def request_otp(data: OTPRequest):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor if hasattr(psycopg2, 'extras') else None)
    try:
        cursor.execute("SELECT id, name FROM mentors WHERE mobile = %s;", (data.mobile,))
        mentor = cursor.fetchone()
        if not mentor:
            raise HTTPException(status_code=404, detail="Mobile number not registered! Please register first.")
        
        generated_otp = str(random.randint(100000, 999999))
        cursor.execute("UPDATE mentors SET current_otp = %s WHERE mobile = %s;", (generated_otp, data.mobile))
        conn.commit()
        print(f"\n🔔🔔🔔 OTP for {data.mobile} is: {generated_otp} 🔔🔔🔔\n")
        return {"success": True, "message": "OTP generated successfully!", "dev_otp": generated_otp}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/login/verify-otp")
def verify_otp(data: OTPVerify):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor if hasattr(psycopg2, 'extras') else None)
    try:
        cursor.execute("SELECT id, name, current_otp FROM mentors WHERE mobile = %s;", (data.mobile,))
        mentor = cursor.fetchone()
        if not mentor or mentor['current_otp'] != data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP!")
            
        cursor.execute("UPDATE mentors SET current_otp = NULL WHERE mobile = %s;", (data.mobile,))
        conn.commit()
        return {"success": True, "message": "Login Successful!", "mentor": {"id": mentor['id'], "name": mentor['name'], "role": "Mentor", "mobile": data.mobile}}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()