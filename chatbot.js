// smart-conversation-chatbot.js - OpenRouter API Powered with Full Firebase Integration

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // ---------- OpenRouter API Configuration ----------
    const OPENROUTER_CONFIG = {
        API_KEY: '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',
        API_URL: 'https://openrouter.ai/api/v1/chat/completions',
        MODEL: 'openai/gpt-3.5-turbo', // ভালো ফল পেতে 'meta-llama/llama-3-8b-instruct' বা 'mistralai/mistral-7b-instruct' ব্যবহার করতে পারেন
        RATE_LIMIT_MS: 3000,
        lastCallTime: 0,
        isAvailable: true
    };

    // ---------- Chat Context ----------
    let chatContext = {
        userName: null,
        conversationHistory: [],
        languagePreference: 'english', // english, banglish, auto
        isFirstMessage: true,
        examData: null,
        examDataLoaded: false,
        dataLoadAttempts: 0
    };

    // ---------- Predefined Responses (expanded) ----------
    const PRE_DEFINED_RESPONSES = {
        "who are you": {
            english: "I'm Routine Explorer, your exam assistant bot! 🤖 I help students with exam schedules, dates, and academic information.",
            banglish: "I'm Routine Explorer, তোমার exam assistant bot! 🤖 আমি students কে exam schedules, dates এবং academic information এ help করি।"
        },
        "what is your name": {
            english: "My name is Routine Explorer! You can call me RE for short. 😊",
            banglish: "My name is Routine Explorer! তুমি আমাকে RE বলতে পারো short এ। 😊"
        },
        "what can you do": {
            english: "I can help you with: 📚 Exam schedules, 📅 Dates and times, 📂 Download routines, 🏫 Department info, and general conversation!",
            banglish: "I can help you with: 📚 Exam schedules, 📅 Dates and times, 📂 Download routines, 🏫 Department info, এবং general conversation!"
        },
        "how are you": {
            english: "I'm doing great, thanks for asking! How about you? 😊",
            banglish: "I'm doing great, thanks for asking! তুমি কেমন আছো? 😊"
        },
        "how is it going": {
            english: "Everything's going smoothly here! Ready to help with your exams. How about you?",
            banglish: "Everything's going smoothly here! Ready to help with তোমার exams. তুমি কেমন আছো?"
        },
        "what's up": {
            english: "Not much, just here to help students with their exam schedules! What's up with you? 😄",
            banglish: "Not much, just here to help students with তাদের exam schedules! তুমি ki korcho? 😄"
        },
        "exam routine": {
            english: "I can help you find exam routines! Tell me your department and semester, or ask about a specific subject.",
            banglish: "I can help you find exam routines! আমাকে বলো তোমার department এবং semester, বা specific subject সম্পর্কে জানাও।"
        },
        "next exam": {
            english: "I'll check the upcoming exams for you. One moment please...",
            banglish: "I'll check the upcoming exams for you. একটু wait করো please..."
        },
        "thank you": {
            english: "You're welcome! 😊 Let me know if you need anything else.",
            banglish: "You're welcome! 😊 আর কিছু দরকার হলে জানিও।"
        },
        "thanks": {
            english: "Anytime! Happy to help. 😊",
            banglish: "Anytime! Happy to help. 😊"
        },
        "goodbye": {
            english: "Goodbye! 👋 See you later. All the best for your exams!",
            banglish: "Goodbye! 👋 পরে দেখা হবে। তোমার exams এর জন্য all the best!"
        },
        "bye": {
            english: "Bye! Take care and study well! 📚",
            banglish: "Bye! Take care এবং study well! 📚"
        }
    };

    // ---------- Bengali phrases map ----------
    const BENGALI_PHRASES = {
        "তুমি কে": "who are you",
        "তোমার নাম কি": "what is your name",
        "তুমি কি কর": "what can you do",
        "কেমন আছ": "how are you",
        "খবর কি": "what's up",
        "কী করছ": "what's up",
        "ধন্যবাদ": "thank you",
        "অনুগ্রহ": "thank you",
        "বিদায়": "goodbye",
        "আসি": "goodbye",
        "পরীক্ষার রুটিন": "exam routine",
        "পরবর্তী পরীক্ষা": "next exam",
        "আগামী পরীক্ষা": "next exam"
    };

    // ---------- Extended keywords for exam detection ----------
    const EXAM_KEYWORDS = [
        'exam', 'routine', 'schedule', 'date', 'time', 'subject',
        'department', 'semester', 'download', 'pdf',
        'পরীক্ষা', 'রুটিন', 'তারিখ', 'সময়', 'বিষয়', 'ডিপার্টমেন্ট',
        'শিডিউল', 'timetable', 'রুটিন দেখাও', 'পরীক্ষার তালিকা'
    ];

    // ---------- Initialize ----------
    initChatbot();

    // ---------- Event Listeners ----------
    chatbotToggle.addEventListener('click', toggleChatbot);
    closeChatbot.addEventListener('click', toggleChatbot);
    sendMessage.addEventListener('click', handleChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatMessage();
    });

    // Listen for exam data loaded event from script.js
    window.addEventListener('examDataLoaded', function() {
        console.log('🔄 Exam data loaded event received');
        loadExamData();
    });

    // ---------- CORE FUNCTIONS ----------

    function initChatbot() {
        chatContext.conversationHistory = [];
        chatContext.isFirstMessage = true;
        chatContext.examData = null;
        chatContext.examDataLoaded = false;
        chatContext.userName = null;

        detectLanguagePreference();

        // Try to load exam data immediately (might be available already)
        loadExamData();

        // Fallback: try again after 2 seconds if not loaded
        if (!chatContext.examDataLoaded) {
            setTimeout(() => {
                if (!chatContext.examDataLoaded) {
                    console.log('⏳ Retrying exam data load...');
                    loadExamData();
                }
            }, 2000);
        }

        // Initial greeting
        setTimeout(() => {
            addBotMessage("Hello there! 👋 I'm your exam assistant. How can I help you today?", false);
        }, 800);
    }

    function detectLanguagePreference() {
        const browserLang = navigator.language || navigator.userLanguage;
        chatContext.languagePreference = browserLang.startsWith('bn') ? 'banglish' : 'english';
    }

    async function loadExamData() {
        chatContext.dataLoadAttempts++;
        try {
            console.log(`🔄 Loading exam data (attempt ${chatContext.dataLoadAttempts})...`);
            let data = null;

            // 1. Try to get from window.examData (set by script.js)
            if (window.examData && window.examData.length > 0) {
                data = window.examData;
                console.log('📋 Loaded from window.examData:', data.length);
            } 
            // 2. If not available, try to load from Firebase via dataFunctions
            else if (window.dataFunctions && typeof window.dataFunctions.loadExamsFromFirebase === 'function') {
                data = await window.dataFunctions.loadExamsFromFirebase();
                console.log('📋 Loaded from Firebase via dataFunctions:', data.length);
            } 
            // 3. Fallback: try to use refreshExamData if available
            else if (window.dataFunctions && typeof window.dataFunctions.refreshExamData === 'function') {
                data = await window.dataFunctions.refreshExamData();
                console.log('📋 Loaded via refreshExamData:', data.length);
            } 
            // 4. If still no data, try to directly use Firebase if available
            else if (window.firebase && window.firebase.db) {
                try {
                    const querySnapshot = await window.firebase.getDocs(
                        window.firebase.collection(window.firebase.db, "exams")
                    );
                    data = [];
                    querySnapshot.forEach((doc) => {
                        data.push({ id: doc.id, ...doc.data() });
                    });
                    console.log('📋 Loaded directly from Firebase:', data.length);
                } catch (firebaseError) {
                    console.error('❌ Direct Firebase load failed:', firebaseError);
                }
            }

            if (data && data.length > 0) {
                chatContext.examData = data;
                chatContext.examDataLoaded = true;
                console.log('✅ Exam data loaded successfully:', data.length, 'exams');
            } else {
                console.warn('⚠️ No exam data found (empty array or null).');
                if (chatContext.dataLoadAttempts < 3) {
                    // Retry after a delay if we think Firebase might still be initializing
                    setTimeout(() => loadExamData(), 2000);
                }
            }
        } catch (error) {
            console.error('❌ Error loading exam data:', error);
        }
    }

    function toggleChatbot() {
        chatbotContainer.classList.toggle('open');
        if (chatbotContainer.classList.contains('open')) {
            setTimeout(() => chatbotMessages.scrollTop = chatbotMessages.scrollHeight, 100);
            chatInput.focus();
            // If data not loaded, try loading again
            if (!chatContext.examDataLoaded) {
                loadExamData();
            }
        }
    }

    function addBotMessage(text, useDelay = true) {
        if (useDelay) {
            setTimeout(() => {
                _addBotMessage(text);
            }, 2000);
        } else {
            _addBotMessage(text);
        }
    }

    function _addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.style.opacity = '0';
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);

        chatContext.conversationHistory.push({
            role: 'assistant',
            content: text,
            timestamp: new Date().toISOString()
        });

        setTimeout(() => {
            messageDiv.style.transition = 'opacity 0.5s ease';
            messageDiv.style.opacity = '1';
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 10);
    }

    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);

        chatContext.conversationHistory.push({
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        });

        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
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
            indicator.style.transition = 'opacity 0.3s ease';
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
            }, 300);
        }
    }

    // ---------- MAIN MESSAGE HANDLER ----------

    async function handleChatMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;

        addUserMessage(message);
        chatInput.value = '';

        const typingId = showTypingIndicator();

        // Ensure data is loaded before processing
        if (!chatContext.examDataLoaded) {
            await loadExamData();
        }

        setTimeout(async () => {
            try {
                const response = await processUserMessage(message);
                removeTypingIndicator(typingId);
                addBotMessage(response);
            } catch (error) {
                console.error('❌ Error processing message:', error);
                removeTypingIndicator(typingId);
                addBotMessage("Sorry, I encountered an error. Please try again.");
            }
        }, 800);
    }

    // ---------- MESSAGE PROCESSING ENGINE ----------

    async function processUserMessage(message) {
        const lowerMessage = message.toLowerCase().trim();
        const originalMessage = message;

        // Ensure exam data is loaded
        if (!chatContext.examDataLoaded) {
            await loadExamData();
        }

        // STEP 1: Check predefined responses
        const predefinedResponse = getPredefinedResponse(lowerMessage, originalMessage);
        if (predefinedResponse) {
            return predefinedResponse;
        }

        // STEP 2: Handle exam queries (using actual data)
        const examResponse = await handleExamQuery(lowerMessage, originalMessage);
        if (examResponse) {
            return examResponse;
        }

        // STEP 3: Use OpenRouter AI for everything else
        const aiResponse = await getAIResponse(originalMessage);
        if (aiResponse) {
            return cleanAIResponse(aiResponse);
        }

        // STEP 4: Fallback
        return getFallbackResponse(originalMessage);
    }

    // ---------- PREDEFINED RESPONSE HANDLER ----------

    function getPredefinedResponse(lowerMessage, originalMessage) {
        // Exact match
        for (const [key, responses] of Object.entries(PRE_DEFINED_RESPONSES)) {
            if (lowerMessage.includes(key)) {
                return responses[chatContext.languagePreference] || responses.english;
            }
        }

        // Bengali phrases
        for (const [bengaliPhrase, englishKey] of Object.entries(BENGALI_PHRASES)) {
            if (originalMessage.includes(bengaliPhrase)) {
                const responses = PRE_DEFINED_RESPONSES[englishKey];
                if (responses) {
                    return responses[chatContext.languagePreference] || responses.english;
                }
            }
        }

        // Greeting detection
        if (isGreeting(lowerMessage, originalMessage)) {
            return getGreetingResponse();
        }

        // Thanks detection
        if (isThanks(lowerMessage, originalMessage)) {
            return PRE_DEFINED_RESPONSES["thank you"][chatContext.languagePreference] || 
                   PRE_DEFINED_RESPONSES["thank you"].english;
        }

        return null;
    }

    function isGreeting(lowerMessage, originalMessage) {
        const greetings = [
            'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'morning', 'afternoon', 'evening', 'gm', 'ga', 'ge',
            'হ্যালো', 'হাই', 'সালাম', 'আসসালামু', 'সুপ্রভাত', 'শুভ সকাল',
            'শুভ বিকাল', 'শুভ সন্ধ্যা', 'কেমন আছ', 'খবর কি'
        ];
        return greetings.some(greet => 
            lowerMessage.includes(greet.toLowerCase()) || 
            originalMessage.includes(greet)
        );
    }

    function getGreetingResponse() {
        const hour = new Date().getHours();
        let timeGreeting = '';
        if (hour < 12) timeGreeting = 'Good morning';
        else if (hour < 17) timeGreeting = 'Good afternoon';
        else timeGreeting = 'Good evening';

        const responses = {
            english: [
                `${timeGreeting}! 😊 How can I help you today?`,
                `${timeGreeting}! Ready to assist with your exam queries.`,
                `${timeGreeting}! What exam information do you need?`,
                `${timeGreeting}! Ask me about schedules, dates, or downloads.`
            ],
            banglish: [
                `${timeGreeting}! 😊 Ajke ki help korte pari?`,
                `${timeGreeting}! Ready to assist with তোমার exam queries.`,
                `${timeGreeting}! Ki exam information lagbe?`,
                `${timeGreeting}! Ask me about schedules, dates, বা downloads.`
            ]
        };
        const langResponses = responses[chatContext.languagePreference] || responses.english;
        return langResponses[Math.floor(Math.random() * langResponses.length)];
    }

    function isThanks(lowerMessage, originalMessage) {
        const thanksWords = [
            'thank', 'thanks', 'thx', 'appreciate', 'grateful',
            'ধন্যবাদ', 'অনুগ্রহ', 'শুক্রিয়া'
        ];
        return thanksWords.some(word => 
            lowerMessage.includes(word) || originalMessage.includes(word)
        );
    }

    // ---------- EXAM QUERY HANDLER (with real data) ----------

    async function handleExamQuery(lowerMessage, originalMessage) {
        // If no exam data, return null (will go to AI)
        if (!chatContext.examData || chatContext.examData.length === 0) {
            return null;
        }

        // Check if message has exam-related keywords
        const hasExamKeyword = EXAM_KEYWORDS.some(keyword => 
            lowerMessage.includes(keyword) || originalMessage.includes(keyword)
        );
        if (!hasExamKeyword) return null;

        // Specific queries
        if (lowerMessage.includes('next exam') || originalMessage.includes('পরবর্তী') || lowerMessage.includes('আগামী')) {
            return await getNextExamResponse();
        }
        if (lowerMessage.includes('today') || originalMessage.includes('আজ') || lowerMessage.includes('today\'s')) {
            return await getTodayExamsResponse();
        }
        if (lowerMessage.includes('download') || originalMessage.includes('ডাউনলোড') || lowerMessage.includes('pdf')) {
            return getDownloadResponse(lowerMessage);
        }

        // Subject extraction
        const subject = extractSubject(originalMessage);
        if (subject) {
            return await getSubjectExamResponse(subject);
        }

        // Department extraction
        const department = extractDepartment(originalMessage);
        if (department) {
            return await getDepartmentResponse(department);
        }

        // Generic routine query (return summary)
        return getGeneralExamInfo();
    }

    async function getNextExamResponse() {
        if (!chatContext.examData) return "Exam data not loaded yet. Please try again later.";

        const currentDate = new Date().toISOString().split('T')[0];
        const upcomingExams = chatContext.examData.filter(exam => exam.examDate >= currentDate);
        if (upcomingExams.length === 0) {
            return chatContext.languagePreference === 'banglish' 
                ? "No upcoming exams found. সব exams complete হয়ে গেছে! 🎉"
                : "No upcoming exams found. All exams are completed! 🎉";
        }

        upcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        const nextExam = upcomingExams[0];
        const daysLeft = Math.ceil((new Date(nextExam.examDate) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
        const dateDisplay = window.dataFunctions ? window.dataFunctions.formatDateShort(nextExam.examDate) : nextExam.examDate;

        let groupInfo = '';
        if (nextExam.examType === 'practical' && nextExam.group) {
            groupInfo = ` | Group: ${nextExam.group}`;
        }

        if (chatContext.languagePreference === 'banglish') {
            return `📅 **Next Exam:** ${nextExam.subject}<br>
                    **Department:** ${nextExam.department} - ${nextExam.semester}<br>
                    **Date:** ${dateDisplay}<br>
                    **Time:** ${nextExam.time}<br>
                    **Type:** ${(nextExam.examType || 'Written').toUpperCase()}${groupInfo}<br>
                    **Status:** ${daysLeft === 0 ? '🔥 Today!' : `${daysLeft} days left`}`;
        } else {
            return `📅 **Next Exam:** ${nextExam.subject}<br>
                    **Department:** ${nextExam.department} - ${nextExam.semester}<br>
                    **Date:** ${dateDisplay}<br>
                    **Time:** ${nextExam.time}<br>
                    **Type:** ${(nextExam.examType || 'Written').toUpperCase()}${groupInfo}<br>
                    **Status:** ${daysLeft === 0 ? '🔥 Today!' : `${daysLeft} days left`}`;
        }
    }

    async function getTodayExamsResponse() {
        if (!chatContext.examData) return "Exam data not loaded yet.";

        const today = new Date().toISOString().split('T')[0];
        const todaysExams = chatContext.examData.filter(exam => exam.examDate === today);
        if (todaysExams.length === 0) {
            return chatContext.languagePreference === 'banglish'
                ? "No exams scheduled for today. Enjoy your day! 🎉"
                : "No exams scheduled for today. Enjoy your day! 🎉";
        }

        let response = chatContext.languagePreference === 'banglish'
            ? `**Today's Exams (${todaysExams.length}):**<br><br>`
            : `**Today's Exams (${todaysExams.length}):**<br><br>`;

        todaysExams.forEach((exam, index) => {
            let typeInfo = (exam.examType || 'Written').toUpperCase();
            if (exam.examType === 'practical' && exam.group) typeInfo += ` (Group ${exam.group})`;
            response += `${index + 1}. **${exam.subject}**<br>`;
            response += `   ${exam.department} - ${exam.semester}<br>`;
            response += `   Time: ${exam.time} | Type: ${typeInfo}<br><br>`;
        });

        return response;
    }

    function getDownloadResponse(message) {
        // Check if they asked for a specific department or subject download
        const dept = extractDepartment(message);
        const subject = extractSubject(message);
        let suggestion = '';
        if (dept) {
            suggestion = `You can download the routine for ${dept} department by clicking the download button on the page.`;
        } else if (subject) {
            suggestion = `You can download the exam schedule for ${subject} by using the download feature.`;
        } else {
            suggestion = 'You can download the complete exam routine by clicking the download button on the page.';
        }

        const link = window.location.origin + '/';
        if (chatContext.languagePreference === 'banglish') {
            return `📥 **Download Help**<br>
                    ${suggestion}<br><br>
                    Alternatively, you can visit <a href="${link}" target="_blank">${link}</a> to access all features.<br>
                    💡 Tip: Use the "Download as JPG" or "Download as PDF" buttons on the main page.`;
        } else {
            return `📥 **Download Help**<br>
                    ${suggestion}<br><br>
                    Alternatively, you can visit <a href="${link}" target="_blank">${link}</a> to access all features.<br>
                    💡 Tip: Use the "Download as JPG" or "Download as PDF" buttons on the main page.`;
        }
    }

    function extractSubject(message) {
        const commonSubjects = [
            'physics', 'math', 'mathematics', 'chemistry', 'programming',
            'database', 'network', 'english', 'electrical', 'mechanical',
            'পদার্থ', 'গণিত', 'রসায়ন', 'প্রোগ্রামিং', 'ইংরেজি'
        ];
        for (const subject of commonSubjects) {
            if (message.toLowerCase().includes(subject.toLowerCase())) {
                return subject;
            }
        }
        return null;
    }

    async function getSubjectExamResponse(subject) {
        if (!chatContext.examData) return "Exam data not loaded yet.";

        const subjectExams = chatContext.examData.filter(exam => 
            exam.subject.toLowerCase().includes(subject.toLowerCase())
        );
        if (subjectExams.length === 0) {
            return chatContext.languagePreference === 'banglish'
                ? `No exams found for "${subject}". Try another subject.`
                : `No exams found for "${subject}". Try another subject.`;
        }

        const currentDate = new Date().toISOString().split('T')[0];
        const upcoming = subjectExams.filter(exam => exam.examDate >= currentDate).length;
        // Find the next exam for this subject
        const sorted = [...subjectExams].sort((a,b) => new Date(a.examDate) - new Date(b.examDate));
        const next = sorted.find(e => e.examDate >= currentDate) || sorted[0];
        const dateDisplay = window.dataFunctions ? window.dataFunctions.formatDateShort(next.examDate) : next.examDate;

        if (chatContext.languagePreference === 'banglish') {
            return `Found ${subjectExams.length} exams for **${subject}**<br>
                    Upcoming: ${upcoming}<br>
                    Next exam: ${next.subject} on ${dateDisplay} at ${next.time}<br>
                    Type: ${(next.examType || 'Written').toUpperCase()}<br>
                    Ask: 'When is ${subject} exam?' for more details.`;
        } else {
            return `Found ${subjectExams.length} exams for **${subject}**<br>
                    Upcoming: ${upcoming}<br>
                    Next exam: ${next.subject} on ${dateDisplay} at ${next.time}<br>
                    Type: ${(next.examType || 'Written').toUpperCase()}<br>
                    Ask: 'When is ${subject} exam?' for more details.`;
        }
    }

    function extractDepartment(message) {
        const departments = {
            'computer': ['computer', 'কম্পিউটার'],
            'civil': ['civil', 'সিভিল'],
            'electrical': ['electrical', 'ইলেকট্রিক্যাল'],
            'mechanical': ['mechanical', 'মেকানিক্যাল'],
            'electronics': ['electronics', 'ইলেকট্রনিক্স'],
            'power': ['power', 'পাওয়ার'],
            'tourism': ['tourism', 'ট্যুরিজম', 'tourism & hospitality']
        };
        for (const [dept, keywords] of Object.entries(departments)) {
            for (const keyword of keywords) {
                if (message.toLowerCase().includes(keyword.toLowerCase())) {
                    return dept;
                }
            }
        }
        return null;
    }

    async function getDepartmentResponse(department) {
        if (!chatContext.examData) return "Exam data not loaded yet.";

        const deptExams = chatContext.examData.filter(exam => 
            exam.department.toLowerCase().includes(department.toLowerCase())
        );
        if (deptExams.length === 0) {
            return chatContext.languagePreference === 'banglish'
                ? `No exams found for ${department} department.`
                : `No exams found for ${department} department.`;
        }

        const currentDate = new Date().toISOString().split('T')[0];
        const upcoming = deptExams.filter(exam => exam.examDate >= currentDate).length;
        const subjects = [...new Set(deptExams.map(e => e.subject))].slice(0, 5).join(', ');

        if (chatContext.languagePreference === 'banglish') {
            return `**${department.toUpperCase()} Department**<br>
                    Total exams: ${deptExams.length}<br>
                    Upcoming exams: ${upcoming}<br>
                    Subjects: ${subjects}${deptExams.length > 5 ? '...' : ''}<br>
                    Ask: '${department} 3rd semester exams' for specific info.`;
        } else {
            return `**${department.toUpperCase()} Department**<br>
                    Total exams: ${deptExams.length}<br>
                    Upcoming exams: ${upcoming}<br>
                    Subjects: ${subjects}${deptExams.length > 5 ? '...' : ''}<br>
                    Ask: '${department} 3rd semester exams' for specific info.`;
        }
    }

    function getGeneralExamInfo() {
        if (!chatContext.examData || chatContext.examData.length === 0) {
            return chatContext.languagePreference === 'banglish'
                ? "I don't have any exam data right now. Please try again later."
                : "I don't have any exam data right now. Please try again later.";
        }

        const total = chatContext.examData.length;
        const currentDate = new Date().toISOString().split('T')[0];
        const upcoming = chatContext.examData.filter(e => e.examDate >= currentDate).length;
        const today = chatContext.examData.filter(e => e.examDate === currentDate).length;
        const depts = [...new Set(chatContext.examData.map(e => e.department))].slice(0, 5).join(', ');

        if (chatContext.languagePreference === 'banglish') {
            return `📊 **Exam Summary:**<br>
                    Total exams: ${total}<br>
                    Upcoming: ${upcoming}<br>
                    Today: ${today}<br>
                    Departments: ${depts}${chatContext.examData.length > 5 ? '...' : ''}<br><br>
                    Ask me about specific departments, subjects, or 'next exam'.`;
        } else {
            return `📊 **Exam Summary:**<br>
                    Total exams: ${total}<br>
                    Upcoming: ${upcoming}<br>
                    Today: ${today}<br>
                    Departments: ${depts}${chatContext.examData.length > 5 ? '...' : ''}<br><br>
                    Ask me about specific departments, subjects, or 'next exam'.`;
        }
    }

    // ---------- OpenRouter AI RESPONSE HANDLER ----------

    async function getAIResponse(userMessage) {
        // Rate limit
        const now = Date.now();
        if (OPENROUTER_CONFIG.lastCallTime > 0 && 
            (now - OPENROUTER_CONFIG.lastCallTime) < OPENROUTER_CONFIG.RATE_LIMIT_MS) {
            console.log('⏳ Rate limited, using fallback');
            return null;
        }

        try {
            const prompt = createAIPrompt(userMessage);

            const response = await fetch(OPENROUTER_CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_CONFIG.API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Routine Explorer Chatbot'
                },
                body: JSON.stringify({
                    model: OPENROUTER_CONFIG.MODEL,
                    messages: [
                        { role: 'system', content: prompt },
                        ...chatContext.conversationHistory.slice(-5).map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        }))
                    ],
                    max_tokens: 250,
                    temperature: 0.7,
                    top_p: 0.9
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ OpenRouter API error:', response.status, errorData);
                return null;
            }

            const data = await response.json();
            OPENROUTER_CONFIG.lastCallTime = now;

            let aiResponse = data.choices?.[0]?.message?.content || data.message || data.content;
            if (!aiResponse && data.choices && data.choices[0]) {
                aiResponse = data.choices[0].message?.content;
            }

            return aiResponse;
        } catch (error) {
            console.error('❌ OpenRouter API error:', error);
            return null;
        }
    }

    function createAIPrompt(userMessage) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        let prompt = `You are "Routine Explorer", a helpful and friendly exam assistant chatbot. `;
        prompt += `Today is ${currentDate}. `;
        prompt += `You help students with exam schedules, dates, departments, and general academic queries.\n\n`;

        prompt += `IMPORTANT LANGUAGE INSTRUCTION:\n`;
        prompt += `- Respond in English OR Banglish (mix of English words with Bangla grammar/structure).\n`;
        prompt += `- DO NOT use pure Bangla (Bengali script).\n`;
        prompt += `- Examples of Banglish: "Ki obostha?", "Kemon aso?", "Exam routine lagbe?", "Koto taka?"\n`;
        prompt += `- Keep responses friendly, concise (2-4 sentences), and helpful.\n\n`;

        // If we have exam data, include a summary
        if (chatContext.examData && chatContext.examData.length > 0) {
            const total = chatContext.examData.length;
            const currentDateStr = new Date().toISOString().split('T')[0];
            const upcoming = chatContext.examData.filter(e => e.examDate >= currentDateStr).length;
            prompt += `Current exam database: ${total} total exams, ${upcoming} upcoming.\n`;
            prompt += `Departments available: ${[...new Set(chatContext.examData.map(e => e.department))].join(', ')}.\n\n`;
        }

        prompt += `Student's message: "${userMessage}"\n\n`;
        prompt += `Your response:`;

        return prompt;
    }

    function cleanAIResponse(response) {
        if (!response) return "I understand. How can I assist you today?";
        response = response.trim();
        if (response.length < 5) {
            return "Thanks for your message! How can I help you?";
        }
        // Remove any markdown or extra symbols if needed
        return response;
    }

    // ---------- FALLBACK RESPONSE ----------

    function getFallbackResponse(message) {
        const responses = {
            english: [
                "I'm here to help with exam schedules and general questions! What would you like to know?",
                "Thanks for your message! I can help with exam dates, routines, and more. Ask me anything!",
                "Hello! I'm your exam assistant. How can I help you today?",
                "Got your message! I'm ready to assist with exam information or any questions you have."
            ],
            banglish: [
                "I'm here to help with exam schedules এবং general questions! Ki jante chao?",
                "Thanks for your message! I can help with exam dates, routines, আরও অনেক কিছু. Ask me anything!",
                "Hello! I'm your exam assistant. Ajke ki help korte pari?",
                "Got your message! I'm ready to assist with exam information বা any questions you have."
            ]
        };
        const langResponses = responses[chatContext.languagePreference] || responses.english;
        return langResponses[Math.floor(Math.random() * langResponses.length)];
    }

    // ---------- UTILITY ----------

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    // ---------- EXPOSE TO GLOBAL ----------

    window.smartChatbot = {
        processMessage: processUserMessage,
        setLanguage: (lang) => {
            if (['english', 'banglish'].includes(lang)) {
                chatContext.languagePreference = lang;
                return `Language set to ${lang}`;
            }
            return 'Invalid language. Use "english" or "banglish"';
        },
        getLanguage: () => chatContext.languagePreference,
        reset: initChatbot,
        loadExamData: loadExamData
    };

    console.log('🤖 Chatbot initialized with OpenRouter API');
});