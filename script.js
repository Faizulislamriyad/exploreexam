if (!window.showNotification) {
  window.showNotification = function (message, type = "info") {
    // Remove existing notification
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

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    // Close button
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
const semesterSelect = document.getElementById("semesterSelect");
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

// Global variables
let filteredExamRoutine = [];
let currentAppDate = "";
let examData = [];
let isLoading = false;
let isFilterChanging = false;

// Initialize the application
async function init() {
  // Wait for dataFunctions to be available
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

  // Set current date with animation
  animateDateUpdate();

  // Load exams from Firebase
  await loadInitialData();

  // Set up event listeners
  setupEventListeners();

  // Initialize UI
  initializeUI();

  // Update title initially
  updateRoutineTitle("all", "all");

  // Setup Firebase realtime listener for auto-refresh
  setupFirebaseListener();

  // Check for scheduled notifications
  checkStudentScheduledNotifications();
}

// Setup Firebase realtime listener for auto-refresh
function setupFirebaseListener() {
  if (!window.firebase || !window.firebase.db) {
    console.log("Firebase not available for realtime updates");
    return;
  }

  try {
    // Listen for changes in exams collection
    const examsCollection = window.firebase.collection(
      window.firebase.db,
      "exams",
    );

    window.firebase.onSnapshot(examsCollection, (snapshot) => {
      if (!isLoading && !isFilterChanging) {
        console.log("Firebase data changed, auto-refreshing...");
        // Debounced refresh to prevent multiple rapid updates
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

// Check for student scheduled notifications
function checkStudentScheduledNotifications() {
  const notifications = JSON.parse(
    localStorage.getItem("studentNotifications") || "[]",
  );
  const now = new Date();

  // Remove past notifications
  const validNotifications = notifications.filter((notification) => {
    const notificationTime = new Date(notification.notificationTime);
    return notificationTime > now;
  });

  localStorage.setItem(
    "studentNotifications",
    JSON.stringify(validNotifications),
  );

  // Reschedule valid notifications
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

        // Remove from localStorage after sending
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
  currentDateEl.textContent = window.dataFunctions.formatDate(currentAppDate);

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

    // Initially show all exams
    filteredExamRoutine = [...examData];

    // Sort by date
    filteredExamRoutine.sort(
      (a, b) => new Date(a.examDate) - new Date(b.examDate),
    );

    // Update all displays with animation
    updateRoutineDisplay();
    updateStatistics();
    updateNextExam();
    updateUpcomingList();

    // Show appropriate message based on data
    if (examData.length === 0) {
      showNoExamsMessage();
    } else {
      // Highlight today's exams if any
      highlightTodaysExams();
    }
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

  // Add loading class to main elements
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

// Setup event listeners with debouncing
function setupEventListeners() {
  // Debounced filter change handler
  const debouncedFilterChange = debounce(() => {
    if (!isFilterChanging) {
      handleFilterChange();
    }
  }, 300);

  if (deptSelect) deptSelect.addEventListener("change", debouncedFilterChange);
  if (semesterSelect)
    semesterSelect.addEventListener("change", debouncedFilterChange);
  if (dateFilter) dateFilter.addEventListener("change", debouncedFilterChange);

  // Add clear filters button
  addClearFiltersButton();

  // Quick filter buttons (add to your HTML if needed)
  setupQuickFilters();
}

// Add clear filters button
function addClearFiltersButton() {
  // Create clear filters button if it doesn't exist
  if (!document.getElementById("clearFiltersBtn")) {
    const filterControls = document.querySelector(".filter-controls");
    if (!filterControls) return;

    const clearBtn = document.createElement("button");
    clearBtn.id = "clearFiltersBtn";
    clearBtn.className = "btn-clear-filters";
    clearBtn.innerHTML = '<i class="fas fa-times"></i> Clear Filters';
    clearBtn.style.display = "none";

    filterControls.appendChild(clearBtn);

    // FIXED: Use direct function call instead of handleFilterChange to avoid infinite loop
    clearBtn.addEventListener("click", () => {
      console.log("Clear filters clicked");

      // Set filter values
      if (deptSelect) deptSelect.value = "all";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "upcoming";

      // Hide clear button
      clearBtn.style.display = "none";

      // Reset quick filter buttons
      document.querySelectorAll(".btn-quick-filter").forEach((btn) => {
        btn.classList.remove("active");
      });
      const allBtn = document.querySelector(
        '.btn-quick-filter[data-filter="all"]',
      );
      if (allBtn) allBtn.classList.add("active");

      // Manually apply filters
      applyFilters("all", "all", "upcoming");
    });
  }
}

// Setup quick filter buttons
function setupQuickFilters() {
  // Create quick filter container if it doesn't exist
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
            </div>
        `;

    // Insert after filter controls
    const filterControls = document.querySelector(".filter-controls");
    if (filterControls && filterControls.parentNode) {
      filterControls.parentNode.insertBefore(
        quickFilterDiv,
        filterControls.nextSibling,
      );

      // Add event listeners to quick filter buttons
      document.querySelectorAll(".btn-quick-filter").forEach((btn) => {
        btn.addEventListener("click", function () {
          // Remove active class from all buttons
          document.querySelectorAll(".btn-quick-filter").forEach((b) => {
            b.classList.remove("active");
          });

          // Add active class to clicked button
          this.classList.add("active");

          // Apply filter
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
      if (deptSelect) deptSelect.value = "all";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "all";
      applyFilters("all", "all", "all", "today");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
    case "upcoming":
      if (deptSelect) deptSelect.value = "all";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "upcoming";
      applyFilters("all", "all", "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
    case "computer":
      if (deptSelect) deptSelect.value = "Computer";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "upcoming";
      applyFilters("Computer", "all", "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
    case "civil":
      if (deptSelect) deptSelect.value = "Civil";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "upcoming";
      applyFilters("Civil", "all", "upcoming");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
    case "practical":
      if (deptSelect) deptSelect.value = "all";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "practical";
      applyFilters("all", "all", "practical");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
    case "written":
      if (deptSelect) deptSelect.value = "all";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "written";
      applyFilters("all", "all", "written");
      if (clearBtn) clearBtn.style.display = "flex";
      break;
    default:
      if (deptSelect) deptSelect.value = "all";
      if (semesterSelect) semesterSelect.value = "all";
      if (dateFilter) dateFilter.value = "upcoming";
      applyFilters("all", "all", "upcoming");
      if (clearBtn) clearBtn.style.display = "none";
  }
}

// Initialize UI elements
function initializeUI() {
  // Set current date with animation
  if (currentDateEl) {
    currentDateEl.textContent = window.dataFunctions.formatDate(currentAppDate);
  }

  // Update department options based on available data
  updateDepartmentOptions();

  // Add search functionality
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

  // Add date filter info
  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";
  if (dateFilterValue === "upcoming") {
    titleText += " (Upcoming)";
  } else if (dateFilterValue === "past") {
    titleText += " (Past)";
  } else if (dateFilterValue === "practical") {
    titleText += " (Practical)";
  } else if (dateFilterValue === "written") {
    titleText += " (Written)";
  }
  routineTitle.innerHTML = titleText;
}

// Update department options dynamically
function updateDepartmentOptions() {
  if (!deptSelect) return;

  const departments = window.dataFunctions.getAllDepartmentsFromExams(examData);

  if (departments.length > 0) {
    // Store current selection
    const currentDept = deptSelect.value;

    // Clear existing options except "All"
    while (deptSelect.options.length > 1) {
      deptSelect.remove(1);
    }

    // Add departments from data
    departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      deptSelect.appendChild(option);
    });

    // Restore selection if it still exists
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

    // Insert after the title
    const title = routineContainer.querySelector("h2");
    if (title && title.parentNode) {
      title.parentNode.insertBefore(searchDiv, title.nextSibling);

      // Add search event listeners
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

  // Show/hide clear button
  if (clearSearchBtn) {
    clearSearchBtn.style.display = searchTerm ? "block" : "none";
  }

  if (!searchTerm) {
    if (searchResultsInfo) searchResultsInfo.textContent = "";
    handleFilterChange();
    return;
  }

  // Filter exams based on search term
  const searchResults = examData.filter((exam) => {
    return (
      exam.subject.toLowerCase().includes(searchTerm) ||
      exam.department.toLowerCase().includes(searchTerm) ||
      exam.semester.toLowerCase().includes(searchTerm) ||
      (exam.examType && exam.examType.toLowerCase().includes(searchTerm)) ||
      exam.time.toLowerCase().includes(searchTerm)
    );
  });

  // Update display with search results
  filteredExamRoutine = searchResults;

  // Sort by date
  filteredExamRoutine.sort(
    (a, b) => new Date(a.examDate) - new Date(b.examDate),
  );

  // Display search results
  displayExams(filteredExamRoutine);

  // Show search results info
  if (searchResultsInfo) {
    searchResultsInfo.textContent = `Found ${searchResults.length} exam${searchResults.length !== 1 ? "s" : ""} matching "${searchTerm}"`;
    searchResultsInfo.style.display = "block";
  }

  // Update title for search
  const routineTitle = document.querySelector(".routine-container h2");
  if (routineTitle) {
    routineTitle.innerHTML = `<i class="fas fa-search"></i> Search Results for "${searchTerm}"`;
  }

  // Update statistics for search results
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

// Main filter handler - FIXED VERSION (no infinite loop)
function handleFilterChange() {
  if (isLoading || isFilterChanging) return;

  isFilterChanging = true;

  // Clear search if active
  clearSearch();

  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemester = semesterSelect ? semesterSelect.value : "all";
  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  console.log("Filter changed:", {
    selectedDept,
    selectedSemester,
    dateFilterValue,
  });

  // Apply filters
  applyFilters(selectedDept, selectedSemester, dateFilterValue);

  isFilterChanging = false;
}

// Apply filters function (separated to avoid recursion)
function applyFilters(dept, semester, dateFilter, specialFilter = null) {
  // Show/hide clear filters button
  const clearBtn = document.getElementById("clearFiltersBtn");
  if (clearBtn) {
    if (
      dept !== "all" ||
      semester !== "all" ||
      dateFilter !== "upcoming" ||
      specialFilter
    ) {
      clearBtn.style.display = "flex";
    } else {
      clearBtn.style.display = "none";
    }
  }

  // Filter routine based on selections
  let tempFiltered = [...examData];

  // Filter by department
  if (dept !== "all") {
    tempFiltered = tempFiltered.filter((exam) => exam.department === dept);
  }

  // Filter by semester
  if (semester !== "all") {
    tempFiltered = tempFiltered.filter((exam) => exam.semester === semester);
  }

  // Special filter for today
  if (specialFilter === "today") {
    tempFiltered = tempFiltered.filter(
      (exam) => exam.examDate === currentAppDate,
    );
  }
  // Filter by date and type
  else if (dateFilter === "upcoming") {
    tempFiltered = tempFiltered.filter(
      (exam) => exam.examDate >= currentAppDate,
    );
  } else if (dateFilter === "past") {
    tempFiltered = tempFiltered.filter(
      (exam) => exam.examDate < currentAppDate,
    );
  } else if (dateFilter === "practical") {
    tempFiltered = tempFiltered.filter((exam) => exam.examType === "practical");
  } else if (dateFilter === "written") {
    tempFiltered = tempFiltered.filter(
      (exam) => !exam.examType || exam.examType === "written",
    );
  }
  // If 'all' is selected for date filter, include all exams

  filteredExamRoutine = tempFiltered;

  console.log(
    `Filtered ${examData.length} exams down to ${filteredExamRoutine.length} exams`,
  );

  // Sort by date (ascending)
  filteredExamRoutine.sort(
    (a, b) => new Date(a.examDate) - new Date(b.examDate),
  );

  // Update title based on selection
  updateRoutineTitle(dept, semester);

  // Update displays with animation
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

    // Show success message
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

    // Get current filter values
    const selectedDept = deptSelect ? deptSelect.value : "all";
    const selectedSemester = semesterSelect ? semesterSelect.value : "all";
    const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

    // Apply current filters to refreshed data
    applyFilters(selectedDept, selectedSemester, dateFilterValue);

    // Update department options
    updateDepartmentOptions();

    // Show message if no exams
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

  // Add filtered class if any filter is active
  const routineContainer = document.querySelector(".routine-container");
  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemester = semesterSelect ? semesterSelect.value : "all";

  if (routineContainer) {
    if (selectedDept !== "all" || selectedSemester !== "all") {
      routineContainer.classList.add("filtered");
    } else {
      routineContainer.classList.remove("filtered");
    }
  }

  // Clear current list with fade out
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

      // Add event listener to clear filters button
      document
        .getElementById("clearFiltersFromEmpty")
        ?.addEventListener("click", () => {
          if (deptSelect) deptSelect.value = "all";
          if (semesterSelect) semesterSelect.value = "all";
          if (dateFilter) dateFilter.value = "upcoming";

          // Direct filter application
          applyFilters("all", "all", "upcoming");

          // Hide clear button
          const clearBtn = document.getElementById("clearFiltersBtn");
          if (clearBtn) clearBtn.style.display = "none";
        });
    } else if (filteredExamRoutine.length === 0 && examData.length === 0) {
      showNoExamsMessage();
    } else {
      // Display each exam with staggered animation
      filteredExamRoutine.forEach((exam, index) => {
        const examElement = createRoutineElement(exam);
        examElement.style.opacity = "0";
        examElement.style.transform = "translateY(20px)";
        routineList.appendChild(examElement);

        // Stagger animation
        setTimeout(() => {
          examElement.style.transition = "all 0.3s ease";
          examElement.style.opacity = "1";
          examElement.style.transform = "translateY(0)";
        }, index * 50);
      });
    }

    // Fade in
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

    // Stagger animation
    setTimeout(() => {
      examElement.style.transition = "all 0.3s ease";
      examElement.style.opacity = "1";
      examElement.style.transform = "translateY(0)";
    }, index * 50);
  });
}

// Create a routine element with enhanced interaction
function createRoutineElement(exam) {
  const examDate = new Date(exam.examDate);

  // Determine status
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

  // Check if it's today
  const isToday = exam.examDate === currentAppDate;

  // Get exam type
  const examType = exam.examType || "written";
  const typeClass =
    examType === "practical" ? "type-practical" : "type-written";
  const typeText = examType === "practical" ? "Practical" : "Written";

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
            <strong class="subject-name">${exam.subject}</strong>
            ${exam.addedBy ? `<div class="exam-added-by"><small>Added by: ${exam.addedBy.split("@")[0]}</small></div>` : ""}
        </div>
        <div class="exam-cell">
            <div class="exam-date">${window.dataFunctions.formatDate(exam.examDate)}</div>
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

  // Add click event to show details
  div.addEventListener("click", (e) => {
    if (!e.target.closest(".exam-actions-hover")) {
      showExamDetails(exam);
    }
  });

  // Add hover action buttons
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

// NEW FUNCTION: Show notification options for students
function showNotificationOptions(exam) {
  // First request notification permission if not already granted
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

// NEW FUNCTION: Show notification modal
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

  // Add event listeners
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

// Helper function to calculate time before
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

// Helper function to convert time to 24-hour format
function convertTimeTo24Hour(time12) {
  if (!time12) return "10:00";

  // Check if already in 24-hour format
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

// NEW FUNCTION: Schedule student notification
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
    // Store in localStorage for persistence
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

    // Schedule notification
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

      // Remove from localStorage after triggering
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

// NEW FUNCTION: Send test notification
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

// Show exam details in enhanced modal
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

  // Create modal
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
                <div class="detail-row">
                    <span class="detail-label">Exam Type:</span>
                    <span class="detail-value exam-type-badge type-${exam.examType || "written"}">${(exam.examType || "written").toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Exam Date:</span>
                    <span class="detail-value">${window.dataFunctions.formatDate(exam.examDate)}</span>
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
                ${
                  exam.addedBy
                    ? `
                <div class="detail-row">
                    <span class="detail-label">Added by:</span>
                    <span class="detail-value">${exam.addedBy}</span>
                </div>
                `
                    : ""
                }
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

  // Add event listeners
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

  // Close on background click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Add new function to download as JPG
async function downloadExamAsJPG(exam) {
  try {
    // Show loading notification
    showNotification("Generating JPG image...", "info");

    // Create a temporary canvas for HTML2Canvas
    const html2canvasScript = document.createElement("script");
    html2canvasScript.src =
      "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(html2canvasScript);

    html2canvasScript.onload = async () => {
      try {
        // Create a temporary div with the content to capture
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

        const currentDate = window.dataFunctions.formatDate(
          window.dataFunctions.getCurrentDate(),
        );
        const status =
          exam.examDate < currentAppDate
            ? "Completed"
            : exam.examDate === currentAppDate
              ? "Today"
              : "Upcoming";

        const examType = exam.examType || "written";

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
                        
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Exam Date</div>
                            <div style="font-size: 24px; font-weight: bold;">${window.dataFunctions.formatDate(exam.examDate)}</div>
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Time</div>
                            <div style="font-size: 24px; font-weight: bold;">${exam.time}</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 40px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
                            <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Exam Type</div>
                            <div style="font-size: 24px; font-weight: bold; color: ${examType === "practical" ? "#ffffff" : "#ffffff"}">${examType.toUpperCase()}</div>
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
                    
                    ${
                      exam.addedBy
                        ? `
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 30px;">
                        <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 5px;">Added by</div>
                        <div style="font-size: 18px;">${exam.addedBy}</div>
                    </div>
                    `
                        : ""
                    }
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 2px solid rgba(255,255,255,0.2);">
                        <div style="font-size: 22px; font-weight: bold; margin-bottom: 10px; color: #ffd700;">Explore Routine 2026</div>
                        <div style="font-size: 16px; color: rgba(255,255,255,0.8);">Generated on ${currentDate}</div>
                        <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 10px;">Download from exploreex.vercel.app</div>
                    </div>
                `;

        document.body.appendChild(tempDiv);

        // Use html2canvas to capture the div as image
        const canvas = await html2canvas(tempDiv, {
          scale: 2, // Higher quality
          backgroundColor: null,
          logging: false,
          useCORS: true,
        });

        // Convert canvas to JPG
        const imageData = canvas.toDataURL("image/jpeg", 0.95);

        // Create download link
        const link = document.createElement("a");
        link.download = `Exam_${exam.subject.replace(/\s+/g, "_")}_${exam.examDate}.jpg`;
        link.href = imageData;
        link.click();

        // Clean up
        document.body.removeChild(tempDiv);
        document.head.removeChild(html2canvasScript);

        // Show success notification
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

// Share exam information
function shareExamInfo(exam) {
  const examType = exam.examType || "written";
  const shareText = `${exam.subject} Exam\nDepartment: ${exam.department}\nSemester: ${exam.semester}\nType: ${examType.toUpperCase()}\nDate: ${window.dataFunctions.formatDate(exam.examDate)}\nTime: ${exam.time}\nRoom: ${exam.room}`;

  if (navigator.share) {
    navigator.share({
      title: `${exam.subject} Exam Details`,
      text: shareText,
      url: window.location.href,
    });
  } else {
    // Fallback to clipboard
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

// Highlight today's exams
function highlightTodaysExams() {
  const todayExams = examData.filter(
    (exam) => exam.examDate === currentAppDate,
  );

  if (todayExams.length > 0) {
    // Show notification badge
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

// Update statistics with animation
function updateStatistics() {
  if (!totalExamsEl || !upcomingExamsEl || !todayExamsEl || !completedExamsEl)
    return;

  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemester = semesterSelect ? semesterSelect.value : "all";
  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  // Filter exams for statistics
  let examsForStats = examData;

  if (selectedDept !== "all") {
    examsForStats = examsForStats.filter(
      (exam) => exam.department === selectedDept,
    );
  }

  if (selectedSemester !== "all") {
    examsForStats = examsForStats.filter(
      (exam) => exam.semester === selectedSemester,
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

  // Update without animation for better performance
  if (totalExamsEl) totalExamsEl.textContent = total;
  if (upcomingExamsEl) upcomingExamsEl.textContent = upcoming;
  if (todayExamsEl) todayExamsEl.textContent = today;
  if (completedExamsEl) completedExamsEl.textContent = completed;
}

// Update next exam information
function updateNextExam() {
  if (!nextExamCard) return;

  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemester = semesterSelect ? semesterSelect.value : "all";
  const dateFilterValue = dateFilter ? dateFilter.value : "upcoming";

  // Filter exams based on current filters
  let filteredExams = filteredExamRoutine;

  // Filter by date for next exam (only upcoming)
  if (dateFilterValue === "all") {
    filteredExams = filteredExams.filter(
      (exam) => exam.examDate >= currentAppDate,
    );
  } else if (dateFilterValue === "past") {
    filteredExams = filteredExams.filter(
      (exam) => exam.examDate < currentAppDate,
    );
  }
  // If 'upcoming', already filtered

  if (nextExamCard) {
    if (filteredExams.length > 0 && dateFilterValue !== "past") {
      const nextExam = filteredExams[0];
      const daysLeft = window.dataFunctions.getDayDifference(
        currentAppDate,
        nextExam.examDate,
      );

      // Animate card update
      nextExamCard.style.opacity = "0";

      setTimeout(() => {
        nextExamCard.innerHTML = `
                    <div class="next-exam-content">
                        <div class="next-exam-subject">${nextExam.subject}</div>
                        <div class="next-exam-class">${nextExam.department} - ${nextExam.semester}</div>
                        <div class="next-exam-date">${window.dataFunctions.formatDate(nextExam.examDate)}</div>
                        <div class="next-exam-details">
                            <div class="detail-item">
                                <i class="fas fa-clock"></i>
                                <span>${nextExam.time}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-tag"></i>
                                <span class="exam-type-badge type-${nextExam.examType || "written"}">${(nextExam.examType || "written").toUpperCase()}</span>
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

        // Add event listener to reminder button
        const reminderBtn = nextExamCard.querySelector(".btn-set-reminder");
        if (reminderBtn) {
          reminderBtn.addEventListener("click", function () {
            showNotificationOptions(nextExam);
          });
        }
      }, 200);

      if (nextExamInfo) {
        nextExamInfo.innerHTML = `Next exam: <strong>${nextExam.subject}</strong> for ${nextExam.department} - ${nextExam.semester} on ${window.dataFunctions.formatDate(nextExam.examDate)}`;
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

// Update upcoming exams list
function updateUpcomingList() {
  if (!upcomingList) return;

  const selectedDept = deptSelect ? deptSelect.value : "all";
  const selectedSemester = semesterSelect ? semesterSelect.value : "all";

  // Filter exams based on current filters (only upcoming for this list)
  let filteredExams = filteredExamRoutine.filter(
    (exam) => exam.examDate >= currentAppDate,
  );

  // Sort by date and take only first 5
  filteredExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  const displayExams = filteredExams.slice(0, 5);

  if (upcomingList) {
    // Animate update
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

          div.innerHTML = `
                        <div class="upcoming-item-header">
                            <div class="upcoming-subject">${exam.subject}</div>
                            <div class="upcoming-days">${daysLeft}d</div>
                        </div>
                        <div class="upcoming-class">${exam.department} - ${exam.semester}</div>
                        <div class="upcoming-date">${window.dataFunctions.formatDate(exam.examDate)}</div>
                        <div class="upcoming-details">
                            <span class="upcoming-time">${exam.time}</span>
                            <span class="exam-type-badge type-${exam.examType || "written"}">${(exam.examType || "written").toUpperCase()}</span>
                        </div>
                    `;

          div.addEventListener("click", () => {
            showExamDetails(exam);
          });

          upcomingList.appendChild(div);

          // Stagger animation
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

// Debounce function
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

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);

// Export functions for use in admin.js and chatbot.js
window.updateRoutineDisplay = updateRoutineDisplay;
window.updateStatistics = updateStatistics;
window.updateNextExam = updateNextExam;
window.updateUpcomingList = updateUpcomingList;
window.examData = examData;
window.showNotification = showNotification;
window.refreshRoutine = refreshRoutine;
