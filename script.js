// WebGIS Assignment - Interactive Map with Geocoding and Weather Data
// Main application script

// ============================================================================
// CONFIGURATION - API KEYS AND SETTINGS
// ============================================================================

// Configuration object for API keys and settings
const CONFIG = {
    // API Keys (Replace with your own keys)
    GEOCODING_API_KEY: 'YOUR_OPENCAGE_API_KEY_HERE', // Get from https://opencagedata.com/api
    WEATHER_API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY_HERE', // Get from https://openweathermap.org/api
    
    // Map Settings
    INITIAL_CENTER: [0, 0], // [longitude, latitude]
    INITIAL_ZOOM: 2,
    MIN_ZOOM: 2,
    MAX_ZOOM: 18,
    
    // API Endpoints
    GEOCODING_API_URL: 'https://api.opencagedata.com/geocode/v1/json',
    WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather',
    
    // Default Settings
    DEFAULT_SEARCH_ZOOM: 12,
    DEFAULT_CLICK_ZOOM: 14,
    ANIMATION_DURATION: 1000
};

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

// Initialize OpenLayers Map
let map;
let markerLayer;
let clickMarker;

/**
 * Initialize the OpenLayers map with base layers and controls
 */
function initializeMap() {
    console.log('Initializing OpenLayers map...');
    
    // Create base layers
    const osmLayer = new ol.layer.Tile({
        title: 'OpenStreetMap',
        type: 'base',
        visible: true,
        source: new ol.source.OSM()
    });
    
    const stamenLayer = new ol.layer.Tile({
        title: 'Stamen Terrain',
        type: 'base',
        visible: false,
        source: new ol.source.XYZ({
            url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
            attributions: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>'
        })
    });
    
    // Create marker layer for search results
    markerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                    color: '#FF5722'
                }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                })
            })
        })
    });
    
    // Create marker layer for click locations
    clickMarker = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                    color: '#2196F3'
                }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                })
            })
        })
    });
    
    // Create map instance
    map = new ol.Map({
        target: 'map',
        layers: [osmLayer, stamenLayer, markerLayer, clickMarker],
        view: new ol.View({
            center: ol.proj.fromLonLat(CONFIG.INITIAL_CENTER),
            zoom: CONFIG.INITIAL_ZOOM,
            minZoom: CONFIG.MIN_ZOOM,
            maxZoom: CONFIG.MAX_ZOOM
        }),
        controls: ol.control.defaults().extend([
            new ol.control.ScaleLine(),
            new ol.control.ZoomSlider(),
            new ol.control.FullScreen(),
            new ol.control.Attribution({
                collapsible: true
            })
        ])
    });
    
    console.log('Map initialized successfully');
    
    // Add click event listener for weather data
    map.on('click', handleMapClick);
    
    // Add map move end event to update coordinates
    map.getView().on('change:center', updateCoordinatesDisplay);
}

// ============================================================================
// GEOCODING FUNCTIONS
// ============================================================================

/**
 * Geocode a location using OpenCage API
 * @param {string} location - Location to geocode
 * @returns {Promise<Object>} - Geocoding result
 */
async function geocodeLocation(location) {
    console.log(`Geocoding location: ${location}`);
    
    if (!CONFIG.GEOCODING_API_KEY || CONFIG.GEOCODING_API_KEY === 'YOUR_OPENCAGE_API_KEY_HERE') {
        throw new Error('Please configure your OpenCage API key in script.js');
    }
    
    const url = `${CONFIG.GEOCODING_API_URL}?q=${encodeURIComponent(location)}&key=${CONFIG.GEOCODING_API_KEY}&limit=1&no_annotations=1`;
    
    try {
        showLoading(true);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            console.log('Geocoding successful:', result);
            
            return {
                lat: result.geometry.lat,
                lon: result.geometry.lng,
                formatted: result.formatted,
                confidence: result.confidence
            };
        } else {
            throw new Error('Location not found');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

/**
 * Handle search button click
 */
async function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const location = searchInput.value.trim();
    
    if (!location) {
        alert('Please enter a location to search');
        return;
    }
    
    try {
        const result = await geocodeLocation(location);
        
        // Move map to location
        moveMapToLocation(result.lon, result.lat, CONFIG.DEFAULT_SEARCH_ZOOM);
        
        // Add marker
        addMarker(result.lon, result.lat, result.formatted);
        
        // Get weather data for this location
        await getWeatherData(result.lat, result.lon, result.formatted);
        
        // Clear search input
        searchInput.value = '';
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

/**
 * Move map to specific coordinates with animation
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @param {number} zoom - Zoom level
 */
function moveMapToLocation(lon, lat, zoom = CONFIG.DEFAULT_SEARCH_ZOOM) {
    const view = map.getView();
    const targetCenter = ol.proj.fromLonLat([lon, lat]);
    
    // Smooth animation
    view.animate({
        center: targetCenter,
        zoom: zoom,
        duration: CONFIG.ANIMATION_DURATION
    });
}

/**
 * Add marker to map
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @param {string} title - Marker title
 */
function addMarker(lon, lat, title = '') {
    // Clear previous markers
    markerLayer.getSource().clear();
    
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        name: title
    });
    
    markerLayer.getSource().addFeature(marker);
}

/**
 * Add click marker to map
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 */
function addClickMarker(lon, lat) {
    // Clear previous click markers
    clickMarker.getSource().clear();
    
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
    });
    
    clickMarker.getSource().addFeature(marker);
}

// ============================================================================
// WEATHER FUNCTIONS
// ============================================================================

/**
 * Get weather data from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} locationName - Optional location name
 */
