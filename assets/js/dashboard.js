document.addEventListener('DOMContentLoaded', () => {
    const communityLink = document.getElementById('community_link');
    const reportLink = document.getElementById('report_link');

    communityLink.addEventListener('click', () => {
        window.location.href = '/community';
    });
    reportLink.addEventListener('click', () => {
        window.location.href = '/report_pollution';
    });

    let reports = [];
    let page = 0;
    const limit = 10;
    const reportsContainer = document.getElementById('reports');

    function loadReports() {
        const start = page * limit;
        const end = start + limit;
        const paginatedReports = reports.slice(start, end);

        paginatedReports.forEach(report => {
            const createdAt = new Date(report.created_at);
            const now = new Date();
            const timeDiff = Math.abs(now - createdAt);
            let timeAgo;

            if (timeDiff < 60000) {
                timeAgo = `${Math.floor(timeDiff / 1000)}s ago`;
            } else if (timeDiff < 3600000) {
                timeAgo = `${Math.floor(timeDiff / 60000)}m ago`;
            } else if (timeDiff < 86400000) {
                timeAgo = `${Math.floor(timeDiff / 3600000)}h ago`;
            } else {
                timeAgo = `${Math.floor(timeDiff / 86400000)}d ago`;
            }

            const reportDiv = document.createElement('div');
            reportDiv.classList.add('post');

            const imageDiv = `<div id="image" style="background-image: url('${report.image_url}');"></div>`;
            const profileImage = report.profile_image || '/image/account.png';

            reportDiv.innerHTML = `
                ${imageDiv}
                <div id="description">
                    <div id="userProfile">
                        <div id="profile_icon"><img src="${profileImage}" alt="${report.username}'s profile image"></div>
                        <div id="nameHolder">
                            <h4 id="name">${report.username}</h4>
                            <span><h5 id="location">${report.location} ,</h5><h5 id="time">${timeAgo}</h5></span>
                        </div>
                    </div>
                    <div id="post_description">
                        <p>${report.description}</p>
                    </div>
                </div>
            `;

            reportsContainer.appendChild(reportDiv);
        });

        page++;
    }

    fetch('/api/reports')
    .then(response => response.json())
    .then(data => {
        reports = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        loadReports();
    })
    .catch(error => console.error('Error fetching reports:', error));

    fetch('/api/get_profile_image')
    .then(response => response.json())
    .then(data => {
        const accountPicElements = document.querySelectorAll('#accountPic');
        if (data.success && data.imageUrl) {
            accountPicElements.forEach(img => {
                img.src = data.imageUrl;
            });
        }
    })
    .catch(error => console.error('Error fetching profile image:', error));

    // Fetch user data to update the username and type in the profile drawer and profile settings
    fetch('/api/get_user_data')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.username) {
            const profileNameDrawer = document.querySelector('#profiledrawer h3');
            const profileNameSettings = document.querySelector('#profileSettings h4');
            const profileTypeSettings = document.querySelector('#profileSettings #type');

            profileNameDrawer.textContent = data.username;
            profileNameSettings.textContent = data.username;
            profileTypeSettings.textContent = data.type; // Set the type field
        }
    })
    .catch(error => console.error('Error fetching user data:', error));

    const profileSetings = document.getElementById('profileSettings');
    const profileIcon = document.getElementById('profileIcon');
    profileIcon.addEventListener('click', () => {
        profileSetings.style.display = 'flex';
    });
    const closeButton = document.getElementById('closeButton');
    closeButton.addEventListener('click', () => {
        profileSetings.style.display = 'none';
    });

    const edit = document.getElementById('profileEdit');
    const imageInput = document.getElementById('image');
    const accountPicElements = document.querySelectorAll('#accountPic');

    edit.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('profile_image', file);

            fetch('/api/upload_profile_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    accountPicElements.forEach(img => {
                        img.src = data.imageUrl;
                    });
                } else {
                    console.error('Failed to upload image:', data.message);
                }
            })
            .catch(error => console.error('Error uploading image:', error));
        }
    });

    const logoutBTNs = document.querySelectorAll('.logout');
    logoutBTNs.forEach(btn => {
        btn.addEventListener('click', () => {
            fetch('/api/logout', {
                method: 'POST'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error logging out');
                }
                return response.text();
            })
            .then(text => {
                if (text.includes('Error')) {
                    alert("Issues logging out");
                } else {
                    window.location.href = '/login';
                }
            })
            .catch(error => {
                console.error('Logout failed:', error);
                alert("Error logging out");
            });
        });
    });

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            loadReports();
        }
    });
});
