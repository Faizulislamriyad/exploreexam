// notification.js - Persistent Notification Manager for Students + User-Specific Notifications
// Updated with user profile integration for personalized exam notifications

const NOTIF_STORAGE_KEY = 'studentNotifications';
let activeNotificationTimeouts = [];

// Helper: convert 12‑hour time to 24‑hour
function convertTimeTo24Hour(time12) {
    if (!time12) return '10:00';
    if (time12.includes(':') && !time12.includes(' ')) {
        const parts = time12.split(':');
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (parseInt(parts[0]) >= 0 && parseInt(parts[0]) <= 23) return time12;
        }
    }
    const [time, modifier] = time12.split(' ');
    if (!time || !modifier) return '10:00';
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
}

// Helper: calculate time X minutes before exam (returns 12-hour format)
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

// ----- Storage -----
function getStoredNotifications() {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch(e) {
        return [];
    }
}

function saveStoredNotifications(notifications) {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
    updateNotificationBadge();
    const modal = document.getElementById('notificationsModal');
    if (modal && modal.style.display === 'flex') {
        renderScheduledNotificationsList();
    }
}

// ----- Scheduling & Cancelling -----
function scheduleSingleNotification(notification) {
    const now = new Date();
    const targetTime = new Date(notification.notificationTime);
    const delay = targetTime - now;
    
    if (delay <= 0) {
        removeNotificationById(notification.id);
        return;
    }
    
    const timeoutId = setTimeout(() => {
        if (Notification.permission === 'granted') {
            const title = notification.minutesBefore === 0
                ? `📚 ${notification.examSubject} exam is starting now!`
                : `📚 ${notification.examSubject} exam in ${notification.minutesBefore} minutes`;
            new Notification(title, {
                body: notification.examDetails,
                icon: '/favicon.ico',
                requireInteraction: true,
                tag: `student-exam-${notification.examId}`
            });
        } else {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    const title = notification.minutesBefore === 0
                        ? `📚 ${notification.examSubject} exam is starting now!`
                        : `📚 ${notification.examSubject} exam in ${notification.minutesBefore} minutes`;
                    new Notification(title, {
                        body: notification.examDetails,
                        icon: '/favicon.ico',
                        requireInteraction: true,
                        tag: `student-exam-${notification.examId}`
                    });
                }
            });
        }
        removeNotificationById(notification.id);
    }, delay);
    
    activeNotificationTimeouts.push({ id: notification.id, timeoutId });
}

function removeNotificationById(notificationId) {
    let notifications = getStoredNotifications();
    const newNotifications = notifications.filter(n => n.id !== notificationId);
    if (newNotifications.length !== notifications.length) {
        saveStoredNotifications(newNotifications);
        const idx = activeNotificationTimeouts.findIndex(t => t.id === notificationId);
        if (idx !== -1) {
            clearTimeout(activeNotificationTimeouts[idx].timeoutId);
            activeNotificationTimeouts.splice(idx, 1);
        }
    }
}

function addNotification(notification) {
    const notifications = getStoredNotifications();
    const exists = notifications.some(n => n.examId === notification.examId && n.minutesBefore === notification.minutesBefore);
    if (!exists) {
        notifications.push(notification);
        saveStoredNotifications(notifications);
        scheduleSingleNotification(notification);
        return true;
    } else {
        if (window.showNotification) window.showNotification('You already have a notification set for this exam with the same timing', 'info');
        return false;
    }
}

// Reschedule all notifications from localStorage
function rescheduleAllNotifications() {
    activeNotificationTimeouts.forEach(t => clearTimeout(t.timeoutId));
    activeNotificationTimeouts = [];
    
    const notifications = getStoredNotifications();
    const now = new Date();
    const validNotifications = notifications.filter(n => new Date(n.notificationTime) > now);
    if (validNotifications.length !== notifications.length) {
        saveStoredNotifications(validNotifications);
    }
    validNotifications.forEach(notif => scheduleSingleNotification(notif));
}

