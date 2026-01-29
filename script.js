// script.js - Smart Exam Routine Manager with Enhanced UX

// DOM Elements
const deptSelect = document.getElementById('deptSelect');
const semesterSelect = document.getElementById('semesterSelect');
const dateFilter = document.getElementById('dateFilter');
const refreshBtn = document.getElementById('refreshBtn');
const routineList = document.getElementById('routineList');
const totalExamsEl = document.getElementById('totalExams');
const upcomingExamsEl = document.getElementById('upcomingExams');
const todayExamsEl = document.getElementById('todayExams');
const completedExamsEl = document.getElementById('completedExams');
const nextExamCard = document.getElementById('nextExamCard');
const upcomingList = document.getElementById('upcomingList');
const currentDateEl = document.getElementById('currentDate');
const nextExamInfo = document.getElementById('nextExamInfo');

// Global variables
let filteredExamRoutine = [];
let currentAppDate = window.dataFunctions.getCurrentDate();
let examData = [];
let isLoading = false;

// Initialize the application
async function init() {
    // Set current date with animation
    animateDateUpdate();
    
    // Load exams from Firebase
    await loadInitialData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI
    initializeUI();
}

// Animate date update
function animateDateUpdate() {
    currentDateEl.style.opacity = '0';
    currentDateEl.textContent = window.dataFunctions.formatDate(currentAppDate);
    
    setTimeout(() => {
        currentDateEl.style.transition = 'opacity 0.5s ease';
        currentDateEl.style.opacity = '1';
    }, 100);
}

// Load initial data with loading states
async function loadInitialData() {
    showLoadingStates();
    
    try {
        examData = await window.dataFunctions.loadExamsFromFirebase();
        filteredExamRoutine = [...examData];
        
        // Update all displays with animation
        await Promise.all([
            updateRoutineDisplay(),
            updateStatistics(),
            updateNextExam(),
            updateUpcomingList()
        ]);
        
        // Show appropriate message based on data
        if (examData.length === 0) {
            showNoExamsMessage();
        } else {
            // Highlight today's exams if any
            highlightTodaysExams();
        }
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showErrorState();
    } finally {
        hideLoadingStates();
    }
}

// Show loading states
function showLoadingStates() {
    isLoading = true;
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Add loading class to main elements
    routineList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading exam routine...</p>
        </div>
    `;
    
    nextExamCard.innerHTML = `
        <div class="loading-state small">
            <div class="loading-spinner small"></div>
            <p>Loading next exam...</p>
        </div>
    `;
}

// Hide loading states
function hideLoadingStates() {
    isLoading = false;
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Routine';
}

// Show error state
function showErrorState() {
    routineList.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Unable to load exams</h3>
            <p>Please check your connection and try again</p>
            <button id="retryLoad" class="btn-retry">Retry Loading</button>
        </div>
    `;
    
    document.getElementById('retryLoad')?.addEventListener('click', loadInitialData);
}

// Setup event listeners with debouncing
function setupEventListeners() {
    // Debounced filter change handler
    const debouncedFilterChange = debounce(handleFilterChange, 300);
    
    deptSelect.addEventListener('change', debouncedFilterChange);
    semesterSelect.addEventListener('change', debouncedFilterChange);
    dateFilter.addEventListener('change', debouncedFilterChange);
    
    // Refresh button with loading state
    refreshBtn.addEventListener('click', handleRefresh);
    
    // Quick filter buttons (add to your HTML if needed)
    setupQuickFilters();
}

// Setup quick filter buttons
function setupQuickFilters() {
    // Create quick filter container if it doesn't exist
    if (!document.querySelector('.quick-filters')) {
        const controls = document.querySelector('.controls');
        const quickFilterDiv = document.createElement('div');
        quickFilterDiv.className = 'quick-filters';
        quickFilterDiv.innerHTML = `
            <div class="quick-filter-buttons">
                <button class="btn-quick-filter active" data-filter="all">All</button>
                <button class="btn-quick-filter" data-filter="today">Today</button>
                <button class="btn-quick-filter" data-filter="upcoming">Upcoming</button>
                <button class="btn-quick-filter" data-filter="computer">Computer</button>
                <button class="btn-quick-filter" data-filter="civil">Civil</button>
            </div>
        `;
        
        // Insert after filter controls
        const filterControls = document.querySelector('.filter-controls');
        filterControls.parentNode.insertBefore(quickFilterDiv, filterControls.nextSibling);
        
        // Add event listeners to quick filter buttons
        document.querySelectorAll('.btn-quick-filter').forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.btn-quick-filter').forEach(b => {
                    b.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Apply filter
                applyQuickFilter(this.dataset.filter);
            });
        });
    }
}

