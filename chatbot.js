// smart-chatbot.js - Pure Text-Based Smart Exam Assistant

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // Advanced conversation context
    let chatContext = {
        lastDepartment: '',
        lastSemester: '',
        lastSubject: '',
        conversationHistory: [],
        userName: null,
        isFirstInteraction: true,
        conversationState: 'idle', // idle, searching, confirming, downloading
        lastExamResults: []
    };

    // Common exam abbreviations and synonyms
    const subjectAbbreviations = {
        'phy': 'physics',
        'math': 'mathematics',
        'chem': 'chemistry',
        'prog': 'programming',
        'dbms': 'database management system',
        'cn': 'computer network',
        'os': 'operating system',
        'oop': 'object oriented programming',
        'eng': 'english',
        'eee': 'electrical engineering',
        'mech': 'mechanical',
        'civil': 'civil engineering',
        'elec': 'electronics',
        'cse': 'computer science',
        'it': 'information technology'
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

    // Initialize with intelligent greeting
    addBotMessage("Hello! 👋 I'm your exam assistant. I can help you find exam schedules, check dates, and get routine information. How can I assist you today?");

    // Main Functions
    function initChatbot() {
        // Clear conversation history
        chatContext.conversationHistory = [];
        chatContext.conversationState = 'idle';
        chatContext.isFirstInteraction = true;
        
        // Add welcome message to history
        chatContext.conversationHistory.push({
            role: 'assistant',
            content: "Hello! I'm your exam assistant. I can help you find exam schedules, check dates, and get routine information. How can I assist you today?",
            timestamp: new Date().toISOString()
        });
    }

    function toggleChatbot() {
        chatbotContainer.classList.toggle('open');
        
        if (chatbotContainer.classList.contains('open')) {
            setTimeout(() => {
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }, 100);
            chatInput.focus();
        }
    }

    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        
        // Add typing animation effect
        messageDiv.style.opacity = '0';
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);
        
        // Add to conversation history
        chatContext.conversationHistory.push({
            role: 'assistant',
            content: text,
            timestamp: new Date().toISOString()
        });
        
        // Animate message appearance
        setTimeout(() => {
            messageDiv.style.transition = 'opacity 0.3s ease';
            messageDiv.style.opacity = '1';
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 10);
    }

    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);
        
        // Add to conversation history
        chatContext.conversationHistory.push({
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        });
        
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    async function handleChatMessage() {
        const message = chatInput.value.trim();
        
        if (message === '') return;
        
        // Add user message
        addUserMessage(message);
        chatInput.value = '';
        
        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        // Process after delay (simulate thinking)
        setTimeout(async () => {
            removeTypingIndicator(typingIndicator);
            await processChatMessage(message);
        }, 800 + (Math.random() * 400)); // Random delay for natural feel
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing-indicator';
        typingDiv.id = 'typing-' + Date.now();
        typingDiv.innerHTML = `<p><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></p>`;
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        return typingDiv.id;
    }

    function removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    async function processChatMessage(message) {
        const lowerMessage = message.toLowerCase().trim();
        let response = '';

        try {
            // Get fresh exam data
            const examData = await getFreshExamData();
            
            // First, check for greetings and basic conversation
            if (isGreeting(lowerMessage)) {
                response = handleGreeting(lowerMessage);
            }
            // Check for thanks
            else if (isThanks(lowerMessage)) {
                response = handleThanks();
            }
            // Check for help request
            else if (isHelpRequest(lowerMessage)) {
                response = getHelpResponse();
            }
            // Check for next exam query
            else if (isNextExamQuery(lowerMessage)) {
                response = await handleNextExamQuery(lowerMessage, examData);
            }
            // Check for download request
            else if (isDownloadRequest(lowerMessage)) {
                response = await handleDownloadRequest(lowerMessage, examData);
            }
            // Check for subject search
            else if (isSubjectQuery(lowerMessage)) {
                response = await handleSubjectQuery(lowerMessage, examData);
            }
            // Check for date-based query
            else if (isDateQuery(lowerMessage)) {
                response = await handleDateQuery(lowerMessage, examData);
            }
            // Check for department/semester query
            else if (isDepartmentQuery(lowerMessage) || isSemesterQuery(lowerMessage)) {
                response = await handleDepartmentSemesterQuery(lowerMessage, examData);
            }
            // Check for room query
            else if (isRoomQuery(lowerMessage)) {
                response = await handleRoomQuery(lowerMessage, examData);
            }
            // Check for general information
            else if (isGeneralInfoQuery(lowerMessage)) {
                response = await handleGeneralInfoQuery(lowerMessage, examData);
            }
            // Check for follow-up questions
            else if (isFollowUpQuery(lowerMessage)) {
                response = await handleFollowUpQuery(lowerMessage, examData);
            }
            // Default - try to understand
            else {
                response = await handleUnknownQuery(lowerMessage, examData);
            }

        } catch (error) {
            console.error('Chatbot error:', error);
            response = "I'm having trouble accessing the exam database right now. Please try again in a moment.";
        }

        addBotMessage(response);
    }

    // ============== INTENT DETECTION FUNCTIONS ==============

    function isGreeting(message) {
        // Clean the message - remove punctuation and convert to lowercase
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        const greetings = [
            'hello', 'hi', 'hey', 'greetings', 'oi', 'kire', 'chatbot', 'chat','laura',
            'good morning', 'good afternoon', 'good evening',
            'morning', 'afternoon', 'evening','helo',
            'whats up', 'sup', 'yo', 'riyad', 'ere','Kemon jacche','subho sokal',
            'how are you', 'how do you do', 'hows it going','hello', 'hi', 'hey', 'heyy', 'heyyy','greetings', 'yo', 'yoo', 'sup', 'whats up', 'what\'s up',
            'how are you', 'how r u', 'how are u',
            'how do you do', 'how\'s it going', 'hows it going',
            'how\'s everything', 'how is everything',
            'good morning', 'good afternoon', 'good evening',
            'morning', 'afternoon', 'evening',
            'hey there', 'hi there', 'hello there','hiya', 'hullo',
            'kemon acho', 'kemon aso', 'kemon accho',
            'kemon jacche', 'kmn aso', 'kmn acho',
            'ki obostha', 'ki khobor','ki cholche', 'ki choltese','ki re', 'kire', 'oi', 'ere',
            'hey bro', 'hi bro', 'hello bro','hey vai', 'hi vai', 'salam vai',
            'assalamu alaikum', 'salam','subho sokal', 'subho bikal', 'subho sondha',
            'helo', 'hlo', 'hlw', 'helloo', 'hiii', 'hiiii',
            'sup bro', 'yo bro','bruh', 'bro', 'vai',
            'chatbot', 'chat', 'bot','laura', 'riyad','hey bot', 'hi bot', 'hello bot',
            'are you there', 'you there','Explore Routine',
            ,'hello anyone','you online','can you hear me','can you help me'

        ];
        return greetings.some(greet => cleanMessage.includes(greet));
    }

    function handleGreeting(message) {
        const hour = new Date().getHours();
        let timeGreeting = '';
        
        if (hour < 12) timeGreeting = 'Good morning','hello','hlw','anyone there','are you online';
        else if (hour < 17) timeGreeting = 'Good afternoon','hello','hlw','are you online';
        else timeGreeting = 'Good evening','hello','hlw','oi','kire','are you online';
        
        // Check if it's first interaction
        if (chatContext.isFirstInteraction) {
            chatContext.isFirstInteraction = false;
            return `${timeGreeting}! 👋 I'm your exam assistant. I can help you with:<br><br>\n\n` +
                   `• Finding exam dates and schedules\n` +
                   `• Searching for subjects\n` +
                   `• Checking upcoming exams\n` +
                   `• Getting department-wise routines\n` +
                   `• Downloading exam schedules (pdf)<br><br>\n\n` +
                   `🔍 What do you want to know? (English preferred for better results.)`;
        } else {
            const responses = [
                `${timeGreeting}! How can I help you with exams today?`,
                `${timeGreeting} again! What exam information do you need?`,
                `${timeGreeting}! Ready to help with your exam queries.`,
                `${timeGreeting}! Kivabe Help Korte Pari?`,
                `${timeGreeting}! What can I assist you with regarding exams?`,
                // Existing style
                `${timeGreeting}! How can I help you with exams today?`,
                `${timeGreeting} again! What exam information do you need?`,
                `${timeGreeting}! Ready to help with your exam queries.`,
                `${timeGreeting}! Kivabe help korte pari?`,
                `${timeGreeting}! What can I assist you with regarding exams?`,
                // Banglish – friendly
                `${timeGreeting}! Exam niye help chai?`,
                `${timeGreeting}! Kon exam er info lagbe?`,
                // Banglish – casual / student vibe
                `${timeGreeting}! Exam niye ki jante chao?`,
                `${timeGreeting}! Kon exam er jonno help lagbe?`,
                `${timeGreeting}! Routine, seat plan, naki result?`,
                `${timeGreeting}! Exam niye question thakle bolo.`,
                `${timeGreeting}! Ami ready, bolo ki lagbe.`,
                // Banglish – polite & supportive
                `${timeGreeting}! Valo acho? Exam niye kono proshno ache?`,
                `${timeGreeting}! Chinta koro na, exam related help pabe.`,
                `${timeGreeting}! Step by step help dite pari, bolo.`,
                // Short Banglish
                `${timeGreeting}! Ki jante chao?`,
                `${timeGreeting}! Help lagle bolo.`,
                `${timeGreeting}! Ready to help 😊`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    function isThanks(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(thank|thanks|thankyou|thnx|thx|appreciate|grateful|acha|accha|acca)/.test(cleanMessage);
    }

    function handleThanks() {
        const responses = [
            "You're welcome! Let me know if you need anything else.",
            "Glad I could help! Feel free to ask more questions.",
            "Happy to assist! Is there anything else you'd like to know?",
            "Anytime! Don't hesitate to ask if you need more information."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    function isHelpRequest(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(help|what can you do|how to use|start|commands|features|what do you do|assist|support|guide)/.test(cleanMessage);
    }

    function getHelpResponse() {
        return "Here's what I can help you with:<br><br>\n\n" +
               "🔍 Search Exams:<br>\n" +
               "• \"Physics exam date\"\n" +
               "• \"Find Mathematics exam\"\n" +
               "• \"Search for Programming\"\n" +
               "• \"When is Chemistry exam?<br><br>\"\n\n" +
               
               "📅 Time-based Queries:<br>\n" +
               "• \"Next exam\"\n" +
               "• \"Exams today\"\n" +
               "• \"Upcoming exams\"\n" +
               "• \"Exams this week\"\n" +
               "• \"Past exams<br><br>\"\n\n" +
               
               "🏛️ Department & Semester:<br>\n" +
               "• \"Computer department exams\"\n" +
               "• \"Civil department 3rd semester\"\n" +
               "• \"Show all departments\"\n" +
               "• \"1st semester schedule<br><br>\"\n\n" +
               
               "📥 Download Options:<br>\n" +
               "• \"Download routine\"\n" +
               "• \"Get Computer department PDF\"\n" +
               "• \"Download all exams\"\n" +
               "• \"Export 4th semester schedule<br><br>\"\n\n" +
               
               "📍 Specific Details:<br>\n" +
               "• \"Practical exams only\"\n" +
               "• \"Completed exams\"\n\n" +
               
               "Just type your question naturally and I'll understand!";
    }

    function isNextExamQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(next exam|next exams|status|next|porer exam|upcoming exam|coming exam|exam after|whats next|next|porer|upcoming|coming)/.test(cleanMessage);
    }

    async function handleNextExamQuery(message, examData) {
        const currentDate = window.dataFunctions.getCurrentDate();
        
        // Extract department if mentioned
        const department = extractDepartment(message);
        const semester = extractSemester(message);
        
        // Get upcoming exams
        let upcomingExams = examData.filter(exam => exam.examDate >= currentDate);
        
        if (upcomingExams.length === 0) {
            return "There are no upcoming exams. All exams have been completed.";
        }
        
        // Apply filters
        if (department) {
            upcomingExams = upcomingExams.filter(exam => 
                exam.department.toLowerCase().includes(department.toLowerCase())
            );
            if (upcomingExams.length === 0) {
                return `No upcoming exams found for ${department} department.`;
            }
        }
        
        if (semester) {
            upcomingExams = upcomingExams.filter(exam => 
                exam.semester.toLowerCase().includes(semester.toLowerCase())
            );
            if (upcomingExams.length === 0) {
                return `No upcoming exams found for ${semester} semester.`;
            }
        }
        
        // Sort by date and time
        upcomingExams.sort((a, b) => {
            const dateCompare = new Date(a.examDate) - new Date(b.examDate);
            if (dateCompare !== 0) return dateCompare;
            return convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time);
        });
        
        const nextExam = upcomingExams[0];
        const daysLeft = window.dataFunctions.getDayDifference(currentDate, nextExam.examDate);
        
        let response = "📅 Next Upcoming Exam<br><br>\n\n";
        response += `Subject : ${nextExam.subject}<br>\n`;
        response += `Department : ${nextExam.department}<br>\n`;
        response += `Semester : ${nextExam.semester}<br>\n`;
        response += `Date : ${window.dataFunctions.formatDate(nextExam.examDate)}<br>\n`;
        response += `Time : ${nextExam.time}<br>\n`;
        response += `Room : ${nextExam.room}<br>\n`;
        response += `Type : ${nextExam.examType || 'Written'}<br>\n`;
        
        if (daysLeft === 0) {
            response += `Status : The exam is today!<br>\n\n`;
        } else {
            response += `Status : In ${daysLeft} day${daysLeft !== 1 ? 's' : ''} ⏳<br><br>\n\n`;
        }
        
        // Suggest related actions
        response += "You can also:<br>\n";
        response += "• Ask \"Set reminder for this exam\" to get notifications<br>\n";
        response += "• Type \"Download this schedule\" to save it<br>\n";
        response += "• Ask \"More details\" for complete information";
        
        // Store for follow-up
        chatContext.lastExamResults = [nextExam];
        chatContext.conversationState = 'showing_next_exam';
        
        return response;
    }

    function isDownloadRequest(message) {
        // Clean the message - more comprehensive pattern matching
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(download|pdf|dn|get pdf|export|save as|routine download|get routine|save|pdf|export|download now|fast download|download fast)/.test(cleanMessage);
    }

    async function handleDownloadRequest(message, examData) {
        const department = extractDepartment(message);
        const semester = extractSemester(message);
        const subject = extractSubjectFromMessage(message, examData);
        
        // Fast download - trigger immediately without delay
        if (subject) {
            const subjectExams = examData.filter(exam => 
                exam.subject.toLowerCase().includes(subject.toLowerCase())
            );
            
            if (subjectExams.length === 0) {
                return `I couldn't find any exams for "${subject}". Please check the subject name and try again.`;
            }
            
            // Immediate download - no setTimeout
            if (window.downloadSubjectExams) {
                // Trigger download immediately
                setTimeout(() => {
                    window.downloadSubjectExams(subject, subjectExams);
                }, 0); // Minimal delay for async stability
            }
            
            return `📥 Download Started\n\n` +
                   `Downloading ${subject} exams...<br>\n` +
                   `Total exams: ${subjectExams.length}<br>\n` +
                   `File: ${subject.replace(/\s+/g, '_')}_Exams.pdf<br>\n\n` +
                   `The download should start immediately. Check your browser's download folder.`;
            
        } else if (department && semester) {
            const deptSemExams = examData.filter(exam => 
                exam.department.toLowerCase().includes(department.toLowerCase()) &&
                exam.semester.toLowerCase().includes(semester.toLowerCase())
            );
            
            if (deptSemExams.length === 0) {
                return `No exams found for ${department} Department, ${semester} Semester.`;
            }
            
            // Immediate download
            if (window.downloadDepartmentRoutine) {
                setTimeout(() => {
                    window.downloadDepartmentRoutine(department, semester, deptSemExams);
                }, 0);
            }
            
            return `📥 Download Started<br>\n\n` +
                   `${department} Department - ${semester} Semester Routine<br>\n` +
                   `Total exams: ${deptSemExams.length}<br>\n` +
                   `File: ${department}_${semester}_Routine.pdf<br>\n\n` +
                   `Downloading now... Please wait a moment.`;
            
        } else if (department) {
            const deptExams = examData.filter(exam => 
                exam.department.toLowerCase().includes(department.toLowerCase())
            );
            
            if (deptExams.length === 0) {
                return `No exams found for ${department} Department.`;
            }
            
            // Immediate download
            if (window.downloadDepartmentExams) {
                setTimeout(() => {
                    window.downloadDepartmentExams(department, deptExams);
                }, 0);
            }
            
            return `📥 Download Started<br>\n\n` +
                   `${department} Department Exam Schedule<br>\n` +
                   `Total exams: ${deptExams.length}<br>\n` +
                   `File: ${department}_Department_Exams.pdf<br>\n\n` +
                   `Your download has been initiated.`;
            
        } else {
            if (examData.length === 0) {
                return "There are no exams available to download.";
            }
            
            // Immediate download
            if (window.downloadAllExams) {
                setTimeout(() => {
                    window.downloadAllExams(examData);
                }, 0);
            }
            
            return `📥 Download Started<br>\n\n` +
                   `Complete Exam Routine\n` +
                   `Total exams: ${examData.length}<br>\n` +
                   `File: Complete_Exam_Routine.pdf<br>\n\n` +
                   `Starting download immediately...`;
        }
    }

    function isSubjectQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        const subjectKeywords = ['exam', 'subject', 'course', 'paper', 'test', 'when', 'date', 'schedule', 'time', 'find', 'search', 'look for'];
        return subjectKeywords.some(keyword => cleanMessage.includes(keyword));
    }

    async function handleSubjectQuery(message, examData) {
        // Extract subject name
        const subject = extractSubjectFromMessage(message, examData);
        
        if (!subject) {
            // Try to get suggestions
            const suggestions = getSubjectSuggestions(message, examData);
            
            if (suggestions.length > 0) {
                let response = "I'm not sure which subject you're looking for. Did you mean:\n\n";
                suggestions.slice(0, 5).forEach((sugg, index) => {
                    response += `${index + 1}. ${sugg}\n`;
                });
                response += "\nTry asking about one of these subjects.";
                return response;
            }
            
            return "I couldn't identify the subject. Please try one of these formats:\n\n" +
                   "• \"Physics exam date\"\n" +
                   "• \"When is Mathematics exam?\"\n" +
                   "• \"Find Java exam\"\n" +
                   "• \"Subject : Java exam\"\n" +
                   "• \"Search for Chemistry\"";
        }
        
        // Find exams for this subject
        const subjectExams = examData.filter(exam => 
            exam.subject.toLowerCase().includes(subject.toLowerCase())
        );
        
        if (subjectExams.length === 0) {
            return `No exams found for "${subject}". This subject might not be in the current schedule, or try (find"${subject}") 4 Exact Rslt`;
        }
        
        // Group by department and semester
        const groupedExams = {};
        subjectExams.forEach(exam => {
            const key = `${exam.department} - ${exam.semester}`;
            if (!groupedExams[key]) {
                groupedExams[key] = [];
            }
            groupedExams[key].push(exam);
        });
        
        const currentDate = window.dataFunctions.getCurrentDate();
        
        let response = `**${subject} Exams**\n\n`;
        response += `Found ${subjectExams.length} exam${subjectExams.length !== 1 ? 's' : ''}:\n\n`;
        
        Object.keys(groupedExams).forEach(key => {
            response += `**${key}**\n`;
            
            groupedExams[key].forEach((exam, index) => {
                const daysLeft = window.dataFunctions.getDayDifference(currentDate, exam.examDate);
                
                let status = '';
                if (exam.examDate < currentDate) {
                    status = '✅ Completed';
                } else if (exam.examDate === currentDate) {
                    status = '🎯 Today';
                } else {
                    status = `⏳ In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
                }
                
                response += `${index + 1}. ${window.dataFunctions.formatDate(exam.examDate)}\n`;
                response += `   Time: ${exam.time} | Room: ${exam.room}\n`;
                response += `   Type: ${exam.examType || 'Written'} | ${status}\n\n`;
            });
        });
        
        // Store for follow-up
        chatContext.lastSubject = subject;
        chatContext.lastExamResults = subjectExams;
        chatContext.conversationState = 'showing_subject_exams';
        
        // Add suggestions
        response += "You can also:\n";
        response += "• Ask \"Download these exams\" to save the schedule\n";
        response += "• Type \"Set reminders\" for notification\n";
        response += "• Ask about a specific department or semester";
        
        return response;
    }

    function isDateQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(today|tomorrow|yesterday|week|month|date|day|upcoming|next|coming|past|completed|finished)/.test(cleanMessage);
    }

    async function handleDateQuery(message, examData) {
        const currentDate = window.dataFunctions.getCurrentDate();
        let filteredExams = [];
        let description = '';
        
        if (message.includes('today')) {
            filteredExams = examData.filter(exam => exam.examDate === currentDate);
            description = 'today';
        } else if (message.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            filteredExams = examData.filter(exam => exam.examDate === tomorrowStr);
            description = 'tomorrow';
        } else if (message.includes('this week') || message.includes('next week')) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            filteredExams = examData.filter(exam => {
                const examDate = new Date(exam.examDate);
                return examDate >= new Date(currentDate) && examDate <= nextWeek;
            });
            description = 'this week';
        } else if (message.includes('upcoming') || message.includes('next') || message.includes('coming')) {
            filteredExams = examData.filter(exam => exam.examDate >= currentDate);
            description = 'upcoming';
        } else if (message.includes('past') || message.includes('completed') || message.includes('finished')) {
            filteredExams = examData.filter(exam => exam.examDate < currentDate);
            description = 'completed';
        } else {
            // Try to extract specific date
            const dateMatch = message.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})|(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (dateMatch) {
                // Handle date extraction
                // For simplicity, using current filter
                filteredExams = examData.filter(exam => exam.examDate >= currentDate);
                description = 'upcoming';
            } else {
                return "I'm not sure which time period you mean. Try:\n\n" +
                       "• \"Exams today\"\n" +
                       "• \"Upcoming exams\"\n" +
                       "• \"Exams this week\"\n" +
                       "• \"Past exams\"";
            }
        }
        
        if (filteredExams.length === 0) {
            return `No exams found for ${description}.`;
        }
        
        // Group by date
        const groupedByDate = {};
        filteredExams.forEach(exam => {
            if (!groupedByDate[exam.examDate]) {
                groupedByDate[exam.examDate] = [];
            }
            groupedByDate[exam.examDate].push(exam);
        });
        
        let response = `Exams ${description.charAt(0).toUpperCase() + description.slice(1)}\n\n`;
        response += `Total: ${filteredExams.length} exam${filteredExams.length !== 1 ? 's' : ''}\n\n`;
        
        // Sort dates and show first 5
        const sortedDates = Object.keys(groupedByDate).sort();
        const displayDates = sortedDates.slice(0, 5);
        
        displayDates.forEach(date => {
            response += `📅 ${window.dataFunctions.formatDate(date)}\n`;
            groupedByDate[date].slice(0, 3).forEach(exam => {
                response += `• ${exam.subject} (${exam.department} - ${exam.semester})\n`;
                response += `  ${exam.time} | Room: ${exam.room}\n\n`;
            });
        });
        
        if (sortedDates.length > 5) {
            response += `... and ${sortedDates.length - 5} more dates\n\n`;
        }
        
        // Store for follow-up
        chatContext.lastExamResults = filteredExams;
        chatContext.conversationState = 'showing_date_exams';
        
        return response;
    }

    function isDepartmentQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(department|dept|branch|stream|computer|civil|electrical|mechanical|electronics|power)/.test(cleanMessage);
    }

    function isSemesterQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(semester|sem|1st|2nd|3rd|4th|5th|6th|7th|8th)/.test(cleanMessage);
    }

    async function handleDepartmentSemesterQuery(message, examData) {
        const department = extractDepartment(message);
        const semester = extractSemester(message);
        
        if (!department && !semester) {
            // List all departments
            const departments = [...new Set(examData.map(exam => exam.department))];
            
            if (departments.length === 0) {
                return "No departments found in the exam schedule.";
            }
            
            let response = "Available Departments\n\n";
            departments.sort().forEach(dept => {
                const deptExams = examData.filter(exam => exam.department === dept);
                const upcoming = deptExams.filter(exam => 
                    exam.examDate >= window.dataFunctions.getCurrentDate()
                ).length;
                
                response += `${dept}\n`;
                response += `Total exams: ${deptExams.length}\n`;
                response += `Upcoming: ${upcoming}\n\n`;
            });
            
            response += "You can ask about a specific department or combine with semester.";
            return response;
        }
        
        let filteredExams = [...examData];
        let description = '';
        
        if (department) {
            filteredExams = filteredExams.filter(exam => 
                exam.department.toLowerCase().includes(department.toLowerCase())
            );
            description += `${department} Department`;
        }
        
        if (semester) {
            filteredExams = filteredExams.filter(exam => 
                exam.semester.toLowerCase().includes(semester.toLowerCase())
            );
            if (description) description += ', ';
            description += `${semester} Semester`;
        }
        
        if (filteredExams.length === 0) {
            return `No exams found for ${description}.`;
        }
        
        // Group by date
        const groupedByDate = {};
        filteredExams.forEach(exam => {
            if (!groupedByDate[exam.examDate]) {
                groupedByDate[exam.examDate] = [];
            }
            groupedByDate[exam.examDate].push(exam);
        });
        
        let response = `${description} Exams\n\n`;
        response += `Total: ${filteredExams.length} exam${filteredExams.length !== 1 ? 's' : ''}\n\n`;
        
        // Sort dates and show first 5
        const sortedDates = Object.keys(groupedByDate).sort().slice(0, 5);
        
        sortedDates.forEach(date => {
            response += `📅 **${window.dataFunctions.formatDate(date)}**\n`;
            groupedByDate[date].slice(0, 3).forEach(exam => {
                response += `• ${exam.subject}\n`;
                response += `  ${exam.time} | ${exam.examType || 'Written'} | Room: ${exam.room}\n\n`;
            });
        });
        
        // Store for follow-up
        chatContext.lastDepartment = department || '';
        chatContext.lastSemester = semester || '';
        chatContext.lastExamResults = filteredExams;
        chatContext.conversationState = 'showing_dept_sem_exams';
        
        return response;
    }

    function isRoomQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(room|hall|lab|classroom|venue|location)/.test(cleanMessage);
    }

    async function handleRoomQuery(message, examData) {
        const room = extractRoom(message);
        
        if (!room) {
            return "Please specify a room number. Example: \"Exams in Room 101\" or \"What's scheduled in Room 205?\"";
        }
        
        const roomExams = examData.filter(exam => 
            exam.room.toLowerCase().includes(room.toLowerCase())
        );
        
        if (roomExams.length === 0) {
            return `No exams found in Room ${room}.`;
        }
        
        // Group by date
        const groupedByDate = {};
        roomExams.forEach(exam => {
            if (!groupedByDate[exam.examDate]) {
                groupedByDate[exam.examDate] = [];
            }
            groupedByDate[exam.examDate].push(exam);
        });
        
        let response = `Exams in Room ${room}\n\n`;
        response += `Total: ${roomExams.length} exam${roomExams.length !== 1 ? 's' : ''}\n\n`;
        
        const sortedDates = Object.keys(groupedByDate).sort();
        
        sortedDates.forEach(date => {
            response += `📅 ${window.dataFunctions.formatDate(date)}\n`;
            groupedByDate[date].forEach(exam => {
                response += `• ${exam.subject}\n`;
                response += `  ${exam.department} - ${exam.semester}\n`;
                response += `  ${exam.time} | ${exam.examType || 'Written'}\n\n`;
            });
        });
        
        return response;
    }

    function isGeneralInfoQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        return /(how many|total exams|statistics|info|information|summary|overview)/.test(cleanMessage);
    }

    async function handleGeneralInfoQuery(message, examData) {
        if (examData.length === 0) {
            return "No exam data available. The schedule is currently empty.";
        }
        
        const currentDate = window.dataFunctions.getCurrentDate();
        
        const totalExams = examData.length;
        const upcomingExams = examData.filter(exam => exam.examDate >= currentDate).length;
        const todayExams = examData.filter(exam => exam.examDate === currentDate).length;
        const pastExams = examData.filter(exam => exam.examDate < currentDate).length;
        
        const departments = [...new Set(examData.map(exam => exam.department))];
        const subjects = [...new Set(examData.map(exam => exam.subject))];
        const semesters = [...new Set(examData.map(exam => exam.semester))];
        
        let response = "📊 Exam Schedule Overview\n\n";
        response += `Total Exams: ${totalExams}\n`;
        response += `Upcoming: ${upcomingExams}\n`;
        response += `Today: ${todayExams}\n`;
        response += `Completed: ${pastExams}\n\n`;
        
        response += `Departments: ${departments.length}\n`;
        response += `Subjects: ${subjects.length}\n`;
        response += `Semesters: ${semesters.length}\n\n`;
        
        if (departments.length > 0) {
            response += "Department-wise Distribution:\n";
            departments.sort().forEach(dept => {
                const count = examData.filter(exam => exam.department === dept).length;
                const percentage = ((count / totalExams) * 100).toFixed(1);
                response += `• ${dept}: ${count} exams (${percentage}%)\n`;
            });
        }
        
        response += "\nYou can ask:<br>\n";
        response += "• \"Next exam\" - See the upcoming exam<br>\n";
        response += "• \"Computer department exams\" - Filter by department<br>\n";
        response += "• \"Exams today\" - Today's schedule<br>\n";
        response += "• \"Download routine\" - Get PDF schedule<br>";
        
        return response;
    }

    function isFollowUpQuery(message) {
        // Clean the message
        const cleanMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
        const followUpKeywords = [
            'more', 'details', 'information', 'tell me more',
            'what else', 'other', 'similar', 'like this',
            'download', 'get pdf', 'save', 'export',
            'reminder', 'notification', 'alert', 'notify',
            'share', 'send', 'forward'
        ];
        return followUpKeywords.some(keyword => cleanMessage.includes(keyword)) ||
               chatContext.conversationState !== 'idle';
    }

    async function handleFollowUpQuery(message, examData) {
        // Check current conversation state
        switch (chatContext.conversationState) {
            case 'showing_next_exam':
            case 'showing_subject_exams':
            case 'showing_date_exams':
            case 'showing_dept_sem_exams':
                // User wants more details or actions
                if (message.includes('download') || message.includes('pdf') || message.includes('save') || message.includes('export')) {
                    // Trigger download of current results
                    if (chatContext.lastExamResults.length > 0) {
                        setTimeout(() => {
                            if (window.downloadAllExams) {
                                window.downloadAllExams(chatContext.lastExamResults);
                            }
                        }, 0); // Immediate download
                        
                        return "📥 Download Started\n\n" +
                               "Downloading the current exam list...\n" +
                               `Total exams: ${chatContext.lastExamResults.length}\n` +
                               "File: Exam_List.pdf\n\n" +
                               "Check your browser's download folder for the PDF.";
                    }
                } else if (message.includes('reminder') || message.includes('notification') || message.includes('alert')) {
                    return "To set reminders for exams:\n\n" +
                           "1. Click on any exam in the main schedule\n" +
                           "2. Click the bell icon ⏰\n" +
                           "3. Choose when you want to be notified\n\n" +
                           "You can also ask \"Set reminder for [subject] exam\" and I'll help you find it.";
                } else if (message.includes('more') || message.includes('details') || message.includes('information')) {
                    // Show more details about the current results
                    if (chatContext.lastExamResults.length > 0) {
                        const currentDate = window.dataFunctions.getCurrentDate();
                        let response = "Detailed Exam Information\n\n";
                        
                        chatContext.lastExamResults.slice(0, 5).forEach((exam, index) => {
                            const daysLeft = window.dataFunctions.getDayDifference(currentDate, exam.examDate);
                            let status = '';
                            
                            if (exam.examDate < currentDate) {
                                status = 'Completed';
                            } else if (exam.examDate === currentDate) {
                                status = 'Today';
                            } else {
                                status = `In ${daysLeft} days`;
                            }
                            
                            response += `${index + 1}. ${exam.subject}\n`;
                            response += `   Department: ${exam.department}\n`;
                            response += `   Semester: ${exam.semester}\n`;
                            response += `   Date: ${window.dataFunctions.formatDate(exam.examDate)}\n`;
                            response += `   Time: ${exam.time}\n`;
                            response += `   Room: ${exam.room}\n`;
                            response += `   Type: ${exam.examType || 'Written'}\n`;
                            response += `   Status: ${status}\n\n`;
                        });
                        
                        if (chatContext.lastExamResults.length > 5) {
                            response += `... and ${chatContext.lastExamResults.length - 5} more exams.\n`;
                        }
                        
                        return response;
                    }
                }
                break;
        }
        
        // Default follow-up response
        return "Is there anything specific you'd like to know about these exams?<br><br>\n\n" +
               "You can ask:<br>\n" +
               "• \"Download these exams\" - Get PDF<br>\n" +
               "• \"Set reminders\" - Get notification help<br>\n" +
               "• \"More details\" - See complete information<br>\n" +
               "• Or ask about another subject/department";
    }

    async function handleUnknownQuery(message, examData) {
        // Try to extract keywords and suggest
        const keywords = extractKeywords(message);
        
        if (keywords.length > 0) {
            // Try to find matching subjects or departments
            const allSubjects = [...new Set(examData.map(exam => exam.subject))];
            const allDepartments = [...new Set(examData.map(exam => exam.department))];
            
            const matchingSubjects = allSubjects.filter(subject => 
                keywords.some(keyword => 
                    subject.toLowerCase().includes(keyword.toLowerCase()) ||
                    keyword.toLowerCase().includes(subject.toLowerCase().substring(0, 4))
                )
            ).slice(0, 3);
            
            const matchingDepartments = allDepartments.filter(dept => 
                keywords.some(keyword => dept.toLowerCase().includes(keyword.toLowerCase()))
            ).slice(0, 2);
            
            let response = "I'm not sure I understand. ";
            
            if (matchingSubjects.length > 0 || matchingDepartments.length > 0) {
                response += "Did you mean:\n\n";
                
                if (matchingSubjects.length > 0) {
                    response += "Subjects:\n";
                    matchingSubjects.forEach(subject => {
                        response += `• "${subject}" exam\n`;
                    });
                    response += "\n";
                }
                
                if (matchingDepartments.length > 0) {
                    response += "Departments:\n";
                    matchingDepartments.forEach(dept => {
                        response += `• ${dept} department exams\n`;
                    });
                }
                
                response += "\nTry asking about one of these.";
            } else {
                response += "Try asking about:<br><br>\n\n" +
                           "• Specific subjects (e.g., \"Physics exam\")<br>\n" +
                           "• Departments (e.g., \"Computer department\")<br>\n" +
                           "• Time periods (e.g., \"Exams today\")<br>\n" +
                           "• Or type \"help\" to see all options";
            }
            
            return response;
        }
        
        // Default response for completely unknown queries
        const responses = [
            "I'm here to help with exam information. Try asking about a subject, department, or exam date.<br>",
            "I specialize in exam schedules. You can ask me about exam dates, subjects, departments, or download routines.<br>",
            "Need exam information? Try asking about a specific subject or department, or type 'help' for options.<br>",
            "I can help you find exam schedules. What would you like to know about?"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // ============== UTILITY FUNCTIONS ==============

    async function getFreshExamData() {
        try {
            if (window.dataFunctions && window.dataFunctions.refreshExamData) {
                return await window.dataFunctions.refreshExamData();
            } else if (window.examData) {
                return window.examData;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error getting exam data:', error);
            return [];
        }
    }

    function extractDepartment(message) {
        const departments = ['computer', 'civil', 'electrical', 'power', 'mechanical', 'electronics', 'electro-medical', 'tourism'];
        for (const dept of departments) {
            if (message.toLowerCase().includes(dept)) {
                return dept.charAt(0).toUpperCase() + dept.slice(1);
            }
        }
        return '';
    }

    function extractSemester(message) {
        const semesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
        for (const sem of semesters) {
            if (message.toLowerCase().includes(sem)) {
                return sem;
            }
        }
        return '';
    }

    function extractSubjectFromMessage(message, examData) {
        if (!examData || examData.length === 0) return '';
        
        const allSubjects = [...new Set(examData.map(exam => exam.subject))];
        const words = message.toLowerCase().split(/\s+/);
        
        // First, check for exact subject names
        for (const subject of allSubjects) {
            const subjectLower = subject.toLowerCase();
            
            // Exact match
            if (message.toLowerCase().includes(subjectLower)) {
                return subject;
            }
            
            // Check for abbreviations
            const subjectAbbrev = subjectLower.split(' ').map(word => word.charAt(0)).join('');
            if (words.some(word => word === subjectAbbrev.toLowerCase())) {
                return subject;
            }
            
            // Check each word of subject
            const subjectWords = subjectLower.split(' ');
            if (subjectWords.some(sw => 
                words.some(word => 
                    word.length > 2 && 
                    (sw.includes(word) || word.includes(sw))
                )
            )) {
                return subject;
            }
        }
        
        // Check abbreviations dictionary
        for (const [abbr, full] of Object.entries(subjectAbbreviations)) {
            if (message.toLowerCase().includes(abbr)) {
                // Try to find matching subject
                const matchingSubject = allSubjects.find(subject => 
                    subject.toLowerCase().includes(full)
                );
                if (matchingSubject) return matchingSubject;
            }
        }
        
        return '';
    }

    function getSubjectSuggestions(query, examData) {
        const allSubjects = [...new Set(examData.map(exam => exam.subject))];
        const queryWords = query.toLowerCase().split(/\s+/);
        const suggestions = [];
        
        allSubjects.forEach(subject => {
            const subjectLower = subject.toLowerCase();
            let score = 0;
            
            queryWords.forEach(qWord => {
                if (qWord.length > 2) {
                    // Check for word matches
                    if (subjectLower.includes(qWord)) {
                        score += 3;
                    }
                    
                    // Check for partial matches
                    const subjectWords = subjectLower.split(' ');
                    subjectWords.forEach(sWord => {
                        if (sWord.includes(qWord) || qWord.includes(sWord)) {
                            score += 2;
                        }
                    });
                    
                    // Check for first few letters
                    if (subjectLower.startsWith(qWord)) {
                        score += 4;
                    }
                }
            });
            
            if (score > 0) {
                suggestions.push({ subject, score });
            }
        });
        
        // Sort by score and return subject names
        return suggestions
            .sort((a, b) => b.score - a.score)
            .map(item => item.subject)
            .slice(0, 10);
    }

    function extractRoom(message) {
        const roomMatch = message.match(/(room|hall|lab)\s*(\d+)/i);
        if (roomMatch && roomMatch[2]) {
            return roomMatch[2];
        }
        
        const numberMatch = message.match(/\b\d{3,4}\b/);
        if (numberMatch) {
            return numberMatch[0];
        }
        
        return '';
    }

    function extractKeywords(message) {
        // Remove common words and get keywords
        const commonWords = [
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'about', 'like', 'through', 'over', 'before',
            'after', 'between', 'under', 'above', 'from', 'into', 'during',
            'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why',
            'how', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
            'has', 'had', 'do', 'does', 'did', 'can', 'could', 'may', 'might',
            'must', 'shall', 'should', 'will', 'would'
        ];
        
        return message.toLowerCase()
            .split(/[\s.,!?;:]+/)
            .filter(word => 
                word.length > 2 && 
                !commonWords.includes(word) &&
                !/^\d+$/.test(word) // Remove pure numbers
            );
    }

    function isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'for', 'you', 'are', 'this', 'that', 'with', 'have',
            'from', 'they', 'would', 'there', 'their', 'what', 'about', 'know',
            'will', 'make', 'like', 'time', 'just', 'them', 'some', 'people',
            'other', 'year', 'take', 'good', 'some', 'could', 'very', 'thing',
            'those', 'then', 'than', 'look', 'only', 'come', 'over', 'think',
            'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
            'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
            'give', 'day', 'most', 'us', 'need', 'find', 'when', 'where', 'which',
            'who', 'whom', 'whose', 'why', 'how', 'exam', 'exams', 'subject',
            'subjects', 'department', 'departments', 'semester', 'semesters'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    function convertTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        
        try {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            
            return hours * 60 + minutes;
        } catch (error) {
            return 0;
        }
    }

    // Export functions for global access
    window.smartChatbot = {
        processUserMessage: handleChatMessage,
        getContext: () => chatContext,
        resetChat: initChatbot
    };
});