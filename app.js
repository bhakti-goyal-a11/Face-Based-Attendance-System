// ============================================================
// Smart Face Attendance System — frontend logic
// Talks to the FastAPI backend (default: http://localhost:8000)
// ============================================================
 
const API_BASE = "http://localhost:8000";
 
const state = {
  user: null,
  role: null,
  section: null,
  capturedBlob: null,
  authMode: "login",
  activeTab: null,
};
 
// ---------------- helpers ----------------
 
async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, options);
  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }
  if (!res.ok) {
    const msg = (data && data.detail) ? data.detail : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
 
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  children.flat().forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}
 
function showMessage(elem, text, type) {
  elem.textContent = text;
  elem.className = "message " + (type || "");
}
 
// ---------------- camera capture ----------------
 
let activeStream = null;
 
async function startCamera(videoEl) {
  if (activeStream) return;
  activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoEl.srcObject = activeStream;
}
 
function stopCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}
 
function captureFrame(videoEl, canvasEl) {
  canvasEl.width = videoEl.videoWidth || 480;
  canvasEl.height = videoEl.videoHeight || 360;
  const ctx = canvasEl.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return new Promise((resolve) => canvasEl.toBlob((blob) => resolve(blob), "image/jpeg", 0.9));
}
 
// ============================================================
// AUTH VIEW
// ============================================================
 
const authView = document.getElementById("authView");
const authForm = document.getElementById("authForm");
const authRole = document.getElementById("authRole");
const authSection = document.getElementById("authSection");
const sectionField = document.getElementById("sectionField");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authVideo = document.getElementById("authVideo");
const authCanvas = document.getElementById("authCanvas");
const authPreview = document.getElementById("authPreview");
const authMessage = document.getElementById("authMessage");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const faceCaptureBlock = document.getElementById("faceCaptureBlock");
 
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.authMode = btn.dataset.mode;
    authSubmitBtn.textContent = state.authMode === "login" ? "Login" : "Register";
    showMessage(authMessage, "", "");
  });
});
 
authRole.addEventListener("change", refreshAuthFormVisibility);
function refreshAuthFormVisibility() {
  const isStudent = authRole.value === "student";
  faceCaptureBlock.classList.toggle("hidden", !isStudent);
  sectionField.classList.toggle("hidden", authRole.value === "faculty" && state.authMode === "login");
}
refreshAuthFormVisibility();
 
document.getElementById("startCamBtn").addEventListener("click", () => startCamera(authVideo));
document.getElementById("captureBtn").addEventListener("click", async () => {
  const blob = await captureFrame(authVideo, authCanvas);
  state.capturedBlob = blob;
  authPreview.src = URL.createObjectURL(blob);
  authPreview.classList.remove("hidden");
});
 
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(authMessage, "", "");
 
  const formData = new FormData();
  formData.append("username", authUsername.value);
  formData.append("password", authPassword.value);
  formData.append("role", authRole.value);
  formData.append("section", authSection.value);
 
  if (authRole.value === "student") {
    if (!state.capturedBlob) {
      showMessage(authMessage, "Please capture your face first.", "error");
      return;
    }
    formData.append("face_image", state.capturedBlob, "face.jpg");
  }
 
  try {
    if (state.authMode === "login") {
      const data = await api("/api/login", { method: "POST", body: formData });
      state.user = data.username;
      state.role = data.role;
      state.section = data.section;
      stopCamera();
      enterApp();
    } else {
      await api("/api/register", { method: "POST", body: formData });
      showMessage(authMessage, "Registration successful. You can now log in.", "success");
      document.querySelector('.tab-btn[data-mode="login"]').click();
      authForm.reset();
      state.capturedBlob = null;
      authPreview.classList.add("hidden");
    }
  } catch (err) {
    showMessage(authMessage, err.message, "error");
  }
});
 
document.getElementById("logoutBtn").addEventListener("click", () => {
  state.user = null;
  state.role = null;
  state.section = null;
  document.getElementById("userInfo").classList.add("hidden");
  document.getElementById("mainView").classList.add("hidden");
  authView.classList.remove("hidden");
  authForm.reset();
});
 
// ============================================================
// MAIN APP SHELL
// ============================================================
 
