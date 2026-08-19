// script.js - Time-Based Status (Today/Running/Completed) with Past filter by Date only
// Fixed date parsing for DD-MM-YYYY format

if (!window.showNotification) {
  window.showNotification = function (message, type = "info") {
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : type === "warning" ? "exclamation-triangle" : "info-circle"}"></i>
                <span>${message}</span>
            </div>
            <button class="btn-close-notification">&times;</button>
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    const closeBtn = notification.querySelector(".btn-close-notification");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
      });
    }
  };
}

// ------------------------------------------------------------------
// ফিল্টার স্টেট সংরক্ষণ ও ট্র্যাকিং
// ------------------------------------------------------------------
let _savingFilterState = false;
const FILTER_STATE_KEY = "examFilterState";
let activeQuickFilter = null;

// DOM Elements
const deptSelect = document.getElementById("deptSelect");
const dateFilter = document.getElementById("dateFilter");
const routineList = document.getElementById("routineList");
const totalExamsEl = document.getElementById("totalExams");
const upcomingExamsEl = document.getElementById("upcomingExams");
const todayExamsEl = document.getElementById("todayExams");
const completedExamsEl = document.getElementById("completedExams");
const nextExamCard = document.getElementById("nextExamCard");
const upcomingList = document.getElementById("upcomingList");
const currentDateEl = document.getElementById("currentDate");
const nextExamInfo = document.getElementById("nextExamInfo");

const semesterMultipleToggle = document.getElementById("semesterMultipleToggle");
const semesterSingleSelect = document.getElementById("semesterSingleSelect");
const semesterMultipleContainer = document.getElementById("semesterMultipleContainer");

const examTypeMultipleToggle = document.getElementById("examTypeMultipleToggle");
const examTypeSingleSelect = document.getElementById("examTypeSingleSelect");
const examTypeMultipleContainer = document.getElementById("examTypeMultipleContainer");

// Global variables
let filteredExamRoutine = [];
let currentAppDate = ""; // YYYY-MM-DD
let examData = [];
let isLoading = false;
let isFilterChanging = false;

window.filteredExamRoutine = filteredExamRoutine;
window.examData = examData;

// ------------------------------------------------------------------
// সময়-ভিত্তিক স্ট্যাটাসের জন্য হেলপার ফাংশন
// ------------------------------------------------------------------
const EXAM_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

// Convert DD-MM-YYYY to YYYY-MM-DD for comparison
function convertToStandardDate(dateStr) {
    if (!dateStr) return null;
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    // Handle DD-MM-YYYY or D-M-YYYY
    let parts = dateStr.split('-');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    // Handle DD/MM/YYYY or D/M/YYYY
    parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr; // fallback
}

function parseExamDateTime(exam) {
  const standardDate = convertToStandardDate(exam.examDate);
  if (!standardDate) return new Date(0);
  
  const parts = standardDate.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  let hours = 0, minutes = 0;
  const timeStr = exam.time || "10:00 AM";
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, modifier] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (modifier === 'PM' && h !== 12) h += 12;
    if (modifier === 'AM' && h === 12) h = 0;
    hours = h;
    minutes = m || 0;
  } else {
    const [h, m] = timeStr.split(':').map(Number);
    hours = h;
    minutes = m || 0;
  }
  return new Date(year, month, day, hours, minutes, 0);
}

function getExamStatusWithTime(exam) {
  const now = new Date();
  const start = parseExamDateTime(exam);
  const end = new Date(start.getTime() + EXAM_DURATION_MS);
  
  const examDateStandard = convertToStandardDate(exam.examDate);
  const todayStandard = currentAppDate;

  if (examDateStandard < todayStandard) {
    return { text: "Completed", class: "status-completed", isRunning: false, isToday: false };
  }

  if (examDateStandard === todayStandard) {
    if (now < start) {
      return { text: "Today", class: "status-today", isRunning: false, isToday: true };
    } else if (now >= start && now <= end) {
      return { text: "Running", class: "status-running", isRunning: true, isToday: true };
    } else {
      return { text: "Completed", class: "status-completed", isRunning: false, isToday: true };
    }
  }

  const daysLeft = window.dataFunctions.getDayDifference(todayStandard, examDateStandard);
  return { text: `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`, class: "status-upcoming", isRunning: false, isToday: false };
}

function isExamCompleted(exam) {
  const now = new Date();
  const start = parseExamDateTime(exam);
  const end = new Date(start.getTime() + EXAM_DURATION_MS);
  return now > end;
}

// ------------------------------------------------------------------
// ফিল্টার স্টেট সেভ/লোড
// ------------------------------------------------------------------
function saveFilterState() {
  if (_savingFilterState) return;
  _savingFilterState = true;
  try {
    const state = {
      dept: deptSelect ? deptSelect.value : "all",
      semesterSingle: semesterSingleSelect ? semesterSingleSelect.value : "all",
      semesterMultipleToggle: semesterMultipleToggle ? semesterMultipleToggle.checked : false,
      semesterMultipleValues: getSelectedSemesterValues(),
      examTypeSingle: examTypeSingleSelect ? examTypeSingleSelect.value : "all",
      examTypeMultipleToggle: examTypeMultipleToggle ? examTypeMultipleToggle.checked : false,
      examTypeMultipleValues: getSelectedExamTypeValues(),
      dateFilter: dateFilter ? dateFilter.value : "upcoming",
      activeQuickFilter: activeQuickFilter,
    };
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save filter state:", e);
  }
  _savingFilterState = false;
}

function loadFilterState() {
  try {
    const stored = localStorage.getItem(FILTER_STATE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (e) {
    console.warn("Could not load filter state:", e);
    return null;
  }
}

function applyFilterState(state) {
  if (!state) return false;

  if (deptSelect && state.dept) deptSelect.value = state.dept;
  if (semesterSingleSelect && state.semesterSingle) {
    semesterSingleSelect.value = state.semesterSingle;
  }
  if (semesterMultipleToggle && state.semesterMultipleToggle !== undefined) {
    semesterMultipleToggle.checked = state.semesterMultipleToggle;
    semesterMultipleToggle.dispatchEvent(new Event("change"));
  }
  if (state.semesterMultipleValues) {
    document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
      cb.checked = state.semesterMultipleValues.includes(cb.value);
    });
    updateDropdownHeader("semesterDropdown");
  }
  if (examTypeSingleSelect && state.examTypeSingle) {
    examTypeSingleSelect.value = state.examTypeSingle;
  }
  if (examTypeMultipleToggle && state.examTypeMultipleToggle !== undefined) {
    examTypeMultipleToggle.checked = state.examTypeMultipleToggle;
    examTypeMultipleToggle.dispatchEvent(new Event("change"));
  }
  if (state.examTypeMultipleValues) {
    document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
      cb.checked = state.examTypeMultipleValues.includes(cb.value);
    });
    updateDropdownHeader("examTypeDropdown");
  }
  if (dateFilter && state.dateFilter) {
    dateFilter.value = state.dateFilter;
  }
  if (state.activeQuickFilter) {
    activeQuickFilter = state.activeQuickFilter;
    document.querySelectorAll('.btn-quick-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === activeQuickFilter);
    });
  } else {
    activeQuickFilter = null;
    const allBtn = document.querySelector('.btn-quick-filter[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
  }

  _savingFilterState = true;
  handleFilterChange();
  _savingFilterState = false;
  return true;
}

// ------------------------------------------------------------------
// ইনিশিয়ালাইজেশন
// ------------------------------------------------------------------
async function init() {
  if (!window.dataFunctions) {
    console.log("Waiting for dataFunctions...");
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.dataFunctions) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  currentAppDate = window.dataFunctions.getCurrentDate();

  animateDateUpdate();

  await loadInitialData();

  setupEventListeners();

  initializeUI();

  const filterState = loadFilterState();
  if (filterState) {
    applyFilterState(filterState);
  } else {
    setDefaultFilters();
  }

  updateRoutineTitle("all", "all");

  setupFirebaseListener();

  checkStudentScheduledNotifications();

  initDropdowns();
}

