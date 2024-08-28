document.addEventListener('DOMContentLoaded', () => {
    const loginLink = document.getElementById('login_link')
    const registerLink = document.getElementById('register_link')


    loginLink.addEventListener('click', () => {
        window.location.href = '/login'
    });
    registerLink.addEventListener('click', () => {
        window.location.href = '/register'
    });
});

