// smart-conversation-chatbot.js - Premium Compact Card with Icons & Like/Dislike + Groq API via Proxy

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

    // Predefined responses (kept for quick matches and fallback)
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
        // Remove duplicates
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

    // Initialize chatbot
    initChatbot();

    // Event listeners
    chatbotToggle.addEventListener('click', toggleChatbot);
    closeChatbot.addEventListener('click', toggleChatbot);
    sendMessage.addEventListener('click', handleChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatMessage();
    });

    // Delegate click events for Like/Dislike buttons
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

    // ============== GROQ API CALL VIA PROXY (/api/groq) ==============

    async function callGroqAPI(userMessage, systemPrompt) {
        try {
            const PROXY_URL = '/api/groq';

            // Prepare conversation history (without timestamps)
            const history = chatContext.conversationHistory.slice(-5);
            const sanitizedHistory = history.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const messages = [
                { role: 'system', content: systemPrompt },
                ...sanitizedHistory,
                { role: 'user', content: userMessage }
            ];

            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: 'openai/gpt-oss-120b',
                    temperature: 0.7,
                    max_tokens: 350
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Proxy API error:', data);
                return null;
            }

            return data.reply || null;
        } catch (error) {
            console.error('Proxy API fetch error:', error);
            return null;
        }
    }

    // ============== SMART REQUEST ANALYZER ==============

    async function analyzeUserRequest(userMessage) {
        const systemPrompt = `
You are an intelligent request analyzer for an exam routine chatbot.

Your task: Analyze the user's message and extract the following information in JSON format:

{
  "intent": "one of: 'next_exam', 'tomorrow_exams', 'specific_date_exams', 'department_exams', 'semester_exams', 'subject_exams', 'exam_type_exams', 'all_upcoming', 'set_reminder', 'download', 'general_question', 'greeting', 'thanks', 'goodbye',
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
- If the user asks for "next exam", "porer exam", "upcoming exam" → intent: "next_exam"
- If the user asks for "tomorrow", "agami kal", "kal" → intent: "tomorrow_exams"
- If the user mentions a specific date → intent: "specific_date_exams"
- If the user mentions a department name → set filters.department
- If the user mentions a semester like "1st", "2nd", etc. → set filters.semester
- If the user mentions "practical", "written", "referred" → set filters.examType
- If the user mentions a subject name → set filters.subject
- If the user asks for "all exams", "all upcoming", "sab exam" → intent: "all_upcoming"
- If the user asks "set reminder", "remind me", "notification" → intent: "set_reminder"
- If the user asks "download", "pdf", "dn" → intent: "download"
- For general questions about the website, etc. → intent: "general_question"

If the user's message contains multiple requests, set "multiple_requests": true.

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

    async function processUserMessage(message) {
        const lowerMessage = message.toLowerCase().trim();
        const originalMessage = message;
        
        // Step 1: Check shortcuts
        const shortcutResult = handleShortcuts(lowerMessage, originalMessage);
        if (shortcutResult) {
            return shortcutResult;
        }

        // Step 2: Check predefined FAQ
        const predefinedResponse = getPredefinedResponse(lowerMessage, originalMessage);
        if (predefinedResponse) {
            return predefinedResponse;
        }

        // Step 3: Smart analysis via Groq
        const analysis = await analyzeUserRequest(originalMessage);
        console.log('User request analysis:', analysis);

        if (!analysis) {
            // Fallback to built-in handlers
            const examResponse = await handleExamQuery(lowerMessage, originalMessage);
            if (examResponse) {
                return examResponse;
            }
            return getExternalQueryResponse();
        }

        const { intent, filters, summary, multiple_requests } = analysis;

        if (!chatContext.examData || chatContext.examData.length === 0) {
            await loadExamData();
            if (!chatContext.examData || chatContext.examData.length === 0) {
                return lang("I couldn't load exam data. Please try again later.", "Ami exam data load korte parini. Ektu pore abar try korun.");
            }
        }

        // Filter to only upcoming exams
        const upcomingExams = chatContext.examData.filter(e => e.examDate >= chatContext.currentDate);

        let response = '';

        // Handle multiple requests
        if (multiple_requests) {
            response = `<div style="margin-bottom:10px;">${summary}</div>`;
            let combinedExams = [];

            if (intent === 'next_exam' || intent === 'all_upcoming') {
                const nextExam = getNextExam(upcomingExams);
                if (nextExam) {
                    combinedExams.push(nextExam);
                }
            }

            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
            const tomorrowExams = upcomingExams.filter(e => e.examDate === tomorrowStr);
            if (tomorrowExams.length > 0 && !combinedExams.some(e => e.examDate === tomorrowStr)) {
                combinedExams = combinedExams.concat(tomorrowExams);
            }

            // Apply filters
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

            // Remove duplicates
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
                response += buildExamListCard(uniqueCombined, lang('Your Exam Information', 'Apnar Exam Information'));
            } else {
                response += lang("No upcoming exams found matching your request.", "Apnar request er moto kono upcoming exam nei.");
            }

            return response;
        }

        // Single intent handling
        switch (intent) {
            case 'next_exam': {
                const nextExam = getNextExam(upcomingExams);
                if (nextExam) {
                    response = buildExamCard(nextExam, true);
                } else {
                    response = lang("🎉 No upcoming exams found!", "🎉 Kono upcoming exam nei!");
                }
                break;
            }

            case 'tomorrow_exams': {
                const tomorrowDate = new Date();
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
                const exams = upcomingExams.filter(e => e.examDate === tomorrowStr);
                if (exams.length > 0) {
                    response = buildExamListCard(exams, lang(`Tomorrow's Exams (${exams.length})`, `Agamikal er Exams (${exams.length})`));
                } else {
                    response = lang("🎉 No exams scheduled for tomorrow.", "🎉 Agamikal kono exam nei.");
                }
                break;
            }

            case 'specific_date_exams': {
                if (filters.date) {
                    const exams = upcomingExams.filter(e => e.examDate === filters.date);
                    if (exams.length > 0) {
                        response = buildExamListCard(exams, lang(`Exams on ${formatDate(filters.date)} (${exams.length})`, `${formatDate(filters.date)} tarikher exams (${exams.length})`));
                    } else {
                        response = lang(`No exams on ${formatDate(filters.date)}.`, `${formatDate(filters.date)} tarikhe kono exam nei.`);
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
                if (filters.department) {
                    filtered = filtered.filter(e => e.department.toLowerCase().includes(filters.department.toLowerCase()));
                }
                if (filters.semester) {
                    filtered = filtered.filter(e => e.semester === filters.semester);
                }
                if (filters.examType) {
                    filtered = filtered.filter(e => (e.examType || 'written') === filters.examType);
                }
                if (filters.subject) {
                    filtered = filtered.filter(e => e.subject.toLowerCase().includes(filters.subject.toLowerCase()));
                }

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
                    response = buildExamListCard(filtered, title);
                } else {
                    response = lang("No upcoming exams found matching your filters.", "Apnar filters er moto kono upcoming exam nei.");
                }
                break;
            }

            case 'set_reminder': {
                const nextExam = getNextExam(upcomingExams);
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

            case 'greeting':
            case 'thanks':
            case 'goodbye': {
                response = getPredefinedResponse(lowerMessage, originalMessage) || getExternalQueryResponse();
                break;
            }

            case 'general_question':
            default: {
                const generalPrompt = `
You are "Routine Explorer", a friendly exam assistant chatbot for Barisal Polytechnic Institute.
Current date: ${chatContext.currentDate}
Total upcoming exams: ${upcomingExams.length}

The user asked: "${originalMessage}"

Provide a helpful, concise response. If the question is about exams, guide them to specific queries like "next exam", "tomorrow exams", or ask for department/semester. If it's a general question about the website, explain briefly.
Respond in ${chatContext.languagePreference === 'banglish' ? 'Bengali (Banglish script)' : 'English'}.
`;
                const groqReply = await callGroqAPI(originalMessage, generalPrompt);
                if (groqReply) {
                    response = groqReply;
                } else {
                    response = getExternalQueryResponse();
                }
                break;
            }
        }

        return response || getExternalQueryResponse();
    }

    // ============== HELPER: Get Next Exam ==============

    function getNextExam(exams) {
        if (!exams || exams.length === 0) return null;
        const upcoming = exams.filter(e => e.examDate >= chatContext.currentDate);
        if (upcoming.length === 0) return null;
        upcoming.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
        return upcoming[0];
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
                    return null;
                }
                if (config.action === 'set_reminder') {
                    return null;
                }
            }
        }
        return null;
    }

    // ============== GET EXTERNAL QUERY RESPONSE (fallback) ==============

    function getExternalQueryResponse() {
        const responses = chatContext.languagePreference === 'banglish' 
            ? EXTERNAL_RESPONSES.banglish 
            : EXTERNAL_RESPONSES.english;
        return responses[Math.floor(Math.random() * responses.length)];
    }

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

    // ============== PREDEFINED RESPONSES ==============

    function getPredefinedResponse(lowerMessage, originalMessage) {
        for (const [key, responses] of Object.entries(PRE_DEFINED_RESPONSES)) {
            if (lowerMessage.includes(key)) {
                return responses[chatContext.languagePreference] || responses.english;
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
            return buildExamListCard(filtered, title);
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

    // ============== UTILITY FUNCTIONS ==============

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

    // ============== MESSAGE HANDLER ==============

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
