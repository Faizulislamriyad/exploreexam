// chatbot.js - Smart Exam Assistant without Emojis

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // Initialize chatbot
    initChatbot();

    // Event listeners
    chatbotToggle.addEventListener('click', toggleChatbot);
    closeChatbot.addEventListener('click', toggleChatbot);
    sendMessage.addEventListener('click', handleChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatMessage();
    });

    // Initialize with welcome message
    addBotMessage("Hello! I'm your exam assistant. You can ask me about exam dates, subjects, departments, or semesters. I can help you find specific exams or give you an overview of the schedule.");

    // Functions
    function initChatbot() {
        // Clear any existing messages except the first bot message
        const existingMessages = chatbotMessages.querySelectorAll('.message');
        if (existingMessages.length > 1) {
            for (let i = 1; i < existingMessages.length; i++) {
                existingMessages[i].remove();
            }
        }
    }

    function toggleChatbot() {
        chatbotContainer.classList.toggle('open');
        
        if (chatbotContainer.classList.contains('open')) {
            setTimeout(() => {
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }, 100);
        }
    }

    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);
        
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);
        
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    async function handleChatMessage() {
        const message = chatInput.value.trim();
        
        if (message === '') return;
        
        // Add user message
        addUserMessage(message);
        chatInput.value = '';
        
        // Process after delay
        setTimeout(async () => {
            await processChatMessage(message);
        }, 500);
    }

    async function processChatMessage(message) {
        const lowerMessage = message.toLowerCase();
        let response = '';

        try {
            // Get current exam data
            const examData = window.examData || [];
            
            // Check for greetings
            if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
                lowerMessage.includes('hey') || lowerMessage.includes('good morning') ||
                lowerMessage.includes('good afternoon') || lowerMessage.includes('good evening')) {
                response = "Hello! How can I help you with exam information today?";
            } 
            else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
                response = "You're welcome! Let me know if you need more assistance.";
            }
            else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
                response = "I can help you with:<br><br>" +
                          "1. Find specific exam dates (e.g., 'When is the Physics exam?')<br>" +
                          "2. Check department schedules (e.g., 'Computer department exams')<br>" +
                          "3. See semester-wise exams (e.g., '1st semester exams')<br>" +
                          "4. View today's exams (e.g., 'Exams today?')<br>" +
                          "5. Get next exam info (e.g., 'Next exam?')<br>" +
                          "6. List all exams (e.g., 'Show all exams')<br>" +
                          "7. Search exams by room (e.g., 'Exams in Room 101')<br>" +
                          "8. Find exams by date range (e.g., 'Exams next week')";
            }
            else if (lowerMessage.includes('date') || lowerMessage.includes('when') || 
                     (lowerMessage.includes('exam') && !lowerMessage.includes('exams'))) {
                response = await handleExamDateQuery(lowerMessage, examData);
            }
            else if (lowerMessage.includes('department') || lowerMessage.includes('dept') || 
                     lowerMessage.includes('computer') || lowerMessage.includes('civil') || 
                     lowerMessage.includes('electrical') || lowerMessage.includes('power') ||
                     lowerMessage.includes('mechanical') || lowerMessage.includes('electronics')) {
                response = await handleDepartmentQuery(lowerMessage, examData);
            }
            else if (lowerMessage.includes('semester') || lowerMessage.includes('1st') || 
                     lowerMessage.includes('2nd') || lowerMessage.includes('3rd') || 
                     lowerMessage.includes('4th') || lowerMessage.includes('5th') || 
                     lowerMessage.includes('6th') || lowerMessage.includes('7th') ||
                     lowerMessage.includes('8th')) {
                response = await handleSemesterQuery(lowerMessage, examData);
            }
            else if (lowerMessage.includes('today') || lowerMessage.includes('now') ||
                     lowerMessage.includes('this day')) {
                response = await handleTodayQuery(examData);
            }
            else if (lowerMessage.includes('next') || lowerMessage.includes('upcoming') ||
                     lowerMessage.includes('coming')) {
                response = await handleNextExamQuery(examData);
            }
            else if (lowerMessage.includes('all') && lowerMessage.includes('exam')) {
                response = await handleAllExamsQuery(examData);
            }
            else if (lowerMessage.includes('room') || lowerMessage.includes('hall') ||
                     lowerMessage.includes('lab')) {
                response = await handleRoomQuery(lowerMessage, examData);
            }
            else if (lowerMessage.includes('week') || lowerMessage.includes('month') ||
                     lowerMessage.includes('tomorrow') || lowerMessage.includes('monday') ||
                     lowerMessage.includes('tuesday') || lowerMessage.includes('wednesday') ||
                     lowerMessage.includes('thursday') || lowerMessage.includes('friday') ||
                     lowerMessage.includes('saturday') || lowerMessage.includes('sunday')) {
                response = await handleDateRangeQuery(lowerMessage, examData);
            }
            else if (lowerMessage.includes('add') || lowerMessage.includes('create') ||
                     lowerMessage.includes('new exam')) {
                response = "To add a new exam, please use the Admin Panel. Click the admin button at the bottom left and login with admin credentials.";
            }
            else if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
                response = "To delete exams, please use the Admin Panel. Only admins can modify exam data.";
            }
            else if (lowerMessage.includes('admin') || lowerMessage.includes('login')) {
                response = "Admin features are available through the Admin Panel (bottom left button). You need admin credentials to access it.";
            }
            else if (lowerMessage.includes('subject') || lowerMessage.includes('course')) {
                response = await handleSubjectListQuery(examData);
            }
            else {
                // Try fuzzy search
                response = await handleGeneralSearch(lowerMessage, examData);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            response = "Sorry, I encountered an error while processing your request. Please try again.";
        }

        addBotMessage(response);
    }

    // Query handlers
    async function handleExamDateQuery(message, examData) {
        // Try to extract subject from message
        let foundSubject = '';
        
        // Get all subjects from exam data
        const subjects = examData.map(exam => exam.subject.toLowerCase());
        
        // Find the most likely subject in the message
        for (const subject of subjects) {
            // Check if subject is in message
            if (message.includes(subject.toLowerCase())) {
                foundSubject = subject;
                break;
            }
            
            // Try partial match for longer subject names
            const subjectWords = subject.toLowerCase().split(' ');
            for (const word of subjectWords) {
                if (word.length > 3 && message.includes(word)) {
                    foundSubject = subject;
                    break;
                }
            }
            if (foundSubject) break;
        }
        
        if (!foundSubject) {
            return "I couldn't identify the subject from your query. Please specify which subject you're looking for. Examples:<br><br>" +
                   "• 'When is the Physics exam?'<br>" +
                   "• 'What is the date for Mathematics exam?'<br>" +
                   "• 'Programming exam date'";
        }
        
        // Filter exams by subject
        const matchingExams = examData.filter(exam => 
            exam.subject.toLowerCase().includes(foundSubject.toLowerCase())
        );
        
        if (matchingExams.length === 0) {
            return `No exams found for "${foundSubject}". This subject hasn't been added to the exam schedule yet.`;
        }
        
        // Sort by date
        matchingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        
        let response = `Exam Information for ${foundSubject}:<br><br>`;
        
        matchingExams.forEach((exam, index) => {
            const examDate = new Date(exam.examDate);
            const formattedDate = examDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const daysLeft = window.dataFunctions ? 
                window.dataFunctions.getDayDifference(currentDate, exam.examDate) : 0;
            
            let status = '';
            if (exam.examDate < currentDate) {
                status = 'Completed';
            } else if (exam.examDate === currentDate) {
                status = 'Today';
            } else {
                status = `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
            }
            
            response += `${index + 1}. ${exam.department} - ${exam.semester} Semester<br>`;
            response += `   Date: ${formattedDate}<br>`;
            response += `   Time: ${exam.time}<br>`;
            response += `   Room: ${exam.room}<br>`;
            response += `   Status: ${status}<br><br>`;
        });
        
        return response;
    }

    async function handleDepartmentQuery(message, examData) {
        const departments = ['Computer', 'Civil', 'Electrical', 'Power', 'Mechanical', 'Electronics'];
        let foundDept = '';
        
        for (const dept of departments) {
            if (message.includes(dept.toLowerCase())) {
                foundDept = dept;
                break;
            }
        }
        
        if (!foundDept) {
            return "Please specify which department you're interested in. Available departments might include: Computer, Civil, Electrical, Power, etc. You can also ask 'Which departments have exams?'";
        }
        
        const deptExams = examData.filter(exam => 
            exam.department.toLowerCase().includes(foundDept.toLowerCase())
        );
        
        if (deptExams.length === 0) {
            return `No exams found for ${foundDept} department. Exams for this department haven't been scheduled yet.`;
        }
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const upcoming = deptExams.filter(exam => exam.examDate >= currentDate);
        const completed = deptExams.filter(exam => exam.examDate < currentDate);
        
        let response = `${foundDept} Department Exam Schedule:<br>`;
        response += `Total Exams: ${deptExams.length} (Upcoming: ${upcoming.length}, Completed: ${completed.length})<br><br>`;
        
        // Group by semester
        const semesters = [...new Set(deptExams.map(exam => exam.semester))].sort();
        
        semesters.forEach(semester => {
            const semesterExams = deptExams.filter(exam => exam.semester === semester);
            const upcomingInSemester = semesterExams.filter(exam => exam.examDate >= currentDate);
            
            response += `${semester} Semester (${semesterExams.length} exams):<br>`;
            
            if (upcomingInSemester.length > 0) {
                const nextInSemester = upcomingInSemester.sort((a, b) => new Date(a.examDate) - new Date(b.examDate))[0];
                const daysLeft = window.dataFunctions ? 
                    window.dataFunctions.getDayDifference(currentDate, nextInSemester.examDate) : 0;
                
                response += `   Next exam: ${nextInSemester.subject} on ${window.dataFunctions.formatDate(nextInSemester.examDate)} `;
                response += `(${daysLeft} day${daysLeft !== 1 ? 's' : ''} from now)<br>`;
            } else {
                response += `   All exams completed for this semester<br>`;
            }
            response += `<br>`;
        });
        
        return response;
    }

    async function handleSemesterQuery(message, examData) {
        const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
        let foundSemester = '';
        
        for (const semester of semesters) {
            if (message.includes(semester.toLowerCase())) {
                foundSemester = semester;
                break;
            }
        }
        
        if (!foundSemester) {
            return "Please specify which semester (1st, 2nd, 3rd, 4th, 5th, 6th, 7th, or 8th)";
        }
        
        const semesterExams = examData.filter(exam => exam.semester === foundSemester);
        
        if (semesterExams.length === 0) {
            return `No exams found for ${foundSemester} semester. Exams for this semester haven't been scheduled yet.`;
        }
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const upcoming = semesterExams.filter(exam => exam.examDate >= currentDate);
        const completed = semesterExams.filter(exam => exam.examDate < currentDate);
        
        let response = `${foundSemester} Semester Exam Schedule:<br>`;
        response += `Total Exams: ${semesterExams.length} (Upcoming: ${upcoming.length}, Completed: ${completed.length})<br><br>`;
        
        if (upcoming.length > 0) {
            response += `Upcoming Exams:<br>`;
            upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
                   .slice(0, 8)
                   .forEach(exam => {
                const daysLeft = window.dataFunctions ? 
                    window.dataFunctions.getDayDifference(currentDate, exam.examDate) : 0;
                response += `• ${exam.subject} (${exam.department})<br>`;
                response += `  Date: ${window.dataFunctions.formatDate(exam.examDate)}<br>`;
                response += `  Time: ${exam.time} | Room: ${exam.room}<br>`;
                response += `  Days left: ${daysLeft}<br><br>`;
            });
        }
        
        return response;
    }

    async function handleTodayQuery(examData) {
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const todayExams = examData.filter(exam => exam.examDate === currentDate);
        
        if (todayExams.length === 0) {
            return "No exams scheduled for today. You can relax or prepare for upcoming exams.";
        }
        
        let response = `Today's Exams (${todayExams.length}):<br><br>`;
        
        todayExams.forEach((exam, index) => {
            response += `${index + 1}. ${exam.subject}<br>`;
            response += `   Department: ${exam.department} - ${exam.semester} Semester<br>`;
            response += `   Time: ${exam.time}<br>`;
            response += `   Room: ${exam.room}<br><br>`;
        });
        
        return response;
    }

    async function handleNextExamQuery(examData) {
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const upcomingExams = examData.filter(exam => exam.examDate >= currentDate);
        
        if (upcomingExams.length === 0) {
            return "No upcoming exams scheduled. All exams have been completed or none have been added yet.";
        }
        
        upcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        const nextExam = upcomingExams[0];
        const daysLeft = window.dataFunctions ? 
            window.dataFunctions.getDayDifference(currentDate, nextExam.examDate) : 0;
        
        let response = `Next Scheduled Exam:<br><br>`;
        response += `Subject: ${nextExam.subject}<br>`;
        response += `Department: ${nextExam.department} - ${nextExam.semester} Semester<br>`;
        response += `Date: ${window.dataFunctions.formatDate(nextExam.examDate)}<br>`;
        response += `Time: ${nextExam.time}<br>`;
        response += `Room: ${nextExam.room}<br>`;
        response += `Days until exam: ${daysLeft} day${daysLeft !== 1 ? 's' : ''}<br><br>`;
        
        // Show next 3 exams after the immediate next one
        if (upcomingExams.length > 1) {
            response += `Following Exams:<br>`;
            for (let i = 1; i < Math.min(4, upcomingExams.length); i++) {
                const exam = upcomingExams[i];
                const days = window.dataFunctions.getDayDifference(currentDate, exam.examDate);
                response += `${i}. ${exam.subject} (${exam.department}) - ${window.dataFunctions.formatDate(exam.examDate)} (in ${days} days)<br>`;
            }
        }
        
        return response;
    }

    async function handleAllExamsQuery(examData) {
        if (examData.length === 0) {
            return "No exams have been added to the schedule yet. Please check back later or contact the admin.";
        }
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const upcoming = examData.filter(exam => exam.examDate >= currentDate).length;
        const completed = examData.filter(exam => exam.examDate < currentDate).length;
        
        let response = `Complete Exam Schedule Overview:<br>`;
        response += `Total Exams: ${examData.length}<br>`;
        response += `Upcoming: ${upcoming}<br>`;
        response += `Completed: ${completed}<br><br>`;
        
        // Group by department
        const departments = [...new Set(examData.map(exam => exam.department))].sort();
        
        departments.forEach(dept => {
            const deptExams = examData.filter(exam => exam.department === dept);
            const deptUpcoming = deptExams.filter(exam => exam.examDate >= currentDate);
            
            response += `${dept} Department: ${deptExams.length} exams (${deptUpcoming.length} upcoming)<br>`;
        });
        
        response += `<br>Use more specific queries to get detailed information about particular departments, semesters, or subjects.`;
        
        return response;
    }

    async function handleRoomQuery(message, examData) {
        // Extract room number from message
        let roomNumber = '';
        const roomMatch = message.match(/(room|hall|lab)\s*(\d+)/i);
        
        if (roomMatch && roomMatch[2]) {
            roomNumber = roomMatch[2];
        } else {
            // Try to find any number in the message
            const numberMatch = message.match(/\d+/);
            if (numberMatch) {
                roomNumber = numberMatch[0];
            }
        }
        
        if (!roomNumber) {
            return "Please specify which room you're looking for. Example: 'Exams in Room 101' or 'What exams are in Lab 301?'";
        }
        
        const roomExams = examData.filter(exam => 
            exam.room.toLowerCase().includes(roomNumber.toLowerCase())
        );
        
        if (roomExams.length === 0) {
            return `No exams found for Room ${roomNumber}. This room might not be scheduled for any exams yet.`;
        }
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const upcoming = roomExams.filter(exam => exam.examDate >= currentDate);
        const completed = roomExams.filter(exam => exam.examDate < currentDate);
        
        let response = `Exams in Room ${roomNumber}:<br>`;
        response += `Total: ${roomExams.length} (Upcoming: ${upcoming.length}, Completed: ${completed.length})<br><br>`;
        
        if (upcoming.length > 0) {
            response += `Upcoming Exams:<br>`;
            upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
                   .forEach((exam, index) => {
                const daysLeft = window.dataFunctions.getDayDifference(currentDate, exam.examDate);
                response += `${index + 1}. ${exam.subject}<br>`;
                response += `   Department: ${exam.department} - ${exam.semester}<br>`;
                response += `   Date: ${window.dataFunctions.formatDate(exam.examDate)}<br>`;
                response += `   Time: ${exam.time}<br>`;
                response += `   Days left: ${daysLeft}<br><br>`;
            });
        }
        
        return response;
    }

    async function handleDateRangeQuery(message, examData) {
        const currentDate = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        if (message.includes('tomorrow')) {
            startDate.setDate(currentDate.getDate() + 1);
            endDate.setDate(currentDate.getDate() + 1);
        } else if (message.includes('next week')) {
            startDate.setDate(currentDate.getDate() + 1);
            endDate.setDate(currentDate.getDate() + 7);
        } else if (message.includes('this week')) {
            // Get start of week (Sunday)
            const day = currentDate.getDay();
            startDate.setDate(currentDate.getDate() - day);
            endDate.setDate(startDate.getDate() + 6);
        } else if (message.includes('next month')) {
            startDate.setMonth(currentDate.getMonth() + 1, 1);
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        } else {
            // Check for specific days
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            for (let i = 0; i < days.length; i++) {
                if (message.includes(days[i])) {
                    const targetDay = i;
                    const todayDay = currentDate.getDay();
                    let daysToAdd = targetDay - todayDay;
                    if (daysToAdd <= 0) daysToAdd += 7;
                    startDate.setDate(currentDate.getDate() + daysToAdd);
                    endDate.setDate(startDate.getDate());
                    break;
                }
            }
        }
        
        // Format dates for comparison
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const rangeExams = examData.filter(exam => {
            const examDate = exam.examDate;
            return examDate >= startDateStr && examDate <= endDateStr;
        });
        
        if (rangeExams.length === 0) {
            if (startDateStr === endDateStr) {
                const dateFormatted = window.dataFunctions.formatDate(startDateStr);
                return `No exams scheduled for ${dateFormatted}.`;
            } else {
                const startFormatted = window.dataFunctions.formatDate(startDateStr);
                const endFormatted = window.dataFunctions.formatDate(endDateStr);
                return `No exams scheduled between ${startFormatted} and ${endFormatted}.`;
            }
        }
        
        rangeExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        
        let response = '';
        if (startDateStr === endDateStr) {
            const dateFormatted = window.dataFunctions.formatDate(startDateStr);
            response = `Exams on ${dateFormatted} (${rangeExams.length}):<br><br>`;
        } else {
            const startFormatted = window.dataFunctions.formatDate(startDateStr);
            const endFormatted = window.dataFunctions.formatDate(endDateStr);
            response = `Exams between ${startFormatted} and ${endFormatted} (${rangeExams.length}):<br><br>`;
        }
        
        rangeExams.forEach((exam, index) => {
            response += `${index + 1}. ${exam.subject}<br>`;
            response += `   Department: ${exam.department} - ${exam.semester}<br>`;
            response += `   Date: ${window.dataFunctions.formatDate(exam.examDate)}<br>`;
            response += `   Time: ${exam.time} | Room: ${exam.room}<br><br>`;
        });
        
        return response;
    }

    async function handleSubjectListQuery(examData) {
        if (examData.length === 0) {
            return "No subjects available. No exams have been added to the schedule yet.";
        }
        
        const subjects = window.dataFunctions ? 
            window.dataFunctions.getAllSubjectsFromExams(examData) : 
            [...new Set(examData.map(exam => exam.subject))].sort();
        
        if (subjects.length === 0) {
            return "No subjects found in the exam schedule.";
        }
        
        let response = `Available Subjects (${subjects.length}):<br><br>`;
        
        // Group subjects by first letter
        const groupedSubjects = {};
        subjects.forEach(subject => {
            const firstLetter = subject.charAt(0).toUpperCase();
            if (!groupedSubjects[firstLetter]) {
                groupedSubjects[firstLetter] = [];
            }
            groupedSubjects[firstLetter].push(subject);
        });
        
        // Sort letters alphabetically
        const letters = Object.keys(groupedSubjects).sort();
        
        letters.forEach(letter => {
            response += `<strong>${letter}</strong><br>`;
            groupedSubjects[letter].forEach(subject => {
                response += `• ${subject}<br>`;
            });
            response += `<br>`;
        });
        
        response += `You can ask about any of these subjects. Example: "When is ${subjects[0]} exam?"`;
        
        return response;
    }

    async function handleGeneralSearch(message, examData) {
        // Try to find any matches in the data
        const searchResults = examData.filter(exam => {
            const searchString = `${exam.subject} ${exam.department} ${exam.semester} ${exam.room} ${exam.time}`.toLowerCase();
            return searchString.includes(message) || 
                   exam.subject.toLowerCase().includes(message) ||
                   exam.department.toLowerCase().includes(message);
        });
        
        if (searchResults.length === 0) {
            return "I couldn't find any information matching your query. Here are some ways you can ask for information:<br><br>" +
                   "• 'When is [subject] exam?'<br>" +
                   "• '[Department] department exams'<br>" +
                   "• '[Semester] semester schedule'<br>" +
                   "• 'Exams today'<br>" +
                   "• 'Next exam'<br>" +
                   "• 'Exams in Room [number]'<br>" +
                   "• 'Exams next week'<br>" +
                   "• 'List all subjects'";
        }
        
        searchResults.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        
        let response = `I found ${searchResults.length} exam${searchResults.length !== 1 ? 's' : ''} related to your query:<br><br>`;
        
        searchResults.slice(0, 5).forEach((exam, index) => {
            const daysLeft = window.dataFunctions.getDayDifference(currentDate, exam.examDate);
            let status = exam.examDate < currentDate ? 'Completed' : 
                        exam.examDate === currentDate ? 'Today' : `In ${daysLeft} days`;
            
            response += `${index + 1}. ${exam.subject}<br>`;
            response += `   ${exam.department} - ${exam.semester}<br>`;
            response += `   Date: ${window.dataFunctions.formatDate(exam.examDate)}<br>`;
            response += `   Time: ${exam.time} | Room: ${exam.room}<br>`;
            response += `   Status: ${status}<br><br>`;
        });
        
        if (searchResults.length > 5) {
            response += `... and ${searchResults.length - 5} more. Please be more specific to see all results.`;
        }
        
        return response;
    }

    // Export functions
    window.addBotMessage = addBotMessage;
});