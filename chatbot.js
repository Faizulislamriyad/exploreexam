// chatbot.js - Smart Exam Assistant without Emojis

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // Variables to track context
    let chatContext = {
        lastDepartment: '',
        lastSemester: '',
        lastDateFilter: 'upcoming'
    };

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
        
        // Remove notification badge if exists
        const badge = chatbotToggle.querySelector('.notification-badge');
        if (badge) {
            badge.remove();
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
            
            // SMART CONTEXTUAL UNDERSTANDING
            // Check for combined queries
            const combinedResult = await handleCombinedQuery(lowerMessage, examData);
            if (combinedResult) {
                response = combinedResult;
            }
            else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
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
            else if (lowerMessage.includes('subject') || lowerMessage.includes('course')) {
                response = await handleSubjectListQuery(examData);
            }
            else {
                // Try general search with better context
                response = await handleGeneralSearch(lowerMessage, examData);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            response = "Sorry, I encountered an error while processing your request. Please try again.";
        }

        addBotMessage(response);
    }

    // SMART COMBINED QUERY HANDLER
    async function handleCombinedQuery(message, examData) {
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        
        // Extract multiple conditions from the message
        const conditions = {
            department: extractDepartment(message),
            semester: extractSemester(message),
            dateFilter: extractDateFilter(message),
            subject: extractSubject(message, examData),
            room: extractRoom(message)
        };
        
        console.log('Extracted conditions:', conditions);
        
        // If no specific conditions, return null for other handlers
        if (!conditions.department && !conditions.semester && !conditions.dateFilter && 
            !conditions.subject && !conditions.room) {
            return null;
        }
        
        // Start with all exams
        let filteredExams = [...examData];
        
        // Apply filters based on conditions
        if (conditions.department) {
            filteredExams = filteredExams.filter(exam => 
                exam.department.toLowerCase().includes(conditions.department.toLowerCase())
            );
            // Update context
            chatContext.lastDepartment = conditions.department;
        }
        
        if (conditions.semester) {
            filteredExams = filteredExams.filter(exam => 
                exam.semester.toLowerCase().includes(conditions.semester.toLowerCase())
            );
            chatContext.lastSemester = conditions.semester;
        }
        
        if (conditions.subject) {
            filteredExams = filteredExams.filter(exam => 
                exam.subject.toLowerCase().includes(conditions.subject.toLowerCase())
            );
        }
        
        if (conditions.room) {
            filteredExams = filteredExams.filter(exam => 
                exam.room.toLowerCase().includes(conditions.room.toLowerCase())
            );
        }
        
        // Apply date filter
        if (conditions.dateFilter === 'today') {
            filteredExams = filteredExams.filter(exam => exam.examDate === currentDate);
        } else if (conditions.dateFilter === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            filteredExams = filteredExams.filter(exam => exam.examDate === tomorrowStr);
        } else if (conditions.dateFilter === 'upcoming') {
            filteredExams = filteredExams.filter(exam => exam.examDate >= currentDate);
        } else if (conditions.dateFilter === 'past') {
            filteredExams = filteredExams.filter(exam => exam.examDate < currentDate);
        }
        
        // If we have date filter but no other conditions, use context
        if (conditions.dateFilter && !conditions.department && !conditions.semester && 
            !conditions.subject && !conditions.room) {
            if (chatContext.lastDepartment) {
                filteredExams = filteredExams.filter(exam => 
                    exam.department.toLowerCase().includes(chatContext.lastDepartment.toLowerCase())
                );
            }
            if (chatContext.lastSemester) {
                filteredExams = filteredExams.filter(exam => 
                    exam.semester.toLowerCase().includes(chatContext.lastSemester.toLowerCase())
                );
            }
        }
        
        // Generate response based on what was found
        if (filteredExams.length === 0) {
            return generateNoResultsResponse(conditions);
        }
        
        return generateCombinedResultsResponse(filteredExams, conditions, currentDate);
    }

    // EXTRACTION FUNCTIONS
    function extractDepartment(message) {
        const departments = ['computer', 'civil', 'electrical', 'power', 'mechanical', 'electronics'];
        for (const dept of departments) {
            if (message.includes(dept)) {
                return dept.charAt(0).toUpperCase() + dept.slice(1);
            }
        }
        return '';
    }

    function extractSemester(message) {
        const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
        for (const semester of semesters) {
            if (message.includes(semester)) {
                return semester;
            }
        }
        return '';
    }

    function extractDateFilter(message) {
        if (message.includes('today') || message.includes('now')) {
            return 'today';
        } else if (message.includes('tomorrow')) {
            return 'tomorrow';
        } else if (message.includes('upcoming') || message.includes('next') || message.includes('coming')) {
            return 'upcoming';
        } else if (message.includes('past') || message.includes('completed') || message.includes('done')) {
            return 'past';
        }
        return '';
    }

    function extractSubject(message, examData) {
        // Get all subjects from exam data
        const subjects = examData.map(exam => exam.subject.toLowerCase());
        
        // Check for subject in message
        for (const subject of subjects) {
            const subjectWords = subject.split(' ');
            for (const word of subjectWords) {
                if (word.length > 3 && message.includes(word.toLowerCase())) {
                    return subject;
                }
            }
        }
        return '';
    }

    function extractRoom(message) {
        const roomMatch = message.match(/(room|hall|lab)\s*(\d+)/i);
        if (roomMatch && roomMatch[2]) {
            return roomMatch[2];
        }
        
        const numberMatch = message.match(/\d+/);
        if (numberMatch) {
            return numberMatch[0];
        }
        
        return '';
    }

    // RESPONSE GENERATORS
    function generateNoResultsResponse(conditions) {
        let response = "I couldn't find any exams matching your criteria:";
        
        if (conditions.department) response += `\n• Department: ${conditions.department}`;
        if (conditions.semester) response += `\n• Semester: ${conditions.semester}`;
        if (conditions.dateFilter) response += `\n• Time: ${conditions.dateFilter}`;
        if (conditions.subject) response += `\n• Subject: ${conditions.subject}`;
        if (conditions.room) response += `\n• Room: ${conditions.room}`;
        
        response += "<br><br>Try modifying your search or ask for help with 'help'";
        return response;
    }

    function generateCombinedResultsResponse(exams, conditions, currentDate) {
        let response = "";
        
        // Create title based on conditions
        if (conditions.department && conditions.dateFilter) {
            response = `${conditions.department} Department Exams (${conditions.dateFilter}):<br>`;
        } else if (conditions.department) {
            response = `${conditions.department} Department Exams:<br>`;
        } else if (conditions.dateFilter) {
            response = `Exams (${conditions.dateFilter}):<br>`;
        } else if (conditions.semester) {
            response = `${conditions.semester} Semester Exams:<br>`;
        } else {
            response = "Matching Exams:<br>";
        }
        
        response += `Found ${exams.length} exam${exams.length !== 1 ? 's' : ''}<br><br>`;
        
        // Sort by date
        exams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        
        // Show results (limit to 8 for readability)
        exams.slice(0, 8).forEach((exam, index) => {
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
            
            response += `${index + 1}. ${exam.subject}<br>`;
            response += `   ${exam.department} - ${exam.semester}<br>`;
            response += `   Date: ${window.dataFunctions.formatDate(exam.examDate)}<br>`;
            response += `   Time: ${exam.time} | Room: ${exam.room}<br>`;
            response += `   Status: ${status}<br><br>`;
        });
        
        if (exams.length > 8) {
            response += `... and ${exams.length - 8} more. Please be more specific to see all results.`;
        }
        
        return response;
    }

    // Query handlers (simplified since combined handler does most work)
    async function handleExamDateQuery(message, examData) {
        // Try to extract subject from message
        const subject = extractSubject(message, examData);
        
        if (!subject) {
            return "I couldn't identify the subject from your query. Please specify which subject you're looking for. Examples:<br><br>" +
                   "• 'When is the Physics exam?'<br>" +
                   "• 'What is the date for Mathematics exam?'<br>" +
                   "• 'Programming exam date'";
        }
        
        // Use combined query handler
        const conditions = {
            subject: subject,
            dateFilter: ''
        };
        
        const filteredExams = examData.filter(exam => 
            exam.subject.toLowerCase().includes(subject.toLowerCase())
        );
        
        if (filteredExams.length === 0) {
            return `No exams found for "${subject}". This subject hasn't been added to the exam schedule yet.`;
        }
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        return generateCombinedResultsResponse(filteredExams, conditions, currentDate);
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
        // This is now handled by the combined query handler
        const combinedResult = await handleCombinedQuery(message, examData);
        if (combinedResult) {
            return combinedResult;
        }
        
        // Fallback for very general queries
        if (message.length < 3) {
            return "Please provide more details. Examples:<br><br>" +
                   "• 'Computer department exams'<br>" +
                   "• 'Exams today'<br>" +
                   "• '1st semester schedule'<br>" +
                   "• 'Physics exam date'<br>" +
                   "• 'Exams in Room 101'";
        }
        
        // Try simple search
        const searchResults = examData.filter(exam => {
            const searchString = `${exam.subject} ${exam.department} ${exam.semester} ${exam.room} ${exam.time}`.toLowerCase();
            return searchString.includes(message);
        });
        
        if (searchResults.length === 0) {
            return "I couldn't find any information matching your query. Try being more specific or use one of these examples:<br><br>" +
                   "• 'Computer exams today'<br>" +
                   "• 'Next exam for Civil department'<br>" +
                   "• '1st semester upcoming exams'<br>" +
                   "• 'When is Mathematics exam?'";
        }
        
        const currentDate = window.dataFunctions ? window.dataFunctions.getCurrentDate() : new Date().toISOString().split('T')[0];
        const conditions = {};
        return generateCombinedResultsResponse(searchResults, conditions, currentDate);
    }

    // Export functions (remove admin notification features)
    window.addBotMessage = addBotMessage;
    window.initChatbot = initChatbot;
});