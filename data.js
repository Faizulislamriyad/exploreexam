// data.js - Firebase Data Management with Admin Control

// NO PRE-DEFINED SUBJECTS - Admin will add everything

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get date in a readable format
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
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

// Firebase function to load exams - NO DEFAULT DATA
async function loadExamsFromFirebase() {
    try {
        if (!window.firebase || !window.firebase.db) {
            console.log("Firebase not initialized");
            return []; // Return empty array if Firebase not available
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
        return firebaseExams; // Return only Firebase data
        
    } catch (error) {
        console.error('Error loading exams from Firebase:', error);
        return []; // Return empty array on error
    }
}

// Function to refresh exam data
async function refreshExamData() {
    return await loadExamsFromFirebase();
}

// Export functions for use in script.js
window.dataFunctions = {
    getCurrentDate,
    formatDate,
    getDayDifference,
    getAllSubjectsFromExams,
    getAllDepartmentsFromExams,
    getAllSemestersFromExams,
    loadExamsFromFirebase,
    refreshExamData
};