const NAV = {
  admin: ["Dashboard", "Users", "Delete User", "Assign Teacher", "Timetable", "Edit Timetable"],
  faculty: ["Take Attendance", "My Students", "Timetable"],
  student: ["My Attendance", "Face Attendance", "Timetable"],
};
 
function enterApp() {
  authView.classList.add("hidden");
  document.getElementById("mainView").classList.remove("hidden");
  document.getElementById("userInfo").classList.remove("hidden");
  document.getElementById("userLabel").textContent =
    `${state.user} · ${state.role.toUpperCase()}${state.role === "student" ? " · Sec " + state.section : ""}`;
 
  const nav = document.getElementById("mainNav");
  nav.innerHTML = "";
  NAV[state.role].forEach((tab, i) => {
    const btn = el("button", { onclick: () => selectTab(tab) }, tab);
    if (i === 0) btn.classList.add("active");
    nav.appendChild(btn);
  });
  selectTab(NAV[state.role][0]);
}
 
async function selectTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll("#mainNav button").forEach((b) => {
    b.classList.toggle("active", b.textContent === tab);
  });
  await renderStatusRow();
  const content = document.getElementById("viewContent");
  content.innerHTML = "<p>Loading…</p>";
  try {
    content.innerHTML = "";
    content.appendChild(await renderTab(tab));
  } catch (err) {
    content.innerHTML = `<p class="message error">${err.message}</p>`;
  }
}
 
async function renderStatusRow() {
  const row = document.getElementById("statusRow");
  row.innerHTML = "";
  if (state.role === "student" || state.role === "faculty") {
    const section = state.role === "student" ? state.section : (row.dataset.section || "A");
    try {
      const status = await api(`/api/status?section=${encodeURIComponent(section)}`);
      row.appendChild(metricCard("Current Class", status.current_subject));
      row.appendChild(metricCard("Next Class", status.next_class));
    } catch (_) {}
  }
  if (state.role === "admin") {
    try {
      const stats = await api("/api/dashboard-stats");
      row.appendChild(metricCard("Total Users", stats.total_users));
      row.appendChild(metricCard("Students", stats.total_students));
      row.appendChild(metricCard("Attendance Records", stats.total_attendance));
      row.appendChild(metricCard("Registered Faces", stats.registered_faces));
    } catch (_) {}
  }
}
 
function metricCard(label, value) {
  return el("div", { class: "metric" },
    el("div", { class: "label" }, label),
    el("div", { class: "value" }, String(value)));
}
 
function tableFromRows(columns, rows) {
  const thead = el("thead", {}, el("tr", {}, columns.map((c) => el("th", {}, c))));
  const tbody = el("tbody", {}, rows.map((r) =>
    el("tr", {}, columns.map((c) => el("td", {}, String(r[c.toLowerCase().replace(/ /g, "_")] ?? r[c] ?? ""))))
  ));
  return el("table", {}, thead, tbody);
}
 
function barChart(counts) {
  const max = Math.max(1, ...Object.values(counts));
  const wrap = el("div", {});
  Object.entries(counts).forEach(([label, value]) => {
    wrap.appendChild(el("div", { class: "bar-row" },
      el("div", { class: "bar-label" }, label),
      el("div", { class: "bar-track" },
        el("div", { class: "bar-fill", style: `width:${(value / max) * 100}%` })),
      el("div", { class: "bar-value" }, String(value))
    ));
  });
  return wrap;
}
 
function groupCount(rows, key) {
  const counts = {};
  rows.forEach((r) => { counts[r[key]] = (counts[r[key]] || 0) + 1; });
  return counts;
}
 
// ============================================================
// TAB RENDERERS
// ============================================================
 
async function renderTab(tab) {
  if (state.role === "admin") return renderAdminTab(tab);
  if (state.role === "faculty") return renderFacultyTab(tab);
  if (state.role === "student") return renderStudentTab(tab);
  return el("div", {}, "Unknown role.");
}
 
// -------- ADMIN --------
 