// Apply quick filter
function applyQuickFilter(filter) {
    switch(filter) {
        case 'today':
            deptSelect.value = 'all';
            semesterSelect.value = 'all';
            dateFilter.value = 'upcoming';
            // Filter to show only today's exams
            const todayExams = examData.filter(exam => exam.examDate === currentAppDate);
            filteredExamRoutine = todayExams;
            break;
        case 'upcoming':
            deptSelect.value = 'all';
            semesterSelect.value = 'all';
            dateFilter.value = 'upcoming';
            handleFilterChange();
            break;
        case 'computer':
            deptSelect.value = 'Computer';
            semesterSelect.value = 'all';
            dateFilter.value = 'upcoming';
            handleFilterChange();
            break;
        case 'civil':
            deptSelect.value = 'Civil';
            semesterSelect.value = 'all';
            dateFilter.value = 'upcoming';
            handleFilterChange();
            break;
        default:
            deptSelect.value = 'all';
            semesterSelect.value = 'all';
            dateFilter.value = 'upcoming';
            handleFilterChange();
    }
    
    updateRoutineDisplay();
}

// Initialize UI elements
function initializeUI() {
    // Set current date with animation
    currentDateEl.textContent = window.dataFunctions.formatDate(currentAppDate);
    
    // Update department options based on available data
    updateDepartmentOptions();
    
    // Add search functionality
    addSearchFunctionality();
}

// Update department options dynamically
function updateDepartmentOptions() {
    const departments = window.dataFunctions.getAllDepartmentsFromExams(examData);
    
    if (departments.length > 0) {
        // Store current selection
        const currentDept = deptSelect.value;
        
        // Clear existing options except "All"
        while (deptSelect.options.length > 1) {
            deptSelect.remove(1);
        }
        
        // Add departments from data
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            deptSelect.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (departments.includes(currentDept) || currentDept === 'all') {
            deptSelect.value = currentDept;
        }
    }
}

// Add search functionality
function addSearchFunctionality() {
    if (!document.getElementById('searchInput')) {
        const routineContainer = document.querySelector('.routine-container');
        const searchDiv = document.createElement('div');
        searchDiv.className = 'routine-search';
        searchDiv.innerHTML = `
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchInput" placeholder="Search exams by subject, department, or room...">
                <button id="clearSearch" class="btn-clear-search" style="display: none;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="search-results-info" id="searchResultsInfo"></div>
        `;
        
        // Insert after the title
        const title = routineContainer.querySelector('h2');
        title.parentNode.insertBefore(searchDiv, title.nextSibling);
        
        // Add search event listeners
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearch');
        
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        clearSearchBtn.addEventListener('click', clearSearch);
    }
}

// Handle search
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const clearSearchBtn = document.getElementById('clearSearch');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    
    // Show/hide clear button
    clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    
    if (!searchTerm) {
        searchResultsInfo.textContent = '';
        handleFilterChange();
        return;
    }
    
    // Filter exams based on search term
    const searchResults = examData.filter(exam => {
        return exam.subject.toLowerCase().includes(searchTerm) ||
               exam.department.toLowerCase().includes(searchTerm) ||
               exam.semester.toLowerCase().includes(searchTerm) ||
               exam.room.toLowerCase().includes(searchTerm) ||
               exam.time.toLowerCase().includes(searchTerm);
    });
    
    // Update display with search results
    filteredExamRoutine = searchResults;
    
    // Sort by date
    filteredExamRoutine.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    
    // Display search results
    displayExams(filteredExamRoutine);
    
    // Show search results info
    searchResultsInfo.textContent = `Found ${searchResults.length} exam${searchResults.length !== 1 ? 's' : ''} matching "${searchTerm}"`;
    searchResultsInfo.style.display = 'block';
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    document.getElementById('searchResultsInfo').style.display = 'none';
    handleFilterChange();
}

