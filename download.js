class RoutineDownloader {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        this.tryCreateButton();
        setTimeout(() => this.tryCreateButton(), 1000);
        this.setupEventListeners();
    }

    tryCreateButton() {
        if (this.isInitialized) return;
        
        const routineHeader = document.querySelector('.routine-container h2');
        if (!routineHeader) {
            setTimeout(() => this.tryCreateButton(), 500);
            return;
        }

        if (document.getElementById('downloadRoutineBtn')) {
            this.isInitialized = true;
            return;
        }

        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'routine-download-container';
        downloadContainer.innerHTML = `
            <button id="downloadRoutineBtn" class="btn-download-icon" title="Download Routine as JPG">
                <i class="fas fa-download"></i>
            </button>
        `;

        routineHeader.parentNode.insertBefore(downloadContainer, routineHeader.nextSibling);
        this.isInitialized = true;
        this.addStyles();
    }

    addStyles() {
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
            let examsToDownload = [];
            
            if (window.filteredExamRoutine && window.filteredExamRoutine.length > 0) {
                examsToDownload = window.filteredExamRoutine;
            } else if (window.examData && window.examData.length > 0) {
                examsToDownload = window.examData;
            } else {
                examsToDownload = this.getExamsFromDOM();
            }
            
            if (examsToDownload.length === 0) {
                this.showNotification('No exams to download', 'error');
                return;
            }

            const selectedDept = document.getElementById('deptSelect')?.value || 'all';
            const selectedSemester = document.getElementById('semesterSelect')?.value || 'all';
            const dateFilter = document.getElementById('dateFilter')?.value || 'upcoming';
            const searchTerm = document.getElementById('searchInput')?.value || '';

            this.showNotification('Generating routine image...', 'info');

            // Keep only upcoming exams
            const filteredExams = this.filterOutCompletedExams(examsToDownload);
            
            if (filteredExams.length === 0) {
                this.showNotification('No upcoming exams to download', 'info');
                return;
            }

            await this.generateAndDownloadJPG(filteredExams, selectedDept, selectedSemester, dateFilter, searchTerm);
            
        } catch (error) {
            console.error('Error in download routine:', error);
            this.showNotification('Failed to download routine: ' + error.message, 'error');
        }
    }

    filterOutCompletedExams(exams) {
        const currentDate = new Date().toISOString().split('T')[0];
        return exams.filter(exam => {
            try {
                const examDate = new Date(exam.examDate).toISOString().split('T')[0];
                return examDate >= currentDate;
            } catch (e) {
                return true;
            }
        });
    }

    getExamsFromDOM() {
        const exams = [];
        const examElements = document.querySelectorAll('.routine-item');
        
        examElements.forEach(element => {
            let examType = 'Written';
            const typeBadge = element.querySelector('.exam-type-badge');
            if (typeBadge) {
                const badgeText = typeBadge.textContent.trim().toLowerCase();
                if (badgeText.includes('practical')) {
                    examType = 'Practical';
                }
            }
            
            const examId = element.getAttribute('data-exam-id');
            if (examId && window.examData) {
                const originalExam = window.examData.find(e => e.id === examId);
                if (originalExam && originalExam.examType) {
                    examType = originalExam.examType === 'practical' ? 'Practical' : 'Written';
                }
            }
            
            if (element.classList.contains('type-practical') || 
                element.querySelector('.type-practical')) {
                examType = 'Practical';
            }
            
            let examDate = element.querySelector('.exam-date')?.textContent || '';
            if (examDate && window.dataFunctions) {
                try {
                    examDate = window.dataFunctions.parseDate(examDate) || examDate;
                } catch (e) {}
            }

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
            
            if (examId) {
                exam.id = examId;
            }
            
            exams.push(exam);
        });
        
        return exams;
    }

    async generateAndDownloadJPG(exams, selectedDept, selectedSemester, dateFilter, searchTerm) {
        try {
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

            const content = this.createRoutineContent(exams, title, subtitle);
            await this.downloadAsJPG(content, selectedDept, selectedSemester, dateFilter);

        } catch (error) {
            console.error('Error generating JPG:', error);
            throw error;
        }
    }

    createRoutineContent(exams, title, subtitle) {
        let tableRows = '';
        const currentDate = new Date().toISOString().split('T')[0];
        
        exams.forEach((exam, index) => {
            let examDate = exam.examDate;
            if (window.dataFunctions && typeof window.dataFunctions.formatDate === 'function') {
                try {
                    examDate = window.dataFunctions.formatDate(exam.examDate);
                } catch (e) {}
            }
            
            const examType = exam.examType || 'Written';
            const typeDisplay = examType === 'practical' || examType === 'Practical' ? 'Practical' : 'Written';
            
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
                } catch (e) {}
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
            const script = document.createElement('script');
            script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
            script.onload = async () => {
                try {
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

                    const canvas = await html2canvas(tempDiv, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false,
                        useCORS: true,
                        allowTaint: true,
                    });

                    const imageData = canvas.toDataURL('image/jpeg', 0.95);
                    const link = document.createElement('a');
                    link.download = this.generateFileName(selectedDept, selectedSemester, dateFilter);
                    link.href = imageData;
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    document.body.removeChild(tempDiv);
                    document.head.removeChild(script);

                    this.showNotification('Routine downloaded successfully as JPG!', 'success');
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
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #667eea;">
                    <h1 style="font-size: 32px; margin: 0 0 10px 0; color: #333; font-weight: 700;">
                        ${content.title}
                    </h1>
                    <h2 style="font-size: 20px; margin: 0; color: #666; font-weight: 500;">${content.subtitle}</h2>
                </div>
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
        if (selectedDept !== 'all') fileName += selectedDept.replace(/\s+/g, '_') + '_';
        if (selectedSemester !== 'all') fileName += selectedSemester.replace(/\s+/g, '_') + '_';
        if (dateFilter !== 'upcoming') fileName += dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1) + '_';
        const timestamp = new Date().toISOString().split('T')[0];
        fileName += timestamp + '.jpg';
        return fileName;
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) window.showNotification(message, type);
        else {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
                color: white; border-radius: 8px; z-index: 10000;
                font-family: 'Poppins', sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-20px)';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }
}