async function renderAdminTab(tab) {
  if (tab === "Dashboard") {
    const attendance = await api("/api/attendance");
    return el("div", { class: "card" },
      el("h3", {}, "📊 Complete Attendance Report"),
      tableFromRows(["Name", "Date", "Time", "Subject", "Section", "Verification"], attendance));
  }
 
  if (tab === "Users") {
    const users = await api("/api/users");
    return el("div", { class: "card" },
      el("h3", {}, "👥 All Users"),
      tableFromRows(["Username", "Role", "Section", "Has_Face"], users));
  }
 
  if (tab === "Delete User") {
    const users = await api("/api/users");
    const select = el("select", {}, users.map((u) => el("option", { value: u.username }, u.username)));
    const msg = el("p", { class: "message" });
    const wrap = el("div", { class: "card" },
      el("h3", {}, "🗑️ Delete User"),
      el("div", { class: "form-row" },
        el("label", {}, "Select user", select),
        el("button", {
          class: "btn btn-danger", onclick: async () => {
            try {
              const data = await api(`/api/users/${encodeURIComponent(select.value)}`, { method: "DELETE" });
              showMessage(msg, data.message, "success");
              selectTab("Delete User");
            } catch (err) { showMessage(msg, err.message, "error"); }
          }
        }, "Delete")),
      msg);
    return wrap;
  }
 
  if (tab === "Assign Teacher") {
    const subjectSel = el("select", {}, ["AI", "ML", "DBMS", "OS", "CN", "SE"].map((s) => el("option", { value: s }, s)));
    const facultyInput = el("input", { type: "text", placeholder: "Faculty username" });
    const sectionSel = el("select", {}, ["A", "B", "C"].map((s) => el("option", { value: s }, s)));
    const msg = el("p", { class: "message" });
    const teachers = await api("/api/teachers");
 
    const wrap = el("div", {},
      el("div", { class: "card" },
        el("h3", {}, "👨‍🏫 Assign Teacher"),
        el("div", { class: "form-row" },
          el("label", {}, "Subject", subjectSel),
          el("label", {}, "Faculty", facultyInput),
          el("label", {}, "Section", sectionSel),
          el("button", {
            class: "btn btn-primary", onclick: async () => {
              if (!facultyInput.value.trim()) { showMessage(msg, "Faculty username required.", "error"); return; }
              try {
                await api("/api/teachers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ subject: subjectSel.value, faculty: facultyInput.value.trim(), section: sectionSel.value }),
                });
                showMessage(msg, "Teacher assigned.", "success");
                selectTab("Assign Teacher");
              } catch (err) { showMessage(msg, err.message, "error"); }
            }
          }, "Assign")),
        msg),
      el("div", { class: "card" },
        el("h3", {}, "📋 Teacher Assignments"),
        tableFromRows(["Subject", "Faculty", "Section"], teachers)));
    return wrap;
  }
 
  if (tab === "Timetable") {
    const rows = await api("/api/timetable");
    const cols = ["Day", "Section", "09-10", "10-11", "11-12", "12-01", "01-02", "02-03", "03-04", "04-05"];
    return el("div", { class: "card" },
      el("h3", {}, "🕘 Complete Timetable"),
      tableFromRows(cols, rows.map((r) => ({
        day: r.day, section: r.section, "09-10": r["09-10"], "10-11": r["10-11"],
        "11-12": r["11-12"], "12-01": r["12-01"], "01-02": r["01-02"],
        "02-03": r["02-03"], "03-04": r["03-04"], "04-05": r["04-05"],
      }))));
  }
 
  if (tab === "Edit Timetable") {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const slots = ["09-10", "10-11", "11-12", "12-01", "01-02", "02-03", "03-04", "04-05"];
    const daySel = el("select", {}, days.map((d) => el("option", { value: d }, d)));
    const sectionSel = el("select", {}, ["A", "B", "C"].map((s) => el("option", { value: s }, s)));
    const slotSel = el("select", {}, slots.map((s) => el("option", { value: s }, s)));
    const subjectInput = el("input", { type: "text", placeholder: "e.g. AI, BREAK, FREE" });
    const msg = el("p", { class: "message" });
    return el("div", { class: "card" },
      el("h3", {}, "✏️ Edit Timetable Cell"),
      el("div", { class: "form-row" },
        el("label", {}, "Day", daySel),
        el("label", {}, "Section", sectionSel),
        el("label", {}, "Slot", slotSel),
        el("label", {}, "Subject", subjectInput),
        el("button", {
          class: "btn btn-primary", onclick: async () => {
            try {
              await api("/api/timetable", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  day: daySel.value, section: sectionSel.value,
                  slot: slotSel.value, subject: subjectInput.value.trim() || "FREE",
                }),
              });
              showMessage(msg, "Timetable updated.", "success");
            } catch (err) { showMessage(msg, err.message, "error"); }
          }
        }, "Save")),
      msg);
  }
}
 