function setDefaultToggleStates() {
  semesterMultipleToggle.checked = false;
  document.getElementById("semesterToggleStatus").textContent = "OFF";
  semesterSingleSelect.style.display = "block";
  semesterMultipleContainer.style.display = "none";
  semesterMultipleContainer.classList.remove("active");

  examTypeMultipleToggle.checked = false;
  document.getElementById("examTypeToggleStatus").textContent = "OFF";
  examTypeSingleSelect.style.display = "block";
  examTypeMultipleContainer.style.display = "none";
  examTypeMultipleContainer.classList.remove("active");
}

// ------------------------------------------------------------------
// ড্রপডাউন ফাংশন
// ------------------------------------------------------------------
function initDropdowns() {
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".custom-dropdown")) {
      document.querySelectorAll(".dropdown-body").forEach(b => b.classList.remove("open"));
      document.querySelectorAll(".dropdown-header").forEach(h => h.classList.remove("active"));
    }
  });

  document.querySelectorAll(".dropdown-header").forEach(header => {
    header.addEventListener("click", function (e) {
      e.stopPropagation();
      const dropdown = this.closest(".custom-dropdown");
      const body = dropdown.querySelector(".dropdown-body");
      const isOpen = body.classList.contains("open");

      document.querySelectorAll(".dropdown-body").forEach(b => b.classList.remove("open"));
      document.querySelectorAll(".dropdown-header").forEach(h => h.classList.remove("active"));

      if (!isOpen) {
        body.classList.add("open");
        this.classList.add("active");
      }
    });
  });

  document.querySelectorAll('.custom-dropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", function () {
      updateDropdownHeader(this.closest(".custom-dropdown").id);
    });
  });

  updateDropdownHeader("semesterDropdown");
  updateDropdownHeader("examTypeDropdown");
}

function updateDropdownHeader(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  const headerText = dropdown.querySelector(".dropdown-selected-text");
  const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
  const checked = dropdown.querySelectorAll('input[type="checkbox"]:checked');

  if (checked.length === 0) headerText.textContent = "None";
  else if (checked.length === checkboxes.length) headerText.textContent = "All";
  else if (checked.length <= 2) {
    const values = Array.from(checked).map(cb => cb.value);
    headerText.textContent = values.join(", ");
  } else {
    headerText.textContent = `${checked.length} selected`;
  }
}

function getSelectedSemesterValues() {
  if (semesterMultipleToggle.checked) {
    const checked = document.querySelectorAll('#semesterDropdown input[type="checkbox"]:checked');
    const values = Array.from(checked).map(cb => cb.value);
    return values.length ? values : ["all"];
  } else {
    const val = semesterSingleSelect.value;
    return val === "all" ? ["all"] : [val];
  }
}

function getSelectedExamTypeValues() {
  if (examTypeMultipleToggle.checked) {
    const checked = document.querySelectorAll('#examTypeDropdown input[type="checkbox"]:checked');
    const values = Array.from(checked).map(cb => cb.value);
    return values.length ? values : ["all"];
  } else {
    const val = examTypeSingleSelect.value;
    return val === "all" ? ["all"] : [val];
  }
}

function setDefaultFilters() {
  semesterSingleSelect.value = "1st";
  examTypeSingleSelect.value = "written";

  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
    cb.checked = cb.value === "1st";
  });
  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
    cb.checked = cb.value === "written";
  });

  updateDropdownHeader("semesterDropdown");
  updateDropdownHeader("examTypeDropdown");

  setDefaultToggleStates();

  handleFilterChange();
}

// ------------------------------------------------------------------
// টগল ইভেন্ট
// ------------------------------------------------------------------
semesterMultipleToggle.addEventListener("change", function () {
  const isOn = this.checked;
  document.getElementById("semesterToggleStatus").textContent = isOn ? "ON" : "OFF";

  if (isOn) {
    semesterSingleSelect.style.display = "none";
    semesterMultipleContainer.style.display = "block";
    semesterMultipleContainer.classList.add("active");
    const singleVal = semesterSingleSelect.value;
    if (singleVal !== "all") {
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = cb.value === singleVal;
      });
    } else {
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    updateDropdownHeader("semesterDropdown");
  } else {
    semesterSingleSelect.style.display = "block";
    semesterMultipleContainer.style.display = "none";
    semesterMultipleContainer.classList.remove("active");
    document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDropdownHeader("semesterDropdown");
  }
  handleFilterChange();
});

examTypeMultipleToggle.addEventListener("change", function () {
  const isOn = this.checked;
  document.getElementById("examTypeToggleStatus").textContent = isOn ? "ON" : "OFF";

  if (isOn) {
    examTypeSingleSelect.style.display = "none";
    examTypeMultipleContainer.style.display = "block";
    examTypeMultipleContainer.classList.add("active");
    const singleVal = examTypeSingleSelect.value;
    if (singleVal !== "all") {
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = cb.value === singleVal;
      });
    } else {
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    updateDropdownHeader("examTypeDropdown");
  } else {
    examTypeSingleSelect.style.display = "block";
    examTypeMultipleContainer.style.display = "none";
    examTypeMultipleContainer.classList.remove("active");
    document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDropdownHeader("examTypeDropdown");
  }
  handleFilterChange();
});

// ------------------------------------------------------------------
// Firebase লিসেনার
// ------------------------------------------------------------------
function setupFirebaseListener() {
  if (!window.firebase || !window.firebase.db) {
    console.log("Firebase not available for realtime updates");
    return;
  }

  try {
    const examsCollection = window.firebase.collection(window.firebase.db, "exams");

    window.firebase.onSnapshot(examsCollection, (snapshot) => {
      if (!isLoading && !isFilterChanging) {
        console.log("Firebase data changed, auto-refreshing...");
        clearTimeout(window.autoRefreshTimeout);
        window.autoRefreshTimeout = setTimeout(() => {
          refreshRoutine();
          showNotification("Exam schedule updated automatically", "info");
        }, 1000);
      }
    });

    console.log("Firebase realtime listener activated");
  } catch (error) {
    console.error("Error setting up Firebase listener:", error);
  }
}

// ------------------------------------------------------------------
// নোটিফিকেশন চেক
// ------------------------------------------------------------------
function checkStudentScheduledNotifications() {
  const notifications = JSON.parse(localStorage.getItem("studentNotifications") || "[]");
  const now = new Date();

  const validNotifications = notifications.filter((notification) => {
    const notificationTime = new Date(notification.notificationTime);
    return notificationTime > now;
  });

  localStorage.setItem("studentNotifications", JSON.stringify(validNotifications));

  validNotifications.forEach((notification) => {
    const notificationTime = new Date(notification.notificationTime);
    const delay = notificationTime - now;

    if (delay > 0) {
      setTimeout(() => {
        if ("Notification" in window && Notification.permission === "granted") {
          const title =
            notification.minutesBefore === 0
              ? `📚 ${notification.examSubject} exam is starting now!`
              : `📚 ${notification.examSubject} exam in ${notification.minutesBefore} minutes`;

          new Notification(title, {
            body: notification.examDetails,
            icon: "/favicon.ico",
            requireInteraction: true,
            tag: `student-exam-${notification.examId}`,
          });
        }

        const updatedNotifications = JSON.parse(localStorage.getItem("studentNotifications") || "[]");
        const filtered = updatedNotifications.filter(
          (n) => !(n.examId === notification.examId && n.notificationTime === notification.notificationTime)
        );
        localStorage.setItem("studentNotifications", JSON.stringify(filtered));
      }, delay);
    }
  });
}

