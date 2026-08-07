// ============================================================
// script.js - সম্পূর্ণ আপডেটেড (User Profile Support সহ)
// ============================================================

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

// Toggle Elements
const semesterMultipleToggle = document.getElementById('semesterMultipleToggle');
const semesterSingleSelect = document.getElementById('semesterSingleSelect');
const semesterMultipleContainer = document.getElementById('semesterMultipleContainer');

const examTypeMultipleToggle = document.getElementById('examTypeMultipleToggle');
const examTypeSingleSelect = document.getElementById('examTypeSingleSelect');
const examTypeMultipleContainer = document.getElementById('examTypeMultipleContainer');

// Global variables
let filteredExamRoutine = [];
let currentAppDate = "";
let examData = [];
let isLoading = false;
let isFilterChanging = false;

// ✅ Global reference for filtered exams (used by download.js)
window.filteredExamRoutine = filteredExamRoutine;

// ✅ Global reference for all exams (used by download.js)
window.examData = examData;

// Initialize the application
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

  // ✅ Set default toggle states (OFF)
  setDefaultToggleStates();

  // ✅ Apply initial filters based on user login state
  applyInitialFilters();

  // ✅ Update routine title
  updateRoutineTitle("all", "all");

  setupFirebaseListener();

  checkStudentScheduledNotifications();

  // Initialize custom dropdowns
  initDropdowns();

  // Listen for profile changes from user-auth.js
  window.addEventListener('profileUpdated', function() {
    // Re-apply filters when profile is updated
    if (window.userAuth && window.userAuth.applyDefaultFilters) {
      window.userAuth.applyDefaultFilters();
    }
  });
}

// ============================================================
// APPLY INITIAL FILTERS (based on user login)
// ============================================================
function applyInitialFilters() {
  // Check if user is logged in
  const user = window.firebase?.auth?.currentUser;
  if (user) {
    // User is logged in - let user-auth.js handle it
    // But we need to ensure that the profile is loaded and applied
    if (window.userAuth && typeof window.userAuth.applyDefaultFilters === 'function') {
      // It will call handleFilterChange internally
      window.userAuth.applyDefaultFilters();
    } else {
      // Fallback to all
      setAllFilters();
    }
  } else {
    // No user - set all filters to 'all'
    setAllFilters();
  }
}

// ============================================================
// SET ALL FILTERS TO 'ALL' (default)
// ============================================================
function setAllFilters() {
  // Department
  if (deptSelect) deptSelect.value = 'all';
  
  // Semester - single select
  if (semesterSingleSelect) semesterSingleSelect.value = 'all';
  // Semester - multiple (uncheck all)
  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  if (window.updateDropdownHeader) window.updateDropdownHeader('semesterDropdown');
  
  // Exam Type - single select
  if (examTypeSingleSelect) examTypeSingleSelect.value = 'all';
  // Exam Type - multiple (uncheck all)
  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  if (window.updateDropdownHeader) window.updateDropdownHeader('examTypeDropdown');
  
  // Date filter
  if (dateFilter) dateFilter.value = 'upcoming';
  
  // Toggles OFF
  if (semesterMultipleToggle) {
    semesterMultipleToggle.checked = false;
    document.getElementById('semesterToggleStatus').textContent = 'OFF';
    semesterSingleSelect.style.display = 'block';
    semesterMultipleContainer.style.display = 'none';
    semesterMultipleContainer.classList.remove('active');
  }
  if (examTypeMultipleToggle) {
    examTypeMultipleToggle.checked = false;
    document.getElementById('examTypeToggleStatus').textContent = 'OFF';
    examTypeSingleSelect.style.display = 'block';
    examTypeMultipleContainer.style.display = 'none';
    examTypeMultipleContainer.classList.remove('active');
  }
  
  // Hide clear filters button
  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  
  // Apply filters
  if (typeof handleFilterChange === 'function') {
    handleFilterChange();
  }
}

// ============================================================
// DEFAULT TOGGLE STATES (OFF)
// ============================================================
function setDefaultToggleStates() {
  // Semester toggle OFF
  semesterMultipleToggle.checked = false;
  document.getElementById('semesterToggleStatus').textContent = 'OFF';
  semesterSingleSelect.style.display = 'block';
  semesterMultipleContainer.style.display = 'none';
  semesterMultipleContainer.classList.remove('active');

  // Exam Type toggle OFF
  examTypeMultipleToggle.checked = false;
  document.getElementById('examTypeToggleStatus').textContent = 'OFF';
  examTypeSingleSelect.style.display = 'block';
  examTypeMultipleContainer.style.display = 'none';
  examTypeMultipleContainer.classList.remove('active');
}

// ============================================================
// DROPDOWN WITH CHECKBOX FUNCTIONS
// ============================================================

