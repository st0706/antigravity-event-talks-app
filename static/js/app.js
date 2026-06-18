// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let allReleases = [];
let filteredReleases = [];
let currentCategory = 'all';
let searchQuery = '';
let sortOrder = 'desc'; // 'desc' = Newest, 'asc' = Oldest
let selectedRelease = null;

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const feedLoader = document.getElementById('feed-loader');
const feedEmpty = document.getElementById('feed-empty');
const notesTimeline = document.getElementById('notes-timeline');
const searchInput = document.getElementById('search-input');
const sortDescBtn = document.getElementById('sort-desc');
const sortAscBtn = document.getElementById('sort-asc');
const refreshSvg = document.getElementById('refresh-svg');
const cacheStatus = document.getElementById('cache-status');

// Stat Elements
const statTotal = document.getElementById('stat-total').querySelector('.stat-value');
const statFeature = document.getElementById('stat-feature').querySelector('.stat-value');
const statAnnouncement = document.getElementById('stat-announcement').querySelector('.stat-value');
const statIssue = document.getElementById('stat-issue').querySelector('.stat-value');
const statChange = document.getElementById('stat-change').querySelector('.stat-value');
const statBreaking = document.getElementById('stat-breaking').querySelector('.stat-value');

// Composer Elements
const composerPlaceholder = document.getElementById('composer-placeholder');
const composerInterface = document.getElementById('composer-interface');
const previewCategoryBadge = document.getElementById('preview-category-badge');
const previewDate = document.getElementById('preview-date');
const previewNoteTitle = document.getElementById('preview-note-title');
const previewNoteText = document.getElementById('preview-note-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountText = document.getElementById('char-count-text');
const charProgressCircle = document.getElementById('char-progress-circle');
const charWarningMsg = document.getElementById('char-warning-msg');

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupCharProgressRing();
});

