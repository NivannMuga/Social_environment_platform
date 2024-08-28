document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const type = document.getElementById('type').value;
    console.log(username, email, password, type)

    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, type })
    })
    .then(response => {
        if (!response.ok) {
            // If response is not OK, throw an error to be caught in the catch block
            throw new Error('Registration failed with status ' + response.status);
        }
        // If the response is OK, proceed to parse the JSON
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        // Handle success, e.g., redirect to the login page
        window.location.href = '/login';
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home_link');
    homeLink.addEventListener('click', () => {
        window.location.href = '/'
    })
})

document.getElementById('loginButton').addEventListener('click', function() {
    window.location.href = '/login';
});


