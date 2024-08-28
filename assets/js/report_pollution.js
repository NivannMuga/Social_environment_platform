document.addEventListener('DOMContentLoaded', () => {
    const homeLink = document.getElementById('home_link');
    const communityLink = document.getElementById('community_link');
    homeLink.addEventListener('click', () => {
        window.location.href = '/dashboard'
    });
    communityLink.addEventListener('click', () => {
        window.location.href = '/community'
    });


    document.getElementById('uploadIcon').addEventListener('click', function() {
        document.getElementById('image').click();
    });
    
    document.getElementById('image').addEventListener('change', function() {
        const filename = this.files.length ? this.files[0].name : 'No file chosen';
        document.getElementById('filename').textContent = filename;
    });
    
    document.getElementById('submitButton').addEventListener('click', function(event) {
        event.preventDefault();
    
        // Manually validate each input
        const title = document.getElementById('title').value.trim();
        const location = document.getElementById('location').value.trim();
        const severity = document.getElementById('severity').value.trim();
        const description = document.getElementById('Description').value.trim();
        const imageFile = document.getElementById('image').files[0];
    
        if (!title || !location || !severity || !description) {
            alert('All fields are required!');
            return;
        }
    
        // Create a FormData object to handle the file and other form data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('location', location);
        formData.append('severity', severity);
        formData.append('description', description);
        formData.append('image', imageFile);
    
        // Send the data to the server using fetch
        fetch('/api/report', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.getElementById('title').value = '';
                document.getElementById('location').value = '';
                document.getElementById('severity').value = '';
                document.getElementById('Description').value = '';
                document.getElementById('filename').textContent = 'No file chosen';
                alert(data.message);
            } else {
                alert('Error submitting report');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
    
    
    
})