// ----- Public API -----
function scheduleStudentNotification(exam, minutesBefore) {
    if (!("Notification" in window)) {
        if (window.showNotification) window.showNotification('This browser does not support notifications', 'error');
        return;
    }
    
    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                scheduleStudentNotification(exam, minutesBefore);
            } else {
                if (window.showNotification) window.showNotification('Please allow notifications to set reminders', 'error');
            }
        });
        return;
    }
    
    const examDateTime = new Date(`${exam.examDate}T${convertTimeTo24Hour(exam.time)}`);
    const notificationTime = new Date(examDateTime.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();
    
    if (notificationTime <= now) {
        if (window.showNotification) window.showNotification('Cannot set notification in the past', 'error');
        return;
    }
    
    const notification = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 8),
        examId: exam.id,
        examSubject: exam.subject,
        examDetails: `${exam.department} - ${exam.semester}\nTime: ${exam.time}\nType: ${exam.examType || 'Written'}`,
        notificationTime: notificationTime.toISOString(),
        minutesBefore: minutesBefore,
        scheduledAt: now.toISOString(),
        examDate: exam.examDate,
        examTime: exam.time
    };
    
    const added = addNotification(notification);
    if (added) {
        const timingText = minutesBefore === 0 ? 'at exam time' : `${minutesBefore} minutes before`;
        const formattedTime = notificationTime.toLocaleString();
        if (window.showNotification) {
            window.showNotification(`✅ Notification scheduled! You will be reminded ${timingText} (at ${formattedTime})`, 'success');
        }
    }
}

function clearAllNotifications() {
    if (confirm('Clear ALL scheduled notifications?')) {
        const notifications = getStoredNotifications();
        notifications.forEach(n => removeNotificationById(n.id));
        renderScheduledNotificationsList();
        if (window.showNotification) window.showNotification('All notifications cleared', 'success');
    }
}

