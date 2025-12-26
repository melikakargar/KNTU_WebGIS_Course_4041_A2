// WebGIS Assignment - Interactive Map with Geocoding and Weather Data
// Main application script

// ============================================================================
// CONFIGURATION - API KEYS (Using provided keys)
// ============================================================================

// Using LocationIQ for geocoding and OpenWeatherMap for weather
const GEOCODING_API_KEY = 'pk.078ede3fa7cbb516376bd0ac9e994930'; // LocationIQ API key
const WEATHER_API_KEY = '204b682aafd0915f187bb074642157af'; // OpenWeatherMap API key

// ============================================================================
// MAP INITIALIZATION - FIXED VERSION
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
        source: new ol.source.OSM()
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
    
    // FIXED: Simple map creation without problematic controls
    map = new ol.Map({
        target: 'map',
        layers: [osmLayer, markerLayer, clickMarker],
        view: new ol.View({
            center: ol.proj.fromLonLat([51.3890, 35.6892]), // Center on Tehran, Iran
            zoom: 10
        })
    });
    
    console.log('Map initialized successfully');
    
    // Add click event listener for weather data
    map.on('click', handleMapClick);
    
    // Add map move end event to update coordinates
    map.getView().on('change:center', updateCoordinatesDisplay);
}

// ============================================================================
// GEOCODING FUNCTIONS (Using LocationIQ)
// ============================================================================

/**
 * Geocode a location using LocationIQ API
 * @param {string} location - Location to geocode
 * @returns {Promise<Object>} - Geocoding result
 */
async function geocodeLocation(location) {
    console.log(`Geocoding location: ${location}`);
    
    if (!GEOCODING_API_KEY) {
        throw new Error('LocationIQ API key is not configured');
    }
    
    // Using LocationIQ Search API
    const url = `https://us1.locationiq.com/v1/search?key=${GEOCODING_API_KEY}&q=${encodeURIComponent(location)}&format=json&limit=1`;
    
    try {
        showLoading(true);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LocationIQ API error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            console.log('Geocoding successful:', result);
            
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                formatted: result.display_name || location,
                importance: result.importance || 0
            };
        } else {
            throw new Error('Location not found. Please try a different search term.');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        
        // Provide more specific error messages
        if (error.message.includes('400')) {
            throw new Error('Invalid search query. Please check your input.');
        } else if (error.message.includes('401')) {
            throw new Error('API key authentication failed. Please check your LocationIQ API key.');
        } else if (error.message.includes('429')) {
            throw new Error('Rate limit exceeded. Please try again in a moment.');
        } else {
            throw error;
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Reverse geocode coordinates using LocationIQ
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string>} - Formatted address
 */
async function reverseGeocode(lat, lon) {
    if (!GEOCODING_API_KEY) {
        return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    }
    
    const url = `https://us1.locationiq.com/v1/reverse?key=${GEOCODING_API_KEY}&lat=${lat}&lon=${lon}&format=json`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.display_name || `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
    }
    
    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
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
        moveMapToLocation(result.lon, result.lat, 12);
        
        // Add marker
        addMarker(result.lon, result.lat, result.formatted);
        
        // Get weather data for this location
        await getWeatherData(result.lat, result.lon, result.formatted);
        
        // Clear search input
        searchInput.value = '';
        
    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Search error:', error);
    }
}

/**
 * Move map to specific coordinates with animation
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @param {number} zoom - Zoom level
 */
function moveMapToLocation(lon, lat, zoom = 12) {
    const view = map.getView();
    const targetCenter = ol.proj.fromLonLat([lon, lat]);
    
    // Smooth animation
    view.animate({
        center: targetCenter,
        zoom: zoom,
        duration: 1000
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
// WEATHER FUNCTIONS (Using OpenWeatherMap)
// ============================================================================

/**
 * Get weather data from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} locationName - Optional location name
 */
async function getWeatherData(lat, lon, locationName = null) {
    console.log(`Getting weather data for lat: ${lat}, lon: ${lon}`);
    
    if (!WEATHER_API_KEY) {
        throw new Error('OpenWeatherMap API key is not configured');
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
    
    try {
        showLoading(true);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Weather API error: ${errorData.message || response.status}`);
        }
        
        const data = await response.json();
        console.log('Weather data received:', data);
        
        // If location name not provided, try to get it from reverse geocoding
        let displayName = locationName;
        if (!displayName) {
            displayName = await reverseGeocode(lat, lon);
        }
        
        // Display weather data
        displayWeatherData(data, displayName);
        
    } catch (error) {
        console.error('Weather API error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('401')) {
            alert('Error: Invalid OpenWeatherMap API key. Please check your API key.');
        } else if (error.message.includes('404')) {
            alert('Error: Weather data not found for this location.');
        } else if (error.message.includes('429')) {
            alert('Error: Too many requests. Please wait a moment and try again.');
        } else {
            alert(`Error getting weather data: ${error.message}`);
        }
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
    
    // Capitalize condition
    const capitalizedCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
    
    // Update UI elements
    document.getElementById('location-name').textContent = locationName;
    document.getElementById('coordinates').textContent = `Lat: ${data.coord.lat.toFixed(4)}, Lon: ${data.coord.lon.toFixed(4)}`;
    document.getElementById('temp-value').textContent = temp;
    document.getElementById('feels-like').textContent = `${feelsLike} °C`;
    document.getElementById('humidity').textContent = `${humidity} %`;
    document.getElementById('pressure').textContent = `${pressure} hPa`;
    document.getElementById('wind-speed').textContent = `${windSpeed.toFixed(1)} m/s`;
    document.getElementById('visibility').textContent = `${visibility} km`;
    document.getElementById('cloudiness').textContent = `${cloudiness} %`;
    document.getElementById('weather-condition').textContent = capitalizedCondition;
    
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
            moveMapToLocation(lon, lat, 14);
            
            // Add marker
            addMarker(lon, lat, 'Your Location');
            
            // Get weather data
            await getWeatherData(lat, lon, 'Your Location');
            
            showLoading(false);
        },
        (error) => {
            console.error('Geolocation error:', error);
            
            // User-friendly error messages
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    alert("Location permission denied. Please enable location services in your browser settings.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert("Location information is unavailable. Please check your device's location settings.");
                    break;
                case error.TIMEOUT:
                    alert("Location request timed out. Please try again.");
                    break;
                default:
                    alert(`Error getting location: ${error.message}`);
            }
            
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
    
    try {
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
        console.log('Using LocationIQ API key:', GEOCODING_API_KEY ? 'Configured' : 'Not configured');
        console.log('Using OpenWeatherMap API key:', WEATHER_API_KEY ? 'Configured' : 'Not configured');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        alert('Failed to initialize the map. Please check your browser console for details.');
    }
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
    alert('An unexpected error occurred. Please check the console for details.');
});

// Display API key status on page load
window.addEventListener('load', function() {
    const apiStatus = document.createElement('div');
    apiStatus.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
    `;
    
    const geocodingStatus = GEOCODING_API_KEY ? '✅' : '❌';
    const weatherStatus = WEATHER_API_KEY ? '✅' : '❌';
    
    apiStatus.innerHTML = `API Status: Geocoding ${geocodingStatus} | Weather ${weatherStatus}`;
    document.body.appendChild(apiStatus);
});