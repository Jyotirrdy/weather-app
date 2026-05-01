const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const statusEl = document.getElementById('status');
const weatherEl = document.getElementById('weather');
const placeEl = document.getElementById('place');
const tempEl = document.getElementById('temp');
const codeEl = document.getElementById('code');
const metaEl = document.getElementById('meta');

const weatherCodeMap = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm'
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ffd2d2' : '#e7f5ff';
}

function showWeather(payload) {
  const { name, admin1, country, temperature, windSpeed, weatherCode, tMax, tMin } = payload;
  placeEl.textContent = [name, admin1, country].filter(Boolean).join(', ');
  tempEl.textContent = `${Math.round(temperature)}°C`;
  codeEl.textContent = weatherCodeMap[weatherCode] ?? `Code ${weatherCode}`;
  metaEl.textContent = `Wind ${Math.round(windSpeed)} km/h • H ${Math.round(tMax)}° / L ${Math.round(tMin)}°`;
  weatherEl.classList.remove('hidden');
}

async function fetchWeather(lat, lon, locationMeta) {
  setStatus('Loading weather...');
  weatherEl.classList.add('hidden');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Weather request failed.');
  }

  const data = await response.json();
  showWeather({
    ...locationMeta,
    temperature: data.current.temperature_2m,
    windSpeed: data.current.wind_speed_10m,
    weatherCode: data.current.weather_code,
    tMax: data.daily.temperature_2m_max[0],
    tMin: data.daily.temperature_2m_min[0]
  });

  setStatus('Updated just now.');
}

async function searchCity(city) {
  setStatus('Finding city...');
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(geoUrl);

  if (!response.ok) {
    throw new Error('City lookup failed.');
  }

  const data = await response.json();
  if (!data.results?.length) {
    throw new Error('No city found with that name.');
  }

  const loc = data.results[0];
  await fetchWeather(loc.latitude, loc.longitude, loc);
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await searchCity(cityInput.value.trim());
  } catch (error) {
    setStatus(error.message, true);
  }
});

locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported in this browser.', true);
    return;
  }

  setStatus('Getting your location...');
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        await fetchWeather(coords.latitude, coords.longitude, {
          name: 'Your location',
          admin1: '',
          country: ''
        });
      } catch (error) {
        setStatus(error.message, true);
      }
    },
    () => setStatus('Could not access your location.', true),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});