// ------------------------------------------------------------------
// তারিখ অ্যানিমেশন
// ------------------------------------------------------------------
function animateDateUpdate() {
  if (!currentDateEl) return;

  currentDateEl.style.opacity = "0";
  currentDateEl.textContent = window.dataFunctions.formatDateShort(currentAppDate);

  setTimeout(() => {
    currentDateEl.style.transition = "opacity 0.5s ease";
    currentDateEl.style.opacity = "1";
  }, 100);
}

// ------------------------------------------------------------------
// ডেটা লোড
// ------------------------------------------------------------------
async function loadInitialData() {
  showLoadingStates();

  try {
    examData = await window.dataFunctions.loadExamsFromFirebase();
    window.examData = examData;

    filteredExamRoutine = [...examData];
    window.filteredExamRoutine = filteredExamRoutine;

    filteredExamRoutine.sort((a, b) => {
      const aStd = convertToStandardDate(a.examDate);
      const bStd = convertToStandardDate(b.examDate);
      return aStd.localeCompare(bStd);
    });

    if (window.calendar && window.calendar.update) {
      window.calendar.update(examData);
    }

    updateRoutineDisplay();
    updateStatistics();
    updateNextExam();
    updateUpcomingList();

    if (examData.length === 0) {
      showNoExamsMessage();
    } else {
      highlightTodaysExams();
    }
  } catch (error) {
    console.error("Error loading initial data:", error);
    showErrorState();
  } finally {
    hideLoadingStates();
  }
}

function showLoadingStates() {
  isLoading = true;

  if (routineList) {
    routineList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading exam routine...</p>
            </div>
        `;
  }

  if (nextExamCard) {
    nextExamCard.innerHTML = `
            <div class="loading-state small">
                <div class="loading-spinner small"></div>
                <p>Loading next exam...</p>
            </div>
        `;
  }
}

function hideLoadingStates() {
  isLoading = false;
}

function showErrorState() {
  if (routineList) {
    routineList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to load exams</h3>
                <p>Please check your connection and try again</p>
                <button id="retryLoad" class="btn-retry">Retry Loading</button>
            </div>
        `;

    document.getElementById("retryLoad")?.addEventListener("click", () => {
      loadInitialData();
    });
  }
}

// ------------------------------------------------------------------
// ক্লিয়ার ফিল্টার বাটন
// ------------------------------------------------------------------
function addClearFiltersButton() {
  if (document.getElementById("clearFiltersBtn")) return;

  const controls = document.querySelector(".controls");
  if (!controls) return;

  const clearContainer = document.createElement("div");
  clearContainer.className = "clear-filters-container";
  clearContainer.style.cssText = "display: flex; justify-content: flex-end; margin-top: 10px;";

  const clearBtn = document.createElement("button");
  clearBtn.id = "clearFiltersBtn";
  clearBtn.className = "btn-clear-filters";
  clearBtn.innerHTML = '<i class="fas fa-times"></i> Clear Filters';
  clearBtn.style.display = "none";

  clearContainer.appendChild(clearBtn);

  const filterControls = document.querySelector(".filter-controls");
  if (filterControls && filterControls.parentNode) {
    filterControls.parentNode.insertBefore(clearContainer, filterControls.nextSibling);
  } else {
    controls.appendChild(clearContainer);
  }

  clearBtn.addEventListener("click", clearAllFilters);
}

function clearAllFilters() {
  deptSelect.value = "all";

  semesterSingleSelect.value = "all";
  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateDropdownHeader("semesterDropdown");

  examTypeSingleSelect.value = "all";
  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateDropdownHeader("examTypeDropdown");

  dateFilter.value = "upcoming";

  semesterMultipleToggle.checked = false;
  examTypeMultipleToggle.checked = false;
  document.getElementById("semesterToggleStatus").textContent = "OFF";
  document.getElementById("examTypeToggleStatus").textContent = "OFF";

  semesterSingleSelect.style.display = "block";
  semesterMultipleContainer.style.display = "none";
  semesterMultipleContainer.classList.remove("active");

  examTypeSingleSelect.style.display = "block";
  examTypeMultipleContainer.style.display = "none";
  examTypeMultipleContainer.classList.remove("active");

  activeQuickFilter = null;
  document.querySelectorAll(".btn-quick-filter").forEach(btn => btn.classList.remove("active"));
  const allBtn = document.querySelector('.btn-quick-filter[data-filter="all"]');
  if (allBtn) allBtn.classList.add("active");

  document.getElementById("clearFiltersBtn").style.display = "none";

  handleFilterChange();

  saveFilterState();

  showNotification("All filters cleared", "info");
}

// ------------------------------------------------------------------
// ইভেন্ট লিসেনার
// ------------------------------------------------------------------
function setupEventListeners() {
  const debouncedFilterChange = debounce(() => {
    if (!isFilterChanging) {
      handleFilterChange();
    }
  }, 300);

  if (deptSelect) deptSelect.addEventListener("change", debouncedFilterChange);

  if (dateFilter) {
    dateFilter.addEventListener("change", function () {
      activeQuickFilter = null;
      document.querySelectorAll(".btn-quick-filter").forEach(btn => btn.classList.remove("active"));
      const allBtn = document.querySelector('.btn-quick-filter[data-filter="all"]');
      if (allBtn) allBtn.classList.add("active");
      debouncedFilterChange();
    });
  }

  if (semesterSingleSelect) semesterSingleSelect.addEventListener("change", debouncedFilterChange);

  if (examTypeSingleSelect) examTypeSingleSelect.addEventListener("change", debouncedFilterChange);

  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", debouncedFilterChange);
  });

  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", debouncedFilterChange);
  });

  addClearFiltersButton();

  setupQuickFilters();
}

// ------------------------------------------------------------------
// কুইক ফিল্টার
// ------------------------------------------------------------------
function setupQuickFilters() {
  if (!document.querySelector(".quick-filters")) {
    const controls = document.querySelector(".controls");
    if (!controls) return;

    const quickFilterDiv = document.createElement("div");
    quickFilterDiv.className = "quick-filters";
    quickFilterDiv.innerHTML = `
            <div class="quick-filter-buttons">
                <button class="btn-quick-filter active" data-filter="all">All</button>
                <button class="btn-quick-filter" data-filter="today">Today</button>
                <button class="btn-quick-filter" data-filter="tomorrow">Tomorrow</button>
                <button class="btn-quick-filter" data-filter="2day">2D Left</button>
                <button class="btn-quick-filter" data-filter="practical">Practical</button>
                <button class="btn-quick-filter" data-filter="written">Written</button>
                <button class="btn-quick-filter" data-filter="referred">Referred</button>
            </div>
        `;

    const filterControls = document.querySelector(".filter-controls");
    if (filterControls && filterControls.parentNode) {
      filterControls.parentNode.insertBefore(quickFilterDiv, filterControls.nextSibling);

      document.querySelectorAll(".btn-quick-filter").forEach((btn) => {
        btn.addEventListener("click", function () {
          document.querySelectorAll(".btn-quick-filter").forEach(b => b.classList.remove("active"));
          this.classList.add("active");
          applyQuickFilter(this.dataset.filter);
        });
      });
    }
  }
}

