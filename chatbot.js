// smart-conversation-chatbot.js - Complete Update with Advanced Features + Date Patterns + Website Info + Multiple External Replies

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // Chat context
    let chatContext = {
        userName: null,
        conversationHistory: [],
        languagePreference: 'english',
        examData: null,
        currentDate: null
    };

    // Predefined responses for static questions
    const PRE_DEFINED_RESPONSES = {
        // Identity & website info
        "who are you": {
            english: "I'm Routine Explorer, your exam assistant bot! 🤖 I help students with exam schedules, dates, and academic information.",
            banglish: "I'm Routine Explorer, তোমার exam assistant bot! 🤖 ami students ke exam schedules, dates এবং academic information e help kori।"
        },
        "what is your name": {
            english: "My name is Routine Explorer! You can call me RE for short. 😊",
            banglish: "My name is Routine Explorer! তুমি আমাকে RE বলতে পারো short এ। 😊"
        },
        "what is this website": {
            english: "This is **Explore Routine** – a comprehensive exam routine management system for Barisal Polytechnic Institute students. You can view, filter, download, and set reminders for all exam schedules. 📚",
            banglish: "এটা **Explore Routine** – Barisal Polytechnic Institute students এর জন্য একটি comprehensive exam routine management system। এখানে তুমি exam schedules দেখতে, filter করতে, download করতে এবং reminders set করতে পারো। 📚"
        },
        "what is explore routine": {
            english: "Explore Routine is a web platform where students can easily find their exam schedules, filter by department, semester, and exam type, download routines as PDF/JPG, and get notifications for upcoming exams. 🎓",
            banglish: "Explore Routine হলো একটি web platform যেখানে students সহজেই তাদের exam schedules খুঁজে পায়, department, semester এবং exam type অনুযায়ী filter করতে পারে, routines PDF/JPG হিসেবে download করতে পারে এবং upcoming exams এর জন্য notifications পায়। 🎓"
        },
        "how does this website work": {
            english: "The website displays all exam data from a Firebase database. You can select filters (department, semester, exam type) to view specific routines. Each exam shows date, time, type, and status. Admins can add/edit exams. You can also download and share exam details. 📱",
            banglish: "এই website টি Firebase database থেকে সব exam data দেখায়। তুমি filters (department, semester, exam type) select করে নির্দিষ্ট routines দেখতে পারো। প্রতিটি exam এর তারিখ, সময়, type এবং status দেখায়। Admins exams যোগ/সম্পাদনা করতে পারে। তুমি exam details download এবং share করতে পারো। 📱"
        },
        "what can i do on this website": {
            english: "You can: \n• View all exam schedules\n• Filter by department, semester, exam type\n• Search for specific subjects\n• Download routines as PDF or JPG\n• Set reminders for upcoming exams\n• View statistics and upcoming exams list\n• Ask me any exam-related questions! 😊",
            banglish: "তুমি পারো: \n• সব exam schedules দেখতে\n• department, semester, exam type অনুযায়ী filter করতে\n• নির্দিষ্ট subject search করতে\n• routines PDF বা JPG হিসেবে download করতে\n• upcoming exams এর জন্য reminder set করতে\n• statistics এবং upcoming exams list দেখতে\n• আমাকে যেকোনো exam-related প্রশ্ন করতে! 😊"
        },
        // Greetings (already handled by isGreeting, but add static ones for fallback)
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

    // Bengali phrases mapping (for predefined responses)
    const BENGALI_PHRASES = {
        "তুমি কে": "who are you",
        "তোমার নাম কি": "what is your name",
        "এই ওয়েবসাইট কি": "what is this website",
        "এই সাইট কি": "what is this website",
        "এক্সপ্লোর রুটিন কি": "what is explore routine",
        "এই ওয়েবসাইট কিভাবে কাজ করে": "how does this website work",
        "কিভাবে কাজ করে": "how does this website work",
        "কি করতে পারি": "what can i do on this website",
        "কেমন আছ": "how are you",
        "খবর কি": "what's up",
        "কী করছ": "what's up",
        "ধন্যবাদ": "thank you",
        "অনুগ্রহ": "thank you",
        "বিদায়": "goodbye",
        "আসি": "goodbye"
    };

    // Shortcut commands mapping
    const SHORTCUT_COMMANDS = {
        'dn': { action: 'download', keyword: 'download' },
        'download': { action: 'download', keyword: 'download' },
        'dwnload': { action: 'download', keyword: 'download' },
        'daunload': { action: 'download', keyword: 'download' },
        'pdf': { action: 'download', keyword: 'download' },
        'next': { action: 'next_exam', keyword: 'next exam' },
        'nxt': { action: 'next_exam', keyword: 'next exam' },
        'porer exam': { action: 'next_exam', keyword: 'next exam' },
        'set notification': { action: 'set_reminder', keyword: 'set reminder' },
        'reminder': { action: 'set_reminder', keyword: 'set reminder' },
        'remind me': { action: 'set_reminder', keyword: 'set reminder' }
    };

    // External question responses (randomly picked)
    const EXTERNAL_RESPONSES = {
        english: [
            "Sorry, I couldn’t understand your request. It seems like you might be asking about something outside this website’s knowledge.",
            "Sorry, my brain isn’t updated enough to understand that request. Maybe you’re asking about something completely unrelated to this website.",
            "Dear, couldn't understand your request. I’m specialized in exam-related queries only. 😊",
            "Hmm, that doesn’t seem to be about exam schedules or this website. I can only help with exam-related questions.",
            "I'm not programmed to answer that. Try asking me about exam dates, departments, or routines!"
        ],
        banglish: [
            "Sorry, I couldn’t understand your request. Mone hoy apni website er baire kichu jante chachen.",
            "Sorry, my brain isn’t updated enough to understand that request. Hoto apni erokom kichu jiggesh korchen ja website er sathe related na.",
            "Dear, couldn't understand your request. Ami shudhu exam-related questions e help korte pari. 😊",
            "Hmm, eta exam schedule ba ei website er kotha mone hocche na. Ami shudhu exam-related questions e help korte pari.",
            "Ami oi answer ta dite parbo na. Exam dates, departments, ba routines niye jiggesh korun."
        ]
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

    // Initial greeting
    setTimeout(() => {
        addBotMessage("Hello there! 👋 I'm your exam assistant. How can I help you today?", false);
    }, 800);

    // ============== CORE FUNCTIONS ==============

    function initChatbot() {
        chatContext.conversationHistory = [];
        chatContext.examData = null;
        chatContext.userName = null;
        chatContext.currentDate = new Date().toISOString().split('T')[0];
        detectLanguagePreference();
        loadExamData();
    }

    function detectLanguagePreference() {
        const browserLang = navigator.language || navigator.userLanguage;
        chatContext.languagePreference = browserLang.startsWith('bn') ? 'banglish' : 'english';
    }

    async function loadExamData() {
        try {
            const data = await getFreshExamData();
            chatContext.examData = data;
            console.log('Exam data loaded:', data.length);
        } catch (error) {
            console.log('Could not load exam data:', error);
        }
    }

    function toggleChatbot() {
        chatbotContainer.classList.toggle('open');
        if (chatbotContainer.classList.contains('open')) {
            setTimeout(() => chatbotMessages.scrollTop = chatbotMessages.scrollHeight, 100);
            chatInput.focus();
        }
    }

    function addBotMessage(text, useDelay = true) {
        if (useDelay) {
            setTimeout(() => _addBotMessage(text), 2000);
        } else {
            _addBotMessage(text);
        }
    }

    function _addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.style.opacity = '0';
        messageDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
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

    async function handleChatMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        addUserMessage(message);
        chatInput.value = '';
        
        const typingId = showTypingIndicator();
        
        setTimeout(async () => {
            try {
                const response = await processUserMessage(message);
                removeTypingIndicator(typingId);
                addBotMessage(response);
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator(typingId);
                addBotMessage("Sorry, I encountered an error. Please try again.");
            }
        }, 2000);
    }

    // ============== MESSAGE PROCESSING ENGINE ==============

    async function processUserMessage(message) {
        const lowerMessage = message.toLowerCase().trim();
        const originalMessage = message;
        
        // Step 0: Check for shortcut commands first
        const shortcutResult = handleShortcuts(lowerMessage, originalMessage);
        if (shortcutResult) {
            return shortcutResult;
        }

        // Step 1: Check for dynamic exam queries
        const examResponse = await handleExamQuery(lowerMessage, originalMessage);
        if (examResponse) {
            return examResponse;
        }
        
        // Step 2: Check for predefined responses (including website info)
        const predefinedResponse = getPredefinedResponse(lowerMessage, originalMessage);
        if (predefinedResponse) {
            return predefinedResponse;
        }
        
        // Step 3: If still no match, return external response
        return getExternalQueryResponse();
    }

    // ============== HANDLE SHORTCUTS ==============

    function handleShortcuts(lowerMessage, originalMessage) {
        for (const [cmd, config] of Object.entries(SHORTCUT_COMMANDS)) {
            if (lowerMessage === cmd || lowerMessage.includes(cmd)) {
                if (config.action === 'download') {
                    if (window.downloadRoutine) {
                        window.downloadRoutine();
                        return "⏳ Downloading exam routine as PDF... Please wait.";
                    } else {
                        return "📄 Download function is not available right now. Please use the download button on the page.";
                    }
                }
                if (config.action === 'next_exam') {
                    return null; // let exam query handle it
                }
                if (config.action === 'set_reminder') {
                    return null; // let exam query handle it
                }
            }
        }
        return null;
    }

    // ============== EXTERNAL QUERY RESPONSE ==============

    function getExternalQueryResponse() {
        const responses = chatContext.languagePreference === 'banglish' 
            ? EXTERNAL_RESPONSES.banglish 
            : EXTERNAL_RESPONSES.english;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // ============== PREDEFINED RESPONSES (including website info) ==============

    function getPredefinedResponse(lowerMessage, originalMessage) {
        // Check exact matches
        for (const [key, responses] of Object.entries(PRE_DEFINED_RESPONSES)) {
            if (lowerMessage.includes(key)) {
                return responses[chatContext.languagePreference] || responses.english;
            }
        }
        // Check Bengali phrases
        for (const [bengaliPhrase, englishKey] of Object.entries(BENGALI_PHRASES)) {
            if (originalMessage.includes(bengaliPhrase)) {
                const responses = PRE_DEFINED_RESPONSES[englishKey];
                if (responses) {
                    return responses[chatContext.languagePreference] || responses.english;
                }
            }
        }
        // Check for greetings (dynamic)
        if (isGreeting(lowerMessage, originalMessage)) {
            return getGreetingResponse();
        }
        // Check for thanks
        if (isThanks(lowerMessage, originalMessage)) {
            return PRE_DEFINED_RESPONSES["thank you"][chatContext.languagePreference];
        }
        return null;
    }

    function isGreeting(lowerMessage, originalMessage) {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'morning', 'afternoon', 'evening', 'gm', 'ga', 'ge',
            'হ্যালো', 'হাই', 'সালাম', 'আসসালামু', 'সুপ্রভাত', 'শুভ সকাল',
            'শুভ বিকাল', 'শুভ সন্ধ্যা', 'কেমন আছ', 'খবর কি'];
        return greetings.some(greet => lowerMessage.includes(greet) || originalMessage.includes(greet));
    }

    function getGreetingResponse() {
        const hour = new Date().getHours();
        let timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
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
        const thanksWords = ['thank', 'thanks', 'thx', 'appreciate', 'grateful', 'ধন্যবাদ', 'অনুগ্রহ', 'শুক্রিয়া'];
        return thanksWords.some(word => lowerMessage.includes(word) || originalMessage.includes(word));
    }

    // ============== ADVANCED EXAM QUERY HANDLER ==============

    async function handleExamQuery(lowerMessage, originalMessage) {
        if (!chatContext.examData || chatContext.examData.length === 0) {
            await loadExamData();
            if (!chatContext.examData || chatContext.examData.length === 0) {
                return null;
            }
        }

        // ----- 1. SET REMINDER -----
        if (lowerMessage.includes('set reminder') || lowerMessage.includes('remind me') || 
            lowerMessage.includes('set notification') || originalMessage.includes('রিমাইন্ডার') ||
            originalMessage.includes('নোটিফিকেশন')) {
            return await handleSetReminder(lowerMessage, originalMessage);
        }

        // ----- 2. DOWNLOAD -----
        if (lowerMessage.includes('download') || lowerMessage.includes('pdf') || 
            lowerMessage.includes('ডাউনলোড') || lowerMessage === 'dn') {
            if (window.downloadRoutine) {
                window.downloadRoutine();
                return "⏳ Downloading exam routine as PDF... Please wait.";
            } else {
                return "📄 Download function is not available right now. Please use the download button on the page.";
            }
        }

        // ----- 3. NEXT EXAM -----
        if (lowerMessage.includes('next exam') || lowerMessage.includes('next') || 
            lowerMessage.includes('nxt') || lowerMessage.includes('পরবর্তী') ||
            lowerMessage === 'porer exam') {
            return await getNextExamResponse();
        }

        // ----- 4. TOMORROW'S EXAM -----
        if (lowerMessage.includes('tomorrow') || lowerMessage.includes('আগামীকাল') || 
            lowerMessage.includes('agami kal')) {
            return await getTomorrowExamsResponse();
        }

        // ----- 5. SPECIFIC DATE SEARCH (improved) -----
        const dateMatch = extractDate(originalMessage);
        if (dateMatch) {
            return await getExamsByDate(dateMatch);
        }

        // ----- 6. NEXT PRACTICAL EXAM -----
        if (lowerMessage.includes('practical') && (lowerMessage.includes('next') || lowerMessage.includes('পরবর্তী'))) {
            return await getNextExamByType('practical');
        }

        // ----- 7. NEXT REFERRED EXAM -----
        if (lowerMessage.includes('referred') && (lowerMessage.includes('next') || lowerMessage.includes('পরবর্তী'))) {
            return await getNextExamByType('referred');
        }

        // ----- 8. DEPARTMENT + SEMESTER + TYPE (e.g., computer 5th referred exam) -----
        const deptSemesterType = extractDeptSemesterType(originalMessage);
        if (deptSemesterType) {
            return await getExamsByDeptSemesterType(deptSemesterType);
        }

        // ----- 9. DEPARTMENT + SEMESTER -----
        const deptSemester = extractDeptSemester(originalMessage);
        if (deptSemester) {
            return await getExamsByDeptSemester(deptSemester);
        }

        // ----- 10. SUBJECT SEARCH -----
        const subject = extractSubject(originalMessage);
        if (subject) {
            return await getSubjectExamResponse(subject);
        }

        // ----- 11. DEPARTMENT SEARCH -----
        const department = extractDepartment(originalMessage);
        if (department) {
            return await getDepartmentResponse(department);
        }

        // ----- 12. GENERIC EXAM HELP -----
        if (lowerMessage.includes('exam') || lowerMessage.includes('routine') || 
            originalMessage.includes('পরীক্ষা') || originalMessage.includes('রুটিন')) {
            return getGenericExamHelp();
        }

        return null;
    }

    // ============== RESPONSE GENERATORS ==============

    async function getNextExamResponse() {
        const exams = chatContext.examData;
        const currentDate = chatContext.currentDate;
        const upcoming = exams.filter(e => e.examDate >= currentDate);
        if (upcoming.length === 0) {
            return lang("No upcoming exams found. All exams are completed! 🎉", 
                       "No upcoming exams found. সব exams complete হয়ে গেছে! 🎉");
        }
        upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        const exam = upcoming[0];
        return formatExamDetails(exam, true);
    }

    async function getTomorrowExamsResponse() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        const exams = chatContext.examData.filter(e => e.examDate === dateStr);
        if (exams.length === 0) {
            return lang("No exams scheduled for tomorrow. 🎉", "Agamikal kono exam nei. 🎉");
        }
        let response = lang(`**Tomorrow's Exams (${exams.length}):**\n\n`, `**Agamikal er Exams (${exams.length}):**\n\n`);
        exams.forEach((exam, i) => {
            response += `${i+1}. ${exam.subject} (${exam.department} - ${exam.semester}) | ${exam.time}\n`;
            if (exam.examType === 'practical' && exam.group) {
                response += `   Group: ${exam.group}\n`;
            }
        });
        return response;
    }

    async function getExamsByDate(dateStr) {
        const exams = chatContext.examData.filter(e => e.examDate === dateStr);
        if (exams.length === 0) {
            return lang(`No exams found on ${formatDate(dateStr)}.`, `${formatDate(dateStr)} tarikhe kono exam nei.`);
        }
        let response = lang(`**Exams on ${formatDate(dateStr)} (${exams.length}):**\n\n`, 
                           `**${formatDate(dateStr)} tarikher exams (${exams.length}):**\n\n`);
        exams.forEach((exam, i) => {
            response += `${i+1}. ${exam.subject} (${exam.department} - ${exam.semester}) | ${exam.time}\n`;
            if (exam.examType === 'practical' && exam.group) {
                response += `   Group: ${exam.group}\n`;
            }
        });
        return response;
    }

    async function getNextExamByType(type) {
        const exams = chatContext.examData;
        const currentDate = chatContext.currentDate;
        const filtered = exams.filter(e => e.examDate >= currentDate && (e.examType || 'written') === type);
        if (filtered.length === 0) {
            return lang(`No upcoming ${type} exams found.`, `${type} er kono upcoming exam nei.`);
        }
        filtered.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        const exam = filtered[0];
        return formatExamDetails(exam, true);
    }

    function extractDeptSemesterType(message) {
        const lower = message.toLowerCase();
        const depts = ['computer', 'civil', 'electrical', 'mechanical', 'electronics', 'power', 'electro-medical', 'tourism'];
        const sems = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
        const types = ['referred', 'practical', 'written'];
        let dept = null, sem = null, type = null;
        for (const d of depts) {
            if (lower.includes(d)) { dept = d; break; }
        }
        for (const s of sems) {
            if (lower.includes(s)) { sem = s; break; }
        }
        for (const t of types) {
            if (lower.includes(t)) { type = t; break; }
        }
        if (dept && sem && type) return { dept, sem, type };
        if (dept && sem) return { dept, sem, type: null };
        return null;
    }

    async function getExamsByDeptSemesterType({ dept, sem, type }) {
        let exams = chatContext.examData.filter(e => 
            e.department.toLowerCase().includes(dept) && 
            e.semester === sem
        );
        if (type) {
            exams = exams.filter(e => (e.examType || 'written') === type);
        }
        if (exams.length === 0) {
            return lang(`No exams found for ${dept} ${sem} ${type ? type : ''}.`, 
                       `${dept} ${sem} ${type ? type : ''} er kono exam nei.`);
        }
        exams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        let response = lang(`**${dept} ${sem} ${type ? type : ''} Exams (${exams.length}):**\n\n`, 
                           `**${dept} ${sem} ${type ? type : ''} Exams (${exams.length}):**\n\n`);
        exams.forEach((exam, i) => {
            response += `${i+1}. ${exam.subject} | ${formatDate(exam.examDate)} | ${exam.time}\n`;
        });
        return response;
    }

    function extractDeptSemester(message) {
        const depts = ['computer', 'civil', 'electrical', 'mechanical', 'electronics', 'power', 'electro-medical', 'tourism'];
        const sems = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
        let dept = null, sem = null;
        for (const d of depts) {
            if (message.toLowerCase().includes(d)) { dept = d; break; }
        }
        for (const s of sems) {
            if (message.toLowerCase().includes(s)) { sem = s; break; }
        }
        if (dept && sem) return { dept, sem };
        return null;
    }

    async function getExamsByDeptSemester({ dept, sem }) {
        const exams = chatContext.examData.filter(e => 
            e.department.toLowerCase().includes(dept) && 
            e.semester === sem
        );
        if (exams.length === 0) {
            return lang(`No exams found for ${dept} ${sem}.`, `${dept} ${sem} er kono exam nei.`);
        }
        exams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        let response = lang(`**${dept} ${sem} Exams (${exams.length}):**\n\n`, `**${dept} ${sem} Exams (${exams.length}):**\n\n`);
        exams.forEach((exam, i) => {
            response += `${i+1}. ${exam.subject} | ${formatDate(exam.examDate)} | ${exam.time}\n`;
            if (exam.examType === 'practical' && exam.group) {
                response += `   Group: ${exam.group}\n`;
            }
        });
        return response;
    }

    // ============== IMPROVED DATE EXTRACTION ==============

    function extractDate(message) {
        // Try multiple patterns: 
        // - YYYY-MM-DD
        // - DD/MM/YYYY, MM/DD/YYYY
        // - DD-MM-YYYY, MM-DD-YYYY
        // - Month DD, YYYY (e.g., Aug 8, 2026)
        // - DD Month YYYY (e.g., 8 August 2026)
        // - "tomorrow" or "today" handled separately

        // 1. YYYY-MM-DD
        let match = message.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) return match[0];

        // 2. DD/MM/YYYY or MM/DD/YYYY (try both)
        match = message.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
            let day = parseInt(match[1]), month = parseInt(match[2]), year = parseInt(match[3]);
            // If day > 12, assume DD/MM/YYYY
            if (day > 12) {
                return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            } else {
                // Could be MM/DD/YYYY or DD/MM/YYYY - we'll treat as MM/DD/YYYY (US style)
                return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            }
        }

        // 3. DD-MM-YYYY or MM-DD-YYYY
        match = message.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (match) {
            let day = parseInt(match[1]), month = parseInt(match[2]), year = parseInt(match[3]);
            if (day > 12) {
                return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            } else {
                return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            }
        }

        // 4. Month name formats: Aug 8, 2026 or 8 August 2026
        const monthNames = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
        };
        // Pattern: MonthName DD, YYYY
        match = message.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/i);
        if (match) {
            const monthKey = match[1].toLowerCase().slice(0,3);
            if (monthNames[monthKey]) {
                const month = monthNames[monthKey];
                const day = parseInt(match[2]);
                const year = parseInt(match[3]);
                return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            }
        }
        // Pattern: DD MonthName YYYY
        match = message.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/i);
        if (match) {
            const monthKey = match[2].toLowerCase().slice(0,3);
            if (monthNames[monthKey]) {
                const month = monthNames[monthKey];
                const day = parseInt(match[1]);
                const year = parseInt(match[3]);
                return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            }
        }

        return null;
    }

    function extractSubject(message) {
        const commonSubjects = ['physics', 'math', 'mathematics', 'chemistry', 'programming',
            'database', 'network', 'english', 'electrical', 'mechanical', 'পদার্থ', 'গণিত', 'রসায়ন', 'প্রোগ্রামিং', 'ইংরেজি'];
        for (const sub of commonSubjects) {
            if (message.toLowerCase().includes(sub.toLowerCase())) {
                return sub;
            }
        }
        return null;
    }

    async function getSubjectExamResponse(subject) {
        const exams = chatContext.examData.filter(e => e.subject.toLowerCase().includes(subject.toLowerCase()));
        if (exams.length === 0) {
            return lang(`No exams found for "${subject}".`, `"${subject}" er kono exam nei.`);
        }
        const currentDate = chatContext.currentDate;
        const upcoming = exams.filter(e => e.examDate >= currentDate).length;
        let response = lang(`Found ${exams.length} exams for **${subject}**\nUpcoming: ${upcoming}\n\n`,
                           `**${subject}** er ${exams.length} ta exam paoa geche\nUpcoming: ${upcoming}\n\n`);
        exams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        exams.forEach((exam, i) => {
            response += `${i+1}. ${exam.department} - ${exam.semester} | ${formatDate(exam.examDate)} | ${exam.time}\n`;
        });
        return response;
    }

    function extractDepartment(message) {
        const depts = {
            'computer': ['computer', 'কম্পিউটার'],
            'civil': ['civil', 'সিভিল'],
            'electrical': ['electrical', 'ইলেকট্রিক্যাল'],
            'mechanical': ['mechanical', 'মেকানিক্যাল'],
            'electronics': ['electronics', 'ইলেকট্রনিক্স'],
            'power': ['power', 'পাওয়ার'],
            'electro-medical': ['electro-medical', 'ইলেক্ট্রো-মেডিকেল'],
            'tourism': ['tourism', 'ট্যুরিজম']
        };
        for (const [dept, keywords] of Object.entries(depts)) {
            for (const kw of keywords) {
                if (message.toLowerCase().includes(kw.toLowerCase())) {
                    return dept;
                }
            }
        }
        return null;
    }

    async function getDepartmentResponse(department) {
        const exams = chatContext.examData.filter(e => e.department.toLowerCase().includes(department.toLowerCase()));
        if (exams.length === 0) {
            return lang(`No exams found for ${department} department.`, `${department} department e kono exam nei.`);
        }
        const currentDate = chatContext.currentDate;
        const upcoming = exams.filter(e => e.examDate >= currentDate).length;
        let response = lang(`**${department.toUpperCase()} Department**\nTotal exams: ${exams.length}\nUpcoming: ${upcoming}\n\n`,
                           `**${department.toUpperCase()} Department**\nTotal exams: ${exams.length}\nUpcoming: ${upcoming}\n\n`);
        exams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        exams.forEach((exam, i) => {
            response += `${i+1}. ${exam.subject} (${exam.semester}) | ${formatDate(exam.examDate)} | ${exam.time}\n`;
        });
        return response;
    }

    function getGenericExamHelp() {
        return lang(
            "I can help you with exam information. Try asking:\n• 'Next exam' - shows upcoming exam\n• 'Tomorrow exams' - lists exams for tomorrow\n• 'Computer 5th referred exam' - filter by dept, sem, type\n• 'Physics exam date' - search by subject\n• 'Set reminder' - set reminder for next exam",
            "Ami exam information e help korte pari. Try ask:\n• 'Next exam' - upcoming exam dekhabe\n• 'Tomorrow exams' - agamikaler exams\n• 'Computer 5th referred exam' - dept, sem, type diye search\n• 'Physics exam date' - subject diye search\n• 'Set reminder' - next exam er reminder set korbe"
        );
    }

    // ============== SET REMINDER ==============

    async function handleSetReminder(lowerMessage, originalMessage) {
        let targetExam = null;
        const subject = extractSubject(originalMessage);
        if (subject) {
            const exams = chatContext.examData.filter(e => e.subject.toLowerCase().includes(subject.toLowerCase()));
            if (exams.length > 0) {
                const currentDate = chatContext.currentDate;
                const upcoming = exams.filter(e => e.examDate >= currentDate);
                if (upcoming.length > 0) {
                    upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
                    targetExam = upcoming[0];
                }
            }
        }
        if (!targetExam) {
            const upcoming = chatContext.examData.filter(e => e.examDate >= chatContext.currentDate);
            if (upcoming.length === 0) {
                return lang("No upcoming exams to set reminder for.", "Reminder set korar moto kono upcoming exam nei.");
            }
            upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
            targetExam = upcoming[0];
        }

        if (window.showNotificationOptions) {
            window.showNotificationOptions(targetExam);
            return lang(`Reminder set for **${targetExam.subject}** on ${formatDate(targetExam.examDate)} at ${targetExam.time}. You will be notified. ✅`,
                       `**${targetExam.subject}** er jonno reminder set kora hoyeche ${formatDate(targetExam.examDate)} ${targetExam.time} te. Notification paaben. ✅`);
        } else {
            if ("Notification" in window && Notification.permission === "granted") {
                const examDateTime = new Date(`${targetExam.examDate}T${convertTimeTo24Hour(targetExam.time)}`);
                const now = new Date();
                const delay = examDateTime - now;
                if (delay > 0) {
                    setTimeout(() => {
                        new Notification(`📚 ${targetExam.subject} Exam Reminder`, {
                            body: `${targetExam.department} - ${targetExam.semester}\nTime: ${targetExam.time}`,
                            icon: "/favicon.ico",
                            requireInteraction: true
                        });
                    }, delay);
                    return lang(`Reminder set for **${targetExam.subject}** at ${targetExam.time}. You will be notified. ✅`,
                               `**${targetExam.subject}** er jonno reminder set kora hoyeche ${targetExam.time} te. Notification paaben. ✅`);
                } else {
                    return lang("Cannot set reminder for past exam.", "Past exam er jonno reminder set kora jay na.");
                }
            } else {
                return lang("Please enable notifications in your browser to set reminders.", "Reminder set korar jonno browser e notification enable koren.");
            }
        }
    }

    // ============== UTILITY FUNCTIONS ==============

    function formatExamDetails(exam, showStatus = true) {
        const dateDisplay = formatDate(exam.examDate);
        const type = exam.examType || 'written';
        const typeText = type === 'practical' ? 'Practical' : type === 'referred' ? 'Referred' : 'Written';
        let groupText = '';
        if (type === 'practical' && exam.group) {
            groupText = `\nGroup: ${exam.group}`;
        }
        let statusText = '';
        if (showStatus) {
            const currentDate = chatContext.currentDate;
            let diff = Math.ceil((new Date(exam.examDate) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
            if (diff < 0) statusText = 'Completed';
            else if (diff === 0) statusText = 'Today!';
            else statusText = `${diff} day${diff > 1 ? 's' : ''} left`;
        }
        const lang = chatContext.languagePreference;
        let response = `📅 Next Exam: ${exam.subject}\n`;
        response += `Department: ${exam.department} - ${exam.semester}\n`;
        response += `Type: ${typeText}${groupText}\n`;
        response += `Date: ${dateDisplay}\n`;
        response += `Time: ${exam.time}\n`;
        if (showStatus && statusText) {
            response += `Status: ${statusText}`;
        }
        return response;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function lang(english, banglish) {
        return chatContext.languagePreference === 'banglish' ? banglish : english;
    }

    function convertTimeTo24Hour(time12) {
        if (!time12) return '10:00';
        if (time12.includes(':')) {
            const parts = time12.split(':');
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                if (parseInt(parts[0]) >= 0 && parseInt(parts[0]) <= 23) {
                    return time12;
                }
            }
        }
        const [time, modifier] = time12.split(' ');
        if (!time || !modifier) return '10:00';
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
    }

    async function getFreshExamData() {
        try {
            if (window.examData && window.examData.length > 0) {
                return window.examData;
            }
            if (window.dataFunctions && window.dataFunctions.loadExamsFromFirebase) {
                return await window.dataFunctions.loadExamsFromFirebase();
            }
            return [];
        } catch (error) {
            console.error('Error getting exam data:', error);
            return [];
        }
    }

    // ============== EXPOSE GLOBAL FUNCTIONS ==============

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
        refreshExamData: loadExamData
    };
});