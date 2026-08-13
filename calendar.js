// calendar.js - Fully Functional with Click to Show Exam Details

(function() {
    'use strict';

    // State
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    let examData = [];
    let daysContainer = null;
    let monthYearDisplay = null;

    // Department color mapping (matching style.css)
    const DEPT_COLORS = {
        'computer': '#3498db',
        'civil': '#2ecc71',
        'electrical': '#3498db',
        'power': '#f39c12',
        'mechanical': '#9b59b6',
        'electronics': '#1abc9c',
        'electro-medical': '#e67e22',
        'tourism': '#1dbdc6'
    };

    // DOM refs
    const daysEl = document.getElementById('calendarDays');
    const monthYearEl = document.getElementById('calendarMonthYear');
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');

    // Normalize date to YYYY-MM-DD
    function normalizeDate(dateStr) {
        if (!dateStr) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        let parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
        parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
        return dateStr;
    }

    function getDeptColor(dept) {
        if (!dept) return '#6c757d';
        const key = dept.toLowerCase();
        return DEPT_COLORS[key] || '#6c757d';
    }

    // Render calendar
    function renderCalendar(exams) {
        if (!daysContainer || !monthYearDisplay) return;

        if (exams) examData = exams;

        const monthNames = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
        monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        // Group exams by normalized date
        const examsByDate = {};
        examData.forEach(exam => {
            if (!exam.examDate) return;
            const normDate = normalizeDate(exam.examDate);
            if (!normDate) return;
            if (!examsByDate[normDate]) examsByDate[normDate] = [];
            examsByDate[normDate].push(exam);
        });

        let html = '';

        // Empty cells
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(currentYear, currentMonth, day);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateKey = `${year}-${month}-${dayStr}`;

            const examsOnDate = examsByDate[dateKey] || [];
            const hasExam = examsOnDate.length > 0;
            const isToday = (day === todayDate && currentMonth === todayMonth && currentYear === todayYear);

            let classes = 'calendar-day';
            if (hasExam) classes += ' has-exam';
            if (isToday) classes += ' today';

            // Build department dots
            let deptIndicators = '';
            let tooltipText = '';
            if (hasExam) {
                const depts = [...new Set(examsOnDate.map(e => e.department))];
                const subjects = examsOnDate.map(e => e.subject).join(', ');
                tooltipText = subjects;

                const maxDots = 3;
                const showDepts = depts.slice(0, maxDots);
                const extra = depts.length > maxDots ? `+${depts.length - maxDots}` : '';
                deptIndicators = showDepts.map(dept => {
                    const color = getDeptColor(dept);
                    return `<span class="dept-dot" style="background:${color};" title="${dept}"></span>`;
                }).join('');
                if (extra) {
                    deptIndicators += `<span class="dept-dot extra">${extra}</span>`;
                }
            }

            // Data attribute to store exams JSON for click
            const examsDataAttr = encodeURIComponent(JSON.stringify(examsOnDate));

            html += `
                <div class="${classes}" data-date="${dateKey}" data-exams="${examsDataAttr}" title="${tooltipText}">
                    <span class="day-number">${day}</span>
                    ${deptIndicators ? `<div class="dept-indicators">${deptIndicators}</div>` : ''}
                    ${isToday ? '<span class="today-label">Today</span>' : ''}
                </div>
            `;
        }

        daysContainer.innerHTML = html;

        // Attach click events to each day with exams
        daysContainer.querySelectorAll('.calendar-day.has-exam').forEach(el => {
            el.addEventListener('click', function(e) {
                const examsData = this.dataset.exams;
                if (!examsData) return;
                try {
                    const exams = JSON.parse(decodeURIComponent(examsData));
                    showDayDetails(exams);
                } catch (err) {
                    console.error('Error parsing exam data', err);
                }
            });
        });
    }

    // Show a small modal/popup with exam details for a date
    function showDayDetails(exams) {
        if (!exams || exams.length === 0) return;

        // Create a floating popup
        const overlay = document.createElement('div');
        overlay.className = 'day-details-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            backdrop-filter: blur(4px);
            animation: fadeIn 0.2s ease;
        `;

        const popup = document.createElement('div');
        popup.className = 'day-details-popup';
        popup.style.cssText = `
            background: white;
            border-radius: 16px;
            max-width: 420px;
            width: 90%;
            padding: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideUp 0.25s ease;
            max-height: 80vh;
            overflow-y: auto;
        `;

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; color:#182848; font-size:1.2rem;">
                    <i class="fas fa-calendar-day" style="color:#4b6cb7;"></i> 
                    ${exams[0].examDate ? window.dataFunctions?.formatDateShort(exams[0].examDate) || exams[0].examDate : 'Date'}
                </h3>
                <button class="close-popup-btn" style="background:none; border:none; font-size:1.6rem; cursor:pointer; color:#999;">&times;</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
        `;

        exams.forEach((exam, idx) => {
            const type = exam.examType || 'written';
            const typeLabel = type === 'practical' ? 'Practical' : type === 'referred' ? 'Referred' : 'Written';
            const groupInfo = (type === 'practical' && exam.group) ? `Group: ${exam.group}` : '';
            const deptColor = getDeptColor(exam.department);

            html += `
                <div style="background: #f8f9ff; border-radius:12px; padding:12px 16px; border-left: 4px solid ${deptColor};">
                    <div style="font-weight:600; color:#182848; font-size:1rem;">${exam.subject}</div>
                    <div style="font-size:0.85rem; color:#555; display:flex; flex-wrap:wrap; gap:10px; margin-top:4px;">
                        <span><span style="font-weight:500;">Dept:</span> ${exam.department}</span>
                        <span><span style="font-weight:500;">Sem:</span> ${exam.semester}</span>
                        ${groupInfo ? `<span><span style="font-weight:500;">Group:</span> ${exam.group}</span>` : ''}
                        <span><span style="font-weight:500;">Time:</span> ${exam.time}</span>
                        <span class="exam-type-badge type-${type}" style="font-size:0.7rem; padding:2px 10px; border-radius:12px; background:${type === 'practical' ? '#4CAF50' : type === 'referred' ? '#e74c3c' : '#2196F3'}; color:white;">${typeLabel}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        popup.innerHTML = html;
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Close events
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });
        popup.querySelector('.close-popup-btn').addEventListener('click', () => overlay.remove());
    }

    // Change month
    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar(examData);
    }

    // Public update function
    function updateCalendar(exams) {
        if (exams !== undefined) examData = exams;
        renderCalendar(examData);
    }

    function goToToday() {
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        renderCalendar(examData);
    }

    // Init
    function init() {
        daysContainer = daysEl;
        monthYearDisplay = monthYearEl;

        if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

        if (window.examData && window.examData.length > 0) {
            updateCalendar(window.examData);
        } else if (window.filteredExamRoutine && window.filteredExamRoutine.length > 0) {
            updateCalendar(window.filteredExamRoutine);
        } else {
            renderCalendar([]);
        }
    }

    // Expose
    window.calendar = {
        init: init,
        update: updateCalendar,
        goToToday: goToToday
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
    } else {
        setTimeout(init, 200);
    }

    document.addEventListener('examDataUpdated', function(e) {
        if (e.detail && e.detail.exams) updateCalendar(e.detail.exams);
        else if (window.examData) updateCalendar(window.examData);
    });

})();