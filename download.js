class RoutineDownloader {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        // Try to create button immediately
        this.tryCreateButton();
        
        // Also set up a retry mechanism
        setTimeout(() => this.tryCreateButton(), 1000);
        
        // Add event listeners for dynamic content
        this.setupEventListeners();
    }

    tryCreateButton() {
        if (this.isInitialized) return;
        
        // Check if required elements exist
        const routineHeader = document.querySelector('.routine-container h2');
        if (!routineHeader) {
            console.log('Routine header not found, retrying...');
            setTimeout(() => this.tryCreateButton(), 500);
            return;
        }

        // Check if button already exists
        if (document.getElementById('downloadRoutineBtn')) {
            this.isInitialized = true;
            return;
        }

        // Create download button container
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'routine-download-container';
        downloadContainer.innerHTML = `
            <button id="downloadRoutineBtn" class="btn-download-icon" title="Download Routine as JPG">
                <i class="fas fa-download"></i>
            </button>
        `;

        // Insert after the title
        routineHeader.parentNode.insertBefore(downloadContainer, routineHeader.nextSibling);
        this.isInitialized = true;
        
        console.log('Download button created successfully');
        
        // Add CSS styles if not already present
        this.addStyles();
    }

    addStyles() {
        // Check if styles already added
        if (document.querySelector('#downloadButtonStyles')) return;

        const style = document.createElement('style');
        style.id = 'downloadButtonStyles';
        style.textContent = `
            .routine-download-container {
                margin: 15px 0;
                text-align: right;
            }
            
            .btn-download-icon {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 12px 24px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
                font-family: 'Poppins', sans-serif;
            }
            
            .btn-download-icon:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            
            .btn-download-icon:active {
                transform: translateY(0);
            }
            
            .btn-download-icon i {
                font-size: 18px;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Handle download button click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#downloadRoutineBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.downloadRoutine();
            }
        });
    }

    async downloadRoutine() {
        try {
            // Get current filtered exams
            let examsToDownload = [];
            
            // Try to get from window object
            if (window.filteredExamRoutine && window.filteredExamRoutine.length > 0) {
                examsToDownload = window.filteredExamRoutine;
            } else if (window.examData && window.examData.length > 0) {
                examsToDownload = window.examData;
            } else {
                // If no window data, try to get from DOM
                examsToDownload = this.getExamsFromDOM();
            }
            
            if (examsToDownload.length === 0) {
                this.showNotification('No exams to download', 'error');
                return;
            }

            // Get filter information
            const selectedDept = document.getElementById('deptSelect')?.value || 'all';
            const selectedSemester = document.getElementById('semesterSelect')?.value || 'all';
            const dateFilter = document.getElementById('dateFilter')?.value || 'upcoming';
            const searchTerm = document.getElementById('searchInput')?.value || '';

            // Show loading notification
            this.showNotification('Generating routine image...', 'info');

            // Filter out completed exams before generating image
            const filteredExams = this.filterOutCompletedExams(examsToDownload);
            
            if (filteredExams.length === 0) {
                this.showNotification('No upcoming exams to download (Completed exams are excluded)', 'info');
                return;
            }

            await this.generateAndDownloadJPG(filteredExams, selectedDept, selectedSemester, dateFilter, searchTerm);
            
        } catch (error) {
            console.error('Error in download routine:', error);
            this.showNotification('Failed to download routine: ' + error.message, 'error');
        }
    }

    // Filter out completed exams
    filterOutCompletedExams(exams) {
        const currentDate = new Date().toISOString().split('T')[0];
        
        return exams.filter(exam => {
            try {
                const examDate = new Date(exam.examDate).toISOString().split('T')[0];
                // Keep only exams that are today or upcoming (not completed)
                return examDate >= currentDate;
            } catch (e) {
                // If date parsing fails, include the exam
                return true;
            }
        });
    }

    getExamsFromDOM() {
        const exams = [];
        const examElements = document.querySelectorAll('.routine-item');
        
        examElements.forEach(element => {
            // DOM থেকে examType সঠিকভাবে পড়ার জন্য
            let examType = 'Written'; // ডিফল্ট
            
            // ১. exam-type-badge ক্লাস থেকে পড়ার চেষ্টা করুন
            const typeBadge = element.querySelector('.exam-type-badge');
            if (typeBadge) {
                const badgeText = typeBadge.textContent.trim().toLowerCase();
                if (badgeText.includes('practical')) {
                    examType = 'Practical';
                }
            }
            
            // ২. data attribute থেকে পড়ার চেষ্টা করুন
            const examId = element.getAttribute('data-exam-id');
            if (examId && window.examData) {
                const originalExam = window.examData.find(e => e.id === examId);
                if (originalExam && originalExam.examType) {
                    examType = originalExam.examType === 'practical' ? 'Practical' : 'Written';
                }
            }
            
            // ৩. ক্লাস থেকে পড়ার চেষ্টা করুন
            if (element.classList.contains('type-practical') || 
                element.querySelector('.type-practical')) {
                examType = 'Practical';
            }
            
            // Format date properly
            let examDate = element.querySelector('.exam-date')?.textContent || '';
            // Try to parse date from text if needed
            if (examDate && window.dataFunctions) {
                try {
                    // Convert displayed date back to ISO format if possible
                    examDate = window.dataFunctions.parseDate(examDate) || examDate;
                } catch (e) {
                    // Keep original date
                }
            }

            // Check if exam is completed by looking at status-badge
            let isCompleted = false;
            const statusBadge = element.querySelector('.status-badge');
            if (statusBadge) {
                const statusText = statusBadge.textContent.trim().toLowerCase();
                if (statusText.includes('completed') || element.classList.contains('past')) {
                    isCompleted = true;
                }
            }

            const exam = {
                department: element.querySelector('.dept-badge')?.textContent || '',
                semester: element.querySelector('.semester-badge')?.textContent || '',
                subject: element.querySelector('.subject-name')?.textContent || '',
                examDate: examDate,
                time: element.querySelector('.exam-time')?.textContent || '',
                examType: examType,
                isCompleted: isCompleted
            };
            
            // If we have examId, store it for reference
            if (examId) {
                exam.id = examId;
            }
            
            exams.push(exam);
        });
        
        return exams;
    }

    async generateAndDownloadJPG(exams, selectedDept, selectedSemester, dateFilter, searchTerm) {
        try {
            // Create title based on filters
            let title = 'Explore Routine 2026';
            let subtitle = '';

            if (selectedDept !== 'all' && selectedSemester !== 'all') {
                subtitle = `${selectedDept} Department, ${selectedSemester} Semester`;
            } else if (selectedDept !== 'all') {
                subtitle = `${selectedDept} Department`;
            } else if (selectedSemester !== 'all') {
                subtitle = `${selectedSemester} Semester`;
            }

            if (dateFilter === 'upcoming') {
                subtitle += (subtitle ? ' - ' : '') + 'Upcoming Exam Only';
            } else if (dateFilter === 'past') {
                subtitle += (subtitle ? ' - ' : '') + 'Past Exam';
            } else if (dateFilter === 'practical') {
                subtitle += (subtitle ? ' - ' : '') + 'Practical Exams';
            } else if (dateFilter === 'written') {
                subtitle += (subtitle ? ' - ' : '') + 'Written Exams';
            }

            if (searchTerm) {
                subtitle += (subtitle ? ' - ' : '') + `Search: "${searchTerm}"`;
            }

            // if (!subtitle) {
            //     subtitle = 'All Exams';
            // } else {
            //     subtitle += ' (Completed exams excluded)';
            // }

            // Create the content for the image
            const content = this.createRoutineContent(exams, title, subtitle);
            
            // Generate and download JPG
            await this.downloadAsJPG(content, selectedDept, selectedSemester, dateFilter);

        } catch (error) {
            console.error('Error generating JPG:', error);
            throw error;
        }
    }

    createRoutineContent(exams, title, subtitle) {
        // Create table rows for exams
        let tableRows = '';
        
        const currentDate = new Date().toISOString().split('T')[0];
        
        exams.forEach((exam, index) => {
            let examDate = exam.examDate;
            // Try to format date if dataFunctions is available
            if (window.dataFunctions && typeof window.dataFunctions.formatDate === 'function') {
                try {
                    examDate = window.dataFunctions.formatDate(exam.examDate);
                } catch (e) {
                    // Use original date if formatting fails
                }
            }
            
            // Get exam type from exam object - সরাসরি examType ব্যবহার করুন
            const examType = exam.examType || 'Written';
            const typeDisplay = examType === 'practical' || examType === 'Practical' ? 'Practical' : 'Written';
            
            // Determine status - শুধু Upcoming এবং Today থাকবে
            let status = 'Upcoming';
            let statusColor = '#4CAF50';
            
            if (exam.examDate) {
                try {
                    const examDateObj = new Date(exam.examDate);
                    const currentDateObj = new Date(currentDate);
                    
                    if (examDateObj.toDateString() === currentDateObj.toDateString()) {
                        status = 'Today';
                        statusColor = '#FF9800';
                    }
                    // Completed exams already filtered out, so no need to check for that
                } catch (e) {
                    // Date parsing error, keep default
                }
            }

            tableRows += `
                <tr style="border-bottom: 1px solid #e0e0e0; background: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                    <td style="padding: 12px; text-align: center; font-size: 14px; font-weight: bold; color: #555;">${index + 1}</td>
                    <td style="padding: 12px; text-align: left; font-size: 14px; color: #333;">${exam.department}</td>
                    <td style="padding: 12px; text-align: center; font-size: 14px; color: #333;">${exam.semester}</td>
                    <td style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #2196F3;">${exam.subject}</td>
                    <td style="padding: 12px; text-align: center; font-size: 14px; color: #333;">${examDate}</td>
                    <td style="padding: 12px; text-align: center; font-size: 14px; color: #333;">${exam.time}</td>
                    <td style="padding: 12px; text-align: center; font-size: 14px; color: #333; font-weight: 500;">
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; background: ${typeDisplay === 'Practical' ? '#4CAF50' : '#2196F3'}; color: white; font-size: 12px;">
                            ${typeDisplay}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center; font-size: 14px; color: ${statusColor}; font-weight: 600;">
                        <span style="padding: 4px 8px; border-radius: 12px; background: ${statusColor}15;">${status}</span>
                    </td>
                </tr>
            `;
        });

        return {
            title,
            subtitle,
            tableRows,
            currentDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        };
    }

    async downloadAsJPG(content, selectedDept, selectedSemester, dateFilter) {
        return new Promise((resolve, reject) => {
            // Load html2canvas
            const script = document.createElement('script');
            script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
            script.onload = async () => {
                try {
                    // Create temporary div for rendering
                    const tempDiv = document.createElement('div');
                    tempDiv.id = 'downloadTempDiv';
                    tempDiv.style.cssText = `
                        position: fixed;
                        top: -10000px;
                        left: -10000px;
                        width: 1000px;
                        padding: 40px;
                        background: white;
                        color: #333;
                        border-radius: 20px;
                        font-family: 'Poppins', sans-serif;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                        box-sizing: border-box;
                    `;

                    tempDiv.innerHTML = this.generateHTMLForCanvas(content);

                    document.body.appendChild(tempDiv);

                    // Use html2canvas to capture the div
                    const canvas = await html2canvas(tempDiv, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false,
                        useCORS: true,
                        allowTaint: true,
                    });

                    // Convert to JPG
                    const imageData = canvas.toDataURL('image/jpeg', 0.95);

                    // Create download link
                    const link = document.createElement('a');
                    link.download = this.generateFileName(selectedDept, selectedSemester, dateFilter);
                    link.href = imageData;
                    
                    // Trigger download
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Clean up
                    document.body.removeChild(tempDiv);
                    document.head.removeChild(script);

                    this.showNotification('Routine downloaded successfully as JPG! (Completed exams excluded)', 'success');
                    resolve();
                    
                } catch (error) {
                    console.error('Error in html2canvas:', error);
                    document.head.removeChild(script);
                    reject(error);
                }
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load html2canvas'));
            };
            
            document.head.appendChild(script);
        });
    }

    generateHTMLForCanvas(content) {
        return `
            <div style="width: 100%; max-width: 1000px; margin: 0 auto; box-sizing: border-box;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #667eea;">
                    <h1 style="font-size: 32px; margin: 0 0 10px 0; color: #333; font-weight: 700;">
                        ${content.title}
                    </h1>
                    <h2 style="font-size: 20px; margin: 0; color: #666; font-weight: 500;">${content.subtitle}</h2>
                </div>
                <!-- Table -->
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; border: 2px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">#</th>
                                <th style="padding: 15px; text-align: left; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Department</th>
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Semester</th>
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Subject</th>
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Date</th>
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Time</th>
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Type</th>
                                <th style="padding: 15px; text-align: center; font-size: 15px; font-weight: 600;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${content.tableRows}
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div style="margin-top: 60px; padding-top: 25px; border-top: 2px solid #eee; text-align: center; color: #777; font-size: 14px;">
                    <div>Download from exploreex.vercel.app</div>
                    <div style="margin-top: 10px; color: #999; font-size: 11px;">
                        Generated on ${content.currentDate}
                    </div>
                </div>
            </div>
        `;
    }

    generateFileName(selectedDept, selectedSemester, dateFilter) {
        let fileName = 'Exam_Routine_Upcoming_';
        
        if (selectedDept !== 'all') {
            fileName += selectedDept.replace(/\s+/g, '_') + '_';
        }
        
        if (selectedSemester !== 'all') {
            fileName += selectedSemester.replace(/\s+/g, '_') + '_';
        }
        
        if (dateFilter !== 'upcoming') {
            fileName += dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1) + '_';
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        fileName += timestamp + '.jpg';
        
        return fileName;
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
                color: white;
                border-radius: 8px;
                z-index: 10000;
                font-family: 'Poppins', sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }
    }
}

// Initialize downloader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing RoutineDownloader...');
    
    // Initialize immediately
    window.routineDownloader = new RoutineDownloader();
    
    // Also try again after a delay when everything is loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.routineDownloader && !window.routineDownloader.isInitialized) {
                window.routineDownloader.tryCreateButton();
            }
        }, 2000);
    });
});

// Export for use in other files
window.RoutineDownloader = RoutineDownloader;