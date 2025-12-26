// WebGIS Assignment - Interactive Map with Geocoding and Weather Data
// Main application script

// ============================================================================
// CONFIGURATION - API KEYS AND SETTINGS
// ============================================================================

const CONFIG = {
    // API Keys - Demo mode (no API key needed)
    GEOCODING_API_KEY: 'demo-mode',
    WEATHER_API_KEY: 'demo-mode',
    
    // Map Settings
    INITIAL_CENTER: [51.3890, 35.6892], // تهران
    INITIAL_ZOOM: 6,
    MIN_ZOOM: 2,
    MAX_ZOOM: 18,
    
    // API Endpoints
    GEOCODING_API_URL: 'https://nominatim.openstreetmap.org/search',
    WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Default Settings
    DEFAULT_SEARCH_ZOOM: 12,
    DEFAULT_CLICK_ZOOM: 14,
    ANIMATION_DURATION: 1000
};

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let map = null;
let markerLayer = null;
let clickMarker = null;

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

function initializeMap() {
    console.log('Initializing OpenLayers map...');
    
    try {
        // Create base layers
        const osmLayer = new ol.layer.Tile({
            title: 'OpenStreetMap',
            type: 'base',
            visible: true,
            source: new ol.source.OSM()
        });
        
        // Create marker layers
        markerLayer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 8,
                    fill: new ol.style.Fill({ color: '#FF5722' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                })
            })
        });
        
        clickMarker = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: '#2196F3' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                })
            })
        });
        
        // Create map
        map = new ol.Map({
            target: 'map',
            layers: [osmLayer, markerLayer, clickMarker],
            view: new ol.View({
                center: ol.proj.fromLonLat(CONFIG.INITIAL_CENTER),
                zoom: CONFIG.INITIAL_ZOOM,
                minZoom: CONFIG.MIN_ZOOM,
                maxZoom: CONFIG.MAX_ZOOM
            })
        });
        
        console.log('Map initialized successfully');
        
        // Add event listeners
        map.on('click', handleMapClick);
        
    } catch (error) {
        console.error('Error initializing map:', error);
        alert('Error initializing map. Please check console.');
    }
}

// ============================================================================
// GEOCODING FUNCTIONS - WORKING VERSION
// ============================================================================

async function geocodeLocation(location) {
    console.log(`Searching for: ${location}`);
    showLoading(true);
    
    // پیش‌تعریف موقعیت‌های معروف
    const quickLocations = {
        // شهرهای بین‌المللی
        'tehran': [35.6892, 51.3890, 'تهران، ایران'],
        'تهران': [35.6892, 51.3890, 'تهران، ایران'],
        'london': [51.5074, -0.1278, 'لندن، انگلستان'],
        'new york': [40.7128, -74.0060, 'نیویورک، آمریکا'],
        'newyork': [40.7128, -74.0060, 'نیویورک، آمریکا'],
        'ny': [40.7128, -74.0060, 'نیویورک، آمریکا'],
        'tokyo': [35.6762, 139.6503, 'توکیو، ژاپن'],
        'paris': [48.8566, 2.3522, 'پاریس، فرانسه'],
        'berlin': [52.5200, 13.4050, 'برلین، آلمان'],
        
        // شهرهای ایران
        'مشهد': [36.2605, 59.6168, 'مشهد، ایران'],
        'اصفهان': [32.6546, 51.6680, 'اصفهان، ایران'],
        'شیراز': [29.5916, 52.5836, 'شیراز، ایران'],
        'shiraz': [29.5916, 52.5836, 'شیراز، ایران'],
        'تبریز': [38.0962, 46.2738, 'تبریز، ایران'],
        'tabriz': [38.0962, 46.2738, 'تبریز، ایران'],
        'کرج': [35.8400, 50.9391, 'کرج، ایران'],
        'karaj': [35.8400, 50.9391, 'کرج، ایران']
    };
    
    const searchTerm = location.toLowerCase().trim();
    
    // چک کردن موقعیت‌های پیش‌تعریف
    for (const [key, value] of Object.entries(quickLocations)) {
        if (searchTerm === key || searchTerm.includes(key) || key.includes(searchTerm)) {
            await new Promise(resolve => setTimeout(resolve, 300));
            showLoading(false);
            return {
                lat: value[0],
                lon: value[1],
                formatted: value[2],
                success: true
            };
        }
    }
    
    // اگر پیدا نشد، از OpenStreetMap استفاده کن
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'WebGIS-App' } }
        );
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            showLoading(false);
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                formatted: data[0].display_name,
                success: true
            };
        }
        
        throw new Error('Location not found');
        
    } catch (error) {
        console.warn('Using fallback location');
        // موقعیت پیش‌فرض (تهران)
        showLoading(false);
        return {
            lat: 35.6892,
            lon: 51.3890,
            formatted: `${location} (موقعیت تقریبی - تهران)`,
            success: false
        };
    }
}