// Handle filter change with animation
function handleFilterChange() {
    if (isLoading) return;
    
    // Clear search if active
    clearSearch();
    
    const selectedDept = deptSelect.value;
    const selectedSemester = semesterSelect.value;
    const dateFilterValue = dateFilter.value;
    
    // Filter routine based on selections
    filteredExamRoutine = examData.filter(exam => {
        // Filter by department
        if (selectedDept !== 'all' && exam.department !== selectedDept) {
            return false;
        }
        
        // Filter by semester
        if (selectedSemester !== 'all' && exam.semester !== selectedSemester) {
            return false;
        }
        
        // Filter by date
        if (dateFilterValue === 'upcoming') {
            return exam.examDate >= currentAppDate;
        } else if (dateFilterValue === 'past') {
            return exam.examDate < currentAppDate;
        }
        
        return true;
    });
    
    // Sort by date
    filteredExamRoutine.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    
    // Update displays with animation
    updateRoutineDisplay();
    updateStatistics();
    updateNextExam();
    updateUpcomingList();
}

// Handle refresh with visual feedback
async function handleRefresh() {
    if (isLoading) return;
    
    // Add pulse animation to refresh button
    refreshBtn.classList.add('pulse');
    
    try {
        await refreshRoutine();
        
        // Show success message
        showNotification('Routine refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Refresh error:', error);
        showNotification('Failed to refresh routine', 'error');
    } finally {
        // Remove pulse animation
        setTimeout(() => {
            refreshBtn.classList.remove('pulse');
        }, 1000);
    }
}

// Refresh routine from Firebase
async function refreshRoutine() {
    showLoadingStates();
    
    try {
        examData = await window.dataFunctions.loadExamsFromFirebase();
        filteredExamRoutine = [...examData];
        
        // Update department options
        updateDepartmentOptions();
        
        // Update all displays
        await Promise.all([
            updateRoutineDisplay(),
            updateStatistics(),
            updateNextExam(),
            updateUpcomingList()
        ]);
        
        // Show message if no exams
        if (examData.length === 0) {
            showNoExamsMessage();
        } else {
            highlightTodaysExams();
        }
        
    } catch (error) {
        console.error('Error refreshing routine:', error);
        throw error;
    } finally {
        hideLoadingStates();
    }
}

