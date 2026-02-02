
// admin.js - Enhanced Admin Panel with Smart Features

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    const adminModal = document.getElementById('adminModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const loginForm = document.getElementById('loginForm');
    const adminDashboard = document.getElementById('adminDashboard');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const addExamBtn = document.getElementById('addExamBtn');
    const examList = document.getElementById('examList');
    const searchExam = document.getElementById('searchExam');
    const loginError = document.getElementById('loginError');
    const addExamMessage = document.getElementById('addExamMessage');
    
    // Admin state
    let isAdminLoggedIn = false;
    let allExams = [];
    let subjectSuggestions = new Set();

    // Initialize
    initAdminPanel();

    // Functions
    function initAdminPanel() {
        // Check Firebase auth state
        if (window.firebase && window.firebase.auth) {
            window.firebase.auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('Admin is signed in:', user.email);
                    isAdminLoggedIn = true;
                    showAdminDashboard();
                    loadExams();
                    loadSubjectSuggestions();
                    updateAdminStats();
                } else {
                    console.log('Admin is signed out');
                    isAdminLoggedIn = false;
                    showLoginForm();
                }
            });
        }

        // Event Listeners
        setupEventListeners();
        
        // Set default date to today and min date to today
        const today = new Date().toISOString().split('T')[0];
        const examDateInput = document.getElementById('newExamDate');
        if (examDateInput) {
            examDateInput.value = today;
            examDateInput.min = today;
        }
        
        // Set min time based on current time if date is today
        updateMinTime();
        
        // Initialize auto-suggest
        initAutoSuggest();
    }

    function setupEventListeners() {
        adminAccessBtn.addEventListener('click', openAdminModal);
        closeModalBtn.addEventListener('click', closeAdminModal);
        
        // Close modal when clicking outside
        adminModal.addEventListener('click', function(e) {
            if (e.target === adminModal) {
                closeAdminModal();
            }
        });

        // Login button
        loginBtn.addEventListener('click', handleLogin);

        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Add exam button
        if (addExamBtn) {
            addExamBtn.addEventListener('click', addNewExam);
        }

        // Search exams
        if (searchExam) {
            searchExam.addEventListener('input', debounce(searchExams, 300));
        }
        
        // Date change listener to update min time
        const examDateInput = document.getElementById('newExamDate');
        if (examDateInput) {
            examDateInput.addEventListener('change', updateMinTime);
        }
        
        // Form auto-save
        setupFormAutoSave();
        
        // Keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Form validation
        setupFormValidation();
    }

    function updateMinTime() {
        const examDateInput = document.getElementById('newExamDate');
        const examTimeInput = document.getElementById('newExamTime');
        
        if (!examDateInput || !examTimeInput) return;
        
        const today = new Date().toISOString().split('T')[0];
        const selectedDate = examDateInput.value;
        
        if (selectedDate === today) {
            // If date is today, set min time to current time + 30 minutes
            const now = new Date();
            const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
            const hours = String(thirtyMinutesLater.getHours()).padStart(2, '0');
            const minutes = String(thirtyMinutesLater.getMinutes()).padStart(2, '0');
            examTimeInput.min = `${hours}:${minutes}`;
        } else {
            // If date is in future, allow any time
            examTimeInput.min = '00:00';
        }
    }

    function openAdminModal() {
        adminModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Update min date and time when modal opens
        const today = new Date().toISOString().split('T')[0];
        const examDateInput = document.getElementById('newExamDate');
        if (examDateInput) {
            examDateInput.value = today;
            examDateInput.min = today;
        }
        updateMinTime();
        
        if (isAdminLoggedIn) {
            loadExams();
            updateAdminStats();
            
            // Show welcome back message
            showAdminNotification('Welcome back!', 'info');
        }
        
        // Focus on first input
        setTimeout(() => {
            if (isAdminLoggedIn) {
                document.getElementById('newSubject').focus();
            } else {
                document.getElementById('adminEmail').focus();
            }
        }, 300);
    }

    function closeAdminModal() {
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function showLoginForm() {
        if (loginForm) {
            loginForm.style.display = 'block';
            loginForm.style.opacity = '0';
            
            setTimeout(() => {
                loginForm.style.transition = 'opacity 0.3s ease';
                loginForm.style.opacity = '1';
            }, 10);
        }
        
        if (adminDashboard) {
            adminDashboard.style.display = 'none';
        }
        
        clearLoginForm();
    }

    function showAdminDashboard() {
        if (loginForm) {
            loginForm.style.display = 'none';
        }
        
        if (adminDashboard) {
            adminDashboard.style.display = 'block';
            adminDashboard.style.opacity = '0';
            
            setTimeout(() => {
                adminDashboard.style.transition = 'opacity 0.3s ease';
                adminDashboard.style.opacity = '1';
            }, 10);
        }
        
        // Set admin name
        const adminName = document.getElementById('adminName');
        const user = window.firebase.auth.currentUser;
        if (adminName && user) {
            const name = user.email.split('@')[0];
            adminName.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        }
        
        // Update last login time
        updateLastLoginTime();
    }

    function clearLoginForm() {
        const adminEmail = document.getElementById('adminEmail');
        const adminPassword = document.getElementById('adminPassword');
        if (adminEmail) adminEmail.value = '';
        if (adminPassword) adminPassword.value = '';
        if (loginError) loginError.textContent = '';
    }

    async function handleLogin() {
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            showLoginError('Please enter both email and password');
            return;
        }

        // Validate email format
        if (!isValidEmail(email)) {
            showLoginError('Please enter a valid email address');
            return;
        }

        try {
            // Show loading state
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            // Check if Firebase auth is available
            if (!window.firebase || !window.firebase.auth) {
                throw new Error('Firebase not initialized. Please refresh the page.');
            }
            
            // Try Firebase authentication
            const userCredential = await window.firebase.signInWithEmailAndPassword(
                window.firebase.auth, 
                email, 
                password
            );
            
            console.log('Login successful:', userCredential.user.email);
            
            // Clear error
            if (loginError) loginError.textContent = '';
            
            // Show success animation
            loginBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
            
            // Small delay before showing dashboard
            setTimeout(() => {
                showAdminDashboard();
                loadExams();
                loadSubjectSuggestions();
                updateAdminStats();
                
                // Show success message
                showAdminNotification('Login successful!', 'success');
                
                // Reset login button
                setTimeout(() => {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = 'Login';
                }, 1000);
                
            }, 500);
            
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. ';
            
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format. Please check your email.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/invalid-login-credentials') {
                errorMessage = 'Invalid email or password.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/password login is not enabled for this project.';
            } else {
                errorMessage += error.message;
            }
            
            showLoginError(errorMessage);
            
            // Reset login button
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
        }
    }

    function showLoginError(message) {
        if (loginError) {
            loginError.textContent = message;
            loginError.style.opacity = '0';
            
            setTimeout(() => {
                loginError.style.transition = 'opacity 0.3s ease';
                loginError.style.opacity = '1';
                
                // Shake animation
                loginError.classList.add('shake');
                setTimeout(() => loginError.classList.remove('shake'), 500);
            }, 10);
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async function handleLogout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }

        try {
            // Show loading state
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            
            if (window.firebase && window.firebase.auth) {
                await window.firebase.signOut(window.firebase.auth);
            }
            
            // Show logout animation
            logoutBtn.innerHTML = '<i class="fas fa-check"></i> Logged out';
            
            setTimeout(() => {
                showLoginForm();
                
                // Reset logout button
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = 'Logout';
            }, 500);
            
            showAdminNotification('Logged out successfully', 'info');
            
        } catch (error) {
            console.error('Logout error:', error);
            showAdminNotification('Logout failed: ' + error.message, 'error');
            
            // Reset logout button
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = 'Logout';
        }
    }

    async function addNewExam() {
        // First check if user is authenticated
        const auth = window.firebase ? window.firebase.auth : null;
        if (!auth || !auth.currentUser) {
            showAdminNotification('Please login first to add exams', 'error');
            return;
        }

        const department = document.getElementById('newDept').value;
        const semester = document.getElementById('newSemester').value;
        const subject = document.getElementById('newSubject').value.trim();
        const examType = document.getElementById('newExamType').value;
        const examDate = document.getElementById('newExamDate').value;
        const examTime = document.getElementById('newExamTime').value;
        
        // Fixed room number
        const room = 'Depends on sit plan';

        // Validation
        const validation = validateExamForm(department, semester, subject, examDate, examTime);
        if (!validation.valid) {
            showAdminNotification(validation.message, 'error');
            highlightInvalidField(validation.field);
            return;
        }

        // Format time to 12-hour format
        const timeFormatted = formatTimeTo12Hour(examTime);

        try {
            // Show loading state
            addExamBtn.disabled = true;
            addExamBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            const examData = {
                department: department,
                semester: semester,
                subject: subject,
                examType: examType,
                examDate: examDate,
                time: timeFormatted,
                room: room,
                createdAt: new Date().toISOString(),
                addedBy: auth.currentUser.email,
                addedById: auth.currentUser.uid
            };

            console.log('Adding exam data:', examData);

            // Check if Firebase is available
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase database not available');
            }

            // Add to Firebase
            const db = window.firebase.db;
            const collection = window.firebase.collection;
            const addDoc = window.firebase.addDoc;

            const docRef = await addDoc(collection(db, "exams"), examData);
            
            console.log('Exam added with ID:', docRef.id);
            
            // Add subject to suggestions
            addSubjectSuggestion(subject);
            
            // Clear form
            clearAddExamForm();
            
            // Show success animation
            addExamBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
            
            // Reset button after delay
            setTimeout(() => {
                addExamBtn.disabled = false;
                addExamBtn.innerHTML = 'Add Exam';
            }, 1000);
            
            showAdminNotification('Exam added successfully!', 'success');
            
            // Reload exams
            await loadExams();
            updateAdminStats();
            
            // Refresh main routine display
            if (typeof window.updateRoutineDisplay === 'function') {
                setTimeout(() => {
                    window.updateRoutineDisplay();
                    window.updateStatistics();
                    window.updateNextExam();
                    window.updateUpcomingList();
                }, 1000);
            }
            
            // Play success sound if available
            playSuccessSound();
            
        } catch (error) {
            console.error('Error adding exam:', error);
            showAdminNotification('Failed to add exam: ' + error.message, 'error');
            
            // Reset button
            addExamBtn.disabled = false;
            addExamBtn.innerHTML = 'Add Exam';
        }
    }

    function validateExamForm(department, semester, subject, examDate, examTime) {
        if (!department) return { valid: false, message: 'Please select a department', field: 'newDept' };
        if (!semester) return { valid: false, message: 'Please select a semester', field: 'newSemester' };
        if (!subject) return { valid: false, message: 'Please enter a subject name', field: 'newSubject' };
        if (subject.length < 2) return { valid: false, message: 'Subject name is too short', field: 'newSubject' };
        if (!examDate) return { valid: false, message: 'Please select an exam date', field: 'newExamDate' };
        if (!examTime) return { valid: false, message: 'Please select an exam time', field: 'newExamTime' };
        
        // Check if date is in the past
        const selectedDate = new Date(examDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return { valid: false, message: 'Exam date cannot be in the past', field: 'newExamDate' };
        }
        
        // Check if date is today and time is in the past
        if (selectedDate.getTime() === today.getTime()) {
            const selectedDateTime = new Date(`${examDate}T${examTime}`);
            const now = new Date();
            
            // Allow at least 30 minutes from now
            const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
            
            if (selectedDateTime < thirtyMinutesFromNow) {
                return { valid: false, message: 'Exam time must be at least 30 minutes from now for today\'s exams', field: 'newExamTime' };
            }
        }
        
        return { valid: true };
    }

    function highlightInvalidField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('invalid');
            field.focus();
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                field.classList.remove('invalid');
            }, 3000);
        }
    }

    function formatTimeTo12Hour(time24) {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    function clearAddExamForm() {
        document.getElementById('newDept').value = 'Computer';
        document.getElementById('newSemester').value = '1st';
        document.getElementById('newSubject').value = '';
        document.getElementById('newExamType').value = 'written';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('newExamDate').value = today;
        document.getElementById('newExamTime').value = '10:00';
        
        // Update min time
        updateMinTime();
        
        // Focus on subject field
        document.getElementById('newSubject').focus();
    }

    async function loadExams() {
        try {
            if (!window.firebase || !window.firebase.db) {
                console.log('Firebase not available');
                if (examList) {
                    examList.innerHTML = '<div class="loading-state"><p>Connecting to database...</p></div>';
                }
                return;
            }

            // Show loading state
            if (examList) {
                examList.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading exams...</p></div>';
            }

            const db = window.firebase.db;
            const collection = window.firebase.collection;
            const getDocs = window.firebase.getDocs;

            const querySnapshot = await getDocs(collection(db, "exams"));
            allExams = [];
            
            querySnapshot.forEach((doc) => {
                const examData = doc.data();
                
                allExams.push({
                    id: doc.id,
                    ...examData
                });
            });

            console.log('Loaded exams:', allExams.length);
            displayExams(allExams);
            updateAdminStats();
            
        } catch (error) {
            console.error('Error loading exams:', error);
            if (examList) {
                examList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load exams</p>
                        <p><small>${error.message}</small></p>
                        <button onclick="loadExams()" class="btn-retry">Retry</button>
                    </div>
                `;
            }
        }
    }

    function displayExams(exams) {
        if (!examList) return;
        
        examList.innerHTML = '';
        
        if (exams.length === 0) {
            examList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-calendar-plus"></i>
                    </div>
                    <h5>No Exams Found</h5>
                    <p>Add your first exam using the form above</p>
                </div>
            `;
            return;
        }

        // Sort by date (newest first)
        exams.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));

        exams.forEach((exam, index) => {
            const examItem = document.createElement('div');
            examItem.className = 'exam-item';
            examItem.style.opacity = '0';
            examItem.style.transform = 'translateY(20px)';
            
            // Format date for display
            const examDate = new Date(exam.examDate);
            const formattedDate = examDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Get status
            const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
            let status = 'upcoming';
            if (exam.examDate < currentDate) {
                status = 'completed';
            } else if (exam.examDate === currentDate) {
                status = 'today';
            }
            
            // Convert department name to valid CSS class
            const deptClass = exam.department.toLowerCase().replace(/[&\s]+/g, '-');
            
            examItem.innerHTML = `
                <div class="exam-info">
                    <div class="exam-header">
                        <h6>${exam.subject} <span class="exam-type-badge type-${exam.examType || 'written'}">${(exam.examType || 'written').toUpperCase()}</span></h6>
                        <span class="exam-status status-${status}">${status.toUpperCase()}</span>
                    </div>
                    <div class="exam-meta">
                        <span class="dept-badge dept-${deptClass}">${exam.department}</span>
                        <span class="meta-item"><i class="fas fa-graduation-cap"></i> ${exam.semester}</span>
                        <span class="meta-item"><i class="fas fa-calendar"></i> ${formattedDate}</span>
                        <span class="meta-item"><i class="fas fa-clock"></i> ${exam.time}</span>
                    </div>
                    ${exam.addedBy ? `
                    <div class="exam-added-by">
                        <i class="fas fa-user"></i>
                        <small>Added by: ${exam.addedBy.split('@')[0]} on ${new Date(exam.createdAt).toLocaleDateString()}</small>
                    </div>
                    ` : ''}
                </div>
                <div class="exam-actions">
                    <button class="btn-edit" data-id="${exam.id}" title="Edit Exam">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${exam.id}" title="Delete Exam">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-notify" data-id="${exam.id}" title="Send Notification">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="btn-copy" data-id="${exam.id}" title="Copy Exam Details">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;

            // Add event listeners
            const editBtn = examItem.querySelector('.btn-edit');
            const deleteBtn = examItem.querySelector('.btn-delete');
            const notifyBtn = examItem.querySelector('.btn-notify');
            const copyBtn = examItem.querySelector('.btn-copy');
            
            editBtn.addEventListener('click', () => editExam(exam));
            deleteBtn.addEventListener('click', () => deleteExam(exam.id));
            notifyBtn.addEventListener('click', () => sendExactNotification(exam));
            copyBtn.addEventListener('click', () => copyExamDetails(exam));

            examList.appendChild(examItem);
            
            // Stagger animation
            setTimeout(() => {
                examItem.style.transition = 'all 0.3s ease';
                examItem.style.opacity = '1';
                examItem.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    function searchExams() {
        const searchTerm = searchExam.value.toLowerCase().trim();
        
        if (!searchTerm) {
            displayExams(allExams);
            return;
        }
        
        const filteredExams = allExams.filter(exam => {
            return exam.subject.toLowerCase().includes(searchTerm) ||
                   exam.department.toLowerCase().includes(searchTerm) ||
                   exam.semester.toLowerCase().includes(searchTerm) ||
                   (exam.examType && exam.examType.toLowerCase().includes(searchTerm)) ||
                   exam.room.toLowerCase().includes(searchTerm) ||
                   exam.time.toLowerCase().includes(searchTerm) ||
                   (exam.addedBy && exam.addedBy.toLowerCase().includes(searchTerm));
        });
        
        displayExams(filteredExams);
        
        // Show search results count
        const searchResults = document.getElementById('searchResultsCount');
        if (!searchResults) {
            const searchBox = document.querySelector('.search-box');
            const resultsDiv = document.createElement('div');
            resultsDiv.id = 'searchResultsCount';
            resultsDiv.className = 'search-results-count';
            if (searchBox && searchBox.parentNode) {
                searchBox.parentNode.insertBefore(resultsDiv, searchBox.nextSibling);
            }
        }
        
        const resultsElement = document.getElementById('searchResultsCount');
        if (resultsElement) {
            resultsElement.textContent = 
                filteredExams.length === 0 ? 'No results found' :
                `Found ${filteredExams.length} exam${filteredExams.length !== 1 ? 's' : ''}`;
        }
    }

    async function editExam(exam) {
        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'edit-exam-modal';
        
        modal.innerHTML = `
            <div class="edit-exam-content">
                <div class="edit-exam-header">
                    <h3>Edit Exam: ${exam.subject}</h3>
                    <button class="btn-close-edit">&times;</button>
                </div>
                <div class="edit-exam-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editDept">Department:</label>
                            <select id="editDept">
                                <option value="Computer" ${exam.department === 'Computer' ? 'selected' : ''}>Computer</option>
                                <option value="Civil" ${exam.department === 'Civil' ? 'selected' : ''}>Civil</option>
                                <option value="Electrical" ${exam.department === 'Electrical' ? 'selected' : ''}>Electrical</option>
                                <option value="Power" ${exam.department === 'Power' ? 'selected' : ''}>Power</option>
                                <option value="Mechanical" ${exam.department === 'Mechanical' ? 'selected' : ''}>Mechanical</option>
                                <option value="Electronics" ${exam.department === 'Electronics' ? 'selected' : ''}>Electronics</option>
                                <option value="Electro-Medical" ${exam.department === 'Electro-Medical' ? 'selected' : ''}>Electro-Medical</option>
                                <option value="Tourism" ${exam.department === 'Tourism' ? 'selected' : ''}>Tourism</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editSemester">Semester:</label>
                            <select id="editSemester">
                                <option value="1st" ${exam.semester === '1st' ? 'selected' : ''}>1st</option>
                                <option value="2nd" ${exam.semester === '2nd' ? 'selected' : ''}>2nd</option>
                                <option value="3rd" ${exam.semester === '3rd' ? 'selected' : ''}>3rd</option>
                                <option value="4th" ${exam.semester === '4th' ? 'selected' : ''}>4th</option>
                                <option value="5th" ${exam.semester === '5th' ? 'selected' : ''}>5th</option>
                                <option value="6th" ${exam.semester === '6th' ? 'selected' : ''}>6th</option>
                                <option value="7th" ${exam.semester === '7th' ? 'selected' : ''}>7th</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editSubject">Subject:</label>
                            <input type="text" id="editSubject" value="${exam.subject}">
                        </div>
                        <div class="form-group">
                            <label for="editExamType">Exam Type:</label>
                            <select id="editExamType">
                                <option value="written" ${(exam.examType || 'written') === 'written' ? 'selected' : ''}>Written</option>
                                <option value="practical" ${(exam.examType || 'written') === 'practical' ? 'selected' : ''}>Practical</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editExamDate">Exam Date:</label>
                            <input type="date" id="editExamDate" value="${exam.examDate}">
                        </div>
                        <div class="form-group">
                            <label for="editExamTime">Time:</label>
                            <input type="time" id="editExamTime" value="${convertTimeTo24Hour(exam.time)}">
                        </div>
                    </div>
                </div>
                <div class="edit-exam-footer">
                    <button class="btn-save-edit">Save Changes</button>
                    <button class="btn-cancel-edit">Cancel</button>
                    <button class="btn-duplicate-exam">Duplicate Exam</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.btn-close-edit').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-cancel-edit').addEventListener('click', () => modal.remove());
        
        modal.querySelector('.btn-save-edit').addEventListener('click', async () => {
            await saveExamEdit(exam.id, modal);
        });
        
        modal.querySelector('.btn-duplicate-exam').addEventListener('click', async () => {
            await duplicateExam(exam, modal);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async function saveExamEdit(examId, modal) {
        const department = modal.querySelector('#editDept').value;
        const semester = modal.querySelector('#editSemester').value;
        const subject = modal.querySelector('#editSubject').value.trim();
        const examType = modal.querySelector('#editExamType').value;
        const examDate = modal.querySelector('#editExamDate').value;
        const examTime = modal.querySelector('#editExamTime').value;
        
        // Validation
        if (!department || !semester || !subject || !examDate || !examTime) {
            showAdminNotification('Please fill all fields', 'error');
            return;
        }
        
        try {
            const timeFormatted = formatTimeTo12Hour(examTime);
            
            const updatedData = {
                department,
                semester,
                subject,
                examType,
                examDate,
                time: timeFormatted,
                room: 'Depends on sit plan',
                updatedAt: new Date().toISOString(),
                updatedBy: window.firebase.auth.currentUser.email
            };
            
            await window.firebase.updateDoc(
                window.firebase.doc(window.firebase.db, "exams", examId),
                updatedData
            );
            
            modal.remove();
            showAdminNotification('Exam updated successfully!', 'success');
            loadExams();
            
            // Refresh main display
            if (typeof window.updateRoutineDisplay === 'function') {
                setTimeout(() => {
                    window.updateRoutineDisplay();
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error updating exam:', error);
            showAdminNotification('Failed to update exam: ' + error.message, 'error');
        }
    }

    async function duplicateExam(exam, modal) {
        if (confirm('Create a duplicate of this exam?')) {
            modal.remove();
            
            // Populate add form with exam data
            document.getElementById('newDept').value = exam.department;
            document.getElementById('newSemester').value = exam.semester;
            document.getElementById('newSubject').value = exam.subject + ' (Copy)';
            document.getElementById('newExamType').value = exam.examType || 'written';
            document.getElementById('newExamDate').value = exam.examDate;
            document.getElementById('newExamTime').value = convertTimeTo24Hour(exam.time);
            
            showAdminNotification('Exam details copied to form. Adjust as needed and click Add Exam.', 'info');
            
            // Scroll to form
            document.getElementById('newSubject').focus();
        }
    }

    function convertTimeTo24Hour(time12) {
        if (!time12) return '10:00';
        
        // Check if already in 24-hour format
        if (time12.includes(':')) {
            const parts = time12.split(':');
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                // If it's already 24-hour format, return as is
                if (parseInt(parts[0]) >= 0 && parseInt(parts[0]) <= 23) {
                    return time12;
                }
            }
        }
        
        const [time, modifier] = time12.split(' ');
        if (!time || !modifier) return '10:00';
        
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') {
            hours = '00';
        }
        
        if (modifier === 'PM') {
            hours = parseInt(hours, 10) + 12;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
    }

    async function deleteExam(examId) {
        if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
            return;
        }

        try {
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase not available');
            }
            
            await window.firebase.deleteDoc(
                window.firebase.doc(window.firebase.db, "exams", examId)
            );
            
            showAdminNotification('Exam deleted successfully!', 'success');
            loadExams();
            updateAdminStats();
            
            // Refresh main routine display
            if (typeof window.updateRoutineDisplay === 'function') {
                setTimeout(() => {
                    window.updateRoutineDisplay();
                    window.updateStatistics();
                    window.updateNextExam();
                    window.updateUpcomingList();
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error deleting exam:', error);
            showAdminNotification('Failed to delete exam: ' + error.message, 'error');
        }
    }

    // NEW FUNCTION: Send exact notification with precise timing
    async function sendExactNotification(exam) {
        // Create notification modal
        const modal = document.createElement('div');
        modal.className = 'exact-notification-modal';
        
        const examDateTime = new Date(`${exam.examDate}T${convertTimeTo24Hour(exam.time)}`);
        const now = new Date();
        const timeDiff = examDateTime - now;
        
        // Calculate days and hours
        const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        modal.innerHTML = `
            <div class="exact-notification-content">
                <div class="exact-notification-header">
                    <h3><i class="fas fa-bell"></i> Send Notification for ${exam.subject}</h3>
                    <button class="btn-close-exact">&times;</button>
                </div>
                <div class="exact-notification-body">
                    <div class="notification-info">
                        <h4>${exam.subject} Exam</h4>
                        <p><strong>${exam.department} - ${exam.semester}</strong></p>
                        <p>Date: ${window.dataFunctions ? window.dataFunctions.formatDate(exam.examDate) : exam.examDate}</p>
                        <p>Time: ${exam.time}</p>
                        <p>Type: ${(exam.examType || 'written').toUpperCase()}</p>
                        
                        <div class="countdown-info">
                            <p><strong>Exam in: ${daysLeft} days, ${hoursLeft} hours</strong></p>
                        </div>
                    </div>
                    
                    <div class="notification-timing">
                        <h5>Send Notification at Exact Time:</h5>
                        <div class="timing-options">
                            <div class="timing-option">
                                <input type="radio" id="exactTime" name="notificationType" value="exact" checked>
                                <label for="exactTime">
                                    <i class="fas fa-clock"></i>
                                    <span>At exact exam time: ${exam.time}</span>
                                </label>
                            </div>
                            <div class="timing-option">
                                <input type="radio" id="before15" name="notificationType" value="15min">
                                <label for="before15">
                                    <i class="fas fa-hourglass-start"></i>
                                    <span>15 minutes before: ${calculateTimeBefore(exam.time, 15)}</span>
                                </label>
                            </div>
                            <div class="timing-option">
                                <input type="radio" id="before30" name="notificationType" value="30min">
                                <label for="before30">
                                    <i class="fas fa-hourglass-half"></i>
                                    <span>30 minutes before: ${calculateTimeBefore(exam.time, 30)}</span>
                                </label>
                            </div>
                            <div class="timing-option">
                                <input type="radio" id="before1hour" name="notificationType" value="1hour">
                                <label for="before1hour">
                                    <i class="fas fa-hourglass-end"></i>
                                    <span>1 hour before: ${calculateTimeBefore(exam.time, 60)}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="notification-preview">
                        <h5>Notification Preview:</h5>
                        <div class="preview-card">
                            <div class="preview-header">
                                <i class="fas fa-bell"></i>
                                <strong>📚 Exam Reminder</strong>
                            </div>
                            <div class="preview-body">
                                <p><strong>${exam.subject}</strong></p>
                                <p>${exam.department} - ${exam.semester}</p>
                                <p>Date: ${window.dataFunctions ? window.dataFunctions.formatDate(exam.examDate) : exam.examDate}</p>
                                <p>Time: ${exam.time}</p>
                                <p>Type: ${(exam.examType || 'written').toUpperCase()}</p>
                                <p id="notification-timing-preview">Will notify at exact exam time</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="exact-notification-footer">
                    <button class="btn-test-notification">
                        <i class="fas fa-bell"></i> Test Notification Now
                    </button>
                    <button class="btn-schedule-exact">
                        <i class="fas fa-calendar-check"></i> Schedule Notification
                    </button>
                    <button class="btn-cancel-exact">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Update preview based on timing selection
        const updatePreview = () => {
            const timing = modal.querySelector('input[name="notificationType"]:checked').value;
            let timingText = '';
            
            switch(timing) {
                case 'exact':
                    timingText = `Will notify at exact exam time: ${exam.time}`;
                    break;
                case '15min':
                    timingText = `Will notify 15 minutes before: ${calculateTimeBefore(exam.time, 15)}`;
                    break;
                case '30min':
                    timingText = `Will notify 30 minutes before: ${calculateTimeBefore(exam.time, 30)}`;
                    break;
                case '1hour':
                    timingText = `Will notify 1 hour before: ${calculateTimeBefore(exam.time, 60)}`;
                    break;
            }
            
            const previewElement = modal.querySelector('#notification-timing-preview');
            if (previewElement) {
                previewElement.textContent = timingText;
            }
        };
        
        // Add event listeners for timing options
        modal.querySelectorAll('input[name="notificationType"]').forEach(radio => {
            radio.addEventListener('change', updatePreview);
        });
        
        // Initial preview update
        updatePreview();
        
        // Add event listeners for buttons
        modal.querySelector('.btn-close-exact').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-cancel-exact').addEventListener('click', () => modal.remove());
        
        modal.querySelector('.btn-test-notification').addEventListener('click', async () => {
            await sendTestNotificationNow(exam);
            showAdminNotification('Test notification sent!', 'success');
        });
        
        modal.querySelector('.btn-schedule-exact').addEventListener('click', async () => {
            const timing = modal.querySelector('input[name="notificationType"]:checked').value;
            await scheduleExactNotification(exam, timing);
            modal.remove();
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    function calculateTimeBefore(examTime, minutesBefore) {
        const [time, modifier] = examTime.split(' ');
        let [hours, minutes] = time.split(':');
        
        hours = parseInt(hours);
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        
        const totalMinutes = hours * 60 + parseInt(minutes) - minutesBefore;
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        
        const newModifier = newHours >= 12 ? 'PM' : 'AM';
        const displayHours = newHours % 12 || 12;
        
        return `${displayHours}:${newMinutes.toString().padStart(2, '0')} ${newModifier}`;
    }

    async function sendTestNotificationNow(exam) {
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                // Create and show notification
                const notification = new Notification("📚 Exam Reminder - TEST", {
                    body: `${exam.subject} exam for ${exam.department} - ${exam.semester} on ${window.dataFunctions.formatDate(exam.examDate)} at ${exam.time}`,
                    icon: "/favicon.ico",
                    tag: `exam-${exam.id}-test`,
                    requireInteraction: true
                });
                
                return true;
            } else if (Notification.permission !== "denied") {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    const notification = new Notification("📚 Exam Reminder - TEST", {
                        body: `${exam.subject} exam for ${exam.department} - ${exam.semester} on ${window.dataFunctions.formatDate(exam.examDate)} at ${exam.time}`,
                        icon: "/favicon.ico",
                        tag: `exam-${exam.id}-test`,
                        requireInteraction: true
                    });
                    
                    return true;
                }
            }
        }
        return false;
    }

    async function scheduleExactNotification(exam, notificationType) {
        const examDateTime = new Date(`${exam.examDate}T${convertTimeTo24Hour(exam.time)}`);
        let notificationTime;
        let timingText = '';
        
        switch(notificationType) {
            case 'exact':
                notificationTime = examDateTime;
                timingText = 'at exact exam time';
                break;
            case '15min':
                notificationTime = new Date(examDateTime.getTime() - 15 * 60 * 1000);
                timingText = '15 minutes before';
                break;
            case '30min':
                notificationTime = new Date(examDateTime.getTime() - 30 * 60 * 1000);
                timingText = '30 minutes before';
                break;
            case '1hour':
                notificationTime = new Date(examDateTime.getTime() - 60 * 60 * 1000);
                timingText = '1 hour before';
                break;
        }
        
        const now = new Date();
        const delay = notificationTime - now;
        
        if (delay > 0) {
            // Store notification schedule in localStorage
            const notifications = JSON.parse(localStorage.getItem('adminScheduledNotifications') || '[]');
            notifications.push({
                examId: exam.id,
                examSubject: exam.subject,
                department: exam.department,
                semester: exam.semester,
                examTime: exam.time,
                examDate: exam.examDate,
                notificationTime: notificationTime.toISOString(),
                notificationType: notificationType,
                scheduledAt: new Date().toISOString()
            });
            
            localStorage.setItem('adminScheduledNotifications', JSON.stringify(notifications));
            
            // Schedule the notification
            setTimeout(() => {
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("📚 Exam Reminder", {
                        body: `${exam.subject} exam for ${exam.department} - ${exam.semester} is starting ${notificationType === 'exact' ? 'now' : notificationType}!\nTime: ${exam.time}`,
                        icon: "/favicon.ico",
                        tag: `exam-${exam.id}`,
                        requireInteraction: true
                    });
                }
                
                // Remove from localStorage after sending
                const updatedNotifications = JSON.parse(localStorage.getItem('adminScheduledNotifications') || '[]');
                const filtered = updatedNotifications.filter(n => 
                    !(n.examId === exam.id && n.notificationTime === notificationTime.toISOString())
                );
                localStorage.setItem('adminScheduledNotifications', JSON.stringify(filtered));
                
            }, delay);
            
            showAdminNotification(`Notification scheduled ${timingText} for ${exam.subject}`, 'success');
        } else {
            showAdminNotification('Cannot schedule notification in the past', 'error');
        }
    }

    function copyExamDetails(exam) {
        const text = `Subject: ${exam.subject}\nDepartment: ${exam.department}\nSemester: ${exam.semester}\nType: ${exam.examType || 'written'}\nDate: ${exam.examDate}\nTime: ${exam.time}\nRoom: ${exam.room}`;
        
        navigator.clipboard.writeText(text).then(() => {
            showAdminNotification('Exam details copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            showAdminNotification('Failed to copy details', 'error');
        });
    }

    function initAutoSuggest() {
        const subjectInput = document.getElementById('newSubject');
        
        if (!subjectInput) return;
        
        // Create datalist for suggestions
        const datalist = document.createElement('datalist');
        datalist.id = 'subjectSuggestions';
        document.body.appendChild(datalist);
        subjectInput.setAttribute('list', 'subjectSuggestions');
        
        // Load existing suggestions
        loadSubjectSuggestions();
    }

    async function loadSubjectSuggestions() {
        try {
            if (!window.firebase || !window.firebase.db) return;
            
            const querySnapshot = await window.firebase.getDocs(
                window.firebase.collection(window.firebase.db, "exams")
            );
            
            subjectSuggestions.clear();
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.subject) {
                    subjectSuggestions.add(data.subject);
                }
            });
            
            updateSubjectDatalist();
            
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    }

    function updateSubjectDatalist() {
        const datalist = document.getElementById('subjectSuggestions');
        if (!datalist) return;
        
        datalist.innerHTML = '';
        subjectSuggestions.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            datalist.appendChild(option);
        });
    }

    function addSubjectSuggestion(subject) {
        subjectSuggestions.add(subject);
        updateSubjectDatalist();
    }

    function updateAdminStats() {
        const totalExams = allExams.length;
        const today = new Date().toISOString().split('T')[0];
        const todayExams = allExams.filter(exam => exam.examDate === today).length;
        const upcomingExams = allExams.filter(exam => exam.examDate >= today).length;
        const practicalExams = allExams.filter(exam => exam.examType === 'practical').length;
        const writtenExams = allExams.filter(exam => !exam.examType || exam.examType === 'written').length;
        
        // Update stats in admin header if elements exist
        const statsElement = document.getElementById('adminStats');
        if (!statsElement) {
            const adminHeader = document.querySelector('.admin-header');
            if (adminHeader) {
                const statsDiv = document.createElement('div');
                statsDiv.id = 'adminStats';
                statsDiv.className = 'admin-stats';
                statsDiv.innerHTML = `
                    <span class="stat-badge">Total: ${totalExams}</span>
                    <span class="stat-badge">Today: ${todayExams}</span>
                    <span class="stat-badge">Upcoming: ${upcomingExams}</span>
                    <span class="stat-badge">Practical: ${practicalExams}</span>
                    <span class="stat-badge">Written: ${writtenExams}</span>
                `;
                adminHeader.appendChild(statsDiv);
            }
        } else {
            statsElement.innerHTML = `
                <span class="stat-badge">Total: ${totalExams}</span>
                <span class="stat-badge">Today: ${todayExams}</span>
                <span class="stat-badge">Upcoming: ${upcomingExams}</span>
                <span class="stat-badge">Practical: ${practicalExams}</span>
                <span class="stat-badge">Written: ${writtenExams}</span>
            `;
        }
    }

    function updateLastLoginTime() {
        const lastLoginElement = document.getElementById('lastLoginTime');
        if (!lastLoginElement) {
            const adminHeader = document.querySelector('.admin-header');
            if (adminHeader) {
                const loginTimeDiv = document.createElement('div');
                loginTimeDiv.id = 'lastLoginTime';
                loginTimeDiv.className = 'last-login-time';
                loginTimeDiv.innerHTML = `<small>Last login: Just now</small>`;
                adminHeader.appendChild(loginTimeDiv);
            }
        } else {
            lastLoginElement.innerHTML = `<small>Last login: Just now</small>`;
            
            // Update time every minute
            setTimeout(() => {
                lastLoginElement.innerHTML = `<small>Last login: 1 minute ago</small>`;
            }, 60000);
        }
    }

    function setupFormAutoSave() {
        const formFields = ['newSubject'];
        const storageKey = 'examFormDraft';
        
        // Load saved draft
        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                formFields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && draft[field]) {
                        element.value = draft[field];
                    }
                });
                
                // Show restore notification
                if (Object.values(draft).some(val => val)) {
                    setTimeout(() => {
                        showAdminNotification('Form draft restored from previous session', 'info');
                    }, 1000);
                }
            } catch (e) {
                console.error('Error loading draft:', e);
            }
        }
        
        // Auto-save on input
        formFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('input', debounce(() => {
                    const draft = {};
                    formFields.forEach(f => {
                        const el = document.getElementById(f);
                        if (el) draft[f] = el.value;
                    });
                    localStorage.setItem(storageKey, JSON.stringify(draft));
                }, 1000));
            }
        });
        
        // Clear draft on successful submit
        document.getElementById('addExamBtn')?.addEventListener('click', () => {
            localStorage.removeItem(storageKey);
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only in admin modal
            if (adminModal.style.display !== 'flex') return;
            
            // Ctrl/Cmd + S to save exam
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && isAdminLoggedIn) {
                e.preventDefault();
                addNewExam();
            }
            
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (searchExam) {
                    searchExam.focus();
                    searchExam.select();
                }
            }
            
            // Escape to close modal
            if (e.key === 'Escape') {
                closeAdminModal();
            }
            
            // Ctrl/Cmd + L to logout
            if ((e.ctrlKey || e.metaKey) && e.key === 'l' && isAdminLoggedIn) {
                e.preventDefault();
                handleLogout();
            }
        });
    }

    function setupFormValidation() {
        const subjectInput = document.getElementById('newSubject');
        
        if (subjectInput) {
            subjectInput.addEventListener('blur', () => {
                if (subjectInput.value.length > 0 && subjectInput.value.length < 2) {
                    subjectInput.classList.add('invalid');
                    showAdminNotification('Subject name should be at least 2 characters', 'warning');
                }
            });
        }
    }

    function showAdminNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.admin-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `admin-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="btn-close-notification">&times;</button>
        `;
        
        adminModal.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
        
        // Close button
        notification.querySelector('.btn-close-notification').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    function playSuccessSound() {
        // Simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

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

    // Check for scheduled notifications on page load
    function checkScheduledNotifications() {
        const notifications = JSON.parse(localStorage.getItem('adminScheduledNotifications') || '[]');
        const now = new Date();
        
        // Remove past notifications
        const validNotifications = notifications.filter(notification => {
            const notificationTime = new Date(notification.notificationTime);
            return notificationTime > now;
        });
        
        localStorage.setItem('adminScheduledNotifications', JSON.stringify(validNotifications));
        
        // Reschedule valid notifications
        validNotifications.forEach(notification => {
            const notificationTime = new Date(notification.notificationTime);
            const delay = notificationTime - now;
            
            if (delay > 0) {
                setTimeout(() => {
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("📚 Exam Reminder", {
                            body: `${notification.examSubject} exam for ${notification.department} - ${notification.semester} is starting ${notification.notificationType}!\nTime: ${notification.examTime}`,
                            icon: "/favicon.ico",
                            tag: `exam-${notification.examId}`,
                            requireInteraction: true
                        });
                    }
                    
                    // Remove from localStorage after sending
                    const updatedNotifications = JSON.parse(localStorage.getItem('adminScheduledNotifications') || '[]');
                    const filtered = updatedNotifications.filter(n => 
                        !(n.examId === notification.examId && n.notificationTime === notification.notificationTime)
                    );
                    localStorage.setItem('adminScheduledNotifications', JSON.stringify(filtered));
                    
                }, delay);
            }
        });
    }

    // Run on page load
    checkScheduledNotifications();

    // Export functions for global access
    window.loadExams = loadExams;
    window.adminFunctions = {
        loadExams,
        addNewExam,
        editExam,
        deleteExam
    };
});
