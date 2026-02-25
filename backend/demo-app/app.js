// Pathfinder Email Parser Demo App
const API_BASE = 'http://localhost:3001/api';

// Global state
let allApplications = [];
let selectedStudentEmail = null;
let allStudents = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();

    // Add enter key listener to email input
    const emailInput = document.getElementById('studentEmail');
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadStudentData();
        }
    });

    // Set default email if available
    const urlParams = new URLSearchParams(window.location.search);
    const defaultEmail = urlParams.get('email');
    if (defaultEmail) {
        emailInput.value = defaultEmail;
        loadStudentData();
    }
});

// Tab Navigation
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update active states
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Load data when switching tabs
            if (targetTab === 'dashboard') {
                loadDashboardData();
            } else if (targetTab === 'applications') {
                loadApplications();
            }
        });
    });
}

// Load Student Data
function loadStudentData() {
    const emailInput = document.getElementById('studentEmail');
    selectedStudentEmail = emailInput.value.trim();

    if (!selectedStudentEmail) {
        alert('Please enter a student email address');
        return;
    }

    // Validate email format
    if (!selectedStudentEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    // Update info display
    const infoEl = document.getElementById('studentInfo');
    infoEl.textContent = `Loading data for ${selectedStudentEmail}...`;

    // Reload all data for selected student
    loadDashboardData();
    loadApplications();
}

// Dashboard Data
async function loadDashboardData() {
    try {
        const emailParam = selectedStudentEmail ? `?email=${encodeURIComponent(selectedStudentEmail)}` : '';

        // Fetch stats
        const [emailsRes, appsRes] = await Promise.all([
            fetch(`${API_BASE}/emails${emailParam}`),
            fetch(`${API_BASE}/applications${emailParam}`)
        ]);

        const emailsData = await emailsRes.json();
        const appsData = await appsRes.json();

        // Update student info with results
        const infoEl = document.getElementById('studentInfo');
        if (emailsData.error || appsData.error) {
            infoEl.textContent = '❌ Student not found';
            infoEl.style.background = '#fee2e2';
            infoEl.style.color = '#991b1b';
        } else {
            const appCount = appsData.applications?.length || 0;
            infoEl.textContent = `✓ ${appCount} application${appCount !== 1 ? 's' : ''} found`;
            infoEl.style.background = '#d1fae5';
            infoEl.style.color = '#065f46';
        }

        // Update stats
        const totalEmails = emailsData.emails?.length || 0;
        const parsedEmails = emailsData.emails?.filter(e => e.processed).length || 0;
        const totalApplications = appsData.applications?.length || 0;
        const successRate = totalEmails > 0 ? Math.round((parsedEmails / totalEmails) * 100) : 0;

        document.getElementById('totalEmails').textContent = totalEmails;
        document.getElementById('parsedEmails').textContent = parsedEmails;
        document.getElementById('totalApplications').textContent = totalApplications;
        document.getElementById('successRate').textContent = `${successRate}%`;

        // Load recent activity
        loadRecentActivity(emailsData.emails || [], appsData.applications || []);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function loadRecentActivity(emails, applications) {
    const container = document.getElementById('recentActivity');

    // Combine and sort by timestamp
    const activities = [];

    emails.forEach(email => {
        if (email.processed) {
            activities.push({
                type: 'email',
                icon: '✨',
                title: 'Email Parsed',
                description: email.subject || 'Job application email',
                time: email.processed_at || email.created_at
            });
        }
    });

    applications.forEach(app => {
        activities.push({
            type: 'application',
            icon: '📝',
            title: 'Application Created',
            description: `${app.position_title || app.position} at ${app.company_name || app.company}`,
            time: app.created_at
        });
    });

    // Sort by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No activity yet</div><div class="empty-state-description">Sync some emails to get started!</div></div>';
        return;
    }

    // Display top 10 activities
    container.innerHTML = activities.slice(0, 10).map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
            </div>
            <div class="activity-time">${formatTimeAgo(activity.time)}</div>
        </div>
    `).join('');
}

// Email Syncing
async function syncEmails() {
    const statusBox = document.getElementById('parserStatus');
    showStatus('loading', `📥 Syncing emails for ${selectedStudentEmail}...`, statusBox);

    try {
        const response = await fetch(`${API_BASE}/emails/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: selectedStudentEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus('success', `✅ Success! Synced ${data.newEmails || 0} new emails`, statusBox);
            await loadDashboardData();
        } else {
            showStatus('error', `❌ Error: ${data.error || 'Failed to sync emails'}`, statusBox);
        }
    } catch (error) {
        console.error('Sync error:', error);
        showStatus('error', '❌ Network error. Make sure the backend is running on port 3001.', statusBox);
    }
}

// Parse Single Email
async function parseNextEmail() {
    const statusBox = document.getElementById('parserStatus');
    const resultsContainer = document.getElementById('parsingResults');

    showStatus('loading', '✨ Parsing next unprocessed email...', statusBox);

    try {
        // Get unprocessed emails
        const emailsRes = await fetch(`${API_BASE}/emails`);
        const emailsData = await emailsRes.json();
        const unprocessed = emailsData.emails?.filter(e => !e.processed) || [];

        if (unprocessed.length === 0) {
            showStatus('info', 'ℹ️ No unprocessed emails. Sync more emails first!', statusBox);
            return;
        }

        // Parse the first unprocessed email
        const email = unprocessed[0];
        const response = await fetch(`${API_BASE}/emails/${email.id}/parse`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            showStatus('success', `✅ Successfully parsed email: ${email.subject}`, statusBox);
            displayParsingResult(data, email);
            await loadDashboardData();
        } else {
            showStatus('error', `❌ Parse error: ${data.error || 'Unknown error'}`, statusBox);
        }
    } catch (error) {
        console.error('Parse error:', error);
        showStatus('error', '❌ Network error. Make sure the backend is running.', statusBox);
    }
}

