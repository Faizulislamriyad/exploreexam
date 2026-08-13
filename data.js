// data.js - সম্পূর্ণ ফাইল (নতুন convertToStandardDate ফাংশন সহ)

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get date in a readable format (Full format)
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
}

// Get date in dd/mm/yyyy format
function formatDateShort(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// 🔥 NEW: Convert dd-mm-yyyy or dd/mm/yyyy to YYYY-MM-DD for comparison
function convertToStandardDate(dateStr) {
    if (!dateStr) return null;
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    // Handle dd-mm-yyyy
    let parts = dateStr.split('-');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    // Handle dd/mm/yyyy
    parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr; // fallback
}

// Get day difference between two dates
function getDayDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get all subjects from existing exams
function getAllSubjectsFromExams(examData) {
    const allSubjects = new Set();
    if (examData && Array.isArray(examData)) {
        examData.forEach(exam => {
            if (exam.subject) {
                allSubjects.add(exam.subject);
            }
        });
    }
    return Array.from(allSubjects);
}

// Get all departments from existing exams
function getAllDepartmentsFromExams(examData) {
    const allDepartments = new Set();
    if (examData && Array.isArray(examData)) {
        examData.forEach(exam => {
            if (exam.department) {
                allDepartments.add(exam.department);
            }
        });
    }
    return Array.from(allDepartments);
}

// Get all semesters from existing exams
function getAllSemestersFromExams(examData) {
    const allSemesters = new Set();
    if (examData && Array.isArray(examData)) {
        examData.forEach(exam => {
            if (exam.semester) {
                allSemesters.add(exam.semester);
            }
        });
    }
    return Array.from(allSemesters);
}

// Firebase function to load exams
async function loadExamsFromFirebase() {
    try {
        if (!window.firebase || !window.firebase.db) {
            console.log("Firebase not initialized");
            return [];
        }
        const querySnapshot = await window.firebase.getDocs(
            window.firebase.collection(window.firebase.db, "exams")
        );
        const firebaseExams = [];
        querySnapshot.forEach((doc) => {
            firebaseExams.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('Loaded exams from Firebase:', firebaseExams.length);
        return firebaseExams;
    } catch (error) {
        console.error('Error loading exams from Firebase:', error);
        return [];
    }
}

// Function to refresh exam data
async function refreshExamData() {
    return await loadExamsFromFirebase();
}

// Export functions
window.dataFunctions = {
    getCurrentDate,
    formatDate,
    formatDateShort,
    convertToStandardDate,   // ✅ নতুন ফাংশন
    getDayDifference,
    getAllSubjectsFromExams,
    getAllDepartmentsFromExams,
    getAllSemestersFromExams,
    loadExamsFromFirebase,
    refreshExamData
};