// analytics-integration.js
const ANALYTICS_API = 'https://ANALYTICS_API_ID.execute-api.us-east-1.amazonaws.com/prod/analytics';

async function loadAnalytics() {
    try {
        const [popular, stats] = await Promise.all([
            fetch(`${ANALYTICS_API}/popular`).then(r => r.json()),
            fetch(`${ANALYTICS_API}/videos`).then(r => r.json())
        ]);
        
        // Example: log to console, update DOM as needed
        console.log('Popular Videos:', popular.popularVideos);
        console.log('Total Views:', stats.totalViews);
        document.getElementById('popular-videos').textContent = JSON.stringify(popular.popularVideos);
        document.getElementById('video-stats').textContent = JSON.stringify(stats);
    } catch (e) {
        console.error('Analytics error:', e);
    }
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAnalytics);
} else {
    loadAnalytics();
}
setInterval(loadAnalytics, 30000);