// -------- FACULTY --------
 
async function renderFacultyTab(tab) {
  if (tab === "Take Attendance") {
    const sectionSel = el("select", {}, ["A", "B", "C"].map((s) => el("option", { value: s }, s)));
    const container = el("div", {});
 
    async function buildForSection(section) {
      container.innerHTML = "";
      const [users, teachers] = await Promise.all([
        api(`/api/users?role=student&section=${section}`),
        api(`/api/teachers?faculty=${encodeURIComponent(state.user)}`),
      ]);
      const status = await api(`/api/status?section=${section}`);
      const assignedHere = teachers.find((t) => t.section === section);
 
      const info = el("div", { class: "card" },
        el("h3", {}, "🔐 Take Attendance"),
        el("p", {}, `Current class in Section ${section}: `, el("strong", {}, status.current_subject)),
        assignedHere
          ? el("p", { class: "badge ok" }, `You are assigned to ${assignedHere.subject} in Section ${section}`)
          : el("p", { class: "badge warn" }, "You are not assigned to teach this section right now."));
      container.appendChild(info);
 
      if (!assignedHere || assignedHere.subject !== status.current_subject) {
        container.appendChild(el("p", { class: "message" }, "🚫 You cannot take attendance for this section right now."));
        return;
      }
 
      const studentSel = el("select", {}, users.map((u) => el("option", { value: u.username }, u.username)));
      const video = el("video", { autoplay: "", playsinline: "" });
      const canvas = el("canvas", { class: "hidden" });
      const preview = el("img", { class: "preview hidden" });
      const msg = el("p", { class: "message" });
      let blob = null;
 
      const camCard = el("div", { class: "card" },
        el("h3", {}, "📸 Verify & Mark"),
        el("div", { class: "form-row" }, el("label", {}, "Student", studentSel)),
        video, canvas,
        el("div", { class: "capture-row" },
          el("button", { class: "btn", type: "button", onclick: () => startCamera(video) }, "Start Camera"),
          el("button", {
            class: "btn", type: "button", onclick: async () => {
              blob = await captureFrame(video, canvas);
              preview.src = URL.createObjectURL(blob);
              preview.classList.remove("hidden");
            }
          }, "Capture")),
        preview,
        el("button", {
          class: "btn btn-primary", onclick: async () => {
            if (!blob) { showMessage(msg, "Capture the student's face first.", "error"); return; }
            const fd = new FormData();
            fd.append("username", studentSel.value);
            fd.append("section", section);
            fd.append("face_image", blob, "face.jpg");
            try {
              const data = await api("/api/attendance/mark", { method: "POST", body: fd });
              showMessage(msg, "✅ " + data.message, "success");
              stopCamera();
            } catch (err) { showMessage(msg, "❌ " + err.message, "error"); }
          }
        }, "Verify & Mark Attendance"),
        msg);
      container.appendChild(camCard);
    }
 
    sectionSel.addEventListener("change", () => buildForSection(sectionSel.value));
    await buildForSection(sectionSel.value);
 
    return el("div", {},
      el("div", { class: "card" }, el("label", {}, "Section", sectionSel)),
      container);
  }
 
  if (tab === "My Students") {
    const sectionSel = el("select", {}, ["A", "B", "C"].map((s) => el("option", { value: s }, s)));
    const content = el("div", {});
    async function load(section) {
      const [students, attendance] = await Promise.all([
        api(`/api/users?role=student&section=${section}`),
        api(`/api/attendance?section=${section}`),
      ]);
      content.innerHTML = "";
      content.appendChild(el("div", { class: "card" }, el("h3", {}, "🎓 Students"), tableFromRows(["Username", "Role", "Section"], students)));
      content.appendChild(el("div", { class: "card" }, el("h3", {}, "📋 Section Attendance"), tableFromRows(["Name", "Date", "Time", "Subject", "Section", "Verification"], attendance)));
    }
    sectionSel.addEventListener("change", () => load(sectionSel.value));
    await load(sectionSel.value);
    return el("div", {}, el("div", { class: "card" }, el("label", {}, "Section", sectionSel)), content);
  }
 
  if (tab === "Timetable") {
    const sectionSel = el("select", {}, ["A", "B", "C"].map((s) => el("option", { value: s }, s)));
    const content = el("div", {});
    async function load(section) {
      const rows = await api(`/api/timetable?section=${section}`);
      content.innerHTML = "";
      content.appendChild(el("div", { class: "card" }, el("h3", {}, `🕘 Section ${section} Timetable`),
        tableFromRows(["Day", "09-10", "10-11", "11-12", "12-01", "01-02", "02-03", "03-04", "04-05"],
          rows.map((r) => ({ day: r.day, "09-10": r["09-10"], "10-11": r["10-11"], "11-12": r["11-12"], "12-01": r["12-01"], "01-02": r["01-02"], "02-03": r["02-03"], "03-04": r["03-04"], "04-05": r["04-05"] })))));
    }
    sectionSel.addEventListener("change", () => load(sectionSel.value));
    await load(sectionSel.value);
    return el("div", {}, el("div", { class: "card" }, el("label", {}, "Section", sectionSel)), content);
  }
}
 
