"""
main.py
FastAPI backend for the Smart Face-Based Attendance System.
 
Run with:
    uvicorn main:app --reload --port 8000
 
Endpoints are consumed by the static frontend in ../frontend.
"""
 
import hashlib
from datetime import datetime
from typing import Optional, List
 
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
 
import db
import face_utils
 
app = FastAPI(title="Smart Face Attendance System API")
 
# Allow the static frontend (served from any local origin / file) to call this API.
# Tighten this to your real frontend origin in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
db.init_db()
 
SUBJECTS = ["AI", "ML", "DBMS", "OS", "CN", "SE"]
SECTIONS = ["A", "B", "C"]
 
SLOT_MAP = {
    9: "09-10", 10: "10-11", 11: "11-12", 12: "12-01",
    13: "01-02", 14: "02-03", 15: "03-04", 16: "04-05",
}
 
 
def hash_pass(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
 
 
def current_subject(section: str) -> str:
    day = datetime.now().strftime("%A")
    hour = datetime.now().hour
    slot = SLOT_MAP.get(hour)
    if not slot:
        return "FREE"
    rows = db.get_timetable(section=section)
    row = next((r for r in rows if r["day"] == day), None)
    if not row:
        return "FREE"
    return row.get(slot) or "FREE"
 
 
def next_class(section: str) -> str:
    day = datetime.now().strftime("%A")
    hour = datetime.now().hour
    future_hours = [h for h in SLOT_MAP if h > hour]
    rows = db.get_timetable(section=section)
    row = next((r for r in rows if r["day"] == day), None)
    if not row:
        return "No class"
    for h in future_hours:
        subject = row.get(SLOT_MAP[h])
        if subject and subject not in ("FREE", "BREAK"):
            return f"{SLOT_MAP[h]} -> {subject}"
    return "No upcoming class"
 
 
# =========================================================
# AUTH
# =========================================================
 
@app.post("/api/register")
async def register(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    section: str = Form("A"),
    face_image: Optional[UploadFile] = File(None),
):
    username = username.strip()
    password = password.strip()
 
    if not username:
        raise HTTPException(400, "Username is required.")
    if not password:
        raise HTTPException(400, "Password is required.")
    if role not in ("admin", "faculty", "student"):
        raise HTTPException(400, "Invalid role.")
    if db.get_user(username):
        raise HTTPException(400, "Username already exists.")
 
    face_encoding = None
    if role == "student":
        if face_image is None:
            raise HTTPException(400, "Student registration requires a face image.")
        image_bytes = await face_image.read()
        face_encoding, error = face_utils.encode_face_from_bytes(image_bytes)
        if error:
            raise HTTPException(400, error)
 
    db.create_user(username, hash_pass(password), role, section, face_encoding)
    return {"success": True, "message": "Registration successful."}
 
 
@app.post("/api/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    section: str = Form("A"),
    face_image: Optional[UploadFile] = File(None),
):
    username = username.strip()
    password = password.strip()
 
    user = db.get_user(username)
    if (
        not user
        or user["password_hash"] != hash_pass(password)
        or user["role"] != role
        or (role == "student" and user["section"] != section)
    ):
        raise HTTPException(401, "Invalid username, password, role or section.")
 
    if role == "student":
        if face_image is None:
            raise HTTPException(400, "Face capture is required for student login.")
        image_bytes = await face_image.read()
        known_encoding = db.get_face_encoding(username)
        verified, message = face_utils.verify_face_from_bytes(known_encoding, image_bytes)
        if not verified:
            raise HTTPException(401, message)
 
    return {
        "success": True,
        "username": username,
        "role": role,
        "section": user["section"] or section,
    }
 
 
# =========================================================
# ATTENDANCE
# =========================================================
 
@app.post("/api/attendance/mark")
async def mark_attendance(
    username: str = Form(...),
    section: str = Form(...),
    face_image: UploadFile = File(...),
):
    subject = current_subject(section)
    if subject in ("FREE", "BREAK"):
        raise HTTPException(400, "No class is running right now.")
 
    user = db.get_user(username)
    if not user:
        raise HTTPException(404, "User not found.")
 
    known_encoding = db.get_face_encoding(username)
    image_bytes = await face_image.read()
    verified, message = face_utils.verify_face_from_bytes(known_encoding, image_bytes)
    if not verified:
        raise HTTPException(401, message)
 
    today = datetime.now().strftime("%Y-%m-%d")
    if db.has_marked_today(username, today, subject, section):
        raise HTTPException(400, "Attendance already marked for this subject today.")
 
    db.add_attendance(
        username, today, datetime.now().strftime("%H:%M:%S"),
        subject, section, "FACE VERIFIED",
    )
    return {"success": True, "message": f"Attendance marked for {subject}."}
 
 
@app.get("/api/attendance")
def get_attendance(username: Optional[str] = None, section: Optional[str] = None):
    return db.list_attendance(name=username, section=section)
 
 
# =========================================================
# USERS (ADMIN)
# =========================================================
 
@app.get("/api/users")
def get_users(role: Optional[str] = None, section: Optional[str] = None):
    return db.list_users(role=role, section=section)
 
 
@app.delete("/api/users/{username}")
def remove_user(username: str):
    if not db.get_user(username):
        raise HTTPException(404, "User not found.")
    db.delete_user(username)
    return {"success": True, "message": f"{username} deleted."}
 
 
# =========================================================
# TEACHERS
# =========================================================
 
class TeacherAssign(BaseModel):
    subject: str
    faculty: str
    section: str
 
 
@app.post("/api/teachers")
def add_teacher(payload: TeacherAssign):
    db.assign_teacher(payload.subject, payload.faculty, payload.section)
    return {"success": True, "message": "Teacher assigned."}
 
 
@app.get("/api/teachers")
def get_teachers(faculty: Optional[str] = None):
    return db.list_teachers(faculty=faculty)
 
 
# =========================================================
# TIMETABLE
# =========================================================
 
@app.get("/api/timetable")
def get_timetable_api(section: Optional[str] = None):
    return db.get_timetable(section=section)
 
 
class TimetableCell(BaseModel):
    day: str
    section: str
    slot: str
    subject: str
 
 
@app.put("/api/timetable")
def update_timetable(payload: TimetableCell):
    db.update_timetable_cell(payload.day, payload.section, payload.slot, payload.subject)
    return {"success": True, "message": "Timetable updated."}
 
 
# =========================================================
# DASHBOARD / STATUS
# =========================================================
 
@app.get("/api/status")
def status(section: str = "A"):
    return {
        "current_subject": current_subject(section),
        "next_class": next_class(section),
    }
 
 
@app.get("/api/dashboard-stats")
def dashboard_stats():
    users = db.list_users()
    attendance = db.list_attendance()
    return {
        "total_users": len(users),
        "total_students": len([u for u in users if u["role"] == "student"]),
        "total_attendance": len(attendance),
        "registered_faces": len([u for u in users if u["has_face"]]),
    }
 
 
@app.get("/api/health")
def health():
    return {"status": "ok", "face_recognition_available": face_utils.FACE_AVAILABLE}
 