// Parse All Emails
async function parseAllEmails() {
    const statusBox = document.getElementById('parserStatus');
    showStatus('loading', `⚡ Parsing all unprocessed emails for ${selectedStudentEmail}...`, statusBox);

    try {
        const response = await fetch(`${API_BASE}/emails/parse-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: selectedStudentEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus('success', `✅ Parsed ${data.processed || 0} emails! ${data.applications || 0} applications created.`, statusBox);
            await loadDashboardData();
            await loadApplications();
            await loadStudents(); // Refresh student counts
        } else {
            showStatus('error', `❌ Error: ${data.error || 'Failed to parse emails'}`, statusBox);
        }
    } catch (error) {
        console.error('Parse all error:', error);
        showStatus('error', '❌ Network error. Make sure the backend is running.', statusBox);
    }
}

// Display Parsing Result
function displayParsingResult(result, email) {
    const container = document.getElementById('parsingResults');
    const app = result.application;

    const resultHTML = `
        <div class="parsing-item">
            <div class="parsing-item-header">
                <div>
                    <div class="parsing-item-title">${app?.position_title || app?.position || 'Unknown Position'}</div>
                    <div class="parsing-item-subtitle">${app?.company_name || app?.company || 'Unknown Company'}</div>
                </div>
                <span class="parsing-badge success">✓ Parsed</span>
            </div>

            <div class="parsing-details">
                <div class="parsing-detail">
                    <div class="parsing-detail-label">Company</div>
                    <div class="parsing-detail-value">${app?.company_name || app?.company || 'N/A'}</div>
                </div>
                <div class="parsing-detail">
                    <div class="parsing-detail-label">Position</div>
                    <div class="parsing-detail-value">${app?.position_title || app?.position || 'N/A'}</div>
                </div>
                <div class="parsing-detail">
                    <div class="parsing-detail-label">Status</div>
                    <div class="parsing-detail-value">${app?.status || app?.application_status || 'applied'}</div>
                </div>
                <div class="parsing-detail">
                    <div class="parsing-detail-label">Applied Date</div>
                    <div class="parsing-detail-value">${app?.applied_date || app?.application_date ? formatDate(app.applied_date || app.application_date) : 'N/A'}</div>
                </div>
                <div class="parsing-detail">
                    <div class="parsing-detail-label">Job Type</div>
                    <div class="parsing-detail-value">${app?.job_type || 'N/A'}</div>
                </div>
                <div class="parsing-detail">
                    <div class="parsing-detail-label">Location</div>
                    <div class="parsing-detail-value">${app?.location || 'N/A'}</div>
                </div>
            </div>

            ${app?.job_url ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <a href="${app.job_url}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 14px;">
                        🔗 View Job Posting →
                    </a>
                </div>
            ` : ''}
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', resultHTML);
}

// Load Applications
async function loadApplications() {
    const container = document.getElementById('applicationsList');
    container.innerHTML = '<div class="loading">Loading applications...</div>';

    try {
        const emailParam = selectedStudentEmail ? `?email=${encodeURIComponent(selectedStudentEmail)}` : '';
        const response = await fetch(`${API_BASE}/applications${emailParam}`);
        const data = await response.json();

        allApplications = data.applications || [];
        displayApplications(allApplications);

    } catch (error) {
        console.error('Error loading applications:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Failed to load applications</div></div>';
    }
}

function displayApplications(applications) {
    const container = document.getElementById('applicationsList');

    if (applications.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-title">No applications yet</div><div class="empty-state-description">Parse some emails to create applications!</div></div>';
        return;
    }

    container.innerHTML = applications.map(app => `
        <div class="application-card">
            <div class="application-header">
                <div class="application-company">${app.company_name || app.company || 'Unknown Company'}</div>
                <div class="application-position">${app.position_title || app.position || 'Unknown Position'}</div>
                <span class="application-status status-${app.status || app.application_status || 'applied'}">
                    ${(app.status || app.application_status || 'applied').toUpperCase()}
                </span>
            </div>

            <div class="application-meta">
                ${app.applied_date || app.application_date ? `
                    <div class="application-meta-item">
                        📅 Applied: ${formatDate(app.applied_date || app.application_date)}
                    </div>
                ` : ''}
                ${app.job_type ? `
                    <div class="application-meta-item">
                        💼 ${app.job_type}
                    </div>
                ` : ''}
                ${app.location ? `
                    <div class="application-meta-item">
                        📍 ${app.location}
                    </div>
                ` : ''}
                ${app.job_url ? `
                    <div class="application-meta-item">
                        <a href="${app.job_url}" target="_blank" style="color: #2563eb; text-decoration: none;">
                            🔗 View Posting
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filterApplications() {
    const filter = document.getElementById('statusFilter').value;

    if (filter === 'all') {
        displayApplications(allApplications);
    } else {
        const filtered = allApplications.filter(app => (app.status || app.application_status) === filter);
        displayApplications(filtered);
    }
}

// Utility Functions
function showStatus(type, message, container) {
    if (container) {
        container.className = `status-box ${type}`;
        container.textContent = message;
    }
}

function showError(message) {
    const statusBox = document.getElementById('parserStatus');
    if (statusBox) {
        showStatus('error', `❌ ${message}`, statusBox);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return formatDate(dateString);
}

function refreshData() {
    loadDashboardData();
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'dashboard') {
        loadDashboardData();
    }
}, 30000);