// -------- STUDENT --------
 
async function renderStudentTab(tab) {
  if (tab === "My Attendance") {
    const rows = await api(`/api/attendance?username=${encodeURIComponent(state.user)}`);
    const verified = rows.filter((r) => r.verification === "FACE VERIFIED").length;
    return el("div", {},
      el("div", { class: "status-row" },
        metricCard("Total Records", rows.length),
        metricCard("Subjects", new Set(rows.map((r) => r.subject)).size),
        metricCard("Face Verified", verified)),
      el("div", { class: "card" }, el("h3", {}, "📋 My Attendance"),
        tableFromRows(["Date", "Time", "Subject", "Section", "Verification"], rows)));
  }
 
  if (tab === "Face Attendance") {
    const status = await api(`/api/status?section=${state.section}`);
    const video = el("video", { autoplay: "", playsinline: "" });
    const canvas = el("canvas", { class: "hidden" });
    const preview = el("img", { class: "preview hidden" });
    const msg = el("p", { class: "message" });
    let blob = null;
 
    if (status.current_subject === "FREE" || status.current_subject === "BREAK") {
      return el("div", { class: "card" },
        el("h3", {}, "🔐 Face Verified Attendance"),
        el("p", { class: "message error" }, "Attendance cannot be marked during FREE/BREAK."));
    }
 
    return el("div", { class: "card" },
      el("h3", {}, "🔐 Face Verified Attendance"),
      el("p", {}, "Current subject: ", el("strong", {}, status.current_subject)),
      video, canvas,
      el("div", { class: "capture-row" },
        el("button", { class: "btn", type: "button", onclick: () => startCamera(video) }, "Start Camera"),
        el("button", {
          class: "btn", type: "button", onclick: async () => {
            blob = await captureFrame(video, canvas);
            preview.src = URL.createObjectURL(blob);
            preview.classList.remove("hidden");
          }
        }, "📸 Capture")),
      preview,
      el("button", {
        class: "btn btn-primary", onclick: async () => {
          if (!blob) { showMessage(msg, "Please capture your face.", "error"); return; }
          const fd = new FormData();
          fd.append("username", state.user);
          fd.append("section", state.section);
          fd.append("face_image", blob, "face.jpg");
          try {
            const data = await api("/api/attendance/mark", { method: "POST", body: fd });
            showMessage(msg, "🎉 " + data.message, "success");
            stopCamera();
          } catch (err) { showMessage(msg, "❌ " + err.message, "error"); }
        }
      }, "Verify Face & Mark Attendance"),
      msg);
  }
 
  if (tab === "Timetable") {
    const rows = await api(`/api/timetable?section=${state.section}`);
    return el("div", { class: "card" }, el("h3", {}, `🕘 Section ${state.section} Timetable`),
      tableFromRows(["Day", "09-10", "10-11", "11-12", "12-01", "01-02", "02-03", "03-04", "04-05"],
        rows.map((r) => ({ day: r.day, "09-10": r["09-10"], "10-11": r["10-11"], "11-12": r["11-12"], "12-01": r["12-01"], "01-02": r["01-02"], "02-03": r["02-03"], "03-04": r["03-04"], "04-05": r["04-05"] }))));
  }
}
 