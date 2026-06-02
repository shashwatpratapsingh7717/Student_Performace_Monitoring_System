from fastapi import APIRouter, HTTPException, UploadFile, File
import psycopg2.extras
import csv
import codecs
from app.database import get_db_connection
from app.schemas import NewStudent, UpdateStudentData

router = APIRouter()

@router.post("/add-student")
def add_student(data: NewStudent):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, 'default123', 'student') RETURNING id;", (data.name, data.email))
        new_user_id = cursor.fetchone()[0]
        cursor.execute("INSERT INTO student_profiles (user_id, enrollment_no, current_semester, attendance_percentage, mst1_marks, mst2_marks, parents_email, mentor_id) VALUES (%s, %s, %s, 0, 0, 0, %s, %s);", 
                       (new_user_id, data.enrollment, data.semester, data.parents_email, data.mentor_id))
        default_subjects = ["Data Structures", "Operating Systems", "Web Development"]
        for sub in default_subjects:
            cursor.execute("INSERT INTO assignments (student_id, subject_name, assignment_title, status) VALUES (%s, %s, 'Assignment 1', 'Pending');", (new_user_id, sub))
        conn.commit()
        return {"success": True, "message": "Student added successfully!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/students/{semester_id}")
def get_students_by_semester(semester_id: int, mentor_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor if hasattr(psycopg2, 'extras') else None)
    cursor.execute("""
        SELECT u.id, u.name, sp.enrollment_no, sp.attendance_percentage, sp.mst1_marks, sp.mst2_marks, sp.parents_email
        FROM users u JOIN student_profiles sp ON u.id = sp.user_id
        WHERE sp.current_semester = %s AND u.role = 'student' AND sp.mentor_id = %s;
    """, (semester_id, mentor_id))
    students_data = cursor.fetchall()
    students_list = []
    for std in students_data:
        std_id = std['id'] if isinstance(std, dict) else std[0]
        cursor.execute("SELECT id, subject_name, assignment_title, status, file_path FROM assignments WHERE student_id = %s ORDER BY subject_name, id;", (std_id,))
        assignments = cursor.fetchall()
        assign_list = [{"id": a['id'], "subject": a['subject_name'], "title": a['assignment_title'], "status": a['status'], "fileUrl": a['file_path']} if isinstance(a, dict) else {"id": a[0], "subject": a[1], "title": a[2], "status": a[3], "fileUrl": a[4]} for a in assignments]
        submitted_count = sum(1 for a in assign_list if a['status'] in ['Submitted', 'Graded'])
        assign_percent = (submitted_count / len(assign_list)) * 100 if assign_list else 0
        students_list.append({
            "id": std_id, "name": std['name'] if isinstance(std, dict) else std[1], "enroll": std['enrollment_no'] if isinstance(std, dict) else std[2],
            "attendance": float(std['attendance_percentage'] if isinstance(std, dict) else std[3]), "mst1": std['mst1_marks'] if isinstance(std, dict) else std[4],
            "mst2": std['mst2_marks'] if isinstance(std, dict) else std[5], "parents_email": std['parents_email'] if isinstance(std, dict) else std[6],
            "assignments": assign_list, "assignmentPercent": round(assign_percent)
        })
    cursor.close()
    conn.close()
    return students_list

@router.put("/update-student/{student_id}")
def update_student_data(student_id: int, data: UpdateStudentData):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE student_profiles SET attendance_percentage = %s, mst1_marks = %s, mst2_marks = %s WHERE user_id = %s;", (data.attendance, data.mst1, data.mst2, student_id))
        cursor.execute("SELECT id FROM assignments WHERE student_id = %s;", (student_id,))
        existing_ids = [row[0] for row in cursor.fetchall()]
        incoming_ids = [a.id for a in data.assignments if a.id is not None]
        for eid in existing_ids:
            if eid not in incoming_ids: cursor.execute("DELETE FROM assignments WHERE id = %s;", (eid,))
        for assign in data.assignments:
            if assign.id is not None:
                cursor.execute("UPDATE assignments SET subject_name = %s, assignment_title = %s, status = %s WHERE id = %s AND student_id = %s;", (assign.subject_name, assign.assignment_title, assign.status, assign.id, student_id))
            else:
                cursor.execute("INSERT INTO assignments (student_id, subject_name, assignment_title, status) VALUES (%s, %s, %s, %s);", (student_id, assign.subject_name, assign.assignment_title, assign.status))
        conn.commit()
        return {"success": True, "message": "Updated successfully!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/bulk-upload-students")
async def bulk_upload_students(mentor_id: int, file: UploadFile = File(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8-sig'))
        row_count = 0
        for row in csvReader:
            if not row.get('name') or not row.get('email'): continue
            cursor.execute("INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, 'default123', 'student') RETURNING id;", (row['name'].strip(), row['email'].strip()))
            new_user_id = cursor.fetchone()[0]
            cursor.execute("INSERT INTO student_profiles (user_id, enrollment_no, current_semester, attendance_percentage, mst1_marks, mst2_marks, parents_email, mentor_id) VALUES (%s, %s, %s, 0, 0, 0, %s, %s);", 
                           (new_user_id, row['enrollment'].strip(), int(row['semester']), row['parents_email'].strip(), mentor_id))
            default_subjects = ["Data Structures", "Operating Systems", "Web Development"]
            for sub in default_subjects: cursor.execute("INSERT INTO assignments (student_id, subject_name, assignment_title, status) VALUES (%s, %s, 'Assignment 1', 'Pending');", (new_user_id, sub))
            row_count += 1
        conn.commit()
        return {"success": True, "message": f"Successfully uploaded {row_count} students!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.put("/promote-students/{current_sem_id}")
def promote_students(current_sem_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE student_profiles SET current_semester = current_semester + 1 WHERE current_semester = %s;", (current_sem_id,))
        cursor.execute("UPDATE assignments a SET status = 'Pending', file_path = NULL FROM student_profiles sp WHERE a.student_id = sp.user_id AND sp.current_semester = %s + 1;", (current_sem_id,))
        conn.commit()
        return {"success": True, "message": f"Successfully promoted class to Semester {current_sem_id + 1}!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.delete("/delete-student/{student_id}")
def delete_student(student_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM assignments WHERE student_id = %s;", (student_id,))
        cursor.execute("DELETE FROM student_profiles WHERE user_id = %s;", (student_id,))
        cursor.execute("DELETE FROM users WHERE id = %s;", (student_id,))
        conn.commit()
        return {"success": True, "message": "Student successfully deleted!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()