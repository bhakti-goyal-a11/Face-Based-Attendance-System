# Face-Based-Attendance-System

# 🎯 Face-Based Attendance System (AI/ML + Computer Vision)

An intelligent **Face Recognition-based Attendance System** built using **Python, OpenCV, and Deep Learning concepts**. This project automates attendance marking using real-time facial recognition and provides analytics through visualization and a web dashboard.

## 🚀 Project Overview

This system captures live video using a webcam, detects faces, matches them with pre-trained encodings, and automatically marks attendance with timestamps. It also provides insights through visual dashboards and supports a basic **Streamlit web interface**.

## 🧠 Key Features

* 📸 Real-time Face Detection & Recognition
* 🧾 Automatic Attendance Logging (CSV-based)
* 🧠 Face Encoding using `face_recognition` library
* ⏱️ Timestamp-based Attendance Tracking
* 📊 Attendance Visualization (Matplotlib + Seaborn)
* 🌐 Streamlit Web App Interface
* 🔐 Basic User Management System (Login/Register)
* 📅 Timetable Integration (CSV-based)

## 🏗️ Tech Stack

| Category         | Tools / Libraries   |
| ---------------- | ------------------- |
| Language         | Python              |
| Computer Vision  | OpenCV              |
| Face Recognition | face_recognition    |
| Data Handling    | Pandas, NumPy       |
| Visualization    | Matplotlib, Seaborn |
| Web App          | Streamlit           |
| Storage          | CSV Files           |

## 📂 Project Structure

```
├── Face Based Attendance System.ipynb   # Main project notebook
├── faces_data.pkl                      # Face dataset (encoded images)
├── attendance.csv                      # Attendance records
├── users.csv                           # User credentials
├── timetable.csv                       # Class schedule
├── teachers.csv                        # Faculty-subject mapping
└── streamlit_app.py                    # Web dashboard (generated in notebook)
```

## ⚙️ How It Works

### 1️⃣ Face Encoding

* Dataset (`faces_data.pkl`) is loaded
* Faces are converted into numerical encodings
* Each face is assigned a label

### 2️⃣ Real-Time Recognition

* Webcam captures frames
* Faces are detected and encoded
* Compared with stored encodings using distance metrics
* Best match → Student identified

### 3️⃣ Attendance Logging

* Name, Date, Time, Subject, Section stored in CSV
* Prevents duplicate entries within session

### 4️⃣ Visualization

* Attendance data plotted using:

  * Count plots
  * Daily/Student-wise analysis

### 5️⃣ Web Dashboard (Streamlit)

* Login/Register system
* Attendance viewing
* Admin control (basic)
* Timetable integration

## 📊 Sample Output

* ✔️ Recognized Face with Name Label
* ✔️ Attendance CSV File Generated
* ✔️ Graph showing attendance distribution

## 🧪 Installation & Setup

### 🔹 Step 1: Clone Repository

```bash
git clone https://github.com/your-username/face-attendance-system.git
cd face-attendance-system
```

### 🔹 Step 2: Install Dependencies

```bash
pip install opencv-python numpy pandas matplotlib seaborn face-recognition streamlit
```

### 🔹 Step 3: Run Notebook

```bash
jupyter notebook
```

### 🔹 Step 4: Run Streamlit App

```bash
streamlit run streamlit_app.py
```

## 📌 Use Cases

* 🎓 Colleges & Universities
* 🏫 Schools
* 🏢 Office Attendance Systems
* 🔐 Secure Access Systems

## ⚠️ Limitations

* Requires good lighting for accurate detection
* Performance depends on camera quality
* Basic dataset labeling (auto labels like Person_1, Person_2)

## 🔮 Future Enhancements

* ✅ Deep Learning-based Face Recognition (CNN)
* ✅ Anti-spoofing Detection
* ✅ Mask Detection Integration
* ✅ Cloud Database (Firebase / MongoDB)
* ✅ Role-based Advanced Admin Panel
* ✅ Mobile App Integration