// Initialize dropdowns
function initDropdowns() {
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.dropdown-body').forEach(b => b.classList.remove('open'));
      document.querySelectorAll('.dropdown-header').forEach(h => h.classList.remove('active'));
    }
  });

  // Toggle dropdown on header click
  document.querySelectorAll('.dropdown-header').forEach(header => {
    header.addEventListener('click', function(e) {
      e.stopPropagation();
      const dropdown = this.closest('.custom-dropdown');
      const body = dropdown.querySelector('.dropdown-body');
      const isOpen = body.classList.contains('open');
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown-body').forEach(b => b.classList.remove('open'));
      document.querySelectorAll('.dropdown-header').forEach(h => h.classList.remove('active'));
      
      if (!isOpen) {
        body.classList.add('open');
        this.classList.add('active');
      }
    });
  });

  // Update header text when checkbox changes
  document.querySelectorAll('.custom-dropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', function() {
      const dropdown = this.closest('.custom-dropdown');
      updateDropdownHeader(dropdown.id);
    });
  });

  // Set initial header text
  updateDropdownHeader('semesterDropdown');
  updateDropdownHeader('examTypeDropdown');
}

// Get selected values from dropdown
function getSelectedDropdownValues(dropdownId) {
  const checkboxes = document.querySelectorAll(`#${dropdownId} input[type="checkbox"]:checked`);
  const values = Array.from(checkboxes).map(cb => cb.value);
  return values;
}

// Update dropdown header text
function updateDropdownHeader(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;
  
  const headerText = dropdown.querySelector('.dropdown-selected-text');
  const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
  const checked = dropdown.querySelectorAll('input[type="checkbox"]:checked');
  
  if (checked.length === 0) {
    headerText.textContent = 'None';
  } else if (checked.length === checkboxes.length) {
    headerText.textContent = 'All';
  } else if (checked.length <= 2) {
    const values = Array.from(checked).map(cb => cb.value);
    headerText.textContent = values.join(', ');
  } else {
    headerText.textContent = `${checked.length} selected`;
  }
}

// ============================================================
// GET SELECTED VALUES BASED ON TOGGLE STATE
// ============================================================

function getSelectedSemesterValues() {
  if (semesterMultipleToggle.checked) {
    const checked = document.querySelectorAll('#semesterDropdown input[type="checkbox"]:checked');
    const values = Array.from(checked).map(cb => cb.value);
    return values.length ? values : ['all'];
  } else {
    const val = semesterSingleSelect.value;
    return val === 'all' ? ['all'] : [val];
  }
}

function getSelectedExamTypeValues() {
  if (examTypeMultipleToggle.checked) {
    const checked = document.querySelectorAll('#examTypeDropdown input[type="checkbox"]:checked');
    const values = Array.from(checked).map(cb => cb.value);
    return values.length ? values : ['all'];
  } else {
    const val = examTypeSingleSelect.value;
    return val === 'all' ? ['all'] : [val];
  }
}

// ============================================================
// DEFAULT FILTERS: 1st Semester & Written (legacy - kept for compatibility)
// ============================================================
function setDefaultFilters() {
  // This is kept for backward compatibility but we no longer call it in init.
  // Instead we use setAllFilters or applyInitialFilters.
  // If called, it will set 1st and written.
  semesterSingleSelect.value = '1st';
  examTypeSingleSelect.value = 'written';
  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
    cb.checked = (cb.value === '1st');
  });
  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
    cb.checked = (cb.value === 'written');
  });
  updateDropdownHeader('semesterDropdown');
  updateDropdownHeader('examTypeDropdown');
  handleFilterChange();
}

// ============================================================
// TOGGLE EVENT LISTENERS
// ============================================================

// Semester Toggle
semesterMultipleToggle.addEventListener('change', function() {
  const isOn = this.checked;
  document.getElementById('semesterToggleStatus').textContent = isOn ? 'ON' : 'OFF';
  
  if (isOn) {
    semesterSingleSelect.style.display = 'none';
    semesterMultipleContainer.style.display = 'block';
    semesterMultipleContainer.classList.add('active');
    // Sync: if single select has a value, check corresponding checkbox
    const singleVal = semesterSingleSelect.value;
    if (singleVal !== 'all') {
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = (cb.value === singleVal);
      });
    } else {
      // If 'all', check none (or all? We'll keep none)
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
    }
    updateDropdownHeader('semesterDropdown');
  } else {
    semesterSingleSelect.style.display = 'block';
    semesterMultipleContainer.style.display = 'none';
    semesterMultipleContainer.classList.remove('active');
    // Reset single select to 'all' or keep? Better to set to 'all'
    semesterSingleSelect.value = 'all';
    document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDropdownHeader('semesterDropdown');
  }
  handleFilterChange();
});

// Exam Type Toggle
examTypeMultipleToggle.addEventListener('change', function() {
  const isOn = this.checked;
  document.getElementById('examTypeToggleStatus').textContent = isOn ? 'ON' : 'OFF';
  
  if (isOn) {
    examTypeSingleSelect.style.display = 'none';
    examTypeMultipleContainer.style.display = 'block';
    examTypeMultipleContainer.classList.add('active');
    const singleVal = examTypeSingleSelect.value;
    if (singleVal !== 'all') {
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = (cb.value === singleVal);
      });
    } else {
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
    }
    updateDropdownHeader('examTypeDropdown');
  } else {
    examTypeSingleSelect.style.display = 'block';
    examTypeMultipleContainer.style.display = 'none';
    examTypeMultipleContainer.classList.remove('active');
    examTypeSingleSelect.value = 'all';
    document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDropdownHeader('examTypeDropdown');
  }
  handleFilterChange();
});