function applyQuickFilter(filter) {
  const clearBtn = document.getElementById("clearFiltersBtn");

  if (["today", "tomorrow", "2day"].includes(filter)) {
    activeQuickFilter = filter;
    const dept = deptSelect.value;
    const semesters = getSelectedSemesterValues();
    const examTypes = getSelectedExamTypeValues();
    applyFilters(dept, semesters, examTypes, null, filter);
    dateFilter.value = "upcoming";
    if (clearBtn) clearBtn.style.display = "flex";
    return;
  }

  if (["practical", "written", "referred"].includes(filter)) {
    activeQuickFilter = null;
    examTypeSingleSelect.value = filter;
    examTypeMultipleToggle.checked = false;
    document.getElementById("examTypeToggleStatus").textContent = "OFF";
    examTypeSingleSelect.style.display = "block";
    examTypeMultipleContainer.style.display = "none";
    examTypeMultipleContainer.classList.remove("active");
    document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDropdownHeader("examTypeDropdown");
    const dept = deptSelect.value;
    const semesters = getSelectedSemesterValues();
    const dateFilterValue = dateFilter.value;
    const examTypes = getSelectedExamTypeValues();
    applyFilters(dept, semesters, examTypes, dateFilterValue, null);
    if (clearBtn) clearBtn.style.display = "flex";
    return;
  }

  if (filter === "all") {
    activeQuickFilter = null;
    dateFilter.value = "upcoming";
    examTypeSingleSelect.value = "all";
    examTypeMultipleToggle.checked = false;
    document.getElementById("examTypeToggleStatus").textContent = "OFF";
    examTypeSingleSelect.style.display = "block";
    examTypeMultipleContainer.style.display = "none";
    examTypeMultipleContainer.classList.remove("active");
    document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDropdownHeader("examTypeDropdown");
    handleFilterChange();
    if (clearBtn) clearBtn.style.display = "none";
  }
}

// ------------------------------------------------------------------
// UI ইনিশিয়ালাইজেশন
// ------------------------------------------------------------------
function initializeUI() {
  if (currentDateEl) {
    currentDateEl.textContent = window.dataFunctions.formatDateShort(currentAppDate);
  }

  updateDepartmentOptions();

  addSearchFunctionality();
}

function updateRoutineTitle(selectedDept, selectedSemester) {
  const routineTitle = document.querySelector(".routine-container h2");
  if (!routineTitle) return;

  let titleText = '<i class="fas fa-list-alt"></i> Exam Routine';

  if (selectedDept !== "all" || selectedSemester !== "all") {
    titleText += " - ";
    if (selectedDept !== "all" && selectedSemester !== "all") {
      titleText += `${selectedDept} Department, ${selectedSemester} Semester`;
    } else if (selectedDept !== "all") {
      titleText += `${selectedDept} Department`;
    } else if (selectedSemester !== "all") {
      titleText += `${selectedSemester} Semester`;
    }
  }

  if (activeQuickFilter) {
    let filterLabel = "";
    switch (activeQuickFilter) {
      case "today": filterLabel = "Today's Exams"; break;
      case "tomorrow": filterLabel = "Tomorrow's Exams"; break;
      case "2day": filterLabel = "2D Left"; break;
      default: filterLabel = "";
    }
    if (filterLabel) {
      titleText += ` (${filterLabel})`;
    }
  } else {
    const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";
    if (dateFilterValue === "upcoming") {
      titleText += " (Upcoming)";
    } else if (dateFilterValue === "past") {
      titleText += " (Past)";
    }
  }

  routineTitle.innerHTML = titleText;
}

function updateDepartmentOptions() {
  if (!deptSelect) return;

  const departments = window.dataFunctions.getAllDepartmentsFromExams(examData);

  if (departments.length > 0) {
    const currentDept = deptSelect.value;

    while (deptSelect.options.length > 1) {
      deptSelect.remove(1);
    }

    departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      deptSelect.appendChild(option);
    });

    if (departments.includes(currentDept) || currentDept === "all") {
      deptSelect.value = currentDept;
    }
  }
}

// ------------------------------------------------------------------
// সার্চ ফাংশনালিটি
// ------------------------------------------------------------------
function addSearchFunctionality() {
  if (!document.getElementById("searchInput")) {
    const routineContainer = document.querySelector(".routine-container");
    if (!routineContainer) return;

    const searchDiv = document.createElement("div");
    searchDiv.className = "routine-search";
    searchDiv.innerHTML = `
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchInput" placeholder="Search exams by subject, department...">
                <button id="clearSearch" class="btn-clear-search" style="display: none;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="search-results-info" id="searchResultsInfo"></div>
        `;

    const title = routineContainer.querySelector("h2");
    if (title && title.parentNode) {
      title.parentNode.insertBefore(searchDiv, title.nextSibling);

      const searchInput = document.getElementById("searchInput");
      const clearSearchBtn = document.getElementById("clearSearch");

      if (searchInput) searchInput.addEventListener("input", debounce(handleSearch, 300));
      if (clearSearchBtn) clearSearchBtn.addEventListener("click", clearSearch);
    }
  }
}

function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");
  const searchResultsInfo = document.getElementById("searchResultsInfo");

  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase().trim();

  if (clearSearchBtn) {
    clearSearchBtn.style.display = searchTerm ? "block" : "none";
  }

  if (!searchTerm) {
    if (searchResultsInfo) searchResultsInfo.textContent = "";
    handleFilterChange();
    return;
  }

  const searchResults = examData.filter((exam) => {
    return (
      exam.subject.toLowerCase().includes(searchTerm) ||
      exam.department.toLowerCase().includes(searchTerm) ||
      exam.semester.toLowerCase().includes(searchTerm) ||
      (exam.examType && exam.examType.toLowerCase().includes(searchTerm)) ||
      exam.time.toLowerCase().includes(searchTerm)
    );
  });

  filteredExamRoutine = searchResults;
  window.filteredExamRoutine = filteredExamRoutine;

  filteredExamRoutine.sort((a, b) => {
    const aStd = convertToStandardDate(a.examDate);
    const bStd = convertToStandardDate(b.examDate);
    return aStd.localeCompare(bStd);
  });

  displayExams(filteredExamRoutine);

  if (searchResultsInfo) {
    searchResultsInfo.textContent = `Found ${searchResults.length} exam${searchResults.length !== 1 ? "s" : ""} matching "${searchTerm}"`;
    searchResultsInfo.style.display = "block";
  }

  const routineTitle = document.querySelector(".routine-container h2");
  if (routineTitle) {
    routineTitle.innerHTML = `<i class="fas fa-search"></i> Search Results for "${searchTerm}"`;
  }

  const total = searchResults.length;
  const upcoming = searchResults.filter((exam) => convertToStandardDate(exam.examDate) >= currentAppDate).length;
  const today = searchResults.filter((exam) => convertToStandardDate(exam.examDate) === currentAppDate).length;
  const completed = searchResults.filter((exam) => convertToStandardDate(exam.examDate) < currentAppDate).length;

  if (totalExamsEl) totalExamsEl.textContent = total;
  if (upcomingExamsEl) upcomingExamsEl.textContent = upcoming;
  if (todayExamsEl) todayExamsEl.textContent = today;
  if (completedExamsEl) completedExamsEl.textContent = completed;
}

function clearSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");
  const searchResultsInfo = document.getElementById("searchResultsInfo");

  if (searchInput) searchInput.value = "";
  if (clearSearchBtn) clearSearchBtn.style.display = "none";
  if (searchResultsInfo) searchResultsInfo.style.display = "none";
  handleFilterChange();
}

// ------------------------------------------------------------------
// ফিল্টার হ্যান্ডলার
// ------------------------------------------------------------------
function handleFilterChange() {
  if (isLoading || isFilterChanging) return;

  isFilterChanging = true;

  clearSearch();

  const dept = deptSelect ? deptSelect.value : "all";
  const semesterValues = getSelectedSemesterValues();
  const examTypeValues = getSelectedExamTypeValues();
  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  console.log("Filter changed:", {
    dept,
    semesterValues,
    examTypeValues,
    dateFilterValue,
    activeQuickFilter,
  });

  applyFilters(dept, semesterValues, examTypeValues, dateFilterValue, activeQuickFilter);

  isFilterChanging = false;

  if (!_savingFilterState) {
    saveFilterState();
  }
}

