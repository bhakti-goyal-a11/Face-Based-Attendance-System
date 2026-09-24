 
import sqlite3
import json
import os
from contextlib import contextmanager
 
DB_PATH = os.path.join(os.path.dirname(__file__), "attendance.db")
 
DEFAULT_TIMETABLE = [
    ("Monday", "A", "AI", "ML", "DBMS", "BREAK", "OS", "CN", "SE", "AI"),
    ("Monday", "B", "ML", "AI", "OS", "BREAK", "DBMS", "SE", "CN", "ML"),
    ("Monday", "C", "DBMS", "CN", "AI", "BREAK", "ML", "OS", "SE", "CN"),
    ("Tuesday", "A", "ML", "AI", "CN", "BREAK", "DBMS", "OS", "SE", "DBMS"),
    ("Tuesday", "B", "AI", "ML", "DBMS", "BREAK", "OS", "CN", "SE", "OS"),
    ("Tuesday", "C", "CN", "DBMS", "ML", "BREAK", "AI", "SE", "OS", "ML"),
    ("Wednesday", "A", "DBMS", "CN", "AI", "BREAK", "ML", "OS", "SE", "CN"),
    ("Wednesday", "B", "OS", "DBMS", "ML", "BREAK", "AI", "SE", "CN", "AI"),
    ("Wednesday", "C", "ML", "AI", "CN", "BREAK", "DBMS", "OS", "SE", "DBMS"),
    ("Thursday", "A", "CN", "OS", "ML", "BREAK", "AI", "DBMS", "SE", "ML"),
    ("Thursday", "B", "AI", "CN", "OS", "BREAK", "ML", "DBMS", "SE", "DBMS"),
    ("Thursday", "C", "DBMS", "ML", "AI", "BREAK", "OS", "CN", "SE", "AI"),
    ("Friday", "A", "SE", "ML", "AI", "BREAK", "CN", "OS", "DBMS", "AI"),
    ("Friday", "B", "DBMS", "SE", "CN", "BREAK", "AI", "ML", "OS", "ML"),
    ("Friday", "C", "AI", "CN", "OS", "BREAK", "ML", "DBMS", "SE", "CN"),
    ("Saturday", "A", "AI", "DBMS", "ML", "BREAK", "OS", "CN", "SE", "FREE"),
    ("Saturday", "B", "ML", "AI", "OS", "BREAK", "DBMS", "SE", "CN", "FREE"),
    ("Saturday", "C", "CN", "ML", "DBMS", "BREAK", "AI", "OS", "SE", "FREE"),
]
 
SLOT_COLUMNS = ["09-10", "10-11", "11-12", "12-01", "01-02", "02-03", "03-04", "04-05"]
 
 
@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
 
 
def init_db():
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                section TEXT,
                face_encoding TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                subject TEXT,
                section TEXT,
                verification TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                faculty TEXT NOT NULL,
                section TEXT NOT NULL
            )
        """)
        c.execute(f"""
            CREATE TABLE IF NOT EXISTS timetable (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                section TEXT NOT NULL,
                {", ".join(f'"{s}" TEXT' for s in SLOT_COLUMNS)}
            )
        """)
 
        c.execute("SELECT COUNT(*) FROM timetable")
        if c.fetchone()[0] == 0:
            placeholders = ", ".join(["?"] * (2 + len(SLOT_COLUMNS)))
            c.executemany(
                f"INSERT INTO timetable (day, section, {', '.join(f'\"{s}\"' for s in SLOT_COLUMNS)}) "
                f"VALUES ({placeholders})",
                DEFAULT_TIMETABLE,
            )
 
        # Seed a default admin account (username: admin, password: admin123)
        c.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        if c.fetchone()[0] == 0:
            import hashlib
            c.execute(
                "INSERT INTO users (username, password_hash, role, section, face_encoding) VALUES (?, ?, ?, ?, ?)",
                ("admin", hashlib.sha256("admin123".encode()).hexdigest(), "admin", None, None),
            )
 
 
# ---------------- USERS ----------------
 
def get_user(username):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None
 
 
def list_users(role=None, section=None):
    with get_conn() as conn:
        q = "SELECT username, role, section, (face_encoding IS NOT NULL) as has_face FROM users WHERE 1=1"
        params = []
        if role:
            q += " AND role = ?"
            params.append(role)
        if section:
            q += " AND section = ?"
            params.append(section)
        rows = conn.execute(q, params).fetchall()
        return [dict(r) for r in rows]
 
 
def create_user(username, password_hash, role, section, face_encoding=None):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (username, password_hash, role, section, face_encoding) VALUES (?, ?, ?, ?, ?)",
            (username, password_hash, role, section, json.dumps(face_encoding) if face_encoding is not None else None),
        )
 
 
def delete_user(username):
    with get_conn() as conn:
        conn.execute("DELETE FROM users WHERE username = ?", (username,))
 
 
def get_face_encoding(username):
    user = get_user(username)
    if not user or not user.get("face_encoding"):
        return None
    return json.loads(user["face_encoding"])
 
 
# ---------------- ATTENDANCE ----------------
 
def add_attendance(name, date, time, subject, section, verification):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO attendance (name, date, time, subject, section, verification) VALUES (?, ?, ?, ?, ?, ?)",
            (name, date, time, subject, section, verification),
        )
 
 
def has_marked_today(name, date, subject, section):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM attendance WHERE name=? AND date=? AND subject=? AND section=?",
            (name, date, subject, section),
        ).fetchone()
        return row is not None
 
 
def list_attendance(name=None, section=None):
    with get_conn() as conn:
        q = "SELECT * FROM attendance WHERE 1=1"
        params = []
        if name:
            q += " AND name = ?"
            params.append(name)
        if section:
            q += " AND section = ?"
            params.append(section)
        q += " ORDER BY id DESC"
        rows = conn.execute(q, params).fetchall()
        return [dict(r) for r in rows]
 
 
# ---------------- TEACHERS ----------------
 
def assign_teacher(subject, faculty, section):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO teachers (subject, faculty, section) VALUES (?, ?, ?)",
            (subject, faculty, section),
        )
 
 
def list_teachers(faculty=None):
    with get_conn() as conn:
        q = "SELECT * FROM teachers WHERE 1=1"
        params = []
        if faculty:
            q += " AND faculty = ?"
            params.append(faculty)
        rows = conn.execute(q, params).fetchall()
        return [dict(r) for r in rows]
 
 
# ---------------- TIMETABLE ----------------
 
def get_timetable(section=None):
    with get_conn() as conn:
        q = "SELECT * FROM timetable WHERE 1=1"
        params = []
        if section:
            q += " AND section = ?"
            params.append(section)
        rows = conn.execute(q, params).fetchall()
        return [dict(r) for r in rows]
 
 
def update_timetable_cell(day, section, slot, subject):
    with get_conn() as conn:
        conn.execute(
            f'UPDATE timetable SET "{slot}" = ? WHERE day = ? AND section = ?',
            (subject, day, section),
        )
 