// Show no exams message
function showNoExamsMessage() {
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
    // Clear current list with fade out
    routineList.style.opacity = '0';
    
    setTimeout(() => {
        routineList.innerHTML = '';
        
        if (filteredExamRoutine.length === 0 && examData.length > 0) {
            routineList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-filter"></i>
                    </div>
                    <h3>No Exams Match Filters</h3>
                    <p>Try changing your department, semester, or date filter settings</p>
                </div>
            `;
        } else if (filteredExamRoutine.length === 0 && examData.length === 0) {
            showNoExamsMessage();
        } else {
            // Display each exam with staggered animation
            filteredExamRoutine.forEach((exam, index) => {
                const examElement = createRoutineElement(exam);
                examElement.style.opacity = '0';
                examElement.style.transform = 'translateY(20px)';
                routineList.appendChild(examElement);
                
                // Stagger animation
                setTimeout(() => {
                    examElement.style.transition = 'all 0.3s ease';
                    examElement.style.opacity = '1';
                    examElement.style.transform = 'translateY(0)';
                }, index * 50);
            });
        }
        
        // Fade in
        routineList.style.opacity = '1';
        routineList.style.transition = 'opacity 0.3s ease';
        
    }, 200);
}

// Display exams (for search results)
function displayExams(exams) {
    routineList.innerHTML = '';
    
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
        examElement.style.opacity = '0';
        examElement.style.transform = 'translateY(20px)';
        routineList.appendChild(examElement);
        
        // Stagger animation
        setTimeout(() => {
            examElement.style.transition = 'all 0.3s ease';
            examElement.style.opacity = '1';
            examElement.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Create a routine element with enhanced interaction
function createRoutineElement(exam) {
    const examDate = new Date(exam.examDate);
    
    // Determine status
    let status = 'Upcoming';
    let statusClass = 'status-upcoming';
    let daysLeft = 0;
    
    if (exam.examDate < currentAppDate) {
        status = 'Completed';
        statusClass = 'status-completed';
    } else if (exam.examDate === currentAppDate) {
        status = 'Today';
        statusClass = 'status-today';
    } else {
        daysLeft = window.dataFunctions.getDayDifference(currentAppDate, exam.examDate);
        status = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
    }
    
    // Check if it's today
    const isToday = exam.examDate === currentAppDate;
    
    const div = document.createElement('div');
    div.className = `routine-item ${exam.examDate < currentAppDate ? 'past' : ''} ${isToday ? 'today' : ''}`;
    div.setAttribute('data-exam-id', exam.id);
    
    div.innerHTML = `
        <div class="exam-cell">
            <span class="dept-badge dept-${exam.department.toLowerCase()}">${exam.department}</span>
        </div>
        <div class="exam-cell">
            <span class="semester-badge">${exam.semester}</span>
        </div>
        <div class="exam-cell">
            <strong class="subject-name">${exam.subject}</strong>
            ${exam.addedBy ? `<div class="exam-added-by"><small>Added by: ${exam.addedBy.split('@')[0]}</small></div>` : ''}
        </div>
        <div class="exam-cell">
            <div class="exam-date">${window.dataFunctions.formatDate(exam.examDate)}</div>
            ${isToday ? '<div class="today-badge">TODAY</div>' : ''}
        </div>
        <div class="exam-cell">
            <div class="exam-time">${exam.time}</div>
        </div>
        <div class="exam-cell">
            <div class="exam-room">${exam.room}</div>
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
        </div>
    `;
    
    // Add click event to show details
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.exam-actions-hover')) {
            showExamDetails(exam);
        }
    });
    
    // Add hover action buttons
    const viewDetailsBtn = div.querySelector('.btn-view-details');
    const shareBtn = div.querySelector('.btn-share-exam');
    
    viewDetailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showExamDetails(exam);
    });
    
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        shareExamInfo(exam);
    });
    
    return div;
}

// Show exam details in enhanced modal
function showExamDetails(exam) {
    const daysLeft = window.dataFunctions.getDayDifference(currentAppDate, exam.examDate);
    let statusText = '';
    let statusClass = '';
    
    if (exam.examDate < currentAppDate) {
        statusText = 'This exam has already taken place.';
        statusClass = 'past';
    } else if (exam.examDate === currentAppDate) {
        statusText = 'This exam is scheduled for today!';
        statusClass = 'today';
    } else {
        statusText = `This exam is in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`;
        statusClass = 'upcoming';
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'exam-details-modal';
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
                ${exam.addedBy ? `
                <div class="detail-row">
                    <span class="detail-label">Added by:</span>
                    <span class="detail-value">${exam.addedBy}</span>
                </div>
                ` : ''}
            </div>
            <div class="exam-details-footer">
                <button class="btn-remind-me" data-exam-id="${exam.id}">
                    <i class="fas fa-bell"></i> Set Reminder
                </button>
                <button class="btn-share" onclick="shareExamInfo(${JSON.stringify(exam).replace(/"/g, '&quot;')})">
                    <i class="fas fa-share-alt"></i> Share
                </button>
                <button class="btn-close">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.btn-close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.btn-remind-me').addEventListener('click', function() {
        setExamReminder(exam, this);
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Show in chatbot as well
    if (typeof window.addBotMessage === 'function') {
        window.addBotMessage(`Viewing details for ${exam.subject} exam (${exam.department} - ${exam.semester})`);
    }
}

// Set exam reminder
function setExamReminder(exam, button) {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Schedule notification
        scheduleNotification(exam);
        button.innerHTML = '<i class="fas fa-check"></i> Reminder Set';
        button.disabled = true;
        showNotification('Reminder set for this exam!', 'success');
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                scheduleNotification(exam);
                button.innerHTML = '<i class="fas fa-check"></i> Reminder Set';
                button.disabled = true;
                showNotification('Reminder set for this exam!', 'success');
            }
        });
    } else {
        showNotification('Please enable notifications to set reminders', 'info');
    }
}

// Schedule notification
function scheduleNotification(exam) {
    const examDateTime = new Date(`${exam.examDate}T${exam.time}`);
    const now = new Date();
    const timeDiff = examDateTime - now;
    
    if (timeDiff > 0) {
        // Schedule notification 1 day before
        const reminderTime = timeDiff - (24 * 60 * 60 * 1000);
        
        if (reminderTime > 0) {
            setTimeout(() => {
                new Notification('Exam Reminder', {
                    body: `${exam.subject} exam is tomorrow! (${exam.department} - ${exam.semester})`,
                    icon: '/favicon.ico'
                });
            }, reminderTime);
        }
        
        // Schedule notification 1 hour before
        const oneHourBefore = timeDiff - (60 * 60 * 1000);
        if (oneHourBefore > 0) {
            setTimeout(() => {
                new Notification('Exam Starting Soon', {
                    body: `${exam.subject} exam starts in 1 hour! Room: ${exam.room}`,
                    icon: '/favicon.ico'
                });
            }, oneHourBefore);
        }
    }
}

// Share exam information
function shareExamInfo(exam) {
    const shareText = `${exam.subject} Exam\nDepartment: ${exam.department}\nSemester: ${exam.semester}\nDate: ${window.dataFunctions.formatDate(exam.examDate)}\nTime: ${exam.time}\nRoom: ${exam.room}`;
    
    if (navigator.share) {
        navigator.share({
            title: `${exam.subject} Exam Details`,
            text: shareText,
            url: window.location.href
        });
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Exam details copied to clipboard!', 'success');
        });
    }
}

// Highlight today's exams
function highlightTodaysExams() {
    const todayExams = examData.filter(exam => exam.examDate === currentAppDate);
    
    if (todayExams.length > 0) {
        // Show notification badge
        const chatbotToggle = document.getElementById('chatbotToggle');
        if (chatbotToggle) {
            let badge = chatbotToggle.querySelector('.notification-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                chatbotToggle.appendChild(badge);
            }
            badge.textContent = todayExams.length;
            badge.style.display = 'block';
        }
        
        // Auto-open chatbot with today's exams info
        setTimeout(() => {
            if (typeof window.addBotMessage === 'function') {
                window.addBotMessage(`You have ${todayExams.length} exam${todayExams.length !== 1 ? 's' : ''} scheduled for today!`);
            }
        }, 2000);
    }
}

// Update statistics with animation
function updateStatistics() {
    const selectedDept = deptSelect.value;
    const selectedSemester = semesterSelect.value;
    
    // Filter exams for statistics
    let examsForStats = examData;
    
    if (selectedDept !== 'all') {
        examsForStats = examsForStats.filter(exam => exam.department === selectedDept);
    }
    
    if (selectedSemester !== 'all') {
        examsForStats = examsForStats.filter(exam => exam.semester === selectedSemester);
    }
    
    const total = examsForStats.length;
    const upcoming = examsForStats.filter(exam => exam.examDate >= currentAppDate).length;
    const today = examsForStats.filter(exam => exam.examDate === currentAppDate).length;
    const completed = examsForStats.filter(exam => exam.examDate < currentAppDate).length;
    
    // Animate counter updates
    animateCounter(totalExamsEl, total);
    animateCounter(upcomingExamsEl, upcoming);
    animateCounter(todayExamsEl, today);
    animateCounter(completedExamsEl, completed);
}

// Animate counter
function animateCounter(element, target) {
    if (!element) return;
    
    const current = parseInt(element.textContent) || 0;
    const diff = target - current;
    
    if (diff === 0) return;
    
    let currentCount = current;
    const increment = diff > 0 ? 1 : -1;
    const duration = 500; // ms
    const stepTime = Math.abs(Math.floor(duration / diff));
    
    const timer = setInterval(() => {
        currentCount += increment;
        element.textContent = currentCount;
        
        if (currentCount === target) {
            clearInterval(timer);
            // Add pulse effect
            element.classList.add('pulse');
            setTimeout(() => element.classList.remove('pulse'), 300);
        }
    }, stepTime);
}

// Update next exam information
function updateNextExam() {
    const selectedDept = deptSelect.value;
    const selectedSemester = semesterSelect.value;
    
    // Filter upcoming exams
    let upcomingExams = examData.filter(exam => exam.examDate >= currentAppDate);
    
    if (selectedDept !== 'all') {
        upcomingExams = upcomingExams.filter(exam => exam.department === selectedDept);
    }
    
    if (selectedSemester !== 'all') {
        upcomingExams = upcomingExams.filter(exam => exam.semester === selectedSemester);
    }
    
    // Sort by date
    upcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    
    if (nextExamCard) {
        if (upcomingExams.length > 0) {
            const nextExam = upcomingExams[0];
            const daysLeft = window.dataFunctions.getDayDifference(currentAppDate, nextExam.examDate);
            
            // Animate card update
            nextExamCard.style.opacity = '0';
            
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
                                <i class="fas fa-door-open"></i>
                                <span>${nextExam.room}</span>
                            </div>
                        </div>
                        <div class="countdown-container">
                            <div class="countdown-label">EXAM IN</div>
                            <div class="countdown-value">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</div>
                        </div>
                        <button class="btn-set-reminder" data-exam-id="${nextExam.id}">
                            <i class="fas fa-bell"></i> Set Reminder
                        </button>
                    </div>
                `;
                
                nextExamCard.style.opacity = '1';
                nextExamCard.style.transition = 'opacity 0.3s ease';
                
                // Add event listener to reminder button
                nextExamCard.querySelector('.btn-set-reminder')?.addEventListener('click', function() {
                    setExamReminder(nextExam, this);
                });
                
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
    const selectedDept = deptSelect.value;
    const selectedSemester = semesterSelect.value;
    
    // Filter upcoming exams
    let upcomingExams = examData.filter(exam => exam.examDate >= currentAppDate);
    
    if (selectedDept !== 'all') {
        upcomingExams = upcomingExams.filter(exam => exam.department === selectedDept);
    }
    
    if (selectedSemester !== 'all') {
        upcomingExams = upcomingExams.filter(exam => exam.semester === selectedSemester);
    }
    
    // Sort by date and take only first 5
    upcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    const displayExams = upcomingExams.slice(0, 5);
    
    if (upcomingList) {
        // Animate update
        upcomingList.style.opacity = '0';
        
        setTimeout(() => {
            upcomingList.innerHTML = '';
            
            if (displayExams.length === 0) {
                upcomingList.innerHTML = `
                    <div class="no-upcoming">
                        <i class="fas fa-calendar-check"></i>
                        <p>No upcoming exams</p>
                    </div>
                `;
            } else {
                displayExams.forEach((exam, index) => {
                    const div = document.createElement('div');
                    div.className = 'upcoming-item';
                    div.style.opacity = '0';
                    div.style.transform = 'translateX(-20px)';
                    
                    const daysLeft = window.dataFunctions.getDayDifference(currentAppDate, exam.examDate);
                    
                    div.innerHTML = `
                        <div class="upcoming-item-header">
                            <div class="upcoming-subject">${exam.subject}</div>
                            <div class="upcoming-days">${daysLeft}d</div>
                        </div>
                        <div class="upcoming-class">${exam.department} - ${exam.semester}</div>
                        <div class="upcoming-date">${window.dataFunctions.formatDate(exam.examDate)}</div>
                        <div class="upcoming-details">
                            <span class="upcoming-time">${exam.time}</span>
                            <span class="upcoming-room">${exam.room}</span>
                        </div>
                    `;
                    
                    div.addEventListener('click', () => {
                        showExamDetails(exam);
                    });
                    
                    upcomingList.appendChild(div);
                    
                    // Stagger animation
                    setTimeout(() => {
                        div.style.transition = 'all 0.3s ease';
                        div.style.opacity = '1';
                        div.style.transform = 'translateX(0)';
                    }, index * 100);
                });
            }
            
            upcomingList.style.opacity = '1';
            upcomingList.style.transition = 'opacity 0.3s ease';
            
        }, 200);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="btn-close-notification">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Close button
    notification.querySelector('.btn-close-notification').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
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
document.addEventListener('DOMContentLoaded', init);

// Export functions for use in admin.js and chatbot.js
window.updateRoutineDisplay = updateRoutineDisplay;
window.updateStatistics = updateStatistics;
window.updateNextExam = updateNextExam;
window.updateUpcomingList = updateUpcomingList;
window.examData = examData;
window.showNotification = showNotification;