// ============================================================
// SETUP FIREBASE LISTENER
// ============================================================
function setupFirebaseListener() {
  if (!window.firebase || !window.firebase.db) {
    console.log("Firebase not available for realtime updates");
    return;
  }

  try {
    const examsCollection = window.firebase.collection(
      window.firebase.db,
      "exams",
    );

    window.firebase.onSnapshot(examsCollection, (snapshot) => {
      if (!isLoading && !isFilterChanging) {
        console.log("Firebase data changed, auto-refreshing...");
        clearTimeout(window.autoRefreshTimeout);
        window.autoRefreshTimeout = setTimeout(() => {
          refreshRoutine();
          showNotification("Exam schedule updated automatically", "info");
          // Update notification badge if user is logged in
          if (window.userAuth && window.userAuth.updateNotificationBadge) {
            window.userAuth.updateNotificationBadge();
          }
        }, 1000);
      }
    });

    console.log("Firebase realtime listener activated");
  } catch (error) {
    console.error("Error setting up Firebase listener:", error);
  }
}

// Check for student scheduled notifications
function checkStudentScheduledNotifications() {
  const notifications = JSON.parse(
    localStorage.getItem("studentNotifications") || "[]",
  );
  const now = new Date();

  const validNotifications = notifications.filter((notification) => {
    const notificationTime = new Date(notification.notificationTime);
    return notificationTime > now;
  });

  localStorage.setItem(
    "studentNotifications",
    JSON.stringify(validNotifications),
  );

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

        const updatedNotifications = JSON.parse(
          localStorage.getItem("studentNotifications") || "[]",
        );
        const filtered = updatedNotifications.filter(
          (n) =>
            !(
              n.examId === notification.examId &&
              n.notificationTime === notification.notificationTime
            ),
        );
        localStorage.setItem("studentNotifications", JSON.stringify(filtered));
      }, delay);
    }
  });
}

// Animate date update
function animateDateUpdate() {
  if (!currentDateEl) return;

  currentDateEl.style.opacity = "0";
  currentDateEl.textContent = window.dataFunctions.formatDateShort(currentAppDate);

  setTimeout(() => {
    currentDateEl.style.transition = "opacity 0.5s ease";
    currentDateEl.style.opacity = "1";
  }, 100);
}

// Load initial data with loading states
async function loadInitialData() {
  showLoadingStates();

  try {
    examData = await window.dataFunctions.loadExamsFromFirebase();
    // ✅ Update global references
    window.examData = examData;

    filteredExamRoutine = [...examData];
    window.filteredExamRoutine = filteredExamRoutine;

    filteredExamRoutine.sort(
      (a, b) => new Date(a.examDate) - new Date(b.examDate),
    );

    updateRoutineDisplay();
    updateStatistics();
    updateNextExam();
    updateUpcomingList();

    if (examData.length === 0) {
      showNoExamsMessage();
    } else {
      highlightTodaysExams();
    }

    // Dispatch event for other modules (e.g., notification badge)
    window.dispatchEvent(new Event('examDataLoaded'));

  } catch (error) {
    console.error("Error loading initial data:", error);
    showErrorState();
  } finally {
    hideLoadingStates();
  }
}

// Show loading states
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

// Hide loading states
function hideLoadingStates() {
  isLoading = false;
}

// Show error state
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

// ============================================================
// CLEAR FILTERS BUTTON (Position: Below filter boxes)
// ============================================================
function addClearFiltersButton() {
  if (document.getElementById("clearFiltersBtn")) return;

  const controls = document.querySelector(".controls");
  if (!controls) return;

  // Create container for clear button
  const clearContainer = document.createElement("div");
  clearContainer.className = "clear-filters-container";
  clearContainer.style.cssText = "display: flex; justify-content: flex-end; margin-top: 10px;";

  const clearBtn = document.createElement("button");
  clearBtn.id = "clearFiltersBtn";
  clearBtn.className = "btn-clear-filters";
  clearBtn.innerHTML = '<i class="fas fa-times"></i> Clear Filters';
  clearBtn.style.display = "none";

  clearContainer.appendChild(clearBtn);
  
  // Insert after filter-controls
  const filterControls = document.querySelector(".filter-controls");
  if (filterControls && filterControls.parentNode) {
    filterControls.parentNode.insertBefore(clearContainer, filterControls.nextSibling);
  } else {
    controls.appendChild(clearContainer);
  }

  clearBtn.addEventListener("click", clearAllFilters);
}

function clearAllFilters() {
  // Department
  deptSelect.value = "all";
  
  // Semester - Single
  semesterSingleSelect.value = "all";
  // Semester - Multiple (uncheck all)
  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateDropdownHeader('semesterDropdown');
  
  // Exam Type - Single
  examTypeSingleSelect.value = "all";
  // Exam Type - Multiple (uncheck all)
  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateDropdownHeader('examTypeDropdown');
  
  // Date Filter
  dateFilter.value = "upcoming";
  
  // Toggles OFF
  semesterMultipleToggle.checked = false;
  examTypeMultipleToggle.checked = false;
  document.getElementById('semesterToggleStatus').textContent = 'OFF';
  document.getElementById('examTypeToggleStatus').textContent = 'OFF';
  
  // Show single selects, hide multiple containers
  semesterSingleSelect.style.display = 'block';
  semesterMultipleContainer.style.display = 'none';
  semesterMultipleContainer.classList.remove('active');
  
  examTypeSingleSelect.style.display = 'block';
  examTypeMultipleContainer.style.display = 'none';
  examTypeMultipleContainer.classList.remove('active');
  
  // Hide clear button
  document.getElementById("clearFiltersBtn").style.display = "none";
  
  // Remove active class from quick filters
  document.querySelectorAll(".btn-quick-filter").forEach((btn) => {
    btn.classList.remove("active");
  });
  const allBtn = document.querySelector('.btn-quick-filter[data-filter="all"]');
  if (allBtn) allBtn.classList.add("active");
  
  // Apply filters
  handleFilterChange();
  
  showNotification('All filters cleared', 'info');
}

