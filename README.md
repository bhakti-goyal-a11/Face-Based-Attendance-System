# Face-Based-Attendance-System

# 🎓 Smart Face-Based Attendance System

An advanced **AI-powered attendance management system** built using **Python, Streamlit, and Face Recognition**. This project ensures **secure, real-time, and anti-proxy attendance tracking** using facial verification along with role-based dashboards for Admin, Faculty, and Students.

## 🚀 Features

### 🔐 Authentication System

* Secure Login & Registration (Admin / Faculty / Student)
* Password hashing for security
* Role-based access control

### 👤 Face Recognition

* Student face registration & encoding
* Real-time face verification using camera
* Anti-proxy attendance (prevents fake marking)

### 📸 Smart Attendance

* Face-verified attendance marking
* Subject-wise and section-wise tracking
* Duplicate attendance prevention
* Time-based attendance (only during active class)

### 👨‍🏫 Faculty Panel

* Take attendance with face verification
* View assigned classes and students
* Multi-section support (faculty can handle multiple sections)
* Download section-wise reports

### 👨‍💼 Admin Panel

* Dashboard with analytics
* Add / Delete users
* Assign teachers to subjects & sections
* View full attendance reports
* Edit timetable dynamically
* Download CSV reports

### 🎓 Student Panel

* View personal attendance records
* Face-based attendance marking
* Subject-wise attendance insights
* Attendance percentage visualization

### 📊 Analytics & Reports

* Section-wise attendance graphs
* Subject-wise performance
* Monthly attendance trends
* Export reports in CSV format

### 🕘 Timetable Management

* Predefined 9 AM – 5 PM schedule
* Section-wise timetable
* Editable by admin

## 🛠️ Tech Stack

* **Frontend/UI:** Streamlit
* **Backend:** Python
* **Libraries:**

  * OpenCV
  * face_recognition
  * NumPy
  * Pandas
  * Plotly
* **Database:** CSV-based storage
* **Other:** Pickle (for face encoding storage)

## 📂 Project Structure

```
├── app.py                  # Main Streamlit Application
├── users.csv               # User database
├── attendance.csv          # Attendance records
├── timetable.csv           # Class schedule
├── teachers.csv            # Faculty assignments
├── faces.pkl               # Face encodings database
```

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/face-attendance-system.git
cd face-attendance-system
```

### 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Run Application

```bash
streamlit run app.py
```

## 🔑 Usage

### 👨‍💼 Admin

* Register as Admin
* Manage users and assign teachers
* View analytics & reports

### 👨‍🏫 Faculty

* Login using credentials
* Take attendance via face verification
* View students & download reports

### 🎓 Student

* Register with face
* Login using face + password
* Mark attendance and view reports

## 🔒 Security Features

* SHA-256 password hashing
* Face-based identity verification
* Anti-duplicate attendance logic
* Role-based access restriction

## 📈 Future Enhancements

* 🔔 Email & WhatsApp notifications
* 🌐 Cloud database integration (MongoDB / Firebase)
* 📱 Mobile app version
* 🧠 AI-based attendance prediction
* 🛡️ Anti-spoofing (liveness detection)