// ============================================================================
// WEATHER FUNCTIONS - DEMO VERSION
// ============================================================================

async function getWeatherData(lat, lon, locationName = null) {
    console.log(`Getting weather for: ${locationName || 'Unknown'}`);
    showLoading(true);
    
    try {
        // داده‌های آب‌وهوای نمونه
        const weatherConditions = [
            { desc: 'آفتابی', icon: '01d', temp: 25 },
            { desc: 'نیمه ابری', icon: '02d', temp: 22 },
            { desc: 'ابری', icon: '03d', temp: 19 },
            { desc: 'بارانی', icon: '10d', temp: 17 }
        ];
        
        const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const demoData = {
            main: {
                temp: randomWeather.temp + (Math.random() * 5 - 2.5),
                feels_like: randomWeather.temp + (Math.random() * 3 - 1.5),
                humidity: 40 + Math.random() * 40,
                pressure: 1000 + Math.random() * 30
            },
            wind: { speed: (1 + Math.random() * 5).toFixed(1) },
            visibility: (5 + Math.random() * 10).toFixed(0) + '000',
            clouds: { all: Math.random() * 100 },
            weather: [{ description: randomWeather.desc, icon: randomWeather.icon }],
            coord: { lat, lon },
            name: locationName || 'موقعیت انتخابی'
        };
        
        displayWeatherData(demoData, locationName);
        
    } catch (error) {
        console.error('Weather error:', error);
        alert('نمایش داده‌های نمونه آب‌وهوا');
    } finally {
        showLoading(false);
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

async function handleSearch() {
    const input = document.getElementById('search-input');
    const location = input.value.trim();
    
    if (!location) {
        alert('لطفاً نام یک مکان را وارد کنید');
        return;
    }
    
    try {
        const result = await geocodeLocation(location);
        
        // حرکت نقشه به موقعیت
        if (map && result.success) {
            const view = map.getView();
            view.animate({
                center: ol.proj.fromLonLat([result.lon, result.lat]),
                zoom: CONFIG.DEFAULT_SEARCH_ZOOM,
                duration: 1000
            });
            
            // اضافه کردن مارکر
            markerLayer.getSource().clear();
            const marker = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([result.lon, result.lat]))
            });
            markerLayer.getSource().addFeature(marker);
        }
        
        // دریافت آب‌وهوا
        await getWeatherData(result.lat, result.lon, result.formatted);
        
        input.value = '';
        
    } catch (error) {
        alert(`خطا: ${error.message}`);
    }
}

async function handleMapClick(event) {
    const coords = ol.proj.toLonLat(event.coordinate);
    const lon = coords[0];
    const lat = coords[1];
    
    // اضافه کردن مارکر کلیک
    clickMarker.getSource().clear();
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
    });
    clickMarker.getSource().addFeature(marker);
    
    // دریافت آب‌وهوا
    await getWeatherData(lat, lon, `موقعیت انتخابی (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
}

function displayWeatherData(data, customName = null) {
    const name = customName || data.name;
    const temp = Math.round(data.main.temp);
    const feels = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const pressure = data.main.pressure;
    const wind = data.wind.speed;
    const condition = data.weather[0]?.description || 'نامشخص';
    
    // آپدیت UI
    document.getElementById('location-name').textContent = name;
    document.getElementById('coordinates').textContent = 
        `عرض: ${data.coord.lat.toFixed(4)}، طول: ${data.coord.lon.toFixed(4)}`;
    document.getElementById('temp-value').textContent = temp;
    document.getElementById('feels-like').textContent = `${feels}°C`;
    document.getElementById('humidity').textContent = `${humidity}%`;
    document.getElementById('pressure').textContent = `${pressure} hPa`;
    document.getElementById('wind-speed').textContent = `${wind} m/s`;
    document.getElementById('weather-condition').textContent = condition;
    
    // آپدیت آیکون
    const iconCode = data.weather[0]?.icon || '01d';
    const iconMap = {
        '01d': 'fas fa-sun', '02d': 'fas fa-cloud-sun',
        '03d': 'fas fa-cloud', '10d': 'fas fa-cloud-rain'
    };
    document.getElementById('weather-icon').innerHTML = 
        `<i class="${iconMap[iconCode] || 'fas fa-sun'}"></i>`;
    
    // نمایش پنل
    document.getElementById('weather-placeholder').style.display = 'none';
    document.getElementById('weather-data').style.display = 'block';
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
    console.log('Starting WebGIS App...');
    
    initializeMap();
    
    // Event Listeners
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('current-location-btn').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                
                if (map) {
                    map.getView().animate({
                        center: ol.proj.fromLonLat([lon, lat]),
                        zoom: 14,
                        duration: 1000
                    });
                    
                    await getWeatherData(lat, lon, 'موقعیت شما');
                }
            });
        } else {
            alert('مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند');
        }
    });
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

// Start app
document.addEventListener('DOMContentLoaded', initializeApp);