// ------------------------------------------------------------------
// মূল ফিল্টার প্রয়োগ (Past শুধু তারিখ অনুযায়ী)
function applyFilters(dept, semesters, examTypes, dateFilterValue = null, quickFilter = null) {
  const clearBtn = document.getElementById("clearFiltersBtn");

  const isFilterActive =
    dept !== "all" ||
    (semesters && !semesters.includes("all") && semesters.length > 0) ||
    (examTypes && !examTypes.includes("all") && examTypes.length > 0) ||
    (dateFilterValue && dateFilterValue === "past") ||
    (quickFilter && quickFilter !== "all");

  if (clearBtn) {
    clearBtn.style.display = isFilterActive ? "flex" : "none";
  }

  let tempFiltered = [...examData];

  if (dept !== "all") {
    tempFiltered = tempFiltered.filter((exam) => exam.department === dept);
  }

  if (semesters && !semesters.includes("all") && semesters.length > 0) {
    tempFiltered = tempFiltered.filter((exam) => semesters.includes(exam.semester));
  }

  if (examTypes && !examTypes.includes("all") && examTypes.length > 0) {
    tempFiltered = tempFiltered.filter((exam) => {
      const type = exam.examType || "written";
      return examTypes.includes(type);
    });
  }

  const filterVal = quickFilter !== null ? quickFilter : (dateFilterValue !== null ? dateFilterValue : dateFilter.value);

  // Past: শুধুমাত্র তারিখের ভিত্তিতে (তারিখ < আজ)
  if (filterVal === "past") {
    tempFiltered = tempFiltered.filter((exam) => convertToStandardDate(exam.examDate) < currentAppDate);
  } else if (filterVal === "upcoming") {
    tempFiltered = tempFiltered.filter((exam) => convertToStandardDate(exam.examDate) >= currentAppDate);
  } else if (filterVal === "today") {
    tempFiltered = tempFiltered.filter((exam) => convertToStandardDate(exam.examDate) === currentAppDate);
  } else if (filterVal === "tomorrow") {
    const tomorrow = new Date(currentAppDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    tempFiltered = tempFiltered.filter((exam) => convertToStandardDate(exam.examDate) === tomorrowStr);
  } else if (filterVal === "2day") {
    const twoDays = new Date(currentAppDate);
    twoDays.setDate(twoDays.getDate() + 2);
    const twoDaysStr = twoDays.toISOString().split('T')[0];
    tempFiltered = tempFiltered.filter((exam) => convertToStandardDate(exam.examDate) === twoDaysStr);
  }

  filteredExamRoutine = tempFiltered;
  window.filteredExamRoutine = filteredExamRoutine;

  console.log(`Filtered ${examData.length} exams down to ${filteredExamRoutine.length} exams (filter: ${filterVal})`);

  filteredExamRoutine.sort((a, b) => {
    const aStd = convertToStandardDate(a.examDate);
    const bStd = convertToStandardDate(b.examDate);
    return aStd.localeCompare(bStd);
  });

  const titleDept = dept !== "all" ? dept : "all";
  const titleSem = semesters && semesters.length === 1 && semesters[0] !== "all" ? semesters[0] : "all";
  updateRoutineTitle(titleDept, titleSem);

  updateRoutineDisplay();
  updateStatistics();
  updateNextExam();
  updateUpcomingList();
}

// রিফ্রেশ
// ------------------------------------------------------------------
async function refreshRoutine() {
  showLoadingStates();

  try {
    const newExamData = await window.dataFunctions.loadExamsFromFirebase();
    examData = newExamData;
    window.examData = examData;

    if (window.calendar && window.calendar.update) {
      window.calendar.update(examData);
    }

    const dept = deptSelect ? deptSelect.value : "all";
    const semesters = getSelectedSemesterValues();
    const examTypes = getSelectedExamTypeValues();
    const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

    applyFilters(dept, semesters, examTypes, dateFilterValue, activeQuickFilter);

    updateDepartmentOptions();

    if (examData.length === 0) {
      showNoExamsMessage();
    } else {
      highlightTodaysExams();
    }
  } catch (error) {
    console.error("Error refreshing routine:", error);
    throw error;
  } finally {
    hideLoadingStates();
  }
}

// ------------------------------------------------------------------
// খালি মেসেজ
// ------------------------------------------------------------------
function showNoExamsMessage() {
  if (!routineList) return;

  routineList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class="fas fa-calendar-plus"></i>
            </div>
            <h3>No Exams Found</h3>
            <p>The exam schedule is currently empty.</p>
            <div class="empty-state-actions">
                <p>Admins can add exams using the admin panel</p>
                <button class="btn-admin-access" onclick="document.getElementById('adminAccessBtn').click()">
                    <i class="fas fa-user-shield"></i> Open Admin Panel
                </button>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------------
// রুটিন ডিসপ্লে
// ------------------------------------------------------------------
function updateRoutineDisplay() {
  if (!routineList) return;

  const routineContainer = document.querySelector(".routine-container");
  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemesters = getSelectedSemesterValues();

  if (routineContainer) {
    if (selectedDept !== "all" || (selectedSemesters && !selectedSemesters.includes("all") && selectedSemesters.length > 0)) {
      routineContainer.classList.add("filtered");
    } else {
      routineContainer.classList.remove("filtered");
    }
  }

  routineList.style.opacity = "0";

  setTimeout(() => {
    routineList.innerHTML = "";

    if (filteredExamRoutine.length === 0 && examData.length > 0) {
      routineList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-filter"></i>
                    </div>
                    <h3>No Exams Match Filters</h3>
                    <p>Try changing your department, semester, or date filter settings</p>
                    <button id="clearFiltersFromEmpty" class="btn-clear-filters">
                        <i class="fas fa-times"></i> Clear Filters
                    </button>
                </div>
            `;

      document.getElementById("clearFiltersFromEmpty")?.addEventListener("click", clearAllFilters);
    } else if (filteredExamRoutine.length === 0 && examData.length === 0) {
      showNoExamsMessage();
    } else {
      filteredExamRoutine.forEach((exam, index) => {
        const examElement = createRoutineElement(exam);
        examElement.style.opacity = "0";
        examElement.style.transform = "translateY(20px)";
        routineList.appendChild(examElement);

        setTimeout(() => {
          examElement.style.transition = "all 0.3s ease";
          examElement.style.opacity = "1";
          examElement.style.transform = "translateY(0)";
        }, index * 50);
      });
    }

    routineList.style.opacity = "1";
    routineList.style.transition = "opacity 0.3s ease";
  }, 200);
}

function displayExams(exams) {
  if (!routineList) return;

  routineList.innerHTML = "";

  if (exams.length === 0) {
    routineList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No Matching Exams</h3>
                <p>Try different search terms or filters</p>
            </div>
        `;
    return;
  }

  exams.forEach((exam, index) => {
    const examElement = createRoutineElement(exam);
    examElement.style.opacity = "0";
    examElement.style.transform = "translateY(20px)";
    routineList.appendChild(examElement);

    setTimeout(() => {
      examElement.style.transition = "all 0.3s ease";
      examElement.style.opacity = "1";
      examElement.style.transform = "translateY(0)";
    }, index * 50);
  });
}

// ------------------------------------------------------------------
// রুটিন এলিমেন্ট তৈরি (সময়ভিত্তিক স্ট্যাটাস)
// ------------------------------------------------------------------
function createRoutineElement(exam) {
  const statusInfo = getExamStatusWithTime(exam);
  const isToday = convertToStandardDate(exam.examDate) === currentAppDate;
  const isRunning = statusInfo.isRunning; // true হলে কার্ডে "running" ক্লাস যোগ হবে

  const examType = exam.examType || "written";
  const typeClass =
    examType === "practical" ? "type-practical" : examType === "referred" ? "type-referred" : "type-written";
  const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";

  let groupDisplay = "-";
  if (examType === "practical" && exam.group) {
    groupDisplay = exam.group;
  } else if (examType === "practical") {
    groupDisplay = "A1";
  }

  const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);

  const div = document.createElement("div");
  // ✅ এখানে "running" ক্লাস যোগ করা হয়েছে
  div.className = `routine-item ${convertToStandardDate(exam.examDate) < currentAppDate ? "past" : ""} ${isToday ? "today" : ""} ${isRunning ? "running" : ""}`;
  div.setAttribute("data-exam-id", exam.id);

  div.innerHTML = `
        <div class="exam-cell">
            <span class="dept-badge dept-${exam.department.toLowerCase()}">${exam.department}</span>
        </div>
        <div class="exam-cell">
            <span class="semester-badge">${exam.semester}</span>
        </div>
        <div class="exam-cell">
            <span class="group-badge">${groupDisplay}</span>
        </div>
        <div class="exam-cell">
            <strong class="subject-name">${exam.subject}</strong>
            ${exam.addedBy ? `<div class="exam-added-by"><small>Added by: ${exam.addedBy.split("@")[0]}</small></div>` : ""}
        </div>
        <div class="exam-cell">
            <div class="exam-date">${dateDisplay}</div>
            ${isToday ? '<div class="today-badge">TODAY</div>' : ""}
        </div>
        <div class="exam-cell">
            <div class="exam-time">${exam.time}</div>
        </div>
        <div class="exam-cell">
            <span class="exam-type-badge ${typeClass}">${typeText}</span>
        </div>
        <div class="exam-cell">
            <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
        </div>
        <div class="exam-actions-hover">
            <button class="btn-view-details" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-share-exam" title="Share Exam Info">
                <i class="fas fa-share-alt"></i>
            </button>
            <button class="btn-notify-exam" title="Set Notification">
                <i class="fas fa-bell"></i>
            </button>
        </div>
    `;

  // ... বাকি ইভেন্ট লিসেনারগুলো আগের মতো থাকবে ...
  div.addEventListener("click", (e) => {
    if (!e.target.closest(".exam-actions-hover")) {
      showExamDetails(exam);
    }
  });

  const viewDetailsBtn = div.querySelector(".btn-view-details");
  const shareBtn = div.querySelector(".btn-share-exam");
  const notifyBtn = div.querySelector(".btn-notify-exam");

  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showExamDetails(exam);
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      shareExamInfo(exam);
    });
  }

  if (notifyBtn) {
    notifyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showNotificationOptions(exam);
    });
  }

  return div;
}

