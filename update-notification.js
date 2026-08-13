// update-notification.js - New Update Notification System (English Version)

(function() {
    'use strict';

    // Current version (change this on every update)
    const CURRENT_VERSION = '1.2.1';
    // Update release date (YYYY-MM-DD format)
    const CURRENT_DATE = '2026-08-14';

    const STORAGE_KEY = 'examRoutineLastSeenVersion';

    // List of new features – using Font Awesome icons (no emojis)
    const UPDATE_FEATURES = [
        {
            icon: 'fa-calendar-alt',
            title: 'Interactive Calendar',
            description: 'Click on any date in the calendar to see which exams are scheduled. Department-wise color dots show exam distribution.'
        },
        {
            icon: 'fa-expand-arrows-alt',
            title: 'Larger Routine View',
            description: 'The routine list height has been increased, so you can see more exams at once without scrolling too much.'
        },
        {
            icon: 'fa-mobile-alt',
            title: 'Improved Mobile Experience',
            description: 'Responsive design has been further enhanced for mobile devices, making it easier to browse on the go.'
        },
        {
            icon: 'fa-bell',
            title: 'Smart Notifications',
            description: 'Set reminders for your exams and get timely notifications so you never miss an exam.'
        }
    ];

    // Check if the user has already seen this update
    function shouldShowUpdate() {
        const lastSeen = localStorage.getItem(STORAGE_KEY);
        return lastSeen !== CURRENT_VERSION;
    }

    // Mark the update as seen after showing
    function markUpdateAsSeen() {
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    }

    // Format date for display (e.g., "14 August 2026")
    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Show the update notification modal
    function showUpdateModal() {
        const modal = document.createElement('div');
        modal.className = 'update-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        const content = document.createElement('div');
        content.className = 'update-modal-content';
        content.style.cssText = `
            background: white;
            border-radius: 24px;
            max-width: 540px;
            width: 92%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 32px 30px 28px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.35);
            animation: slideUp 0.4s ease;
            position: relative;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'update-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 14px;
            right: 18px;
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #999;
            transition: 0.2s;
            line-height: 1;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#333';
        closeBtn.onmouseout = () => closeBtn.style.color = '#999';

        // Header with icon (no emoji)
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 18px;
        `;
        const formattedDate = formatDate(CURRENT_DATE);
        header.innerHTML = `
            <div style="font-size: 3rem; color: #4b6cb7; margin-bottom: 8px;">
                <i class="fas fa-rocket"></i>
            </div>
            <h2 style="margin: 0; color: #182848; font-size: 1.6rem; font-weight: 700;">
                New Update Available!
            </h2>
            <p style="margin: 6px 0 0; color: #888; font-size: 0.95rem;">
                <i class="fas fa-calendar-alt" style="margin-right: 6px;"></i>
                Released: ${formattedDate}
            </p>
        `;

        // Features list – using Font Awesome icons (no emojis)
        const featuresContainer = document.createElement('div');
        featuresContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin: 20px 0 28px;
        `;

        UPDATE_FEATURES.forEach((feature, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 14px 16px;
                background: #f8f9ff;
                border-radius: 14px;
                border-left: 4px solid #4b6cb7;
                transition: 0.2s;
                animation: slideIn 0.4s ease ${index * 0.1}s both;
            `;
            item.innerHTML = `
                <div style="font-size: 1.4rem; color: #4b6cb7; flex-shrink: 0; margin-top: 2px;">
                    <i class="fas ${feature.icon}"></i>
                </div>
                <div>
                    <div style="font-weight: 600; color: #182848; font-size: 1rem;">${feature.title}</div>
                    <div style="color: #666; font-size: 0.9rem; margin-top: 2px; line-height: 1.4;">${feature.description}</div>
                </div>
            `;
            featuresContainer.appendChild(item);
        });

        // Footer buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
            border-top: 2px solid #f0f0f0;
            padding-top: 20px;
            flex-wrap: wrap;
        `;

        const gotItBtn = document.createElement('button');
        gotItBtn.className = 'btn-update-gotit';
        gotItBtn.textContent = 'Got it, thanks!';
        gotItBtn.style.cssText = `
            padding: 12px 36px;
            background: linear-gradient(135deg, #4b6cb7, #182848);
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s;
            font-family: 'Poppins', sans-serif;
        `;
        gotItBtn.onmouseover = () => {
            gotItBtn.style.transform = 'scale(1.03)';
            gotItBtn.style.boxShadow = '0 6px 20px rgba(75,108,183,0.4)';
        };
        gotItBtn.onmouseout = () => {
            gotItBtn.style.transform = 'scale(1)';
            gotItBtn.style.boxShadow = 'none';
        };

        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn-update-skip';
        skipBtn.textContent = 'Skip';
        skipBtn.style.cssText = `
            padding: 12px 24px;
            background: transparent;
            color: #888;
            border: 2px solid #ddd;
            border-radius: 30px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: 0.3s;
            font-family: 'Poppins', sans-serif;
        `;
        skipBtn.onmouseover = () => {
            skipBtn.style.borderColor = '#999';
            skipBtn.style.color = '#555';
        };
        skipBtn.onmouseout = () => {
            skipBtn.style.borderColor = '#ddd';
            skipBtn.style.color = '#888';
        };

        footer.appendChild(gotItBtn);
        footer.appendChild(skipBtn);

        // Append all
        content.appendChild(closeBtn);
        content.appendChild(header);
        content.appendChild(featuresContainer);
        content.appendChild(footer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Event handlers
        function closeModal() {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                modal.remove();
                markUpdateAsSeen();
            }, 300);
        }

        closeBtn.addEventListener('click', closeModal);
        gotItBtn.addEventListener('click', closeModal);
        skipBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    // Check and show if needed
    function checkForUpdate() {
        if (shouldShowUpdate()) {
            setTimeout(() => {
                showUpdateModal();
            }, 600);
        }
    }

    // Expose global functions
    window.updateNotifier = {
        check: checkForUpdate,
        show: showUpdateModal,
        reset: () => {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        },
        getVersion: () => CURRENT_VERSION,
        getDate: () => CURRENT_DATE
    };

    // Auto-check when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForUpdate);
    } else {
        checkForUpdate();
    }

})();