// ----- Update Notification Badge (Header & Floating) -----
function updateNotificationBadge() {
    // Count upcoming exams for the logged-in user (if any)
    const user = window.firebase?.auth?.currentUser;
    let count = 0;
    if (user && window.userProfile) {
        const dept = window.userProfile.department;
        const semesters = [];
        if (window.userProfile.semester && window.userProfile.semester !== 'all') semesters.push(window.userProfile.semester);
        if (window.userProfile.referredSemesters) semesters.push(...window.userProfile.referredSemesters);
        if (semesters.length > 0 && window.examData) {
            const today = new Date().toISOString().split('T')[0];
            const exams = window.examData.filter(exam => {
                const deptMatch = dept === 'all' || exam.department === dept;
                const semMatch = semesters.includes(exam.semester);
                return deptMatch && semMatch && exam.examDate >= today;
            });
            count = exams.length;
        }
    }
    // Update header badge
    const headerBadge = document.getElementById('notifBadgeHeader');
    if (headerBadge) {
        headerBadge.textContent = count > 0 ? count : '0';
        headerBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    // Update floating badge (same as student notifications count)
    const studentNotifs = getStoredNotifications();
    const floatingBadge = document.getElementById('notifBadge');
    if (floatingBadge) {
        const total = studentNotifs.length;
        floatingBadge.textContent = total > 0 ? total : '0';
        floatingBadge.style.display = total > 0 ? 'inline-block' : 'none';
    }
}

// ----- Generate User Notifications (for preview modal) -----
function generateUserNotifications() {
    const user = window.firebase?.auth?.currentUser;
    if (!user) {
        return '<p>Please login to see your personalized notifications.</p>';
    }
    const dept = window.userProfile.department;
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

    // Filter by department and semesters
    const filtered = exams.filter(exam => {
        const deptMatch = dept === 'all' || exam.department === dept;
        const semMatch = semesters.includes(exam.semester);
        return deptMatch && semMatch;
    });

    // Sort by date
    const sorted = filtered.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

    // Get upcoming exams (today or future)
    const today = new Date().toISOString().split('T')[0];
    const upcoming = sorted.filter(exam => exam.examDate >= today);

    if (upcoming.length === 0) {
        return `<p>No upcoming exams for your department (${dept}) and semesters (${semesters.join(', ')}).</p>`;
    }

    // Build notification messages
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

// ----- Render the list inside the "My Scheduled Notifications" modal -----
function renderScheduledNotificationsList() {
    const container = document.getElementById('scheduledNotificationsList');
    if (!container) return;
    
    const notifications = getStoredNotifications();
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No scheduled notifications</p></div>';
        return;
    }
    
    notifications.sort((a,b) => new Date(a.notificationTime) - new Date(b.notificationTime));
    
    container.innerHTML = notifications.map(notif => {
        const notifDate = new Date(notif.notificationTime);
        const formattedTime = notifDate.toLocaleString();
        const timingText = notif.minutesBefore === 0 ? 'At exam time' : `${notif.minutesBefore} min before`;
        return `
            <div class="notification-item" data-id="${notif.id}">
                <div class="notif-info">
                    <strong>${escapeHtml(notif.examSubject)}</strong><br>
                    <small>${escapeHtml(notif.examDetails.split('\n')[0])}</small><br>
                    <small>⏰ ${escapeHtml(formattedTime)} (${escapeHtml(timingText)})</small>
                </div>
                <button class="btn-cancel-notif" data-id="${notif.id}">
                    <i class="fas fa-trash"></i> Cancel
                </button>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-cancel-notif').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Cancel this notification?')) {
                removeNotificationById(id);
                renderScheduledNotificationsList();
                if (window.showNotification) window.showNotification('Notification cancelled', 'info');
            }
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ----- Open modal with enhanced inline styling for options -----
function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderScheduledNotificationsList();
    
    const closeBtn = modal.querySelector('.close-notif-modal');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    
    const clearAllBtn = document.getElementById('clearAllNotifBtn');
    if (clearAllBtn) clearAllBtn.onclick = clearAllNotifications;
}

// ----- The actual notification options modal (for setting a reminder) -----
function showNotificationOptionsModal(exam) {
    const modal = document.createElement('div');
    modal.className = 'notification-options-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.3s ease;
    `;

    const content = document.createElement('div');
    content.className = 'notification-options-content';
    content.style.cssText = `
        background: white;
        border-radius: 24px;
        max-width: 520px;
        width: 92%;
        padding: 30px 32px 32px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        max-height: 90vh;
        overflow-y: auto;
        font-family: 'Poppins', sans-serif;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 16px;
        margin-bottom: 22px;
    `;
    header.innerHTML = `
        <h3 style="margin:0; font-size:1.3rem; color:#2d3436; display:flex; align-items:center; gap:10px;">
            <i class="fas fa-bell" style="color:#f39c12;"></i> Set Notification for ${exam.subject}
        </h3>
        <button class="btn-close-notify-options" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:#999; transition:0.2s;">&times;</button>
    `;

    const body = document.createElement('div');
    body.style.cssText = 'margin-bottom: 22px;';
    body.innerHTML = `
        <p style="margin-bottom:18px; color:#555; font-weight:500;">Get reminded before your exam:</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;" class="notification-buttons">
            <button class="btn-notify-option" data-minutes="0" style="
                background:#f8f9fa; border:2px solid #e9ecef; border-radius:14px; padding:14px 10px; 
                cursor:pointer; transition:all 0.2s ease; display:flex; flex-direction:column; align-items:center; 
                text-align:center; gap:4px; color:#2d3436; font-weight:500; font-family:inherit;
            ">
                <i class="fas fa-clock" style="font-size:1.6rem; color:#6c5ce7; margin-bottom:4px;"></i>
                <span style="font-size:0.95rem;">At exam time</span>
                <small style="font-size:0.75rem; color:#888; font-weight:400;">${exam.time}</small>
            </button>
            <button class="btn-notify-option" data-minutes="15" style="
                background:#f8f9fa; border:2px solid #e9ecef; border-radius:14px; padding:14px 10px; 
                cursor:pointer; transition:all 0.2s ease; display:flex; flex-direction:column; align-items:center; 
                text-align:center; gap:4px; color:#2d3436; font-weight:500; font-family:inherit;
            ">
                <i class="fas fa-hourglass-start" style="font-size:1.6rem; color:#6c5ce7; margin-bottom:4px;"></i>
                <span style="font-size:0.95rem;">15 min before</span>
                <small style="font-size:0.75rem; color:#888; font-weight:400;">${calculateTimeBefore(exam.time, 15)}</small>
            </button>
            <button class="btn-notify-option" data-minutes="30" style="
                background:#f8f9fa; border:2px solid #e9ecef; border-radius:14px; padding:14px 10px; 
                cursor:pointer; transition:all 0.2s ease; display:flex; flex-direction:column; align-items:center; 
                text-align:center; gap:4px; color:#2d3436; font-weight:500; font-family:inherit;
            ">
                <i class="fas fa-hourglass-half" style="font-size:1.6rem; color:#6c5ce7; margin-bottom:4px;"></i>
                <span style="font-size:0.95rem;">30 min before</span>
                <small style="font-size:0.75rem; color:#888; font-weight:400;">${calculateTimeBefore(exam.time, 30)}</small>
            </button>
            <button class="btn-notify-option" data-minutes="60" style="
                background:#f8f9fa; border:2px solid #e9ecef; border-radius:14px; padding:14px 10px; 
                cursor:pointer; transition:all 0.2s ease; display:flex; flex-direction:column; align-items:center; 
                text-align:center; gap:4px; color:#2d3436; font-weight:500; font-family:inherit;
            ">
                <i class="fas fa-hourglass-end" style="font-size:1.6rem; color:#6c5ce7; margin-bottom:4px;"></i>
                <span style="font-size:0.95rem;">1 hour before</span>
                <small style="font-size:0.75rem; color:#888; font-weight:400;">${calculateTimeBefore(exam.time, 60)}</small>
            </button>
        </div>
        <div style="background:#f0f4ff; border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px; font-size:0.9rem; color:#2d3436;">
            <i class="fas fa-info-circle" style="color:#6c5ce7; font-size:1.2rem;"></i>
            <span>Notifications will appear on your device at the selected time.</span>
        </div>
    `;

    const footer = document.createElement('div');
    footer.style.cssText = `
        display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;
        border-top: 1px solid #eee; padding-top: 20px;
    `;
    footer.innerHTML = `
        <button class="btn-test-notification-now" style="
            padding:10px 24px; border:none; border-radius:30px; font-weight:500; cursor:pointer; 
            transition:0.2s; font-size:0.9rem; background:#00b894; color:white;
        ">Test Notification Now</button>
        <button class="btn-cancel-notify" style="
            padding:10px 24px; border:none; border-radius:30px; font-weight:500; cursor:pointer; 
            transition:0.2s; font-size:0.9rem; background:#dfe6e9; color:#2d3436;
        ">Cancel</button>
    `;

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // ---- Event Listeners ----
    const closeBtn = content.querySelector('.btn-close-notify-options');
    closeBtn.addEventListener('click', () => modal.remove());
    const cancelBtn = content.querySelector('.btn-cancel-notify');
    cancelBtn.addEventListener('click', () => modal.remove());

    const testBtn = content.querySelector('.btn-test-notification-now');
    testBtn.addEventListener('click', () => {
        sendTestNotificationNow(exam);
    });

    content.querySelectorAll('.btn-notify-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const minutes = parseInt(this.dataset.minutes);
            scheduleStudentNotification(exam, minutes);
            modal.remove();
        });
        // hover effect
        btn.addEventListener('mouseenter', function() {
            this.style.background = '#6c5ce7';
            this.style.borderColor = '#6c5ce7';
            this.style.color = 'white';
            this.style.transform = 'translateY(-3px)';
            this.style.boxShadow = '0 6px 20px rgba(108,92,231,0.3)';
            const icon = this.querySelector('i');
            if (icon) icon.style.color = 'white';
            const small = this.querySelector('small');
            if (small) small.style.color = 'rgba(255,255,255,0.8)';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.background = '#f8f9fa';
            this.style.borderColor = '#e9ecef';
            this.style.color = '#2d3436';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
            const icon = this.querySelector('i');
            if (icon) icon.style.color = '#6c5ce7';
            const small = this.querySelector('small');
            if (small) small.style.color = '#888';
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Override the showNotificationOptions function in script.js
window.showNotificationOptionsModal = showNotificationOptionsModal;

// ----- Send test notification -----
function sendTestNotificationNow(exam) {
    if (Notification.permission === 'granted') {
        new Notification("📚 Test Notification", {
            body: `Test for ${exam.subject} exam.\nIf you see this, notifications are working!`,
            icon: '/favicon.ico',
            requireInteraction: true,
            tag: 'test-notification'
        });
        if (window.showNotification) window.showNotification('Test notification sent!', 'success');
    } else {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                new Notification("📚 Test Notification", {
                    body: `Test for ${exam.subject} exam.\nIf you see this, notifications are working!`,
                    icon: '/favicon.ico',
                    requireInteraction: true,
                    tag: 'test-notification'
                });
                if (window.showNotification) window.showNotification('Test notification sent!', 'success');
            } else {
                if (window.showNotification) window.showNotification('Cannot send test: permission denied', 'error');
            }
        });
    }
}

// ----- Initialization with enhanced styles -----
function initNotificationSystem() {
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            // don't ask yet
        } else if (Notification.permission === "granted") {
            console.log("Notification permission already granted");
        }
    }
    rescheduleAllNotifications();
    updateNotificationBadge();
    
    const notifBtn = document.getElementById('myNotificationsBtn');
    if (notifBtn) notifBtn.addEventListener('click', openNotificationsModal);
    
    // Listen for exam data loaded to update badge
    window.addEventListener('examDataLoaded', function() {
        updateNotificationBadge();
    });

    // Listen for profile updates (from user-auth.js)
    window.addEventListener('profileUpdated', function() {
        updateNotificationBadge();
    });

    // Inject comprehensive CSS styles for both modals
    if (!document.querySelector('#notifStyles')) {
        const style = document.createElement('style');
        style.id = 'notifStyles';
        style.textContent = `
            /* Notification item in the list */
            .notification-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #eee;
                background: #f9f9f9;
                margin-bottom: 8px;
                border-radius: 8px;
                transition: background 0.2s;
            }
            .notification-item:hover {
                background: #f1f1f1;
            }
            .notification-item .notif-info {
                flex: 1;
                font-size: 0.9rem;
                line-height: 1.5;
            }
            .notification-item .notif-info strong {
                font-size: 1rem;
                color: #2d3436;
            }
            .btn-cancel-notif {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 6px 14px;
                border-radius: 20px;
                cursor: pointer;
                transition: 0.2s;
                font-size: 0.8rem;
            }
            .btn-cancel-notif:hover {
                background: #ff4757;
                transform: scale(1.05);
            }
            
            /* Modal styles */
            .modal-content {
                max-width: 500px;
                width: 90%;
            }
            .modal-header h3 i {
                margin-right: 8px;
            }
            .empty-state {
                text-align: center;
                padding: 30px 0;
                color: #888;
            }
            .empty-state i {
                font-size: 2.5rem;
                display: block;
                margin-bottom: 12px;
                color: #ccc;
            }
            
            /* Notification options modal (the one that appears when setting a reminder) */
            .notification-options-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s ease;
            }
            .notification-options-content {
                background: white;
                border-radius: 24px;
                max-width: 520px;
                width: 92%;
                padding: 30px 32px 32px;
                box-shadow: 0 25px 80px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
                max-height: 90vh;
                overflow-y: auto;
                font-family: 'Poppins', sans-serif;
            }
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 16px;
                margin-bottom: 22px;
            }
            .notification-header h3 {
                margin: 0;
                font-size: 1.3rem;
                color: #2d3436;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-header h3 i {
                color: #f39c12;
            }
            .btn-close-notify-options {
                background: none;
                border: none;
                font-size: 1.8rem;
                cursor: pointer;
                color: #999;
                transition: 0.2s;
                line-height: 1;
            }
            .btn-close-notify-options:hover {
                color: #333;
                transform: rotate(90deg);
            }
            
            .notification-body p {
                margin-bottom: 18px;
                color: #555;
                font-weight: 500;
            }
            
            .notification-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 20px;
            }
            .btn-notify-option {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 14px;
                padding: 14px 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 4px;
                color: #2d3436;
                font-weight: 500;
                font-family: inherit;
            }
            .btn-notify-option i {
                font-size: 1.6rem;
                color: #6c5ce7;
                margin-bottom: 4px;
            }
            .btn-notify-option span {
                font-size: 0.95rem;
            }
            .btn-notify-option small {
                font-size: 0.75rem;
                color: #888;
                font-weight: 400;
            }
            .btn-notify-option:hover {
                background: #6c5ce7;
                border-color: #6c5ce7;
                color: white;
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(108,92,231,0.3);
            }
            .btn-notify-option:hover i {
                color: white;
            }
            .btn-notify-option:hover small {
                color: rgba(255,255,255,0.8);
            }
            
            .notification-info {
                background: #f0f4ff;
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.9rem;
                color: #2d3436;
            }
            .notification-info i {
                color: #6c5ce7;
                font-size: 1.2rem;
            }
            
            .notification-footer {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                justify-content: flex-end;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            .btn-test-notification-now,
            .btn-cancel-notify {
                padding: 10px 24px;
                border: none;
                border-radius: 30px;
                font-weight: 500;
                cursor: pointer;
                transition: 0.2s;
                font-size: 0.9rem;
            }
            .btn-test-notification-now {
                background: #00b894;
                color: white;
            }
            .btn-test-notification-now:hover {
                background: #00a381;
                transform: scale(1.02);
            }
            .btn-cancel-notify {
                background: #dfe6e9;
                color: #2d3436;
            }
            .btn-cancel-notify:hover {
                background: #b2bec3;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Responsive */
            @media (max-width: 500px) {
                .notification-buttons {
                    grid-template-columns: 1fr 1fr;
                }
                .notification-options-content {
                    padding: 20px;
                }
                .notification-footer {
                    flex-direction: column;
                }
                .btn-test-notification-now,
                .btn-cancel-notify {
                    width: 100%;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Override the showNotificationOptions function in script.js
    if (window.showNotificationOptions && typeof window.showNotificationOptions === 'function') {
        const original = window.showNotificationOptions;
        window.showNotificationOptions = function(exam) {
            showNotificationOptionsModal(exam);
        };
    } else {
        window.showNotificationOptions = showNotificationOptionsModal;
    }
}

// Export to window
window.NotificationManager = {
    scheduleStudentNotification,
    initNotificationSystem,
    rescheduleAllNotifications,
    calculateTimeBefore,
    convertTimeTo24Hour,
    sendTestNotificationNow,
    clearAllNotifications,
    showNotificationOptionsModal,
    updateNotificationBadge,
    generateUserNotifications,
    openNotificationsModal
};

// Automatically init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationSystem);
} else {
    initNotificationSystem();
}