function showNotificationModal(exam) {
  const modal = document.createElement("div");
  modal.className = "notification-options-modal";

  modal.innerHTML = `
    <div class="notification-options-content">
      <div class="notification-header">
        <h3><i class="fas fa-bell"></i> Set Notification for ${exam.subject}</h3>
        <button class="btn-close-notify-options">&times;</button>
      </div>
      <div class="notification-body">
        <p>Get reminded before your exam:</p>
        <div class="notification-buttons">
          <button class="btn-notify-option" data-minutes="0">
            <i class="fas fa-clock"></i>
            <span>At exam time</span>
            <small>${exam.time}</small>
          </button>
          <button class="btn-notify-option" data-minutes="15">
            <i class="fas fa-hourglass-start"></i>
            <span>15 min before</span>
            <small>${calculateTimeBefore(exam.time, 15)}</small>
          </button>
          <button class="btn-notify-option" data-minutes="30">
            <i class="fas fa-hourglass-half"></i>
            <span>30 min before</span>
            <small>${calculateTimeBefore(exam.time, 30)}</small>
          </button>
          <button class="btn-notify-option" data-minutes="60">
            <i class="fas fa-hourglass-end"></i>
            <span>1 hour before</span>
            <small>${calculateTimeBefore(exam.time, 60)}</small>
          </button>
        </div>
        <div class="notification-info">
          <p><i class="fas fa-info-circle"></i> Notifications will appear on your device at the selected time.</p>
        </div>
      </div>
      <div class="notification-footer">
        <button class="btn-test-notification-now">Test Notification Now</button>
        <button class="btn-cancel-notify">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".btn-close-notify-options").addEventListener("click", () => modal.remove());
  modal.querySelector(".btn-cancel-notify").addEventListener("click", () => modal.remove());

  modal.querySelector(".btn-test-notification-now").addEventListener("click", () => {
    sendTestNotificationNow(exam);
  });

  modal.querySelectorAll(".btn-notify-option").forEach((btn) => {
    btn.addEventListener("click", function () {
      const minutesBefore = parseInt(this.dataset.minutes);
      scheduleStudentNotification(exam, minutesBefore);
      modal.remove();
    });
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function calculateTimeBefore(examTime, minutesBefore) {
  const [time, modifier] = examTime.split(" ");
  let [hours, minutes] = time.split(":");

  hours = parseInt(hours);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + parseInt(minutes) - minutesBefore;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  const newModifier = newHours >= 12 ? "PM" : "AM";
  const displayHours = newHours % 12 || 12;

  return `${displayHours}:${newMinutes.toString().padStart(2, "0")} ${newModifier}`;
}

function convertTimeTo24Hour(time12) {
  if (!time12) return "10:00";

  if (time12.includes(":")) {
    const parts = time12.split(":");
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (parseInt(parts[0]) >= 0 && parseInt(parts[0]) <= 23) {
        return time12;
      }
    }
  }

  const [time, modifier] = time12.split(" ");
  if (!time || !modifier) return "10:00";

  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes || "00"}`;
}

