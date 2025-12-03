// Analytics Dashboard - With Pre-initialized Video Events Section
const APPSYNC_ENDPOINT = 'https://API_ID.appsync-api.us-east-1.amazonaws.com/graphql';
const API_KEY = 'API_KEY';

class AnalyticsDashboard {
    constructor() {
        this.videoIds = ['4990233', '6963744', '7140928', '3129957'];
    }

    // UPDATE Popular Videos
    async updatePopularVideos() {
        try {
            const responses = await Promise.all(
                this.videoIds.map(id =>
                    fetch(APPSYNC_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': API_KEY
                        },
                        body: JSON.stringify({
                            query: `query { getVideo(id: "${id}") { id total_views recent_views } }`
                        })
                    })
                )
            );

            const videos = await Promise.all(responses.map(r => r.json()));
            const videoData = videos
                .map(v => v.data?.getVideo)
                .filter(v => v)
                .sort((a, b) => b.total_views - a.total_views);

            console.log('Video data:', videoData);

            // Update Popular Videos display
            const container = document.getElementById('popular-videos-display');
            if (container && videoData.length > 0) {
                container.innerHTML = videoData.map(video => `
                    <div style="padding: 10px; margin-bottom: 8px; background: #f5f5f5; border-radius: 4px; cursor: pointer;" 
                         onmouseover="this.style.background='#e0e0e0'" 
                         onmouseout="this.style.background='#f5f5f5'">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Video ${video.id}</div>
                        <div style="font-size: 12px; color: #666;">${video.total_views || 0} views</div>
                        <div style="font-size: 12px; color: #999;">${video.recent_views || 0} recent</div>
                    </div>
                `).join('');
            }

            // Update Metrics
            this.updateMetrics(videoData);

            console.log('Popular Videos updated');
        } catch (error) {
            console.error('Error updating popular videos:', error);
        }
    }

    // UPDATE Metrics Display
    updateMetrics(videos) {
        const metricsDisplay = document.getElementById('metrics-display');
        if (!metricsDisplay || !videos) return;

        const totalVideos = videos.length;
        const totalViews = videos.reduce((sum, v) => sum + (v.total_views || 0), 0);
        const recentViews = videos.reduce((sum, v) => sum + (v.recent_views || 0), 0);

        // Only update the base metrics div
        let baseMetricsDiv = document.getElementById('base-metrics');
        if (!baseMetricsDiv) {
            // Create structure on first run
            metricsDisplay.innerHTML = `
                <div id="base-metrics"></div>
                <div id="video-events-section"></div>
            `;
            baseMetricsDiv = document.getElementById('base-metrics');
        }

        baseMetricsDiv.innerHTML = `
            <div style="font-size: 13px; line-height: 1.8; color: #666;">
                <div><strong>Total Videos:</strong> ${totalVideos}</div>
                <div><strong>Total Views:</strong> ${totalViews.toLocaleString()}</div>
                <div><strong>Recent Views:</strong> ${recentViews.toLocaleString()}</div>
                <div><strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}</div>
            </div>
        `;
    }

    // Start the dashboard
    start() {
        console.log('\n========================================');
        console.log('ANALYTICS DASHBOARD');
        console.log('========================================\n');

        // Initialize metrics structure
        const metricsDisplay = document.getElementById('metrics-display');
        if (metricsDisplay) {
            metricsDisplay.innerHTML = `
                <div id="base-metrics">
                    <div style="font-size: 13px; line-height: 1.8; color: #666;">
                        <div><strong>Total Videos:</strong> Loading...</div>
                        <div><strong>Total Views:</strong> Loading...</div>
                        <div><strong>Recent Views:</strong> Loading...</div>
                        <div><strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
                <div id="video-events-section" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                    <div style="font-weight: 600; margin-bottom: 8px;">Video Events:</div>
                    <div style="font-size: 12px; color: #666; line-height: 1.8;">
                        <div id="event-play">Play: 0</div>
                        <div id="event-pause">Pause: 0</div>
                        <div id="event-buffer">Buffer: 0</div>
                        <div id="event-ended">Ended: 0</div>
                    </div>
                </div>
            `;
        }

        // Update immediately
        this.updatePopularVideos();

        // Update every 10 seconds
        setInterval(() => this.updatePopularVideos(), 10000);

        console.log('Dashboard started\n');
    }
}

// Make event counters globally accessible
window.videoEventCounters = {
    play: 0,
    pause: 0,
    buffer: 0,
    ended: 0
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const dashboard = new AnalyticsDashboard();
        dashboard.start();
    });
} else {
    const dashboard = new AnalyticsDashboard();
    dashboard.start();
}

console.log('Analytics Dashboard loaded');
