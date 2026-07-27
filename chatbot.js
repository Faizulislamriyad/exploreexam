// smart-conversation-chatbot.js - English/Banglish Responses

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // APIFreeLLM Configuration
    const APIFREELLM_CONFIG = {
        API_KEY: 'apf_bnahyl1q5eg4rkqcdvjbnadv',
        API_URL: 'https://apifreellm.com/api/v1/chat',
        RATE_LIMIT_MS: 5000,
        lastCallTime: 0,
        isAvailable: true
    };

    // Chat context
    let chatContext = {
        userName: null,
        conversationHistory: [],
        languagePreference: 'english', // english, banglish, auto
        isFirstMessage: true,
        examData: null
    };

    // Predefined responses for common questions
    const PRE_DEFINED_RESPONSES = {
        // Identity questions
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
        
        // Greetings and feelings
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
        
        // Exam specific
        "exam routine": {
            english: "I can help you find exam routines! Tell me your department and semester, or ask about a specific subject.",
            banglish: "I can help you find exam routines! আমাকে বলো তোমার department এবং semester, বা specific subject সম্পর্কে জানাও।"
        },
        "next exam": {
            english: "I'll check the upcoming exams for you. One moment please...",
            banglish: "I'll check the upcoming exams for you. একটু wait করো please..."
        },
        
        // Polite responses
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

    // Bengali phrases with English responses
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
        chatContext.isFirstMessage = true;
        chatContext.examData = null;
        chatContext.userName = null;
        
        // Detect language preference
        detectLanguagePreference();
        
        // Load exam data
        loadExamData();
    }

    function detectLanguagePreference() {
        // Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('bn')) {
            chatContext.languagePreference = 'banglish';
        } else {
            chatContext.languagePreference = 'english';
        }
    }

    async function loadExamData() {
        try {
            const data = await getFreshExamData();
            chatContext.examData = data;
        } catch (error) {
            console.log('Could not load exam data');
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
            setTimeout(() => {
                _addBotMessage(text);
            }, 2000); // 2 second delay
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

    async function handleChatMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        addUserMessage(message);
        chatInput.value = '';
        
        const typingId = showTypingIndicator();
        
        // Process with delay
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
        
        // Step 1: Check for predefined responses
        const predefinedResponse = getPredefinedResponse(lowerMessage, originalMessage);
        if (predefinedResponse) {
            return predefinedResponse;
        }
        
        // Step 2: Check for exam queries
        const examResponse = await handleExamQuery(lowerMessage, originalMessage);
        if (examResponse) {
            return examResponse;
        }
        
        // Step 3: Use AI for everything else
        const aiResponse = await getAIResponse(originalMessage);
        if (aiResponse) {
            return cleanAIResponse(aiResponse);
        }
        
        // Step 4: Fallback
        return getFallbackResponse(originalMessage);
    }

    function getPredefinedResponse(lowerMessage, originalMessage) {
        // First check exact matches
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
        
        // Check for greeting patterns
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
        const greetings = [
            // English
            'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'morning', 'afternoon', 'evening', 'gm', 'ga', 'ge',
            
            // Bengali
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
            // English
            'thank', 'thanks', 'thx', 'appreciate', 'grateful',
            
            // Bengali
            'ধন্যবাদ', 'অনুগ্রহ', 'শুক্রিয়া'
        ];
        
        return thanksWords.some(word => 
            lowerMessage.includes(word) || 
            originalMessage.includes(word)
        );
    }

    async function handleExamQuery(lowerMessage, originalMessage) {
        if (!chatContext.examData || chatContext.examData.length === 0) {
            return null;
        }
        
        // Check for exam keywords
        const examKeywords = [
            'exam', 'routine', 'schedule', 'date', 'time', 'subject',
            'department', 'semester', 'download', 'pdf',
            'পরীক্ষা', 'রুটিন', 'তারিখ', 'সময়', 'বিষয়', 'ডিপার্টমেন্ট'
        ];
        
        const hasExamKeyword = examKeywords.some(keyword => 
            lowerMessage.includes(keyword) || originalMessage.includes(keyword)
        );
        
        if (!hasExamKeyword) {
            return null;
        }
        
        // Handle specific exam queries
        if (lowerMessage.includes('next exam') || originalMessage.includes('পরবর্তী')) {
            return await getNextExamResponse();
        }
        
        if (lowerMessage.includes('today') || originalMessage.includes('আজ')) {
            return await getTodayExamsResponse();
        }
        
        if (lowerMessage.includes('download') || originalMessage.includes('ডাউনলোড')) {
            return getDownloadResponse(lowerMessage);
        }
        
        // Check for specific subject
        const subject = extractSubject(originalMessage);
        if (subject) {
            return await getSubjectExamResponse(subject);
        }
        
        // Check for department
        const department = extractDepartment(originalMessage);
        if (department) {
            return await getDepartmentResponse(department);
        }
        
        return null;
    }

    async function getNextExamResponse() {
        if (!chatContext.examData) return "Exam data not loaded yet.";
        
        const currentDate = new Date().toISOString().split('T')[0];
        const upcomingExams = chatContext.examData.filter(exam => exam.examDate >= currentDate);
        
        if (upcomingExams.length === 0) {
            return chatContext.languagePreference === 'banglish' 
                ? "No upcoming exams found. সব exams complete হয়ে গেছে!" 
                : "No upcoming exams found. All exams are completed!";
        }
        
        upcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        const nextExam = upcomingExams[0];
        const daysLeft = Math.ceil((new Date(nextExam.examDate) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
        
        if (chatContext.languagePreference === 'banglish') {
            return `📅 **Next Exam:** ${nextExam.subject}<br>
                    **Department:** ${nextExam.department} - ${nextExam.semester}<br>
                    **Date:** ${formatDate(nextExam.examDate)}<br>
                    **Time:** ${nextExam.time}<br>
                    **Status:** ${daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}`;
        } else {
            return `📅 **Next Exam:** ${nextExam.subject}<br>
                    **Department:** ${nextExam.department} - ${nextExam.semester}<br>
                    **Date:** ${formatDate(nextExam.examDate)}<br>
                    **Time:** ${nextExam.time}<br>
                    **Status:** ${daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}`;
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
            response += `${index + 1}. **${exam.subject}**<br>`;
            response += `   ${exam.department} - ${exam.semester}<br>`;
            response += `   Time: ${exam.time} | Room: ${exam.room}<br><br>`;
        });
        
        return response;
    }

    function getDownloadResponse(message) {
        if (chatContext.languagePreference === 'banglish') {
            return "I can help you download exam routines! Try asking:<br>" +
                   "• 'Download computer department routine'<br>" +
                   "• 'Download physics exam schedule'<br>" +
                   "• 'Get all exam PDF'";
        } else {
            return "I can help you download exam routines! Try asking:<br>" +
                   "• 'Download computer department routine'<br>" +
                   "• 'Download physics exam schedule'<br>" +
                   "• 'Get all exam PDF'";
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
        if (!chatContext.examData) return "Exam data not loaded.";
        
        const subjectExams = chatContext.examData.filter(exam => 
            exam.subject.toLowerCase().includes(subject.toLowerCase())
        );
        
        if (subjectExams.length === 0) {
            return chatContext.languagePreference === 'banglish'
                ? `No exams found for "${subject}". Try another subject.`
                : `No exams found for "${subject}". Try another subject.`;
        }
        
        const count = subjectExams.length;
        const currentDate = new Date().toISOString().split('T')[0];
        const upcoming = subjectExams.filter(exam => exam.examDate >= currentDate).length;
        
        if (chatContext.languagePreference === 'banglish') {
            return `Found ${count} exams for **${subject}**<br>
                    Upcoming: ${upcoming}<br>
                    Ask me: 'When is ${subject} exam?' for more details.`;
        } else {
            return `Found ${count} exams for **${subject}**<br>
                    Upcoming: ${upcoming}<br>
                    Ask me: 'When is ${subject} exam?' for more details.`;
        }
    }

    function extractDepartment(message) {
        const departments = {
            'computer': ['computer', 'কম্পিউটার'],
            'civil': ['civil', 'সিভিল'],
            'electrical': ['electrical', 'ইলেকট্রিক্যাল'],
            'mechanical': ['mechanical', 'মেকানিক্যাল'],
            'electronics': ['electronics', 'ইলেকট্রনিক্স']
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
        if (!chatContext.examData) return "Exam data not loaded.";
        
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
        
        if (chatContext.languagePreference === 'banglish') {
            return `**${department.toUpperCase()} Department**<br>
                    Total exams: ${deptExams.length}<br>
                    Upcoming exams: ${upcoming}<br>
                    Ask: '${department} 3rd semester exams' for specific info.`;
        } else {
            return `**${department.toUpperCase()} Department**<br>
                    Total exams: ${deptExams.length}<br>
                    Upcoming exams: ${upcoming}<br>
                    Ask: '${department} 3rd semester exams' for specific info.`;
        }
    }

    // ============== AI RESPONSE HANDLER ==============

    async function getAIResponse(userMessage) {
        // Rate limit check
        const now = Date.now();
        if (APIFREELLM_CONFIG.lastCallTime > 0 && 
            (now - APIFREELLM_CONFIG.lastCallTime) < APIFREELLM_CONFIG.RATE_LIMIT_MS) {
            return null;
        }
        
        try {
            const prompt = createAIPrompt(userMessage);
            
            const response = await fetch(APIFREELLM_CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${APIFREELLM_CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    message: prompt
                })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            APIFREELLM_CONFIG.lastCallTime = now;
            
            // Extract response
            let aiResponse = data.response || data.message || data.content;
            if (!aiResponse && data.choices && data.choices[0]) {
                aiResponse = data.choices[0].message?.content;
            }
            
            return aiResponse;
            
        } catch (error) {
            console.error('AI Error:', error);
            return null;
        }
    }

    function createAIPrompt(userMessage) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        
        let prompt = `You are "Routine Explorer", a helpful exam assistant chatbot. `;
        prompt += `Today is ${currentDate}. `;
        prompt += `You help students with exam schedules and general conversation.\n\n`;
        
        // Language instruction
        prompt += `IMPORTANT LANGUAGE INSTRUCTION: \n`;
        prompt += `- Use ONLY English or Banglish (mix of English words with Bangla grammar/structure)\n`;
        prompt += `- DO NOT use pure Bangla (Bengali script)\n`;
        prompt += `- Examples of Banglish: "Ki obostha?", "Kemon aso?", "Exam routine lagbe?", "Koto taka?"\n`;
        prompt += `- Keep responses friendly and natural\n\n`;
        
        // Add conversation context
        if (chatContext.conversationHistory.length > 0) {
            prompt += `Recent conversation:\n`;
            const recentHistory = chatContext.conversationHistory.slice(-3);
            recentHistory.forEach(msg => {
                const role = msg.role === 'user' ? 'Student' : 'You';
                prompt += `${role}: ${msg.content}\n`;
            });
            prompt += `\n`;
        }
        
        // Current message
        prompt += `Student's message: "${userMessage}"\n\n`;
        
        // Response guidelines
        prompt += `Your response should be:\n`;
        prompt += `1. Natural and conversational\n`;
        prompt += `2. In English or Banglish (NO pure Bangla)\n`;
        prompt += `3. Helpful and friendly\n`;
        prompt += `4. If exam-related, mention I can help with schedules\n`;
        prompt += `5. Keep it concise (2-4 sentences)\n\n`;
        
        prompt += `Your response:`;
        
        return prompt;
    }

    function cleanAIResponse(response) {
        if (!response) return "I understand. How can I assist you today?";
        
        // Remove any pure Bangla script (optional - if you want to enforce Banglish)
        // response = response.replace(/[অ-হ]/g, '');
        
        // Trim and clean
        response = response.trim();
        
        // Ensure it's not empty
        if (response.length < 5) {
            return "Thanks for your message! How can I help you?";
        }
        
        return response;
    }

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

    // ============== UTILITY FUNCTIONS ==============

    async function getFreshExamData() {
        try {
            if (window.dataFunctions && window.dataFunctions.refreshExamData) {
                return await window.dataFunctions.refreshExamData();
            } else if (window.examData) {
                return window.examData;
            }
            return [];
        } catch (error) {
            console.error('Error getting exam data:', error);
            return [];
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // ============== EXPORT ==============
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
        reset: initChatbot
    };
});