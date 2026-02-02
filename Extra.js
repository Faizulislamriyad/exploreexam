// Mobile ডিভাইসে শুধু হেডার পরিবর্তন
function updateHeadersForMobile() {
    if (window.innerWidth <= 768) {
        const headerItems = document.querySelectorAll('.routine-header .header-item');
        if (headerItems.length >= 7) {
            headerItems[0].textContent = "Exam Routine";
            headerItems[1].textContent = "Dept";
            headerItems[2].textContent = "Sem";
            headerItems[3].textContent = "Subject";
            headerItems[4].textContent = "Date";
            headerItems[5].textContent = "Time";
            headerItems[6].textContent = "Type";
        }
    }
}

// পেজ লোড এবং রিসাইজে কল করুন
window.addEventListener('load', updateHeadersForMobile);
window.addEventListener('resize', updateHeadersForMobile);

// নতুন: রিসাইজ শেষ হলে পেজ রিফ্রেশ (Debounce সহ)
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        location.reload();
    }, 200); // রিসাইজ শেষ হওয়ার ২০০ মিলিসেকেন্ড পর রিফ্রেশ
});