// ==========================================================================
// API CALLS
// ==========================================================================
async function fetchReleases(forceRefresh = false) {
    try {
        showLoader();
        refreshSvg.classList.add('spinning');
        
        const response = await fetch(`/api/releases?refresh=${forceRefresh}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            allReleases = data.releases;
            updateDashboardStats(data.categories, allReleases.length);
            
            // Set cache status display
            const now = new Date();
            cacheStatus.textContent = forceRefresh ? `Refreshed just now` : `Loaded from cache`;
            
            applyFilters();
        } else {
            showError("Failed to fetch release notes: " + data.message);
        }
    } catch (err) {
        showError("Network error fetching release notes.");
        console.error(err);
    } finally {
        refreshSvg.classList.remove('spinning');
    }
}

function refreshFeed() {
    fetchReleases(true);
}

// ==========================================================================
// STATE FILTERING & SORTING
// ==========================================================================
function filterCategory(category) {
    currentCategory = category;
    
    // Update active UI classes in sidebar
    document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
    if (category === 'all') {
        document.getElementById('stat-total').classList.add('active');
        document.getElementById('active-filters-chips').style.display = 'none';
    } else {
        const activeCard = document.querySelector(`.stat-card[data-category="${category}"]`);
        if (activeCard) activeCard.classList.add('active');
        
        // Show chip
        document.getElementById('active-filters-chips').style.display = 'flex';
        document.getElementById('chip-text').textContent = category;
    }
    
    applyFilters();
}

function handleSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    applyFilters();
}

function setSortOrder(order) {
    sortOrder = order;
    sortDescBtn.classList.toggle('active', order === 'desc');
    sortAscBtn.classList.toggle('active', order === 'asc');
    applyFilters();
}

function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    currentCategory = 'all';
    sortOrder = 'desc';
    
    document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
    document.getElementById('stat-total').classList.add('active');
    document.getElementById('active-filters-chips').style.display = 'none';
    
    sortDescBtn.classList.add('active');
    sortAscBtn.classList.remove('active');
    
    applyFilters();
}

function applyFilters() {
    // 1. Filter by category
    filteredReleases = allReleases;
    if (currentCategory !== 'all') {
        filteredReleases = filteredReleases.filter(r => r.category.toLowerCase() === currentCategory.toLowerCase());
    }
    
    // 2. Filter by search query
    if (searchQuery) {
        filteredReleases = filteredReleases.filter(r => {
            const dateMatch = r.date.toLowerCase().includes(searchQuery);
            const catMatch = r.category.toLowerCase().includes(searchQuery);
            const textMatch = r.content_text.toLowerCase().includes(searchQuery);
            return dateMatch || catMatch || textMatch;
        });
    }
    
    // 3. Sort
    filteredReleases.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    renderFeed();
}

// ==========================================================================
// RENDER UI FUNCTIONS
// ==========================================================================
function renderFeed() {
    hideLoader();
    
    if (filteredReleases.length === 0) {
        notesTimeline.style.display = 'none';
        feedEmpty.style.display = 'flex';
        return;
    }
    
    feedEmpty.style.display = 'none';
    notesTimeline.style.display = 'flex';
    notesTimeline.innerHTML = '';
    
    // Group notes by date for beautiful timeline grouping
    const grouped = {};
    filteredReleases.forEach(release => {
        if (!grouped[release.date]) {
            grouped[release.date] = [];
        }
        grouped[release.date].push(release);
    });
    
    // Render grouped dates
    for (const [date, items] of Object.entries(grouped)) {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'timeline-group';
        
        // Date marker
        const dateMarker = document.createElement('div');
        dateMarker.className = 'date-marker';
        dateMarker.innerHTML = `
            <div class="date-node"></div>
            <div class="date-text">${date}</div>
        `;
        groupContainer.appendChild(dateMarker);
        
        // Cards for this date
        items.forEach(item => {
            const card = document.createElement('div');
            // Unique ID identifier for testing/operations
            const releaseId = generateIdForRelease(item);
            card.id = `card-${releaseId}`;
            card.className = 'note-card';
            if (selectedRelease && generateIdForRelease(selectedRelease) === releaseId) {
                card.classList.add('selected-active');
            }
            
            const categoryClass = `badge-${item.category.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="badge ${categoryClass}">${item.category}</span>
                    <span class="note-date-text">${item.date}</span>
                </div>
                <div class="card-html-content">
                    ${item.content_html}
                </div>
                <div class="card-actions">
                    <button class="card-action-btn btn-secondary btn-copy" onclick="copyCardToClipboard('${releaseId}')" id="copy-btn-${releaseId}">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <a href="${item.primary_link}" target="_blank" rel="noopener noreferrer" class="card-action-btn btn-secondary">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        <span>View Docs</span>
                    </a>
                    <button class="card-action-btn btn-primary" onclick="selectReleaseForTweet(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${releaseId}')">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                        <span>Tweet Update</span>
                    </button>
                </div>
            `;
            groupContainer.appendChild(card);
        });
        
        notesTimeline.appendChild(groupContainer);
    }
}

function updateDashboardStats(categories, total) {
    statTotal.textContent = total;
    statFeature.textContent = categories['Feature'] || 0;
    statAnnouncement.textContent = categories['Announcement'] || 0;
    statIssue.textContent = categories['Issue'] || 0;
    statChange.textContent = categories['Change'] || 0;
    statBreaking.textContent = categories['Breaking'] || 0;
}

function showLoader() {
    feedLoader.style.display = 'flex';
    feedEmpty.style.display = 'none';
    notesTimeline.style.display = 'none';
}

function hideLoader() {
    feedLoader.style.display = 'none';
}

function showError(message) {
    hideLoader();
    feedEmpty.style.display = 'flex';
    feedEmpty.querySelector('h3').textContent = "Something went wrong";
    feedEmpty.querySelector('p').textContent = message;
    notesTimeline.style.display = 'none';
}

// Helper to create safe, clean IDs for elements based on release details
function generateIdForRelease(release) {
    const combined = `${release.date}-${release.category}-${release.content_text.slice(0, 20)}`;
    return combined.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

// ==========================================================================
// TWEET COMPOSER LOGIC
// ==========================================================================
function selectReleaseForTweet(release, releaseId) {
    selectedRelease = release;
    
    // Highlight active card
    document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected-active'));
    const activeCard = document.getElementById(`card-${releaseId}`);
    if (activeCard) activeCard.classList.add('selected-active');
    
    // Switch composer panels
    composerPlaceholder.style.display = 'none';
    composerInterface.style.display = 'flex';
    
    // Populating selection preview
    previewCategoryBadge.textContent = release.category;
    previewCategoryBadge.className = `preview-badge badge-${release.category.toLowerCase()}`;
    previewDate.textContent = release.date;
    
    // Make a neat preview title from category + date
    previewNoteTitle.textContent = `${release.category} Update`;
    previewNoteText.textContent = release.content_text;
    
    // Draft the initial tweet body
    const initialTweet = generateInitialDraft(release);
    tweetTextarea.value = initialTweet;
    
    updateCharCount();
    
    // Scroll to composer on mobile
    if (window.innerWidth <= 1200) {
        document.querySelector('.composer-section').scrollIntoView({ behavior: 'smooth' });
    }
}

function generateInitialDraft(release, limitText = false) {
    const dateStr = release.date;
    const category = release.category;
    
    const header = `📢 New BigQuery ${category} (${dateStr}):\n\n`;
    const hashtags = `\n\n#BigQuery #GoogleCloud`;
    const link = release.primary_link ? `\n🔗 Read: ${release.primary_link}` : '';
    
    // Calculate space left for description
    const baseLength = getTweetLength(header + link + hashtags);
    const availableLength = 280 - baseLength;
    
    let description = release.content_text;
    
    // If description is very long or if we want to enforce safety limits
    if (limitText || description.length > availableLength) {
        const sliceLen = Math.max(50, availableLength - 5);
        description = description.slice(0, sliceLen) + '...';
    }
    
    return `${header}${description}${link}${hashtags}`;
}

// Custom Tweet length calculation accounting for X's 23-char link wrap rule
function getTweetLength(text) {
    // Find all links in text (http or https)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let length = text.length;
    urls.forEach(url => {
        // Remove actual url length and add 23 characters (X's standard shortener cost)
        length = length - url.length + 23;
    });
    
    return length;
}

function updateCharCount() {
    const text = tweetTextarea.value;
    const length = getTweetLength(text);
    const remaining = 280 - length;
    
    charCountText.textContent = remaining;
    
    // Update progress circle ring
    const radius = 15;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, (length / 280) * 100));
    const offset = circumference - (percentage / 100) * circumference;
    
    charProgressCircle.style.strokeDashoffset = offset;
    
    // Visual indicators for warning states
    if (length > 280) {
        charProgressCircle.style.stroke = 'var(--color-breaking)';
        charCountText.style.color = 'var(--color-breaking)';
        charWarningMsg.style.display = 'block';
    } else if (length >= 260) {
        charProgressCircle.style.stroke = 'var(--color-issue)';
        charCountText.style.color = 'var(--color-issue)';
        charWarningMsg.style.display = 'none';
    } else {
        charProgressCircle.style.stroke = 'var(--primary-color)';
        charCountText.style.color = 'var(--text-secondary)';
        charWarningMsg.style.display = 'none';
    }
}

function setupCharProgressRing() {
    const radius = 15;
    const circumference = 2 * Math.PI * radius;
    
    charProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    charProgressCircle.style.strokeDashoffset = circumference;
}

// Automatically trims description to fit character limit
function optimizeTweetLength() {
    if (!selectedRelease) return;
    
    // Draft with forced short description truncation
    const optimizedText = generateInitialDraft(selectedRelease, true);
    tweetTextarea.value = optimizedText;
    updateCharCount();
    
    // Highlight textarea briefly to show the change
    tweetTextarea.style.borderColor = '#06b6d4';
    setTimeout(() => {
        tweetTextarea.style.borderColor = 'var(--primary-color)';
    }, 500);
}

function submitTweet() {
    const tweetText = tweetTextarea.value.trim();
    if (!tweetText) return;
    
    // Open Twitter Web Intent in new window
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400,resizable=yes');
}

// Copy a specific card's release notes text to the clipboard
function copyCardToClipboard(releaseId) {
    const item = allReleases.find(r => generateIdForRelease(r) === releaseId);
    if (!item) return;
    
    const copyText = `Google BigQuery Release Notes - ${item.category} (${item.date})\n\n${item.content_text}\n\nRead more: ${item.primary_link}`;
    
    navigator.clipboard.writeText(copyText).then(() => {
        const btn = document.getElementById(`copy-btn-${releaseId}`);
        if (btn) {
            const span = btn.querySelector('span');
            const originalText = span.textContent;
            span.textContent = 'Copied!';
            btn.style.borderColor = 'var(--color-feature)';
            btn.style.color = 'var(--color-feature)';
            
            setTimeout(() => {
                span.textContent = originalText;
                btn.style.borderColor = '';
                btn.style.color = '';
            }, 1500);
        }
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Export the currently filtered set of release notes as a CSV file
function exportToCSV() {
    if (filteredReleases.length === 0) {
        alert("No release notes to export!");
        return;
    }
    
    const headers = ["Date", "Category", "Content", "Link"];
    const rows = filteredReleases.map(r => {
        return [
            r.date,
            r.category,
            r.content_text,
            r.primary_link
        ].map(val => {
            const cleaned = (val || '').replace(/"/g, '""');
            return `"${cleaned}"`;
        }).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const categorySuffix = currentCategory.toLowerCase();
    const filename = `bq_releases_${categorySuffix}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
