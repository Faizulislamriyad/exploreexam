// smart-conversation-chatbot.js - Premium Compact Card with Icons & Like/Dislike + Groq API Integration
// Enhanced: Dislike now always triggers Groq for improved answer

document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatbotMessages = document.getElementById('chatbotMessages');

    // Groq API Key
    const GROQ_API_KEY = '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';
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    // Chat context
    let chatContext = {
        userName: null,
        conversationHistory: [],
        languagePreference: 'english',
        examData: null,
        currentDate: null,
        messageCounter: 0
    };

    // Predefined responses – strict matching
    const PRE_DEFINED_RESPONSES = {
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

    // Bengali phrase mapping
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

    // Acknowledgment phrases
    const ACKNOWLEDGMENT_PHRASES = [
        'okay', 'ok', 'got it', 'alright', 'fine', 'understand', 'accah bujhlam',
        'ঠিক আছে', 'বুঝলাম', 'আচ্ছা', 'আচ্ছা বুঝলাম', 'bu jhlam', 'bujhlam', 'accha',
        'হ্যাঁ', 'yes', 'yeah', 'yep', 'right'
    ];

    const SHORTCUT_COMMANDS = {
        'dn': { action: 'download' },
        'download': { action: 'download' },
        'dwnload': { action: 'download' },
        'daunload': { action: 'download' },
        'pdf': { action: 'download' },
        'next': { action: 'next_exam' },
        'nxt': { action: 'next_exam' },
        'porer exam': { action: 'next_exam' },
        'set notification': { action: 'set_reminder' },
        'reminder': { action: 'set_reminder' },
        'remind me': { action: 'set_reminder' }
    };

    // ============== CONSTANTS ==============
    const MAX_EXAM_CARDS = 5;

    // ============== CARD GENERATOR ==============
    function buildExamCard(exam, showStatus = true) {
        const dateDisplay = formatDate(exam.examDate);
        const type = exam.examType || 'written';
        const typeText = type === 'practical' ? 'Practical' : type === 'referred' ? 'Referred' : 'Written';
        const typeClass = type === 'practical' ? 'practical' : type === 'referred' ? 'referred' : '';
        
        let groupHtml = '';
        if (type === 'practical' && exam.group) {
            groupHtml = `<div class="exam-detail"><i class="fas fa-users"></i> <strong>Group:</strong> ${exam.group}</div>`;
        }

        let statusText = '';
        let statusClass = '';
        if (showStatus) {
            const currentDate = chatContext.currentDate || new Date().toISOString().split('T')[0];
            let diff = Math.ceil((new Date(exam.examDate) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
            if (diff < 0) {
                statusText = 'Completed';
                statusClass = 'completed';
            } else if (diff === 0) {
                statusText = 'Today!';
                statusClass = 'today';
            } else {
                statusText = `${diff} day${diff > 1 ? 's' : ''} left`;
                statusClass = '';
            }
        }

        return `
            <div class="chatbot-exam-card">
                <div class="exam-title">${exam.subject}</div>
                <hr class="exam-divider">
                <div class="exam-detail"><i class="fas fa-building"></i> <strong>Dept:</strong> ${exam.department}</div>
                <div class="exam-detail"><i class="fas fa-layer-group"></i> <strong>Sem:</strong> ${exam.semester}</div>
                ${groupHtml}
                <div class="exam-detail"><i class="fas fa-calendar-alt"></i> <strong>Date:</strong> ${dateDisplay}</div>
                <div class="exam-detail"><i class="fas fa-clock"></i> <strong>Time:</strong> ${exam.time}</div>
                <div class="exam-detail">
                    <i class="fas fa-tag"></i> <strong>Type:</strong> <span class="exam-type-badge ${typeClass}">${typeText}</span>
                    ${showStatus ? `<span class="exam-status-badge ${statusClass}">${statusText}</span>` : ''}
                </div>
                <div class="exam-card-actions">
                    <button class="btn-like" data-subject="${exam.subject}"><i class="fas fa-thumbs-up"></i> Like</button>
                    <button class="btn-dislike" data-subject="${exam.subject}"><i class="fas fa-thumbs-down"></i> Dislike</button>
                </div>
            </div>
        `;
    }

    function buildExamListCard(exams, title = '') {
        if (!exams || exams.length === 0) return '';
        const uniqueExams = [];
        const seenIds = new Set();
        for (const exam of exams) {
            if (exam.id && !seenIds.has(exam.id)) {
                seenIds.add(exam.id);
                uniqueExams.push(exam);
            } else if (!exam.id) {
                const key = exam.subject + exam.examDate + exam.time;
                if (!seenIds.has(key)) {
                    seenIds.add(key);
                    uniqueExams.push(exam);
                }
            }
        }
        if (uniqueExams.length === 0) return '';
        let html = `<div class="chatbot-exam-list">`;
        uniqueExams.forEach(exam => {
            html += buildExamCard(exam, true);
        });
        html += `</div>`;
        if (title) {
            html = `<div style="font-weight:600;margin:8px 0 4px;color:#182848;">${title}</div>` + html;
        }
        return html;
    }

    function buildExamListCardWithLimit(exams, title = '', limit = MAX_EXAM_CARDS) {
        if (!exams || exams.length === 0) return '';
        const total = exams.length;
        const displayExams = exams.slice(0, limit);
        let html = buildExamListCard(displayExams, title);
        if (total > limit) {
            html += `<div class="chatbot-more-indicator" style="font-size:0.8rem; color:#666; margin-top:8px; text-align:center; border-top:1px dashed #ddd; padding-top:8px;">
                        <i class="fas fa-info-circle"></i> Showing ${limit} of ${total} exams. Please refine your query (e.g., by department or semester) to see more.
                     </div>`;
        }
        return html;
    }

    // ============== INJECT STYLES FOR FEEDBACK BUTTONS ==============
    function injectFeedbackStyles() {
        if (document.querySelector('#chatbotFeedbackStyles')) return;
        const style = document.createElement('style');
        style.id = 'chatbotFeedbackStyles';
        style.textContent = `
            .btn-msg-like, .btn-msg-dislike {
                background: none;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                color: #888;
                padding: 2px 6px;
                border-radius: 4px;
            }
            .btn-msg-like:hover {
                color: #28a745;
                transform: scale(1.15);
                background: #e8f5e9;
            }
            .btn-msg-dislike:hover {
                color: #dc3545;
                transform: scale(1.15);
                background: #fce4ec;
            }
            .btn-msg-like.liked {
                color: #28a745;
                background: #e8f5e9;
                cursor: default;
                opacity: 0.8;
            }
            .btn-msg-dislike.disliked {
                color: #dc3545;
                background: #fce4ec;
                cursor: default;
                opacity: 0.8;
            }
            .btn-msg-like.liked:hover, .btn-msg-dislike.disliked:hover {
                transform: none;
                background: inherit;
            }
        `;
        document.head.appendChild(style);
    }
    injectFeedbackStyles();

    // ============== INIT ==============
    initChatbot();

    // Event listeners
    chatbotToggle.addEventListener('click', toggleChatbot);
    closeChatbot.addEventListener('click', toggleChatbot);
    sendMessage.addEventListener('click', handleChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatMessage();
    });

    // Feedback buttons (message-level)
    chatbotMessages.addEventListener('click', function(e) {
        const target = e.target.closest('.btn-msg-like, .btn-msg-dislike');
        if (!target) return;
        e.stopPropagation();
        const isLike = target.classList.contains('btn-msg-like');
        const msgId = target.dataset.msgId;
        if (!msgId) return;

        if (target.classList.contains('liked') || target.classList.contains('disliked')) {
            return;
        }

        if (isLike) {
            target.classList.add('liked');
            if (window.showNotification) {
                window.showNotification('👍 Thanks for your feedback!', 'success');
            }
        } else {
            target.classList.add('disliked');
            if (window.showNotification) {
                window.showNotification('👎 Sorry about that! Let me improve...', 'info');
            }
            // Find the user message that preceded this bot message
            const msgIndex = chatContext.conversationHistory.findIndex(m => m.messageId === msgId);
            if (msgIndex > 0) {
                const userMsg = chatContext.conversationHistory[msgIndex - 1];
                if (userMsg && userMsg.role === 'user') {
                    handleDislike(userMsg.content, msgId);
                }
            }
        }
    });

    // Exam card like/dislike (existing)
    chatbotMessages.addEventListener('click', function(e) {
        const target = e.target.closest('.btn-like, .btn-dislike');
        if (!target) return;
        e.stopPropagation();
        const isLike = target.classList.contains('btn-like');
        const subject = target.dataset.subject || 'exam';
        target.style.transform = 'scale(0.9)';
        setTimeout(() => target.style.transform = '', 200);
        if (window.showNotification) {
            window.showNotification(isLike ? `👍 Liked "${subject}"!` : `👎 Disliked "${subject}"`, isLike ? 'success' : 'error');
        } else {
            alert(isLike ? `You liked "${subject}"` : `You disliked "${subject}"`);
        }
    });

    // Initial greeting
    setTimeout(() => {
        addBotMessage("Hello there! 👋 I'm your exam assistant. Ask me anything about your exam schedules – I'll understand even if you don't use exact commands!", false);
    }, 800);

    // ============== CORE FUNCTIONS ==============

    function initChatbot() {
        chatContext.conversationHistory = [];
        chatContext.examData = null;
        chatContext.userName = null;
        chatContext.currentDate = new Date().toISOString().split('T')[0];
        chatContext.messageCounter = 0;
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

    // ---------- Add bot message with feedback buttons ----------
    function addBotMessage(text, useDelay = true) {
        const msgId = 'msg-' + (++chatContext.messageCounter);
        if (useDelay) {
            setTimeout(() => _addBotMessage(text, msgId), 2000);
        } else {
            _addBotMessage(text, msgId);
        }
        return msgId;
    }

    function _addBotMessage(text, msgId) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.style.opacity = '0';
        messageDiv.id = msgId;
        const feedbackHtml = `
            <div class="message-feedback" style="margin-top:6px; display:flex; gap:6px; align-items:center; font-size:0.75rem; color:#888;">
                <span style="font-size:0.7rem;">Was this helpful?</span>
                <button class="btn-msg-like" data-msg-id="${msgId}" title="Like this response">
                    <i class="fas fa-thumbs-up"></i>
                </button>
                <button class="btn-msg-dislike" data-msg-id="${msgId}" title="Dislike this response">
                    <i class="fas fa-thumbs-down"></i>
                </button>
            </div>
        `;
        messageDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>` + feedbackHtml;
        chatbotMessages.appendChild(messageDiv);
        
        chatContext.conversationHistory.push({
            role: 'assistant',
            content: text,
            timestamp: new Date().toISOString(),
            messageId: msgId
        });
        
        setTimeout(() => {
            messageDiv.style.transition = 'opacity 0.5s ease';
            messageDiv.style.opacity = '1';
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 10);
    }

    function addUserMessage(text) {
        const msgId = 'msg-' + (++chatContext.messageCounter);
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.id = msgId;
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatbotMessages.appendChild(messageDiv);
        
        chatContext.conversationHistory.push({
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
            messageId: msgId
        });
        
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        return msgId;
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

    // ---------- Handle Dislike – always use Groq ----------
    async function handleDislike(userMessage, dislikedMsgId) {
        // Show typing indicator
        const typingId = showTypingIndicator();

        // Build a specialized prompt for Groq to improve the answer
        const contextSummary = buildExamContextSummary();
        const language = chatContext.languagePreference === 'banglish' ? 'Bengali (Banglish script)' : 'English';
        const improvePrompt = `
You are "Routine Explorer", a friendly and knowledgeable exam assistant chatbot for Barisal Polytechnic Institute.

The user asked: "${userMessage}"

You previously gave an answer that the user did not find helpful. Please provide a more detailed, accurate, and useful response.

Context:
- Current date: ${chatContext.currentDate}
- Exam data summary: ${contextSummary}
- The user's language preference: ${language}

Consider the following:
- If the user is asking about exam schedules, be specific about dates, departments, semesters, and exam types.
- If the question is ambiguous, ask clarifying questions to better understand what they need.
- Provide actionable information (e.g., "The next Computer exam is on ...", "Tomorrow's exams are ...").
- Be concise but thorough.

Respond in ${language}.
`;

        try {
            // Directly call Groq API with the improvement prompt
            const improvedReply = await callGroqAPI(userMessage, improvePrompt);
            removeTypingIndicator(typingId);
            if (improvedReply) {
                // Add the new response as a bot message
                addBotMessage(improvedReply, false);
            } else {
                // Fallback if Groq returns nothing
                addBotMessage("I'm sorry, I couldn't generate a better answer. Could you please rephrase your question?", false);
            }
        } catch (error) {
            console.error('Error during dislike regeneration:', error);
            removeTypingIndicator(typingId);
            addBotMessage("Sorry, I encountered an error while trying to improve my answer. Please try again.", false);
        }
    }

    // ============== GROQ API CALL WITH CONTEXT ==============

    const SUPPORTED_MODELS = [
        'openai/gpt-oss-120b',
        'qwen/qwen3.6-27b',
        'canopylabs/orpheus-v1-english',
        'allam-2-7b',
        'groq/compound',
        'groq/compound-mini',
        'openai/gpt-oss-20b',
        'canopylabs/orpheus-arabic-saudi'
    ];

    let currentModelIndex = 0;

    function buildExamContextSummary() {
        if (!chatContext.examData || chatContext.examData.length === 0) {
            return "No exam data available.";
        }
        const total = chatContext.examData.length;
        const upcoming = chatContext.examData.filter(e => e.examDate >= chatContext.currentDate);
        const upcomingCount = upcoming.length;
        const departments = [...new Set(chatContext.examData.map(e => e.department))].join(', ');
        const semesters = [...new Set(chatContext.examData.map(e => e.semester))].sort().join(', ');
        const upcomingSorted = upcoming.slice().sort((a, b) => a.examDate.localeCompare(b.examDate));
        const sample = upcomingSorted.slice(0, 3).map(e => `${e.subject} (${e.department}, ${e.semester})`).join('; ');

        return `Total exams: ${total}. Upcoming (today or future): ${upcomingCount}. Departments: ${departments}. Semesters: ${semesters}. Examples of upcoming exams: ${sample || 'none'}.`;
    }

    async function callGroqAPI(userMessage, systemPrompt, retryCount = 0) {
        if (retryCount >= SUPPORTED_MODELS.length) {
            console.error('All models failed');
            return null;
        }

        const model = SUPPORTED_MODELS[currentModelIndex];
        const history = chatContext.conversationHistory.slice(-5);
        const sanitizedHistory = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // For dislike regeneration, we might already have a full system prompt; but we still add context
        // If the prompt already contains context, avoid duplication
        let enhancedSystemPrompt = systemPrompt;
        if (!systemPrompt.includes('Current exam data context:')) {
            const contextSummary = buildExamContextSummary();
            enhancedSystemPrompt = `${systemPrompt}\n\nCurrent exam data context: ${contextSummary}\nCurrent date: ${chatContext.currentDate}`;
        }

        const messages = [
            { role: 'system', content: enhancedSystemPrompt },
            ...sanitizedHistory,
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 350,
                    top_p: 0.9
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Groq API error with model ${model}:`, response.status, errorText);
                currentModelIndex = (currentModelIndex + 1) % SUPPORTED_MODELS.length;
                return callGroqAPI(userMessage, systemPrompt, retryCount + 1);
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content?.trim();
            if (reply) {
                return reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
            return null;
        } catch (error) {
            console.error(`Groq API fetch error with model ${model}:`, error);
            currentModelIndex = (currentModelIndex + 1) % SUPPORTED_MODELS.length;
            return callGroqAPI(userMessage, systemPrompt, retryCount + 1);
        }
    }

    // ============== KEYWORD PRE-CHECK (Enhanced) ==============

    function keywordPreCheck(message) {
        const lower = message.toLowerCase().trim();
        const filters = { department: null, semester: null, examType: null, subject: null, date: null };
        let intent = null;
        let summary = '';

        // 1. Acknowledgment
        if (ACKNOWLEDGMENT_PHRASES.some(phrase => lower.includes(phrase))) {
            return { intent: 'acknowledgment', filters: {}, summary: 'User acknowledged' };
        }

        // 2. Detect "next" and combine with department/semester/type
        let hasNext = /\bnext\b/.test(lower);
        let hasTomorrow = /\btomorrow\b/.test(lower) || lower.includes('agami kal') || lower.includes('kal');
        let hasToday = /\btoday\b/.test(lower) || lower.includes('ajke');

        // Detect department
        const depts = ['computer', 'civil', 'electrical', 'mechanical', 'electronics', 'power', 'electro-medical', 'tourism'];
        for (const d of depts) {
            if (lower.includes(d)) {
                filters.department = d;
                break;
            }
        }

        // Detect semester
        const sems = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
        for (const s of sems) {
            if (lower.includes(s)) {
                filters.semester = s;
                break;
            }
        }

        // Detect exam type
        if (lower.includes('practical')) filters.examType = 'practical';
        else if (lower.includes('written')) filters.examType = 'written';
        else if (lower.includes('referred')) filters.examType = 'referred';

        // Detect subject
        const subjects = ['physics', 'math', 'mathematics', 'chemistry', 'programming', 'database', 'network', 'english'];
        for (const sub of subjects) {
            if (lower.includes(sub)) {
                filters.subject = sub;
                break;
            }
        }

        // Determine intent based on time words
        if (hasNext) {
            intent = 'next_exam';
            summary = 'Next exam';
        } else if (hasTomorrow) {
            intent = 'tomorrow_exams';
            summary = 'Tomorrow\'s exams';
        } else if (hasToday) {
            intent = 'today_exams';
            summary = 'Today\'s exams';
        }

        // If we have filters but no intent, assume all_upcoming
        if (!intent && (filters.department || filters.semester || filters.examType || filters.subject)) {
            intent = 'all_upcoming';
            summary = 'Exams with filters';
        }

        if (intent) {
            return { intent, filters, summary };
        }

        return null;
    }

    // ============== SMART REQUEST ANALYZER (Groq) ==============

    async function analyzeUserRequest(userMessage, isRetry = false) {
        const systemPrompt = `
You are an intelligent request analyzer for an exam routine chatbot.

Your task: Analyze the user's message and extract the following information in JSON format:

{
  "intent": "one of: 'next_exam', 'tomorrow_exams', 'specific_date_exams', 'department_exams', 'semester_exams', 'subject_exams', 'exam_type_exams', 'all_upcoming', 'set_reminder', 'download', 'general_question', 'greeting', 'thanks', 'goodbye', 'acknowledgment',
  "filters": {
    "department": "department name or null",
    "semester": "semester name or null",
    "examType": "written/practical/referred or null",
    "subject": "subject name or null",
    "date": "YYYY-MM-DD or null"
  },
  "summary": "A brief summary of what the user wants (in the same language as the user's message)",
  "multiple_requests": true/false
}

Important rules:
- Only consider UPCOMING exams (today or future). Ignore past exams.
- If the user says "next exam", "porer exam", etc. → intent: "next_exam"
- If they mention a department/semester/type with "next", set the corresponding filter and keep intent as "next_exam".
- If they ask for "tomorrow", "agami kal", "kal" → intent: "tomorrow_exams"
- If they mention a specific date → intent: "specific_date_exams"
- If they mention department, semester, type, or subject → set filters accordingly.
- "all exams", "all upcoming", "sab exam" → intent: "all_upcoming"
- "set reminder", "remind me", "notification" → intent: "set_reminder"
- "download", "pdf", "dn" → intent: "download"
- General questions about the website → intent: "general_question"
- Greetings, thanks, goodbye → respective intents.
- If the user says "okay", "got it", "bujhlam", "accah" etc. → intent: "acknowledgment"

If multiple requests, set "multiple_requests": true.

Always respond in valid JSON only.
`;
        const result = await callGroqAPI(userMessage, systemPrompt);
        if (!result) return null;
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (e) {
            console.error('Error parsing Groq response:', e);
            return null;
        }
    }

    // ============== MESSAGE PROCESSING ENGINE ==============

    async function processUserMessage(message, isRetry = false) {
        const lowerMessage = message.toLowerCase().trim();
        const originalMessage = message;
        
        // Step 1: Shortcuts
        const shortcutResult = handleShortcuts(lowerMessage, originalMessage);
        if (shortcutResult) {
            return shortcutResult;
        }

        // Step 2: Predefined responses (strict whole-word)
        const predefinedResponse = getPredefinedResponse(lowerMessage, originalMessage);
        if (predefinedResponse) {
            return predefinedResponse;
        }

        // Step 3: Keyword pre-check
        const preCheck = keywordPreCheck(lowerMessage);
        let analysis = null;
        if (preCheck) {
            analysis = {
                intent: preCheck.intent,
                filters: preCheck.filters,
                summary: preCheck.summary,
                multiple_requests: false
            };
            console.log('Keyword pre-check matched:', analysis);
        } else {
            analysis = await analyzeUserRequest(originalMessage, isRetry);
            console.log('User request analysis (Groq):', analysis);
        }

        if (!analysis) {
            const examResponse = await handleExamQuery(lowerMessage, originalMessage);
            if (examResponse) {
                return examResponse;
            }
            return getExternalQueryResponse();
        }

        const { intent, filters, summary, multiple_requests } = analysis;

        // Ensure data loaded
        if (!chatContext.examData || chatContext.examData.length === 0) {
            await loadExamData();
            if (!chatContext.examData || chatContext.examData.length === 0) {
                return lang("I couldn't load exam data. Please try again later.", "Ami exam data load korte parini. Ektu pore abar try korun.");
            }
        }

        const upcomingExams = chatContext.examData.filter(e => e.examDate >= chatContext.currentDate);

        let response = '';

        // Handle multiple requests
        if (multiple_requests) {
            response = `<div style="margin-bottom:10px;">${summary}</div>`;
            let combinedExams = [];

            if (intent === 'next_exam' || intent === 'all_upcoming') {
                const nextExam = getNextExam(upcomingExams);
                if (nextExam) combinedExams.push(nextExam);
            }

            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
            const tomorrowExams = upcomingExams.filter(e => e.examDate === tomorrowStr);
            if (tomorrowExams.length > 0 && !combinedExams.some(e => e.examDate === tomorrowStr)) {
                combinedExams = combinedExams.concat(tomorrowExams);
            }

            if (filters.department) {
                combinedExams = combinedExams.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
            }
            if (filters.semester) {
                combinedExams = combinedExams.filter(e => e.semester === filters.semester);
            }
            if (filters.examType) {
                combinedExams = combinedExams.filter(e => (e.examType || 'written') === filters.examType);
            }
            if (filters.subject) {
                combinedExams = combinedExams.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));
            }

            const uniqueCombined = [];
            const seen = new Set();
            for (const exam of combinedExams) {
                const key = exam.id || (exam.subject + exam.examDate + exam.time);
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCombined.push(exam);
                }
            }

            if (uniqueCombined.length > 0) {
                response += buildExamListCardWithLimit(uniqueCombined, lang('Your Exam Information', 'Apnar Exam Information'));
            } else {
                response += lang("No upcoming exams found matching your request.", "Apnar request er moto kono upcoming exam nei.");
            }
            return response;
        }

        // Single intent
        switch (intent) {
            case 'next_exam': {
                let candidates = upcomingExams;
                if (filters.department) candidates = candidates.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
                if (filters.semester) candidates = candidates.filter(e => e.semester === filters.semester);
                if (filters.examType) candidates = candidates.filter(e => (e.examType || 'written') === filters.examType);
                if (filters.subject) candidates = candidates.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));
                const nextExam = getNextExam(candidates);
                if (nextExam) {
                    response = buildExamCard(nextExam, true);
                } else {
                    let msg = lang("🎉 No upcoming exams found!", "🎉 Kono upcoming exam nei!");
                    if (filters.department || filters.semester || filters.examType || filters.subject) {
                        msg = lang("No upcoming exam matches your filters.", "Apnar filters er moto kono upcoming exam nei.");
                    }
                    response = msg;
                }
                break;
            }

            case 'tomorrow_exams': {
                const tomorrowDate = new Date();
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
                let exams = upcomingExams.filter(e => e.examDate === tomorrowStr);
                if (filters.department) exams = exams.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
                if (filters.semester) exams = exams.filter(e => e.semester === filters.semester);
                if (filters.examType) exams = exams.filter(e => (e.examType || 'written') === filters.examType);
                if (filters.subject) exams = exams.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));
                if (exams.length > 0) {
                    response = buildExamListCardWithLimit(exams, lang(`Tomorrow's Exams (${exams.length})`, `Agamikal er Exams (${exams.length})`));
                } else {
                    response = lang("🎉 No exams scheduled for tomorrow matching your filters.", "🎉 Agamikal apnar filters er moto kono exam nei.");
                }
                break;
            }

            case 'specific_date_exams': {
                if (filters.date) {
                    let exams = upcomingExams.filter(e => e.examDate === filters.date);
                    if (filters.department) exams = exams.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
                    if (filters.semester) exams = exams.filter(e => e.semester === filters.semester);
                    if (filters.examType) exams = exams.filter(e => (e.examType || 'written') === filters.examType);
                    if (filters.subject) exams = exams.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));
                    if (exams.length > 0) {
                        response = buildExamListCardWithLimit(exams, lang(`Exams on ${formatDate(filters.date)} (${exams.length})`, `${formatDate(filters.date)} tarikher exams (${exams.length})`));
                    } else {
                        response = lang(`No exams on ${formatDate(filters.date)} matching your filters.`, `${formatDate(filters.date)} tarikhe apnar filters er moto kono exam nei.`);
                    }
                } else {
                    response = lang("Please specify a date.", "Doya kore ekta date bolun.");
                }
                break;
            }

            case 'department_exams':
            case 'semester_exams':
            case 'exam_type_exams':
            case 'subject_exams':
            case 'all_upcoming': {
                let filtered = upcomingExams;
                if (filters.department) filtered = filtered.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
                if (filters.semester) filtered = filtered.filter(e => e.semester === filters.semester);
                if (filters.examType) filtered = filtered.filter(e => (e.examType || 'written') === filters.examType);
                if (filters.subject) filtered = filtered.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));

                if (filtered.length > 0) {
                    let title = '';
                    if (filters.department && filters.semester) {
                        title = lang(`${filters.department} ${filters.semester} Exams (${filtered.length})`, `${filters.department} ${filters.semester} Exams (${filtered.length})`);
                    } else if (filters.department) {
                        title = lang(`${filters.department} Department (${filtered.length} exams)`, `${filters.department} Department (${filtered.length} exams)`);
                    } else if (filters.semester) {
                        title = lang(`${filters.semester} Semester (${filtered.length} exams)`, `${filters.semester} Semester (${filtered.length} exams)`);
                    } else if (filters.subject) {
                        const upcomingCount = filtered.filter(e => e.examDate >= chatContext.currentDate).length;
                        title = lang(`Found ${filtered.length} exams for "${filters.subject}" (${upcomingCount} upcoming)`, `"${filters.subject}" er ${filtered.length} ta exam (${upcomingCount} upcoming)`);
                    } else if (filters.examType) {
                        title = lang(`${filters.examType.charAt(0).toUpperCase() + filters.examType.slice(1)} Exams (${filtered.length})`, `${filters.examType.charAt(0).toUpperCase() + filters.examType.slice(1)} Exams (${filtered.length})`);
                    } else {
                        title = lang(`Upcoming Exams (${filtered.length})`, `Upcoming Exams (${filtered.length})`);
                    }
                    response = buildExamListCardWithLimit(filtered, title);
                } else {
                    response = lang("No upcoming exams found matching your filters.", "Apnar filters er moto kono upcoming exam nei.");
                }
                break;
            }

            case 'set_reminder': {
                let candidates = upcomingExams;
                if (filters.department) candidates = candidates.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
                if (filters.semester) candidates = candidates.filter(e => e.semester === filters.semester);
                if (filters.examType) candidates = candidates.filter(e => (e.examType || 'written') === filters.examType);
                if (filters.subject) candidates = candidates.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));
                const nextExam = getNextExam(candidates);
                if (nextExam) {
                    if (window.showNotificationOptions) {
                        window.showNotificationOptions(nextExam);
                        response = lang(`🔔 Reminder options opened for **${nextExam.subject}** on ${formatDate(nextExam.examDate)} at ${nextExam.time}.`, `🔔 **${nextExam.subject}** er jonno reminder options open kora hoyeche ${formatDate(nextExam.examDate)} ${nextExam.time} e.`);
                    } else {
                        response = lang("Please enable notifications to set reminders.", "Reminder set korar jonno notification enable koren.");
                    }
                } else {
                    response = lang("No upcoming exams to set reminder for.", "Reminder set korar moto kono upcoming exam nei.");
                }
                break;
            }

            case 'download': {
                if (window.downloadRoutine) {
                    window.downloadRoutine();
                    response = "⏳ Downloading exam routine as PDF... Please wait.";
                } else {
                    response = "📄 Download function is not available right now. Please use the download button on the page.";
                }
                break;
            }

            case 'acknowledgment': {
                response = lang("Great! 😊 Do you have any other questions about your exams?", "বুঝলাম! 😊 আপনার আর কোনো প্রশ্ন আছে?");
                break;
            }

            case 'thanks': {
                response = lang("You're welcome! 😊 Let me know if you need anything else.", "আপনাকে স্বাগতম! 😊 আর কিছু দরকার হলে জানাবেন।");
                break;
            }

            case 'greeting':
            case 'goodbye': {
                response = getPredefinedResponse(lowerMessage, originalMessage) || getExternalQueryResponse();
                break;
            }

            case 'general_question':
            default: {
                if (lowerMessage.includes('exam') || lowerMessage.includes('routine') || lowerMessage.includes('schedule')) {
                    const totalUpcoming = upcomingExams.length;
                    if (totalUpcoming > 0) {
                        const nextThree = upcomingExams.slice(0, 3);
                        let examList = nextThree.map(e => `• ${e.subject} (${e.department}, ${e.semester})`).join('\n');
                        response = lang(
                            `I found ${totalUpcoming} upcoming exams. Here are a few examples:\n${examList}\n\nTry asking for a specific department, semester, or "next exam" for more details.`,
                            `Ami ${totalUpcoming} ta upcoming exam paisi. Kichu example:\n${examList}\n\nDoya kore specific department, semester, ba "next exam" jiggesh korun.`
                        );
                    } else {
                        response = lang("I don't see any upcoming exams. Please check back later.", "Ami kono upcoming exam dekhte pacchi na. Pore abar check korun.");
                    }
                } else {
                    let generalPrompt = `
You are "Routine Explorer", a friendly exam assistant chatbot for Barisal Polytechnic Institute.
Current date: ${chatContext.currentDate}
Total upcoming exams: ${upcomingExams.length}

The user asked: "${originalMessage}"

Provide a helpful, concise response. If the question is about exams, guide them to specific queries like "next exam", "tomorrow exams", or ask for department/semester. If it's a general question about the website, explain briefly.
Respond in ${chatContext.languagePreference === 'banglish' ? 'Bengali (Banglish script)' : 'English'}.
`;
                    if (isRetry) {
                        generalPrompt = `
You are "Routine Explorer", a friendly exam assistant chatbot for Barisal Polytechnic Institute.
The user did not like your previous response to the question: "${originalMessage}".
Please provide a more detailed, helpful, and accurate answer. Consider the exam data context below.
Current date: ${chatContext.currentDate}
Total upcoming exams: ${upcomingExams.length}
${buildExamContextSummary()}

Provide a clear, informative response. If the question is ambiguous, ask clarifying questions.
Respond in ${chatContext.languagePreference === 'banglish' ? 'Bengali (Banglish script)' : 'English'}.
`;
                    }
                    const groqReply = await callGroqAPI(originalMessage, generalPrompt);
                    if (groqReply) {
                        response = groqReply;
                    } else {
                        response = "I'm not sure how to answer that. Could you please rephrase or ask about your exam schedule?";
                    }
                }
                break;
            }
        }

        return response || "Sorry, I didn't catch that. Could you try again?";
    }

    // ============== HELPER FUNCTIONS ==============

    function getNextExam(exams) {
        if (!exams || exams.length === 0) return null;
        const upcoming = exams.filter(e => e.examDate >= chatContext.currentDate);
        if (upcoming.length === 0) return null;
        upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        return upcoming[0];
    }

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
                return null;
            }
        }
        return null;
    }

    function getExternalQueryResponse() {
        return "I'm not sure how to answer that. Could you please rephrase or ask about your exam schedule?";
    }

    // ============== PREDEFINED RESPONSES WITH STRICT MATCHING ==============

    function getPredefinedResponse(lowerMessage, originalMessage) {
        for (const key of Object.keys(PRE_DEFINED_RESPONSES)) {
            const regex = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            if (regex.test(lowerMessage)) {
                return PRE_DEFINED_RESPONSES[key][chatContext.languagePreference] || PRE_DEFINED_RESPONSES[key].english;
            }
        }

        for (const [bengaliPhrase, englishKey] of Object.entries(BENGALI_PHRASES)) {
            if (originalMessage.includes(bengaliPhrase)) {
                const responses = PRE_DEFINED_RESPONSES[englishKey];
                if (responses) {
                    return responses[chatContext.languagePreference] || responses.english;
                }
            }
        }

        if (isGreeting(lowerMessage, originalMessage)) {
            return getGreetingResponse();
        }
        if (isThanks(lowerMessage, originalMessage)) {
            return PRE_DEFINED_RESPONSES["thank you"][chatContext.languagePreference] || "You're welcome! 😊";
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

    // ============== BUILT-IN EXAM QUERY HANDLER (FALLBACK) ==============

    async function handleExamQuery(lowerMessage, originalMessage) {
        if (!chatContext.examData || chatContext.examData.length === 0) {
            await loadExamData();
            if (!chatContext.examData || chatContext.examData.length === 0) {
                return null;
            }
        }

        const upcomingExams = chatContext.examData.filter(e => e.examDate >= chatContext.currentDate);

        if (lowerMessage.includes('next exam') || lowerMessage.includes('next') || 
            lowerMessage.includes('nxt') || lowerMessage.includes('পরবর্তী') ||
            lowerMessage === 'porer exam') {
            const nextExam = getNextExam(upcomingExams);
            if (nextExam) return buildExamCard(nextExam, true);
            return lang("🎉 No upcoming exams found!", "🎉 Kono upcoming exam nei!");
        }

        const deptMatch = extractDepartment(originalMessage);
        const semMatch = extractSemester(originalMessage);
        const typeMatch = extractExamType(originalMessage);
        const subjectMatch = extractSubject(originalMessage);

        let filtered = upcomingExams;
        if (deptMatch) filtered = filtered.filter(e => e.department.toLowerCase().includes(deptMatch.toLowerCase()));
        if (semMatch) filtered = filtered.filter(e => e.semester === semMatch);
        if (typeMatch) filtered = filtered.filter(e => (e.examType || 'written') === typeMatch);
        if (subjectMatch) filtered = filtered.filter(e => e.subject.toLowerCase().includes(subjectMatch.toLowerCase()));

        if (filtered.length > 0) {
            let title = lang(`Found ${filtered.length} upcoming exams`, `${filtered.length} ta upcoming exam paoa geche`);
            if (deptMatch && semMatch) {
                title = lang(`${deptMatch} ${semMatch} Exams (${filtered.length})`, `${deptMatch} ${semMatch} Exams (${filtered.length})`);
            } else if (deptMatch) {
                title = lang(`${deptMatch} Department (${filtered.length} exams)`, `${deptMatch} Department (${filtered.length} exams)`);
            } else if (semMatch) {
                title = lang(`${semMatch} Semester (${filtered.length} exams)`, `${semMatch} Semester (${filtered.length} exams)`);
            } else if (subjectMatch) {
                title = lang(`Exams for "${subjectMatch}" (${filtered.length})`, `"${subjectMatch}" er exams (${filtered.length})`);
            }
            return buildExamListCardWithLimit(filtered, title);
        }

        return null;
    }

    function extractSemester(message) {
        const sems = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
        for (const s of sems) {
            if (message.toLowerCase().includes(s)) return s;
        }
        return null;
    }

    function extractExamType(message) {
        const types = ['written', 'practical', 'referred'];
        for (const t of types) {
            if (message.toLowerCase().includes(t)) return t;
        }
        return null;
    }

    function extractDepartment(message) {
        const depts = ['computer', 'civil', 'electrical', 'mechanical', 'electronics', 'power', 'electro-medical', 'tourism'];
        for (const d of depts) {
            if (message.toLowerCase().includes(d)) return d;
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

    // ============== UTILITY ==============

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function lang(english, banglish) {
        return chatContext.languagePreference === 'banglish' ? banglish : english;
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

    // ============== MESSAGE HANDLER ==============

    async function handleChatMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        addUserMessage(message);
        chatInput.value = '';
        
        const typingId = showTypingIndicator();
        
        setTimeout(async () => {
            try {
                const response = await processUserMessage(message, false);
                removeTypingIndicator(typingId);
                addBotMessage(response);
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator(typingId);
                addBotMessage("Sorry, I encountered an error. Please try again.");
            }
        }, 2000);
    }

    // ============== GLOBAL EXPORTS ==============

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