// Initialize downloader
document.addEventListener('DOMContentLoaded', () => {
    window.routineDownloader = new RoutineDownloader();
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.routineDownloader && !window.routineDownloader.isInitialized) {
                window.routineDownloader.tryCreateButton();
            }
        }, 2000);
    });
});

window.RoutineDownloader = RoutineDownloader;

// =====================================================
// ✅ PDF Download – Clean, only upcoming, date sorted
// =====================================================

class PDFDownloader {
    constructor() {
        this.jsPDFLoaded = false;
    }

    async ensureJSPDF() {
        if (this.jsPDFLoaded) return true;
        return new Promise((resolve, reject) => {
            if (typeof jspdf !== 'undefined') {
                this.jsPDFLoaded = true;
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => { this.jsPDFLoaded = true; resolve(true); };
            script.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.head.appendChild(script);
        });
    }

    // Filter only upcoming exams
    filterUpcoming(exams) {
        const today = new Date().toISOString().split('T')[0];
        return exams.filter(exam => exam.examDate && exam.examDate >= today);
    }

    // Sort by date
    sortByDate(exams) {
        return exams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    }

    async downloadAsPDF(filename, exams, title = 'Exam Routine', subtitle = '') {
        try {
            // Only keep upcoming exams and sort by date
            let upcomingExams = this.filterUpcoming(exams);
            upcomingExams = this.sortByDate(upcomingExams);
            
            if (upcomingExams.length === 0) {
                if (window.showNotification) window.showNotification('No upcoming exams to download', 'error');
                return false;
            }

            await this.ensureJSPDF();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Helper: format date as dd/mm/yyyy
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateStr;
            };

            // ----- HEADER -----
            let y = 20;
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('EXAM ROUTINE', pageWidth / 2, 25, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(title, pageWidth / 2, 35, { align: 'center' });

            y = 50;

            // Subtitle
            if (subtitle) {
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(12);
                doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
                y += 10;
            }

            // Generation info (centered)
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateStr = `${day}/${month}/${year}`;
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const genText = `Generated: ${dateStr} at ${timeStr}  |  Total: ${upcomingExams.length} exams`;

            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(genText, pageWidth / 2, y, { align: 'center' });
            y += 15;

            // ----- TABLE HEADER -----
            doc.setFillColor(240, 240, 240);
            doc.rect(10, y, pageWidth - 20, 10, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');

            const columns = ['#', 'Department', 'Semester', 'Subject', 'Date', 'Time', 'Type', 'Status'];
            const colWidths = [10, 30, 20, 50, 25, 20, 20, 20];
            let x = 10;
            columns.forEach((col, idx) => {
                doc.text(col, x + colWidths[idx] / 2, y + 6, { align: 'center' });
                x += colWidths[idx];
            });
            y += 10;

            // ----- TABLE ROWS -----
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            const currentDate = new Date().toISOString().split('T')[0];

            upcomingExams.forEach((exam, index) => {
                // New page if needed
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                    // Re-draw header
                    doc.setFillColor(240, 240, 240);
                    doc.rect(10, y, pageWidth - 20, 10, 'F');
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    let hx = 10;
                    columns.forEach((col, idx) => {
                        doc.text(col, hx + colWidths[idx] / 2, y + 6, { align: 'center' });
                        hx += colWidths[idx];
                    });
                    y += 10;
                }

                // Row background
                if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(10, y, pageWidth - 20, 8, 'F');
                }

                let colX = 10;

                // # (Serial)
                doc.setTextColor(100, 100, 100);
                doc.text((index + 1).toString(), colX + colWidths[0] / 2, y + 5, { align: 'center' });
                colX += colWidths[0];

                // Department
                doc.setTextColor(0, 0, 0);
                const deptText = exam.department.length > 12 ? exam.department.substring(0, 10) + '..' : exam.department;
                doc.text(deptText, colX + 2, y + 5);
                colX += colWidths[1];

                // Semester
                doc.text(exam.semester, colX + colWidths[2] / 2, y + 5, { align: 'center' });
                colX += colWidths[2];

                // Subject
                const subjText = exam.subject.length > 20 ? exam.subject.substring(0, 18) + '..' : exam.subject;
                doc.text(subjText, colX + 2, y + 5);
                colX += colWidths[3];

                // Date (dd/mm/yyyy)
                const formattedDate = formatDate(exam.examDate);
                doc.text(formattedDate, colX + colWidths[4] / 2, y + 5, { align: 'center' });
                colX += colWidths[4];

                // Time
                doc.text(exam.time, colX + colWidths[5] / 2, y + 5, { align: 'center' });
                colX += colWidths[5];

                // Type (plain text)
                const typeDisplay = (exam.examType === 'practical' || exam.examType === 'Practical') ? 'Practical' : 'Written';
                // Use setTextColor with individual R,G,B values
                const typeColor = typeDisplay === 'Practical' ? [76, 175, 80] : [33, 150, 243];
                doc.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
                doc.text(typeDisplay, colX + colWidths[6] / 2, y + 5, { align: 'center' });
                colX += colWidths[6];

                // Status (plain text)
                let status = 'Upcoming';
                let statusColor = [76, 175, 80];
                if (exam.examDate === currentDate) {
                    status = 'Today';
                    statusColor = [255, 152, 0];
                }
                doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
                doc.text(status, colX + colWidths[7] / 2, y + 5, { align: 'center' });

                // Row border
                doc.setDrawColor(220, 220, 220);
                doc.line(10, y + 8, pageWidth - 10, y + 8);

                y += 8;
            });

            // ----- FOOTER -----
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Download from exploreex.vercel.app', pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text('© 2026 Explore Routine', pageWidth / 2, pageHeight - 5, { align: 'center' });

            doc.save(filename);
            return true;

        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    generateFileName(prefix, exams, selectedDept, selectedSemester) {
        let fileName = prefix;
        if (selectedDept && selectedDept !== 'all') fileName += '_' + selectedDept.replace(/\s+/g, '_');
        if (selectedSemester && selectedSemester !== 'all') fileName += '_' + selectedSemester.replace(/\s+/g, '_');
        const count = exams.length;
        fileName += `_${count}_exams`;
        const timestamp = new Date().toISOString().split('T')[0];
        fileName += '_' + timestamp + '.pdf';
        return fileName;
    }
}

// --- Global functions (all filter to upcoming only) ---

window.downloadSubjectExams = async function(subject, exams) {
    try {
        const downloader = new PDFDownloader();
        const subtitle = `Subject: ${subject}`;
        const filename = `Exam_Routine_${subject.replace(/\s+/g, '_')}.pdf`;
        await downloader.downloadAsPDF(filename, exams, 'Subject Exam Schedule', subtitle);
        if (window.showNotification) window.showNotification(`Downloaded ${subject} exams as PDF`, 'success');
    } catch (error) {
        console.error('Error downloading subject exams:', error);
        if (window.showNotification) window.showNotification('Failed to download PDF', 'error');
    }
};

window.downloadDepartmentRoutine = async function(department, semester, exams) {
    try {
        const downloader = new PDFDownloader();
        const subtitle = `${department} Department, ${semester} Semester`;
        const filename = downloader.generateFileName(`${department}_${semester}_Routine`, exams);
        await downloader.downloadAsPDF(filename, exams, 'Department Routine', subtitle);
        if (window.showNotification) window.showNotification(`Downloaded ${department} department routine as PDF`, 'success');
    } catch (error) {
        console.error('Error downloading department routine:', error);
        if (window.showNotification) window.showNotification('Failed to download PDF', 'error');
    }
};

window.downloadDepartmentExams = async function(department, exams) {
    try {
        const downloader = new PDFDownloader();
        const subtitle = `${department} Department`;
        const filename = downloader.generateFileName(`${department}_Exams`, exams);
        await downloader.downloadAsPDF(filename, exams, 'Department Exam Schedule', subtitle);
        if (window.showNotification) window.showNotification(`Downloaded ${department} department exams as PDF`, 'success');
    } catch (error) {
        console.error('Error downloading department exams:', error);
        if (window.showNotification) window.showNotification('Failed to download PDF', 'error');
    }
};

window.downloadAllExams = async function(exams) {
    try {
        const downloader = new PDFDownloader();
        const filename = 'Complete_Exam_Routine.pdf';
        await downloader.downloadAsPDF(filename, exams, 'Complete Exam Routine', 'All Upcoming Exams');
        if (window.showNotification) window.showNotification('Downloaded complete exam routine as PDF', 'success');
    } catch (error) {
        console.error('Error downloading all exams:', error);
        if (window.showNotification) window.showNotification('Failed to download PDF', 'error');
    }
};

// Initialize PDF downloader
document.addEventListener('DOMContentLoaded', () => {
    window.pdfDownloader = new PDFDownloader();
    console.log('PDF Download functions ready');
});

window.PDFDownloader = PDFDownloader;