function scheduleStudentNotification(exam, minutesBefore) {
  const examDateTime = new Date(`${convertToStandardDate(exam.examDate)}T${convertTimeTo24Hour(exam.time)}`);
  const notificationTime = new Date(examDateTime.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();
  const delay = notificationTime - now;

  if (delay > 0) {
    const notifications = JSON.parse(localStorage.getItem("studentNotifications") || "[]");
    notifications.push({
      examId: exam.id,
      examSubject: exam.subject,
      examDetails: `${exam.department} - ${exam.semester}\nTime: ${exam.time}\nType: ${exam.examType || "Written"}`,
      notificationTime: notificationTime.toISOString(),
      minutesBefore: minutesBefore,
      scheduledAt: now.toISOString(),
    });

    localStorage.setItem("studentNotifications", JSON.stringify(notifications));

    setTimeout(() => {
      if (Notification.permission === "granted") {
        const title =
          minutesBefore === 0
            ? `📚 ${exam.subject} exam is starting now!`
            : `📚 ${exam.subject} exam in ${minutesBefore} minutes`;

        new Notification(title, {
          body: `${exam.department} - ${exam.semester}\nTime: ${exam.time}\nType: ${exam.examType || "Written"}`,
          icon: "/favicon.ico",
          requireInteraction: true,
          tag: `student-exam-${exam.id}`,
        });
      }

      const updatedNotifications = JSON.parse(localStorage.getItem("studentNotifications") || "[]");
      const filtered = updatedNotifications.filter(
        (n) => !(n.examId === exam.id && n.notificationTime === notificationTime.toISOString())
      );
      localStorage.setItem("studentNotifications", JSON.stringify(filtered));
    }, delay);

    const timingText = minutesBefore === 0 ? "at exam time" : `${minutesBefore} minutes before`;
    showNotification(`Notification set for ${timingText}`, "success");
  } else {
    showNotification("Cannot set notification in the past", "error");
  }
}

function sendTestNotificationNow(exam) {
  if (Notification.permission === "granted") {
    new Notification("📚 Exam Reminder - TEST", {
      body: `${exam.subject} exam for ${exam.department} - ${exam.semester}\nTime: ${exam.time}\nType: ${exam.examType || "Written"}`,
      icon: "/favicon.ico",
      requireInteraction: true,
      tag: `test-exam-${exam.id}`,
    });

    showNotification("Test notification sent!", "success");
  }
}

// ------------------------------------------------------------------
// পরীক্ষার বিস্তারিত (সময়ভিত্তিক স্ট্যাটাস)
// ------------------------------------------------------------------
const TECH_CODES = {
    'Computer': '85',
    'Mechanical': '70',
    'Civil': '64',
    'Electrical': '67',
    'Power': '71',
    'Electronics': '68',
    'Electro-Medical': '86',
    'Tourism & Hospitality Management': '99',
    'Tourism': '99'
};

function getEmailPrefix(email) {
    if (!email) return '';
    return email.split('@')[0];
}

function showExamDetails(exam) {
    const statusInfo = getExamStatusWithTime(exam);
    const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);
    const examType = exam.examType || "written";
    const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";

    let groupDisplay = "-";
    if (examType === "practical" && exam.group) {
        groupDisplay = exam.group;
    } else if (examType === "practical") {
        groupDisplay = "A1";
    }

    const techCode = TECH_CODES[exam.department] || "N/A";
    const addedByPrefix = exam.addedBy ? getEmailPrefix(exam.addedBy) : '';

    const modal = document.createElement("div");
    modal.className = "exam-details-modal";
    modal.innerHTML = `
        <div class="exam-details-content">
            <div class="exam-details-header">
                <h3><i class="fas fa-info-circle"></i> ${exam.subject} Exam Details</h3>
                <button class="btn-close-modal">&times;</button>
            </div>
            <div class="exam-details-body">
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-university"></i> Department:</span>
                    <span class="detail-value dept-badge dept-${exam.department.toLowerCase()}">${exam.department}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-qrcode"></i> Technology Code:</span>
                    <span class="detail-value tech-code-badge">${techCode}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-layer-group"></i> Semester:</span>
                    <span class="detail-value">${exam.semester}</span>
                </div>
                ${examType === "practical" ? `
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-users"></i> Group:</span>
                    <span class="detail-value group-badge">${groupDisplay}</span>
                </div>
                ` : ""}
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-tag"></i> Exam Type:</span>
                    <span class="detail-value exam-type-badge type-${examType}">${typeText}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-calendar-alt"></i> Exam Date:</span>
                    <span class="detail-value">${dateDisplay}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-clock"></i> Time:</span>
                    <span class="detail-value">${exam.time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-door-open"></i> Room:</span>
                    <span class="detail-value">${exam.room}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-info-circle"></i> Status:</span>
                    <span class="detail-value ${statusInfo.class}">${statusInfo.text}</span>
                </div>
                ${addedByPrefix ? `
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-user-plus"></i> Added by:</span>
                    <span class="detail-value">${addedByPrefix}</span>
                </div>
                ` : ""}
            </div>
            <div class="exam-details-footer">
                <button class="btn-remind-me" data-exam-id="${exam.id}" title="Set Reminder">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="btn-share" title="Share">
                    <i class="fas fa-share-alt"></i>
                </button>
                <button class="btn-download-exam" title="Download as JPG">
                    <i class="fas fa-download"></i>
                </button>
                <div class="explore-routine-text">
                    Explore Routine 2026
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModalBtn = modal.querySelector(".btn-close-modal");
    const shareBtn = modal.querySelector(".btn-share");
    const remindBtn = modal.querySelector(".btn-remind-me");
    const downloadBtn = modal.querySelector(".btn-download-exam");

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            modal.remove();
        });
    }

    if (remindBtn) {
        remindBtn.addEventListener("click", function () {
            showNotificationOptions(exam);
            modal.remove();
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            shareExamInfo(exam);
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            downloadExamAsJPG(exam);
        });
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function shareExamInfo(exam) {
  const examType = exam.examType || "written";
  const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";
  const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);
  let shareText = `${exam.subject} Exam\nDepartment: ${exam.department}\nSemester: ${exam.semester}\nType: ${typeText}\nDate: ${dateDisplay}\nTime: ${exam.time}\nRoom: ${exam.room}`;

  if (examType === "practical") {
    const group = exam.group || "A1";
    shareText += `\nGroup: ${group}`;
  }

  if (navigator.share) {
    navigator.share({
      title: `${exam.subject} Exam Details`,
      text: shareText,
      url: window.location.href,
    });
  } else {
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        showNotification("Exam details copied to clipboard!", "success");
      })
      .catch(() => {
        showNotification("Failed to copy details", "error");
      });
  }
}

// ------------------------------------------------------------------
// ডাউনলোড JPG (আগের মতো)
// ------------------------------------------------------------------
async function downloadExamAsJPG(exam) {
  try {
    showNotification("Generating JPG image...", "info");

    const html2canvasScript = document.createElement("script");
    html2canvasScript.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(html2canvasScript);

    html2canvasScript.onload = async () => {
      try {
        const techCode = TECH_CODES[exam.department] || "N/A";
        const examType = exam.examType || "written";
        const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";
        let groupDisplay;
        if (examType === "practical") {
          groupDisplay = exam.group ? exam.group : "A1";
        } else {
          groupDisplay = "N/A";
        }
        const addedByPrefix = exam.addedBy ? getEmailPrefix(exam.addedBy) : '';

        const tempDiv = document.createElement("div");
        tempDiv.style.cssText = `
          position: fixed;
          top: -10000px;
          left: -10000px;
          width: 800px;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 20px;
          font-family: 'Poppins', sans-serif;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;

        const currentDate = window.dataFunctions.formatDateShort(window.dataFunctions.getCurrentDate());
        const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);

        tempDiv.innerHTML = `
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 36px; margin-bottom: 10px; color: white;">Exam Details</h1>
            <h2 style="font-size: 28px; margin-bottom: 20px; color: #ffd700;">${exam.subject}</h2>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px;">
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Department</div>
              <div style="font-size: 24px; font-weight: bold;">${exam.department}</div>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Technology Code</div>
              <div style="font-size: 24px; font-weight: bold; color: #ffd700;">${techCode}</div>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Semester</div>
              <div style="font-size: 24px; font-weight: bold;">${exam.semester}</div>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Group</div>
              <div style="font-size: 24px; font-weight: bold;">${groupDisplay}</div>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Exam Date</div>
              <div style="font-size: 24px; font-weight: bold;">${dateDisplay}</div>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Time</div>
              <div style="font-size: 24px; font-weight: bold;">${exam.time}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 40px;">
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Exam Type</div>
              <div style="font-size: 24px; font-weight: bold;">${typeText}</div>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Room</div>
              <div style="font-size: 24px; font-weight: bold;">${exam.room}</div>
            </div>
          </div>
          
          ${addedByPrefix ? `
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 30px;">
            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Added by</div>
            <div style="font-size: 18px;">${addedByPrefix}</div>
          </div>
          ` : ""}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 2px solid rgba(255,255,255,0.2);">
            <div style="font-size: 22px; font-weight: bold; margin-bottom: 10px; color: #ffd700;">Explore Routine 2026</div>
            <div style="font-size: 16px; color: rgba(255,255,255,0.8);">Generated on ${currentDate}</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 10px;">Download from exploreex.vercel.app</div>
          </div>
        `;

        document.body.appendChild(tempDiv);

        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          backgroundColor: null,
          logging: false,
          useCORS: true,
        });

        const imageData = canvas.toDataURL("image/jpeg", 0.95);

        const link = document.createElement("a");
        link.download = `Exam_${exam.subject.replace(/\s+/g, "_")}_${exam.examDate}.jpg`;
        link.href = imageData;
        link.click();

        document.body.removeChild(tempDiv);
        document.head.removeChild(html2canvasScript);

        showNotification("JPG image downloaded successfully!", "success");
      } catch (error) {
        console.error("Error generating JPG:", error);
        showNotification("Failed to generate JPG image", "error");
        document.head.removeChild(html2canvasScript);
      }
    };

    html2canvasScript.onerror = () => {
      showNotification("Failed to load image generator", "error");
    };
  } catch (error) {
    console.error("Error in download process:", error);
    showNotification("Download failed: " + error.message, "error");
  }
}