// Setup event listeners with debouncing
function setupEventListeners() {
  const debouncedFilterChange = debounce(() => {
    if (!isFilterChanging) {
      handleFilterChange();
    }
  }, 300);

  // Department dropdown
  if (deptSelect) deptSelect.addEventListener('change', debouncedFilterChange);
  
  // Date filter
  if (dateFilter) dateFilter.addEventListener('change', debouncedFilterChange);

  // Semester single select
  if (semesterSingleSelect) semesterSingleSelect.addEventListener('change', debouncedFilterChange);
  
  // Exam Type single select
  if (examTypeSingleSelect) examTypeSingleSelect.addEventListener('change', debouncedFilterChange);

  // Semester dropdown checkboxes (already added in initDropdowns, but we need to trigger filter change)
  document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', debouncedFilterChange);
  });

  // Exam Type dropdown checkboxes
  document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', debouncedFilterChange);
  });

  addClearFiltersButton();

  setupQuickFilters();
}

// Setup quick filter buttons
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
                <button class="btn-quick-filter" data-filter="upcoming">Upcoming</button>
                <button class="btn-quick-filter" data-filter="computer">Computer</button>
                <button class="btn-quick-filter" data-filter="civil">Civil</button>
                <button class="btn-quick-filter" data-filter="practical">Practical</button>
                <button class="btn-quick-filter" data-filter="written">Written</button>
                <button class="btn-quick-filter" data-filter="referred">Referred</button>
            </div>
        `;

    const filterControls = document.querySelector(".filter-controls");
    if (filterControls && filterControls.parentNode) {
      filterControls.parentNode.insertBefore(
        quickFilterDiv,
        filterControls.nextSibling,
      );

      document.querySelectorAll(".btn-quick-filter").forEach((btn) => {
        btn.addEventListener("click", function () {
          document.querySelectorAll(".btn-quick-filter").forEach((b) => {
            b.classList.remove("active");
          });

          this.classList.add("active");

          applyQuickFilter(this.dataset.filter);
        });
      });
    }
  }
}

// Apply quick filter
function applyQuickFilter(filter) {
  const clearBtn = document.getElementById("clearFiltersBtn");

  switch (filter) {
    case "today":
      deptSelect.value = "all";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      // Toggles OFF
      semesterMultipleToggle.checked = false;
      examTypeMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      document.getElementById('examTypeToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      examTypeSingleSelect.style.display = 'block';
      examTypeMultipleContainer.style.display = 'none';
      examTypeMultipleContainer.classList.remove('active');
      
      applyFilters("all", ["all"], ["all"], "upcoming");
      
      const todayExams = examData.filter(exam => exam.examDate === currentAppDate);
      filteredExamRoutine = todayExams;
      window.filteredExamRoutine = filteredExamRoutine;
      filteredExamRoutine.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
      updateRoutineDisplay();
      updateStatistics();
      updateNextExam();
      updateUpcomingList();
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    case "upcoming":
      deptSelect.value = "all";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      semesterMultipleToggle.checked = false;
      examTypeMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      document.getElementById('examTypeToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      examTypeSingleSelect.style.display = 'block';
      examTypeMultipleContainer.style.display = 'none';
      examTypeMultipleContainer.classList.remove('active');
      
      applyFilters("all", ["all"], ["all"], "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    case "computer":
      deptSelect.value = "Computer";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      semesterMultipleToggle.checked = false;
      examTypeMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      document.getElementById('examTypeToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      examTypeSingleSelect.style.display = 'block';
      examTypeMultipleContainer.style.display = 'none';
      examTypeMultipleContainer.classList.remove('active');
      
      applyFilters("Computer", ["all"], ["all"], "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    case "civil":
      deptSelect.value = "Civil";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      semesterMultipleToggle.checked = false;
      examTypeMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      document.getElementById('examTypeToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      examTypeSingleSelect.style.display = 'block';
      examTypeMultipleContainer.style.display = 'none';
      examTypeMultipleContainer.classList.remove('active');
      
      applyFilters("Civil", ["all"], ["all"], "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    case "practical":
      deptSelect.value = "all";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      // Check practical in multiple
      document.querySelector('#examTypeDropdown input[value="practical"]').checked = true;
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      // Toggle ON for exam type (to show multiple)
      examTypeMultipleToggle.checked = true;
      document.getElementById('examTypeToggleStatus').textContent = 'ON';
      examTypeSingleSelect.style.display = 'none';
      examTypeMultipleContainer.style.display = 'block';
      examTypeMultipleContainer.classList.add('active');
      
      semesterMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      
      applyFilters("all", ["all"], ["practical"], "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    case "written":
      deptSelect.value = "all";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelector('#examTypeDropdown input[value="written"]').checked = true;
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      examTypeMultipleToggle.checked = true;
      document.getElementById('examTypeToggleStatus').textContent = 'ON';
      examTypeSingleSelect.style.display = 'none';
      examTypeMultipleContainer.style.display = 'block';
      examTypeMultipleContainer.classList.add('active');
      
      semesterMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      
      applyFilters("all", ["all"], ["written"], "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    case "referred":
      deptSelect.value = "all";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelector('#examTypeDropdown input[value="referred"]').checked = true;
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      examTypeMultipleToggle.checked = true;
      document.getElementById('examTypeToggleStatus').textContent = 'ON';
      examTypeSingleSelect.style.display = 'none';
      examTypeMultipleContainer.style.display = 'block';
      examTypeMultipleContainer.classList.add('active');
      
      semesterMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      
      applyFilters("all", ["all"], ["referred"], "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
      
    default:
      deptSelect.value = "all";
      dateFilter.value = "upcoming";
      semesterSingleSelect.value = "all";
      examTypeSingleSelect.value = "all";
      document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#examTypeDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
      updateDropdownHeader('semesterDropdown');
      updateDropdownHeader('examTypeDropdown');
      semesterMultipleToggle.checked = false;
      examTypeMultipleToggle.checked = false;
      document.getElementById('semesterToggleStatus').textContent = 'OFF';
      document.getElementById('examTypeToggleStatus').textContent = 'OFF';
      semesterSingleSelect.style.display = 'block';
      semesterMultipleContainer.style.display = 'none';
      semesterMultipleContainer.classList.remove('active');
      examTypeSingleSelect.style.display = 'block';
      examTypeMultipleContainer.style.display = 'none';
      examTypeMultipleContainer.classList.remove('active');
      
      applyFilters("all", ["all"], ["all"], "upcoming");
      if (clearBtn) clearBtn.style.display = "none";
  }
}

// Initialize UI elements
function initializeUI() {
  if (currentDateEl) {
    currentDateEl.textContent = window.dataFunctions.formatDateShort(currentAppDate);
  }

  updateDepartmentOptions();

  addSearchFunctionality();
}

// Update routine title based on filters
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

  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";
  if (dateFilterValue === "upcoming") {
    titleText += " (Upcoming)";
  } else if (dateFilterValue === "past") {
    titleText += " (Past)";
  }
  routineTitle.innerHTML = titleText;
}

// Update department options dynamically
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

// Add search functionality
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

      if (searchInput)
        searchInput.addEventListener("input", debounce(handleSearch, 300));
      if (clearSearchBtn) clearSearchBtn.addEventListener("click", clearSearch);
    }
  }
}

// Handle search
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

  filteredExamRoutine.sort(
    (a, b) => new Date(a.examDate) - new Date(b.examDate),
  );

  displayExams(filteredExamRoutine);

  if (searchResultsInfo) {
    searchResultsInfo.textContent = `Found ${searchResults.length} exam${searchResults.length !== 1 ? "s" : ""} matching "${searchTerm}"`;
    searchResultsInfo.style.display = "block";
  }

  const routineTitle = document.querySelector(".routine-container h2");
  if (routineTitle) {
    routineTitle.innerHTML = `<i class="fas fa-search"></i> Search Results for "${searchTerm}"`;
  }

  const currentDate = window.dataFunctions.getCurrentDate();
  const total = searchResults.length;
  const upcoming = searchResults.filter(
    (exam) => exam.examDate >= currentDate,
  ).length;
  const today = searchResults.filter(
    (exam) => exam.examDate === currentDate,
  ).length;
  const completed = searchResults.filter(
    (exam) => exam.examDate < currentDate,
  ).length;

  if (totalExamsEl) totalExamsEl.textContent = total;
  if (upcomingExamsEl) upcomingExamsEl.textContent = upcoming;
  if (todayExamsEl) todayExamsEl.textContent = today;
  if (completedExamsEl) completedExamsEl.textContent = completed;
}

// Clear search
function clearSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearch");
  const searchResultsInfo = document.getElementById("searchResultsInfo");

  if (searchInput) searchInput.value = "";
  if (clearSearchBtn) clearSearchBtn.style.display = "none";
  if (searchResultsInfo) searchResultsInfo.style.display = "none";
  handleFilterChange();
}

// Main filter handler
function handleFilterChange() {
  if (isLoading || isFilterChanging) return;

  isFilterChanging = true;

  // Clear search if active
  const searchInput = document.getElementById("searchInput");
  if (searchInput && searchInput.value.trim() !== "") {
    clearSearch();
  }

  const dept = deptSelect ? deptSelect.value : "all";
  const semesterValues = getSelectedSemesterValues();
  const examTypeValues = getSelectedExamTypeValues();
  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  console.log("Filter changed:", {
    dept,
    semesterValues,
    examTypeValues,
    dateFilterValue,
  });

  applyFilters(dept, semesterValues, examTypeValues, dateFilterValue);

  isFilterChanging = false;
}

// ============================================================
// ✅ APPLY FILTERS - Updated with Toggle Support
// ============================================================
function applyFilters(dept, semesters, examTypes, dateFilterValue = null) {
  const clearBtn = document.getElementById("clearFiltersBtn");
  
  // Check if any filter is active
  const isFilterActive = dept !== "all" || 
                         (semesters && !semesters.includes('all') && semesters.length > 0) || 
                         (examTypes && !examTypes.includes('all') && examTypes.length > 0) ||
                         (dateFilterValue && dateFilterValue === "past");
  
  if (clearBtn) {
    clearBtn.style.display = isFilterActive ? "flex" : "none";
  }

  let tempFiltered = [...examData];

  // Department filter
  if (dept !== "all") {
    tempFiltered = tempFiltered.filter((exam) => exam.department === dept);
  }

  // Semester filter
  if (semesters && !semesters.includes('all') && semesters.length > 0) {
    tempFiltered = tempFiltered.filter((exam) => semesters.includes(exam.semester));
  }

  // Exam Type filter
  if (examTypes && !examTypes.includes('all') && examTypes.length > 0) {
    tempFiltered = tempFiltered.filter((exam) => {
      const type = exam.examType || 'written';
      return examTypes.includes(type);
    });
  }

  // Date filter
  const filterVal = dateFilterValue !== null ? dateFilterValue : (dateFilter ? dateFilter.value : "upcoming");
  
  if (filterVal === "past") {
    tempFiltered = tempFiltered.filter((exam) => exam.examDate < currentAppDate);
  } else if (filterVal === "upcoming") {
    tempFiltered = tempFiltered.filter((exam) => exam.examDate >= currentAppDate);
  }

  filteredExamRoutine = tempFiltered;
  window.filteredExamRoutine = filteredExamRoutine;

  console.log(
    `Filtered ${examData.length} exams down to ${filteredExamRoutine.length} exams (${filterVal})`,
  );

  filteredExamRoutine.sort(
    (a, b) => new Date(a.examDate) - new Date(b.examDate),
  );

  // Update title
  const titleDept = dept !== "all" ? dept : "all";
  const titleSem = (semesters && semesters.length === 1 && semesters[0] !== 'all') ? semesters[0] : "all";
  updateRoutineTitle(titleDept, titleSem);

  updateRoutineDisplay();
  updateStatistics();
  updateNextExam();
  updateUpcomingList();
}

// Handle refresh with visual feedback
async function handleRefresh() {
  if (isLoading) return;

  try {
    await refreshRoutine();
    showNotification("Routine refreshed successfully!", "success");
  } catch (error) {
    console.error("Refresh error:", error);
    showNotification("Failed to refresh routine", "error");
  }
}

// Refresh routine from Firebase
async function refreshRoutine() {
  showLoadingStates();

  try {
    const newExamData = await window.dataFunctions.loadExamsFromFirebase();
    examData = newExamData;
    window.examData = examData;

    const dept = deptSelect ? deptSelect.value : "all";
    const semesters = getSelectedSemesterValues();
    const examTypes = getSelectedExamTypeValues();
    const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

    applyFilters(dept, semesters, examTypes, dateFilterValue);

    updateDepartmentOptions();

    if (examData.length === 0) {
      showNoExamsMessage();
    } else {
      highlightTodaysExams();
    }

    // Dispatch event for other modules
    window.dispatchEvent(new Event('examDataLoaded'));

  } catch (error) {
    console.error("Error refreshing routine:", error);
    throw error;
  } finally {
    hideLoadingStates();
  }
}

// Show no exams message
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

// Update routine display with animation
function updateRoutineDisplay() {
  if (!routineList) return;

  const routineContainer = document.querySelector(".routine-container");
  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemesters = getSelectedSemesterValues();

  if (routineContainer) {
    if (selectedDept !== "all" || (selectedSemesters && !selectedSemesters.includes('all') && selectedSemesters.length > 0)) {
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

      document
        .getElementById("clearFiltersFromEmpty")
        ?.addEventListener("click", clearAllFilters);
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

// Display exams (for search results)
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

// ============================================================
// CREATE ROUTINE ELEMENT - WITH GROUP COLUMN
// ============================================================
function createRoutineElement(exam) {
  const examDate = new Date(exam.examDate);

  let status = "Upcoming";
  let statusClass = "status-upcoming";
  let daysLeft = 0;

  if (exam.examDate < currentAppDate) {
    status = "Completed";
    statusClass = "status-completed";
  } else if (exam.examDate === currentAppDate) {
    status = "Today";
    statusClass = "status-today";
  } else {
    daysLeft = window.dataFunctions.getDayDifference(
      currentAppDate,
      exam.examDate,
    );
    status = `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`;
  }

  const isToday = exam.examDate === currentAppDate;

  const examType = exam.examType || "written";
  const typeClass =
    examType === "practical" ? "type-practical" : examType === "referred" ? "type-referred" : "type-written";
  const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";

  // ✅ Group handling: For practical exams show group, else "-"
  let groupDisplay = "-";
  if (examType === "practical" && exam.group) {
    groupDisplay = exam.group;
  } else if (examType === "practical") {
    // If it's practical but group is missing, default to "A1" (should be set during add)
    groupDisplay = "A1";
  }

  // ✅ Date format: dd/mm/yyyy
  const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);

  const div = document.createElement("div");
  div.className = `routine-item ${exam.examDate < currentAppDate ? "past" : ""} ${isToday ? "today" : ""}`;
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
            <span class="status-badge ${statusClass}">${status}</span>
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

// ============================================================
// NOTIFICATION FUNCTIONS (Student)
// ============================================================

function showNotificationOptions(exam) {
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotificationModal(exam);
        } else {
          showNotification(
            "Notifications are blocked. Please enable notifications in your browser settings.",
            "error",
          );
        }
      });
    } else if (Notification.permission === "granted") {
      showNotificationModal(exam);
    } else {
      showNotification(
        "Notifications are blocked. Please enable notifications in your browser settings.",
        "error",
      );
    }
  } else {
    showNotification(
      "Notifications are not supported in this browser",
      "error",
    );
  }
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

  modal
    .querySelector(".btn-close-notify-options")
    .addEventListener("click", () => modal.remove());
  modal
    .querySelector(".btn-cancel-notify")
    .addEventListener("click", () => modal.remove());

  modal
    .querySelector(".btn-test-notification-now")
    .addEventListener("click", () => {
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
  const examDateTime = new Date(
    `${exam.examDate}T${convertTimeTo24Hour(exam.time)}`,
  );
  const notificationTime = new Date(
    examDateTime.getTime() - minutesBefore * 60 * 1000,
  );
  const now = new Date();
  const delay = notificationTime - now;

  if (delay > 0) {
    const notifications = JSON.parse(
      localStorage.getItem("studentNotifications") || "[]",
    );
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

      const updatedNotifications = JSON.parse(
        localStorage.getItem("studentNotifications") || "[]",
      );
      const filtered = updatedNotifications.filter(
        (n) =>
          !(
            n.examId === exam.id &&
            n.notificationTime === notificationTime.toISOString()
          ),
      );
      localStorage.setItem("studentNotifications", JSON.stringify(filtered));
    }, delay);

    const timingText =
      minutesBefore === 0 ? "at exam time" : `${minutesBefore} minutes before`;
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

// ============================================================
// EXAM DETAILS FUNCTIONS
// ============================================================

function showExamDetails(exam) {
  const daysLeft = window.dataFunctions.getDayDifference(
    currentAppDate,
    exam.examDate,
  );
  let statusText = "";
  let statusClass = "";

  if (exam.examDate < currentAppDate) {
    statusText = "This exam has already taken place.";
    statusClass = "past";
  } else if (exam.examDate === currentAppDate) {
    statusText = "This exam is scheduled for today!";
    statusClass = "today";
  } else {
    statusText = `This exam is in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`;
    statusClass = "upcoming";
  }

  const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);

  const examType = exam.examType || "written";
  const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";

  // Group info
  let groupDisplay = "-";
  if (examType === "practical" && exam.group) {
    groupDisplay = exam.group;
  } else if (examType === "practical") {
    groupDisplay = "A1";
  }

  const modal = document.createElement("div");
  modal.className = "exam-details-modal";
  modal.innerHTML = `
        <div class="exam-details-content">
            <div class="exam-details-header">
                <h3>${exam.subject} Exam Details</h3>
                <button class="btn-close-modal">&times;</button>
            </div>
            <div class="exam-details-body">
                <div class="detail-row">
                    <span class="detail-label">Department:</span>
                    <span class="detail-value dept-badge dept-${exam.department.toLowerCase()}">${exam.department}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Semester:</span>
                    <span class="detail-value">${exam.semester}</span>
                </div>
                ${examType === "practical" ? `
                <div class="detail-row">
                    <span class="detail-label">Group:</span>
                    <span class="detail-value group-badge">${groupDisplay}</span>
                </div>
                ` : ""}
                <div class="detail-row">
                    <span class="detail-label">Exam Type:</span>
                    <span class="detail-value exam-type-badge type-${examType}">${typeText}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Exam Date:</span>
                    <span class="detail-value">${dateDisplay}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${exam.time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Room:</span>
                    <span class="detail-value">${exam.room}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value status-${statusClass}">${statusText}</span>
                </div>
                ${exam.addedBy ? `
                <div class="detail-row">
                    <span class="detail-label">Added by:</span>
                    <span class="detail-value">${exam.addedBy}</span>
                </div>
                ` : ""}
            </div>
            <div class="exam-details-footer">
                <button class="btn-remind-me" data-exam-id="${exam.id}">
                    <i class="fas fa-bell"></i> Set Reminder
                </button>
                <button class="btn-share">
                    <i class="fas fa-share-alt"></i> Share
                </button>
                <button class="btn-download-exam">
                    <i class="fas fa-download"></i> Download as JPG
                </button>
                <div class="explore-routine-text">
                    Explore routine 2026
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

async function downloadExamAsJPG(exam) {
  try {
    showNotification("Generating JPG image...", "info");

    const html2canvasScript = document.createElement("script");
    html2canvasScript.src =
      "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(html2canvasScript);

    html2canvasScript.onload = async () => {
      try {
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

        const currentDate = window.dataFunctions.formatDateShort(
          window.dataFunctions.getCurrentDate(),
        );
        const status =
          exam.examDate < currentAppDate
            ? "Completed"
            : exam.examDate === currentAppDate
              ? "Today"
              : "Upcoming";

        const examType = exam.examType || "written";
        const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";
        const groupDisplay = (examType === "practical") ? (exam.group || "A1") : "-";

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
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Semester</div>
                            <div style="font-size: 24px; font-weight: bold;">${exam.semester}</div>
                        </div>
                        
                        ${examType === "practical" ? `
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Group</div>
                            <div style="font-size: 24px; font-weight: bold;">${groupDisplay}</div>
                        </div>
                        ` : ""}
                        
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Exam Date</div>
                            <div style="font-size: 24px; font-weight: bold;">${window.dataFunctions.formatDateShort(exam.examDate)}</div>
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Time</div>
                            <div style="font-size: 24px; font-weight: bold;">${exam.time}</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 40px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Exam Type</div>
                            <div style="font-size: 24px; font-weight: bold; color: ${examType === "practical" ? "#ffffff" : "#ffffff"}">${typeText}</div>
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Status</div>
                            <div style="font-size: 24px; font-weight: bold; color: ${status === "Today" ? "#ffd700" : status === "Upcoming" ? "#ffe600" : "#f44336"}">${status}</div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 30px;">
                        <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Room Allocation</div>
                        <div style="font-size: 18px;">${exam.room}</div>
                    </div>
                    
                    ${exam.addedBy ? `
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 30px;">
                        <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Added by</div>
                        <div style="font-size: 18px;">${exam.addedBy}</div>
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

function shareExamInfo(exam) {
  const examType = exam.examType || "written";
  const typeText = examType === "practical" ? "Practical" : examType === "referred" ? "Referred" : "Written";
  const dateDisplay = window.dataFunctions.formatDateShort(exam.examDate);
  let shareText = `${exam.subject} Exam\nDepartment: ${exam.department}\nSemester: ${exam.semester}\nType: ${typeText}\nDate: ${dateDisplay}\nTime: ${exam.time}\nRoom: ${exam.room}`;
  
  // Include group if practical
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

function highlightTodaysExams() {
  const todayExams = examData.filter(
    (exam) => exam.examDate === currentAppDate,
  );

  if (todayExams.length > 0) {
    const chatbotToggle = document.getElementById("chatbotToggle");
    if (chatbotToggle) {
      let badge = chatbotToggle.querySelector(".notification-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "notification-badge";
        chatbotToggle.appendChild(badge);
      }
      badge.textContent = todayExams.length;
      badge.style.display = "block";
    }
  }
}

// ============================================================
// UPDATE STATISTICS
// ============================================================
function updateStatistics() {
  if (!totalExamsEl || !upcomingExamsEl || !todayExamsEl || !completedExamsEl)
    return;

  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemesters = getSelectedSemesterValues();

  let examsForStats = examData;

  if (selectedDept !== "all") {
    examsForStats = examsForStats.filter(
      (exam) => exam.department === selectedDept,
    );
  }

  if (selectedSemesters && !selectedSemesters.includes('all') && selectedSemesters.length > 0) {
    examsForStats = examsForStats.filter(
      (exam) => selectedSemesters.includes(exam.semester),
    );
  }

  const total = examsForStats.length;
  const upcoming = examsForStats.filter(
    (exam) => exam.examDate >= currentAppDate,
  ).length;
  const today = examsForStats.filter(
    (exam) => exam.examDate === currentAppDate,
  ).length;
  const completed = examsForStats.filter(
    (exam) => exam.examDate < currentAppDate,
  ).length;

  if (totalExamsEl) totalExamsEl.textContent = total;
  if (upcomingExamsEl) upcomingExamsEl.textContent = upcoming;
  if (todayExamsEl) todayExamsEl.textContent = today;
  if (completedExamsEl) completedExamsEl.textContent = completed;
}

// ============================================================
// UPDATE NEXT EXAM
// ============================================================
function updateNextExam() {
  if (!nextExamCard) return;

  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  let filteredExams = filteredExamRoutine;

  if (dateFilterValue !== "past") {
    filteredExams = filteredExams.filter(
      (exam) => exam.examDate >= currentAppDate,
    );
  }

  if (nextExamCard) {
    if (filteredExams.length > 0 && dateFilterValue !== "past") {
      const nextExam = filteredExams[0];
      const daysLeft = window.dataFunctions.getDayDifference(
        currentAppDate,
        nextExam.examDate,
      );

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

// ============================================================
// UPDATE UPCOMING LIST
// ============================================================
function updateUpcomingList() {
  if (!upcomingList) return;

  let filteredExams = filteredExamRoutine.filter(
    (exam) => exam.examDate >= currentAppDate,
  );

  filteredExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
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

          const daysLeft = window.dataFunctions.getDayDifference(
            currentAppDate,
            exam.examDate,
          );
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

// ============================================================
// DEBOUNCE FUNCTION
// ============================================================
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


document.addEventListener("DOMContentLoaded", init);
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
window.handleFilterChange = handleFilterChange;
window.applyFilters = applyFilters;
window.setAllFilters = setAllFilters;
document.dispatchEvent(new Event('scriptReady'));
console.log('script.js ready event dispatched');