// user-auth.js - Google Login + Profile Settings + Default Filters
// Added: localStorage caching & coordinated filter apply with script.js

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginBtnHeader = document.getElementById('loginBtnHeader');
    const userInfoDiv = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const profileSettingsBtn = document.getElementById('profileSettingsBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.querySelector('.close-profile-modal');
    const profileForm = document.getElementById('profileForm');
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileEmail = document.getElementById('profileEmail');
    const profileDept = document.getElementById('profileDept');
    const profileSemester = document.getElementById('profileSemester');
    const profileReferredSemesters = document.getElementById('profileReferredSemesters');
    const logoutUserBtn = document.getElementById('logoutUserBtn');
    const notificationBtn = document.getElementById('notificationBtn');
    const notifBadgeHeader = document.getElementById('notifBadgeHeader');
    const notificationPreviewModal = document.getElementById('notificationPreviewModal');
    const notificationPreviewBody = document.getElementById('notificationPreviewBody');
    const closeNotifPreview = document.querySelector('.close-notif-preview');

    // Global user profile object
    window.userProfile = {
        uid: null,
        displayName: null,
        email: null,
        photoURL: null,
        department: 'all',
        semester: 'all',
        referredSemesters: []
    };

    // localStorage key for profile cache
    const PROFILE_CACHE_KEY = 'userProfileCache';

    // Firebase auth state
    if (!window.firebase || !window.firebase.auth) {
        console.error('Firebase auth not available');
        return;
    }

    const auth = window.firebase.auth;
    const db = window.firebase.db;
    const docRef = window.firebase.doc;
    const setDoc = window.firebase.setDoc;
    const getDoc = window.firebase.getDoc;
    const signInWithPopup = window.firebase.signInWithPopup;
    const GoogleAuthProvider = window.firebase.GoogleAuthProvider;
    const onAuthStateChanged = window.firebase.onAuthStateChanged;
    const signOut = window.firebase.signOut;

    // ---------- Listeners ----------
    loginBtnHeader.addEventListener('click', loginWithGoogle);
    profileSettingsBtn.addEventListener('click', openProfileModal);
    closeProfileModal.addEventListener('click', closeProfileModalFn);
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModalFn();
    });
    profileForm.addEventListener('submit', saveProfile);
    logoutUserBtn.addEventListener('click', logoutUser);
    notificationBtn.addEventListener('click', openNotificationPreview);
    closeNotifPreview.addEventListener('click', () => {
        notificationPreviewModal.style.display = 'none';
    });
    notificationPreviewModal.addEventListener('click', (e) => {
        if (e.target === notificationPreviewModal) notificationPreviewModal.style.display = 'none';
    });

    // ---------- Auth State ----------
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('User logged in:', user.displayName);
            window.userProfile.uid = user.uid;
            window.userProfile.displayName = user.displayName || 'User';
            window.userProfile.email = user.email;
            window.userProfile.photoURL = user.photoURL || '';

            loginBtnHeader.style.display = 'none';
            userInfoDiv.style.display = 'flex';
            userNameDisplay.textContent = window.userProfile.displayName;
            if (window.userProfile.photoURL) {
                userAvatar.src = window.userProfile.photoURL;
                userAvatar.style.display = 'inline-block';
            } else {
                userAvatar.style.display = 'none';
            }

            // 1. Load from localStorage first (for quick display)
            const cached = loadProfileFromCache();
            if (cached) {
                window.userProfile.department = cached.department || 'all';
                window.userProfile.semester = cached.semester || 'all';
                window.userProfile.referredSemesters = cached.referredSemesters || [];
                // Apply filters immediately from cache
                applyDefaultFilters();
            }

            // 2. Then load from Firestore (sync)
            await loadUserProfile(user.uid);
            // Firestore load will also call applyDefaultFilters again if needed

            // Update notification badge
            updateNotificationBadge();

        } else {
            console.log('User logged out');
            loginBtnHeader.style.display = 'inline-block';
            userInfoDiv.style.display = 'none';
            window.userProfile = {
                uid: null,
                displayName: null,
                email: null,
                photoURL: null,
                department: 'all',
                semester: 'all',
                referredSemesters: []
            };
            // Clear cache
            localStorage.removeItem(PROFILE_CACHE_KEY);
            resetFiltersToDefault();
            if (notifBadgeHeader) notifBadgeHeader.textContent = '0';
        }
    });

    // ---------- Login Function ----------
    async function loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            console.log('Login successful:', result.user.displayName);
        } catch (error) {
            console.error('Login error:', error);
            if (window.showNotification) {
                window.showNotification('Login failed: ' + error.message, 'error');
            } else {
                alert('Login failed: ' + error.message);
            }
        }
    }

    // ---------- Load Profile from Firestore ----------
    async function loadUserProfile(uid) {
        try {
            const userDoc = await getDoc(docRef(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                window.userProfile.department = data.department || 'all';
                window.userProfile.semester = data.semester || 'all';
                window.userProfile.referredSemesters = data.referredSemesters || [];
                // Save to cache
                saveProfileToCache(window.userProfile);
                console.log('Profile loaded from Firestore:', window.userProfile);
            } else {
                // No profile yet, create default
                await saveProfileToFirestore(uid);
            }
            // Apply filters again (in case cache was different)
            applyDefaultFilters();
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    // ---------- Save Profile to Firestore ----------
    async function saveProfileToFirestore(uid) {
        try {
            const profileData = {
                department: window.userProfile.department || 'all',
                semester: window.userProfile.semester || 'all',
                referredSemesters: window.userProfile.referredSemesters || [],
                updatedAt: new Date().toISOString()
            };
            await setDoc(docRef(db, 'users', uid), profileData, { merge: true });
            // Save to cache
            saveProfileToCache(window.userProfile);
            console.log('Profile saved to Firestore');
        } catch (error) {
            console.error('Error saving profile:', error);
            if (window.showNotification) {
                window.showNotification('Failed to save profile: ' + error.message, 'error');
            }
        }
    }

    // ---------- Cache functions ----------
    function saveProfileToCache(profile) {
        try {
            const cacheData = {
                department: profile.department,
                semester: profile.semester,
                referredSemesters: profile.referredSemesters
            };
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('Could not save profile to cache:', e);
        }
    }

    function loadProfileFromCache() {
        try {
            const cached = localStorage.getItem(PROFILE_CACHE_KEY);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {
            console.warn('Could not load profile from cache:', e);
        }
        return null;
    }

    // ---------- Save Profile (from form) ----------
    async function saveProfile(e) {
        e.preventDefault();
        const uid = window.userProfile.uid;
        if (!uid) {
            if (window.showNotification) window.showNotification('Please login first', 'error');
            return;
        }

        const dept = profileDept.value;
        const semester = profileSemester.value;
        const referredSelect = profileReferredSemesters;
        const selectedReferred = Array.from(referredSelect.selectedOptions).map(opt => opt.value);

        window.userProfile.department = dept;
        window.userProfile.semester = semester;
        window.userProfile.referredSemesters = selectedReferred;

        await saveProfileToFirestore(uid);
        applyDefaultFilters();
        closeProfileModalFn();

        if (window.showNotification) {
            window.showNotification('Profile saved successfully!', 'success');
        }
        updateNotificationBadge();
        window.dispatchEvent(new Event('profileUpdated'));
    }

    // ---------- Apply Default Filters ----------
    function applyDefaultFilters() {
        // Wait for script.js to be ready (handleFilterChange defined)
        if (typeof window.handleFilterChange === 'function' && typeof window.updateDropdownHeader === 'function') {
            _applyFilters();
        } else {
            // If not ready, wait for a custom event from script.js
            const listener = function() {
                _applyFilters();
                document.removeEventListener('scriptReady', listener);
            };
            document.addEventListener('scriptReady', listener);
            // Also set a fallback timeout
            setTimeout(() => {
                if (typeof window.handleFilterChange === 'function') {
                    document.removeEventListener('scriptReady', listener);
                    _applyFilters();
                }
            }, 500);
        }
    }

    function _applyFilters() {
        const dept = window.userProfile.department || 'all';
        const semester = window.userProfile.semester || 'all';
        const referred = window.userProfile.referredSemesters || [];

        const deptSelect = document.getElementById('deptSelect');
        if (deptSelect && dept !== 'all') {
            deptSelect.value = dept;
        } else if (deptSelect) {
            deptSelect.value = 'all';
        }

        const singleSelect = document.getElementById('semesterSingleSelect');
        const multipleToggle = document.getElementById('semesterMultipleToggle');
        const multipleContainer = document.getElementById('semesterMultipleContainer');
        const semesterCheckboxes = document.querySelectorAll('#semesterDropdown input[type="checkbox"]');

        let semestersToSelect = [];
        if (semester !== 'all') semestersToSelect.push(semester);
        semestersToSelect = semestersToSelect.concat(referred);

        if (semestersToSelect.length > 0) {
            if (semestersToSelect.length > 1) {
                multipleToggle.checked = true;
                document.getElementById('semesterToggleStatus').textContent = 'ON';
                singleSelect.style.display = 'none';
                multipleContainer.style.display = 'block';
                multipleContainer.classList.add('active');
                semesterCheckboxes.forEach(cb => {
                    cb.checked = semestersToSelect.includes(cb.value);
                });
            } else {
                multipleToggle.checked = false;
                document.getElementById('semesterToggleStatus').textContent = 'OFF';
                singleSelect.style.display = 'block';
                multipleContainer.style.display = 'none';
                multipleContainer.classList.remove('active');
                singleSelect.value = semestersToSelect[0];
                semesterCheckboxes.forEach(cb => cb.checked = false);
            }
        } else {
            multipleToggle.checked = false;
            document.getElementById('semesterToggleStatus').textContent = 'OFF';
            singleSelect.style.display = 'block';
            multipleContainer.style.display = 'none';
            multipleContainer.classList.remove('active');
            singleSelect.value = 'all';
            semesterCheckboxes.forEach(cb => cb.checked = false);
        }

        if (window.updateDropdownHeader) {
            window.updateDropdownHeader('semesterDropdown');
        }

        if (window.handleFilterChange) {
            window.handleFilterChange();
        }

        console.log('Default filters applied:', { dept, semestersToSelect });
    }

    // ---------- Reset Filters to Default (All) ----------
    function resetFiltersToDefault() {
        const deptSelect = document.getElementById('deptSelect');
        if (deptSelect) deptSelect.value = 'all';
        const singleSelect = document.getElementById('semesterSingleSelect');
        if (singleSelect) singleSelect.value = 'all';
        const multipleToggle = document.getElementById('semesterMultipleToggle');
        if (multipleToggle) {
            multipleToggle.checked = false;
            document.getElementById('semesterToggleStatus').textContent = 'OFF';
        }
        const multipleContainer = document.getElementById('semesterMultipleContainer');
        if (multipleContainer) {
            multipleContainer.style.display = 'none';
            multipleContainer.classList.remove('active');
        }
        const singleSelectDisplay = document.getElementById('semesterSingleSelect');
        if (singleSelectDisplay) singleSelectDisplay.style.display = 'block';
        document.querySelectorAll('#semesterDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
        if (window.updateDropdownHeader) window.updateDropdownHeader('semesterDropdown');
        if (window.handleFilterChange) window.handleFilterChange();
    }

    // ---------- Profile Modal ----------
    function openProfileModal() {
        const user = auth.currentUser;
        if (!user) {
            if (window.showNotification) window.showNotification('Please login first', 'error');
            return;
        }
        profileDisplayName.value = window.userProfile.displayName || '';
        profileEmail.value = window.userProfile.email || '';
        profileDept.value = window.userProfile.department || 'all';
        profileSemester.value = window.userProfile.semester || 'all';
        const referred = window.userProfile.referredSemesters || [];
        const options = profileReferredSemesters.options;
        for (let i = 0; i < options.length; i++) {
            options[i].selected = referred.includes(options[i].value);
        }
        profileModal.style.display = 'flex';
    }

    function closeProfileModalFn() {
        profileModal.style.display = 'none';
    }

    // ---------- Logout ----------
    async function logoutUser() {
        try {
            await signOut(auth);
            if (window.showNotification) window.showNotification('Logged out successfully', 'success');
            closeProfileModalFn();
        } catch (error) {
            console.error('Logout error:', error);
            if (window.showNotification) window.showNotification('Logout failed: ' + error.message, 'error');
        }
    }

    // ---------- Notification Preview ----------
    function openNotificationPreview() {
        const user = auth.currentUser;
        if (!user) {
            if (window.showNotification) window.showNotification('Please login to see notifications', 'error');
            return;
        }
        const notifications = generateUserNotifications();
        notificationPreviewBody.innerHTML = notifications;
        notificationPreviewModal.style.display = 'flex';
    }

    // ---------- Generate User Notifications ----------
    function generateUserNotifications() {
        const user = auth.currentUser;
        if (!user) {
            return '<p>Please login to see your personalized notifications.</p>';
        }
        const dept = window.userProfile.department || 'all';
        const semesters = [];
        if (window.userProfile.semester && window.userProfile.semester !== 'all') semesters.push(window.userProfile.semester);
        if (window.userProfile.referredSemesters) semesters.push(...window.userProfile.referredSemesters);
        if (semesters.length === 0) {
            return '<p>No semesters selected. Please update your profile.</p>';
        }

        let exams = window.examData || [];
        if (!exams.length) {
            return '<p>No exam data available.</p>';
        }

        const filtered = exams.filter(exam => {
            const deptMatch = dept === 'all' || exam.department === dept;
            const semMatch = semesters.includes(exam.semester);
            return deptMatch && semMatch;
        });

        const sorted = filtered.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        const today = new Date().toISOString().split('T')[0];
        const upcoming = sorted.filter(exam => exam.examDate >= today);

        if (upcoming.length === 0) {
            return `<p>No upcoming exams for your department (${dept}) and semesters (${semesters.join(', ')}).</p>`;
        }

        let html = `<h4>Upcoming Exams for ${dept} Department</h4><ul>`;
        upcoming.slice(0, 10).forEach(exam => {
            const dateObj = new Date(exam.examDate);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const daysLeft = Math.ceil((dateObj - new Date()) / (1000 * 60 * 60 * 24));
            let msg = '';
            if (daysLeft === 0) msg = 'TODAY!';
            else if (daysLeft === 1) msg = 'tomorrow';
            else msg = `in ${daysLeft} days`;
            const examType = exam.examType || 'Written';
            html += `<li><strong>${exam.subject}</strong> - ${exam.semester} semester (${examType}) - ${dateStr} at ${exam.time} (${msg})</li>`;
        });
        html += '</ul>';
        if (upcoming.length > 10) {
            html += `<p>... and ${upcoming.length - 10} more exams.</p>`;
        }
        return html;
    }

    // ---------- Update Notification Badge ----------
    function updateNotificationBadge() {
        const user = auth.currentUser;
        if (!user) {
            if (notifBadgeHeader) notifBadgeHeader.textContent = '0';
            return;
        }
        const dept = window.userProfile.department || 'all';
        const semesters = [];
        if (window.userProfile.semester && window.userProfile.semester !== 'all') semesters.push(window.userProfile.semester);
        if (window.userProfile.referredSemesters) semesters.push(...window.userProfile.referredSemesters);
        if (semesters.length === 0) {
            if (notifBadgeHeader) notifBadgeHeader.textContent = '0';
            return;
        }
        let exams = window.examData || [];
        const today = new Date().toISOString().split('T')[0];
        const filtered = exams.filter(exam => {
            const deptMatch = dept === 'all' || exam.department === dept;
            const semMatch = semesters.includes(exam.semester);
            return deptMatch && semMatch && exam.examDate >= today;
        });
        const count = filtered.length;
        if (notifBadgeHeader) notifBadgeHeader.textContent = count > 0 ? count : '0';
    }

    // Listen for exam data updates to refresh badge
    window.addEventListener('examDataLoaded', function() {
        updateNotificationBadge();
    });

    // Also call when profile is saved
    window.updateNotificationBadge = updateNotificationBadge;

    // Expose functions globally
    window.userAuth = {
        loginWithGoogle,
        logoutUser,
        saveProfile,
        applyDefaultFilters,
        loadUserProfile,
        openProfileModal,
        closeProfileModalFn,
        generateUserNotifications,
        updateNotificationBadge
    };

    console.log('User Auth module loaded');
});