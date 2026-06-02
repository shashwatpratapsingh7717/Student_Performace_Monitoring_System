from pydantic import BaseModel
from typing import List, Optional

class NewStudent(BaseModel):
    name: str
    email: str
    enrollment: str
    semester: int
    parents_email: str 
    mentor_id: int  

class AssignmentItem(BaseModel):
    id: Optional[int] = None
    subject_name: str       
    assignment_title: str   
    status: str

class UpdateStudentData(BaseModel):
    attendance: float
    mst1: int
    mst2: int
    assignments: List[AssignmentItem]

class QuestionRequest(BaseModel):
    student_id: int
    current_round: int
    previous_chat_history: List[dict]
    combined_syllabus_context: str

class EvaluationRequest(BaseModel):
    student_id: int
    chat_history: List[dict]
    combined_syllabus_context: str

class EmailSendRequest(BaseModel):
    to_email: str
    student_name: str
    report_text: str
    sender_email: str     
    sender_password: str  

class MentorRegister(BaseModel):
    name: str
    email: str
    mobile: str
    password: str

class OTPRequest(BaseModel):
    mobile: str

class OTPVerify(BaseModel):
    mobile: str
    otp: str