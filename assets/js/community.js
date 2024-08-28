document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home_link');
    const reportLink = document.getElementById('report_link');

    homeLink.addEventListener('click', () => {
        window.location.href = '/dashboard'
    });
    reportLink.addEventListener('click', () => {
        window.location.href = '/report_pollution'
    });
})