async function getWeatherData(lat, lon, locationName = null) {
    console.log(`Getting weather data for lat: ${lat}, lon: ${lon}`);
    
    if (!CONFIG.WEATHER_API_KEY || CONFIG.WEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY_HERE') {
        throw new Error('Please configure your OpenWeatherMap API key in script.js');
    }
    
    const url = `${CONFIG.WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${CONFIG.WEATHER_API_KEY}&units=metric`;
    
    try {
        showLoading(true);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Weather data received:', data);
        
        // Display weather data
        displayWeatherData(data, locationName);
        
    } catch (error) {
        console.error('Weather API error:', error);
        alert(`Error getting weather data: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

/**
 * Display weather data in the UI
 * @param {Object} data - Weather data from API
 * @param {string} customLocationName - Custom location name to display
 */
function displayWeatherData(data, customLocationName = null) {
    const locationName = customLocationName || data.name || 'Unknown Location';
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const pressure = data.main.pressure;
    const windSpeed = data.wind.speed;
    const visibility = data.visibility ? (data.visibility / 1000).toFixed(1) : 'N/A';
    const cloudiness = data.clouds?.all || 0;
    const condition = data.weather[0]?.description || 'Unknown';
    const iconCode = data.weather[0]?.icon || '01d';
    
    // Update UI elements
    document.getElementById('location-name').textContent = locationName;
    document.getElementById('coordinates').textContent = `Lat: ${data.coord.lat.toFixed(4)}, Lon: ${data.coord.lon.toFixed(4)}`;
    document.getElementById('temp-value').textContent = temp;
    document.getElementById('feels-like').textContent = `${feelsLike} °C`;
    document.getElementById('humidity').textContent = `${humidity} %`;
    document.getElementById('pressure').textContent = `${pressure} hPa`;
    document.getElementById('wind-speed').textContent = `${windSpeed} m/s`;
    document.getElementById('visibility').textContent = `${visibility} km`;
    document.getElementById('cloudiness').textContent = `${cloudiness} %`;
    document.getElementById('weather-condition').textContent = condition;
    
    // Update weather icon
    updateWeatherIcon(iconCode);
    
    // Update last updated time
    const now = new Date();
    document.getElementById('last-updated').textContent = `Last updated: ${now.toLocaleTimeString()}`;
    
    // Show weather data and hide placeholder
    document.getElementById('weather-placeholder').style.display = 'none';
    document.getElementById('weather-data').style.display = 'block';
}

/**
 * Update weather icon based on OpenWeatherMap icon code
 * @param {string} iconCode - OpenWeatherMap icon code
 */
function updateWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'fas fa-sun',           // Clear sky day
        '01n': 'fas fa-moon',          // Clear sky night
        '02d': 'fas fa-cloud-sun',     // Few clouds day
        '02n': 'fas fa-cloud-moon',    // Few clouds night
        '03d': 'fas fa-cloud',         // Scattered clouds
        '03n': 'fas fa-cloud',
        '04d': 'fas fa-cloud',         // Broken clouds
        '04n': 'fas fa-cloud',
        '09d': 'fas fa-cloud-rain',    // Shower rain
        '09n': 'fas fa-cloud-rain',
        '10d': 'fas fa-cloud-sun-rain',// Rain day
        '10n': 'fas fa-cloud-moon-rain',// Rain night
        '11d': 'fas fa-bolt',          // Thunderstorm
        '11n': 'fas fa-bolt',
        '13d': 'fas fa-snowflake',     // Snow
        '13n': 'fas fa-snowflake',
        '50d': 'fas fa-smog',          // Mist
        '50n': 'fas fa-smog'
    };
    
    const iconElement = document.getElementById('weather-icon');
    const iconClass = iconMap[iconCode] || 'fas fa-question-circle';
    iconElement.innerHTML = `<i class="${iconClass}"></i>`;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle map click event for weather data
 * @param {Event} event - Map click event
 */
async function handleMapClick(event) {
    const coordinates = ol.proj.toLonLat(event.coordinate);
    const lon = coordinates[0];
    const lat = coordinates[1];
    
    console.log(`Map clicked at lon: ${lon}, lat: ${lat}`);
    
    // Add click marker
    addClickMarker(lon, lat);
    
    // Get weather data
    await getWeatherData(lat, lon);
}

/**
 * Get current location using browser geolocation
 */
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    showLoading(true);
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Move map to location
            moveMapToLocation(lon, lat, CONFIG.DEFAULT_CLICK_ZOOM);
            
            // Add marker
            addMarker(lon, lat, 'Your Location');
            
            // Get weather data
            await getWeatherData(lat, lon, 'Your Location');
            
            showLoading(false);
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert(`Error getting location: ${error.message}`);
            showLoading(false);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/**
 * Update coordinates display in weather panel
 */
function updateCoordinatesDisplay() {
    const view = map.getView();
    const center = ol.proj.toLonLat(view.getCenter());
    
    if (document.getElementById('weather-data').style.display === 'block') {
        document.getElementById('coordinates').textContent = 
            `Lat: ${center[1].toFixed(4)}, Lon: ${center[0].toFixed(4)}`;
    }
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// ============================================================================
// API COMPARISON TAB FUNCTIONALITY
// ============================================================================

/**
 * Initialize API comparison tabs
 */
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing WebGIS Application...');
    
    // Initialize map
    initializeMap();
    
    // Initialize tabs
    initializeTabs();
    
    // Setup event listeners
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('current-location-btn').addEventListener('click', getCurrentLocation);
    
    // Allow pressing Enter in search input
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    console.log('Application initialized successfully');
}

// ============================================================================
// START APPLICATION
// ============================================================================

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showLoading(false);
});