// Real-Time Analytics - Updates Pre-created Event Counters
(function() {
    'use strict';
    
    const APPSYNC_ENDPOINT = 'https://API_ID.appsync-api.us-east-1.amazonaws.com/graphql';
    const API_KEY = 'API_KEY';
    
    console.log('\n========================================');
    console.log('REAL-TIME ANALYTICS WITH EVENTS');
    console.log('========================================\n');
    
    function getVideoId(url) {
        if (!url) return null;
        const filename = url.split('/').pop().split('?')[0];
        const match = filename.match(/^(\d+)/);
        return match ? match[1] : null;
    }
    
    // Track video events
    function trackVideoEvent(videoId, eventType, currentTime) {
        console.log(`Event: ${eventType} - Video ${videoId} at ${Math.floor(currentTime)}s`);
        
        // Update global counter
        if (window.videoEventCounters) {
            if (eventType === 'play') window.videoEventCounters.play++;
            if (eventType === 'pause') window.videoEventCounters.pause++;
            if (eventType === 'buffer') window.videoEventCounters.buffer++;
            if (eventType === 'ended') window.videoEventCounters.ended++;
        }
        
        // Update display directly
        updateEventDisplay(eventType);
    }
    
    function updateEventDisplay(eventType) {
        if (!window.videoEventCounters) return;
        
        // Update specific event counter
        const elements = {
            play: document.getElementById('event-play'),
            pause: document.getElementById('event-pause'),
            buffer: document.getElementById('event-buffer'),
            ended: document.getElementById('event-ended')
        };
        
        if (eventType && elements[eventType]) {
            const icons = { play: '▶️', pause: '⏸️', buffer: '⏺️', ended: '⏹️' };
            const labels = { play: 'Play', pause: 'Pause', buffer: 'Buffer', ended: 'Ended' };
            elements[eventType].textContent = `${icons[eventType]} ${labels[eventType]}: ${window.videoEventCounters[eventType]}`;
        }
    }
    
    // Attach event listeners to videos
    function attachVideoListeners() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            if (video.dataset.analyticsAttached) return;
            video.dataset.analyticsAttached = 'true';
            
            const videoId = () => getVideoId(video.currentSrc);
            
            video.addEventListener('play', () => {
                const id = videoId();
                if (id) trackVideoEvent(id, 'play', video.currentTime);
            });
            
            video.addEventListener('pause', () => {
                const id = videoId();
                if (id) trackVideoEvent(id, 'pause', video.currentTime);
            });
            
            video.addEventListener('ended', () => {
                const id = videoId();
                if (id) trackVideoEvent(id, 'ended', video.currentTime);
            });
            
            video.addEventListener('waiting', () => {
                const id = videoId();
                if (id) trackVideoEvent(id, 'buffer', video.currentTime);
            });
            
            video.addEventListener('seeking', () => {
                const id = videoId();
                if (id) console.log(`Seeking: Video ${id} to ${Math.floor(video.currentTime)}s`);
            });
            
            console.log('Event listeners attached to video element');
        });
    }
    
    setInterval(attachVideoListeners, 2000);
    
    // VIDEO VIEW TRACKING
    const tracking = new Set();
    
    async function trackView(videoId) {
        if (tracking.has(videoId)) return;
        tracking.add(videoId);
        
        try {
            console.log(`\nTracking view: ${videoId}`);
            
            const mutation = `mutation { 
                updateVideo(id: "${videoId}", total_views: 1, recent_views: 1) { 
                    id total_views recent_views 
                } 
            }`;
            
            const response = await fetch(APPSYNC_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({ query: mutation })
            });
            
            const data = await response.json();
            
            if (data.errors) {
                console.error('Error:', data.errors);
            } else if (data.data?.updateVideo) {
                console.log(`Views: ${data.data.updateVideo.total_views}`);
            }
            
        } catch (error) {
            console.error('Exception:', error);
        } finally {
            setTimeout(() => tracking.delete(videoId), 5000);
        }
    }
    
    const tracked = new Map();
    
    function startTracking() {
        setInterval(() => {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (video.paused || !video.currentSrc || video.currentTime < 1) return;
                
                const videoId = getVideoId(video.currentSrc);
                if (!videoId) return;
                
                const now = Date.now();
                const last = tracked.get(videoId) || 0;
                
                if (now - last > 45000) {
                    tracked.set(videoId, now);
                    trackView(videoId);
                }
            });
        }, 5000);
        console.log('Video tracking active\n');
    }
    
    // ACTIVE USERS
    class Session {
        constructor() {
            this.id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            this.registered = false;
        }
        
        async start() {
            console.log('Session:', this.id);
            await this.register();
            setInterval(() => this.update(), 5000);
            this.update();
            window.addEventListener('beforeunload', () => this.end());
            console.log('Session tracking active\n');
        }
        
        async register() {
            if (this.registered) return;
            try {
                const current = await this.getCount();
                const mutation = `mutation { updateActiveUsers(count: ${current + 1}) { count } }`;
                await fetch(APPSYNC_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
                    body: JSON.stringify({ query: mutation })
                });
                this.registered = true;
                console.log(`Registered: ${current} → ${current + 1}`);
            } catch (e) {
                console.error('Session error:', e);
            }
        }
        
        async end() {
            if (!this.registered) return;
            try {
                const current = await this.getCount();
                const mutation = `mutation { updateActiveUsers(count: ${Math.max(0, current - 1)}) { count } }`;
                navigator.sendBeacon(APPSYNC_ENDPOINT + '?api-key=' + API_KEY, JSON.stringify({ query: mutation }));
            } catch (e) {}
        }
        
        async getCount() {
            try {
                const query = `query { getActiveUsers { count } }`;
                const res = await fetch(APPSYNC_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
                    body: JSON.stringify({ query })
                });
                const data = await res.json();
                return data.data?.getActiveUsers?.count || 0;
            } catch (e) {
                return 0;
            }
        }
        
        async update() {
            try {
                const count = await this.getCount();
                const el = document.getElementById('active-users-display');
                if (el) el.textContent = count;
            } catch (e) {}
        }
    }
    
    // INIT
    setTimeout(() => {
        attachVideoListeners();
        startTracking();
        new Session().start();
        console.log('========================================');
        console.log('ALL SYSTEMS READY');
        console.log('========================================\n');
    }, 2000);
})();