function highlightTodaysExams() {
  const chatbotToggle = document.getElementById("chatbotToggle");
  if (chatbotToggle) {
    const badge = chatbotToggle.querySelector(".notification-badge");
    if (badge) {
      badge.remove();
    }
  }
}

// ------------------------------------------------------------------
// পরিসংখ্যান (শুধু তারিখ অনুযায়ী)
// ------------------------------------------------------------------
function updateStatistics() {
  if (!totalExamsEl || !upcomingExamsEl || !todayExamsEl || !completedExamsEl) return;

  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemesters = getSelectedSemesterValues();

  let examsForStats = examData;

  if (selectedDept !== "all") {
    examsForStats = examsForStats.filter((exam) => exam.department === selectedDept);
  }

  if (selectedSemesters && !selectedSemesters.includes("all") && selectedSemesters.length > 0) {
    examsForStats = examsForStats.filter((exam) => selectedSemesters.includes(exam.semester));
  }

  const total = examsForStats.length;
  const upcoming = examsForStats.filter((exam) => convertToStandardDate(exam.examDate) >= currentAppDate).length;
  const today = examsForStats.filter((exam) => convertToStandardDate(exam.examDate) === currentAppDate).length;
  const completed = examsForStats.filter((exam) => convertToStandardDate(exam.examDate) < currentAppDate).length;

  if (totalExamsEl) totalExamsEl.textContent = total;
  if (upcomingExamsEl) upcomingExamsEl.textContent = upcoming;
  if (todayExamsEl) todayExamsEl.textContent = today;
  if (completedExamsEl) completedExamsEl.textContent = completed;
}

// ------------------------------------------------------------------
// NEXT EXAM (শুধু এখনও শেষ হয়নি এমন)
// ------------------------------------------------------------------
function updateNextExam() {
  if (!nextExamCard) return;

  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  let filteredExams = filteredExamRoutine;

  filteredExams = filteredExams.filter(exam => !isExamCompleted(exam));

  if (dateFilterValue !== "past") {
    filteredExams = filteredExams.filter((exam) => convertToStandardDate(exam.examDate) >= currentAppDate);
  }

  if (nextExamCard) {
    if (filteredExams.length > 0 && dateFilterValue !== "past") {
      const nextExam = filteredExams[0];
      const daysLeft = window.dataFunctions.getDayDifference(currentAppDate, convertToStandardDate(nextExam.examDate));

      const dateDisplay = window.dataFunctions.formatDateShort(nextExam.examDate);

      nextExamCard.style.opacity = "0";

      setTimeout(() => {
        nextExamCard.innerHTML = `
                    <div class="next-exam-content">
                        <div class="next-exam-subject">${nextExam.subject}</div>
                        <div class="next-exam-class">${nextExam.department} - ${nextExam.semester}</div>
                        <div class="next-exam-date">${dateDisplay}</div>
                        <div class="next-exam-details">
                            <div class="detail-item">
                                <i class="fas fa-clock"></i>
                                <span>${nextExam.time}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-tag"></i>
                                <span class="exam-type-badge type-${nextExam.examType || "written"}">${(nextExam.examType === "practical" ? "Practical" : nextExam.examType === "referred" ? "Referred" : "Written").toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="countdown-container">
                            <div class="countdown-label">EXAM IN</div>
                            <div class="countdown-value">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</div>
                        </div>
                        <button class="btn-set-reminder" data-exam-id="${nextExam.id}">
                            <i class="fas fa-bell"></i> Set Reminder
                        </button>
                    </div>
                `;

        nextExamCard.style.opacity = "1";
        nextExamCard.style.transition = "opacity 0.3s ease";

        const reminderBtn = nextExamCard.querySelector(".btn-set-reminder");
        if (reminderBtn) {
          reminderBtn.addEventListener("click", function () {
            showNotificationOptions(nextExam);
          });
        }
      }, 200);

      if (nextExamInfo) {
        nextExamInfo.innerHTML = `Next exam: <strong>${nextExam.subject}</strong> for ${nextExam.department} - ${nextExam.semester} on ${dateDisplay}`;
      }
    } else {
      nextExamCard.innerHTML = `
                <div class="no-next-exam">
                    <div class="no-exam-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h4>No Upcoming Exams</h4>
                    <p>All exams are completed for the selected filters</p>
                </div>
            `;

      if (nextExamInfo) {
        nextExamInfo.textContent = "No upcoming exams for the selected filters";
      }
    }
  }
}

// ------------------------------------------------------------------
// UPCOMING LIST (শুধু এখনও শেষ হয়নি এমন)
// ------------------------------------------------------------------
function updateUpcomingList() {
  if (!upcomingList) return;

  let filteredExams = filteredExamRoutine.filter((exam) => convertToStandardDate(exam.examDate) >= currentAppDate && !isExamCompleted(exam));

  filteredExams.sort((a, b) => {
    const aStd = convertToStandardDate(a.examDate);
    const bStd = convertToStandardDate(b.examDate);
    return aStd.localeCompare(bStd);
  });
  const displayExams = filteredExams.slice(0, 5);

  if (upcomingList) {
    upcomingList.style.opacity = "0";

    setTimeout(() => {
      upcomingList.innerHTML = "";

      if (displayExams.length === 0) {
        upcomingList.innerHTML = `
                    <div class="no-upcoming">
                        <i class="fas fa-calendar-check"></i>
                        <p>No upcoming exams</p>
                    </div>
                `;
      } else {
        displayExams.forEach((exam, index) => {
          const div = document.createElement("div");
          div.className = "upcoming-item";
          div.style.opacity = "0";
          div.style.transform = "translateX(-20px)";

          const daysLeft = window.dataFunctions.getDayDifference(currentAppDate, convertToStandardDate(exam.examDate));
          const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);

          div.innerHTML = `
                        <div class="upcoming-item-header">
                            <div class="upcoming-subject">${exam.subject}</div>
                            <div class="upcoming-days">${daysLeft}d</div>
                        </div>
                        <div class="upcoming-class">${exam.department} - ${exam.semester}</div>
                        <div class="upcoming-date">${dateDisplay}</div>
                        <div class="upcoming-details">
                            <span class="upcoming-time">${exam.time}</span>
                            <span class="exam-type-badge type-${exam.examType || "written"}">${(exam.examType === "practical" ? "Practical" : exam.examType === "referred" ? "Referred" : "Written").toUpperCase()}</span>
                        </div>
                    `;

          div.addEventListener("click", () => {
            showExamDetails(exam);
          });

          upcomingList.appendChild(div);

          setTimeout(() => {
            div.style.transition = "all 0.3s ease";
            div.style.opacity = "1";
            div.style.transform = "translateX(0)";
          }, index * 100);
        });
      }

      upcomingList.style.opacity = "1";
      upcomingList.style.transition = "opacity 0.3s ease";
    }, 200);
  }
}

// ------------------------------------------------------------------
// ডিবাউন্স
// ------------------------------------------------------------------
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ------------------------------------------------------------------
// DOM লোড হলে ইনিশিয়ালাইজ
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", init);

// ------------------------------------------------------------------
// গ্লোবাল এক্সপোর্ট
// ------------------------------------------------------------------
window.updateRoutineDisplay = updateRoutineDisplay;
window.updateStatistics = updateStatistics;
window.updateNextExam = updateNextExam;
window.updateUpcomingList = updateUpcomingList;
window.examData = examData;
window.filteredExamRoutine = filteredExamRoutine;
window.showNotification = showNotification;
window.refreshRoutine = refreshRoutine;
window.getSelectedSemesterValues = getSelectedSemesterValues;
window.getSelectedExamTypeValues = getSelectedExamTypeValues;
window.updateDropdownHeader = updateDropdownHeader;
window.clearAllFilters = clearAllFilters;
window.saveFilterState = saveFilterState;