// ============================================
// weather-bg.js - Sistema de imágenes dinámicas por clima
// ============================================

const WEATHER_BG_API_URL = 'https://wttr.in';
const DEFAULT_COORDS = '27.4863,-99.5162'; // Nuevo Laredo

// Mapeo de imágenes de Google Drive (IDs públicos)
// Carpeta: https://drive.google.com/drive/folders/1kFyqpqrWTcbrk1FgyxNyFK4KIsU-qAto
const WEATHER_IMAGES = {
  // Amanecer
  'amanecer_aguanieve': '1ABC123...',  // Reemplazar con ID real
  'amanecer_lluvia_ligera': '1ABC123...',
  'amanecer_lluvia': '1ABC123...',
  'amanecer_nublado_parcial': '1ABC123...',
  'amanecer_nublado': '1ABC123...',
  'amanecer_nieve': '1ABC123...',
  
  // Atardecer
  'atardecer_nublado_parcial': '1ABC123...',
  'atardecer_nublado': '1ABC123...',
  'atardecer': '1ABC123...',
  
  // Día
  'dia_calor': '1ABC123...',
  'dia_frio': '1ABC123...',
  'dia_lluvia_fuerte': '1ABC123...',
  'dia_lluvia': '1RZmReM6hkm6E4GSKvx68_1ogXvL_mKz8',
  'dia_nublado_con_lluvia': '1ABC123...',
  'dia_nublado_parcial': '1ABC123...',
  'dia_nublado': '1ABC123...',
  'dia_soleado': '1ABC123...',
  'dia_tormenta': '1ABC123...',
  
  // Noche
  'noche_aguanieve': '1ABC123...',
  'noche_lluvia': '1ABC123...',
  'noche_con_nubes': '1ABC123...',
  'noche_nublada': '1ABC123...',
  'noche_tormenta': '1ABC123...',
  
  // Tarde
  'tarde_aguanieve': '1ABC123...',
  'tarde_despejada': '1ABC123...',
  'tarde_lluvia_fuerte': '1ABC123...',
  'tarde_lluvia': '1ABC123...',
  'tarde_nublado_parcial': '1ABC123...',
  'tarde_nublado': '1ABC123...',
  'tarde_soleado': '1ABC123...',
  'tarde_tormenta': '1ABC123...',
  
  // Especiales
  'tormenta_viento_fuerte': '1ABC123...',
  'nieve': '1ABC123...',
  'default': '1RZmReM6hkm6E4GSKvx68_1ogXvL_mKz8'  // Imagen por defecto
};

// Configuración de URLs de imágenes (se construye con el ID)
function getImageUrl(fileId, size = 1200) {
  if (!fileId || fileId === '1ABC123...') return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

// ========== 1. OBTENER CLIMA ==========
async function fetchWeatherData(coords = DEFAULT_COORDS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const url = `${WEATHER_BG_API_URL}/${coords}?format=j1&lang=es&u`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('⚠️ Error obteniendo clima:', error.message);
    return null;
  }
}

// ========== 2. CLASIFICAR HORA DEL DÍA ==========
function classifyTimeOfDay(hour) {
  if (hour >= 5 && hour < 8) return 'amanecer';
  if (hour >= 8 && hour < 12) return 'dia';
  if (hour >= 12 && hour < 18) return 'tarde';
  if (hour >= 18 && hour < 20) return 'atardecer';
  return 'noche';
}

// ========== 3. CLASIFICAR CONDICIÓN CLIMÁTICA ==========
function classifyWeatherCondition(weatherDesc, weatherCode, windSpeed, chanceOfRain, precipMM) {
  const desc = (weatherDesc || '').toLowerCase();
  const code = String(weatherCode || '');
  const isStrongWind = windSpeed > 35;
  
  // Prioridad 1: Tormenta eléctrica
  if (desc.includes('tormenta') || desc.includes('thunder') || desc.includes('storm') || code === '127' || code === '128') {
    return isStrongWind ? 'tormenta_viento_fuerte' : 'tormenta';
  }
  
  // Prioridad 2: Nieve
  if (desc.includes('nieve') || desc.includes('snow') || desc.includes('sleet') || code === '179' || code === '182' || code === '227' || code === '230') {
    return 'nieve';
  }
  
  // Prioridad 3: Aguanieve
  if (desc.includes('aguanieve') || desc.includes('sleet')) {
    return 'aguanieve';
  }
  
  // Prioridad 4: Lluvia (con intensidad)
  const isRain = desc.includes('lluvia') || desc.includes('rain') || code === '176' || code === '185' || code === '299' || code === '302' || code === '305' || code === '308';
  if (isRain) {
    const isHeavy = (chanceOfRain > 70) || (precipMM > 5);
    return isHeavy ? 'lluvia_fuerte' : 'lluvia';
  }
  
  // Prioridad 5: Nublado
  if (desc.includes('nublado') || desc.includes('overcast') || desc.includes('cloudy') || code === '119' || code === '122') {
    return 'nublado';
  }
  
  // Prioridad 6: Parcialmente nublado
  if (desc.includes('parcialmente') || desc.includes('poco nuboso') || desc.includes('few clouds') || code === '116') {
    return 'nublado_parcial';
  }
  
  // Prioridad 7: Viento fuerte (sin otra condición)
  if (isStrongWind) {
    return 'viento_fuerte';
  }
  
  // Prioridad 8: Soleado / Despejado
  return 'soleado';
}

// ========== 4. CLASIFICAR TEMPERATURA ==========
function classifyTemperature(feelsLike) {
  if (feelsLike >= 28) return 'calor';
  if (feelsLike <= 15) return 'frio';
  return 'templado';
}

// ========== 5. OBTENER CLAVE DE IMAGEN ==========
function getImageKey(timeOfDay, condition, hasRainWithNubes = false) {
  // Casos especiales
  if (condition === 'tormenta_viento_fuerte') return 'tormenta_viento_fuerte';
  if (condition === 'nieve') return 'nieve';
  
  // Combinaciones especiales: "nublado con lluvia"
  if (condition === 'lluvia' && hasRainWithNubes) {
    return `${timeOfDay}_nublado_con_lluvia`;
  }
  
  // Caso especial: "noche con nubes" (parcialmente nublado de noche)
  if (timeOfDay === 'noche' && condition === 'nublado_parcial') {
    return 'noche_con_nubes';
  }
  
  // Mapeo directo
  const conditionMap = {
    'aguanieve': 'aguanieve',
    'lluvia_fuerte': 'lluvia_fuerte',
    'lluvia': 'lluvia',
    'nublado': 'nublado',
    'nublado_parcial': 'nublado_parcial',
    'soleado': 'soleado',
    'tormenta': 'tormenta',
    'calor': 'calor',
    'frio': 'frio',
    'viento_fuerte': 'viento_fuerte'
  };
  
  const mappedCondition = conditionMap[condition] || condition;
  
  // Casos especiales por hora
  if (timeOfDay === 'amanecer' && mappedCondition === 'nieve') return 'amanecer_nieve';
  if (timeOfDay === 'amanecer' && mappedCondition === 'aguanieve') return 'amanecer_aguanieve';
  if (timeOfDay === 'tarde' && mappedCondition === 'soleado') return 'tarde_soleado';
  if (timeOfDay === 'tarde' && mappedCondition === 'despejado') return 'tarde_despejada';
  
  return `${timeOfDay}_${mappedCondition}`;
}

// ========== 6. CLASIFICAR CLIMA COMPLETO ==========
function classifyWeather(weatherData) {
  // Si no hay datos, usar valores por defecto basados en hora actual
  if (!weatherData || !weatherData.current_condition) {
    const now = new Date();
    const defaultTemp = now.getMonth() >= 5 && now.getMonth() <= 8 ? 32 : 22;
    return {
      timeOfDay: classifyTimeOfDay(now.getHours()),
      condition: 'soleado',
      intensity: null,
      temperature: defaultTemp,
      feelsLike: defaultTemp,
      weatherDesc: 'Datos estimados',
      isDefault: true
    };
  }
  
  const current = weatherData.current_condition[0];
  const hourly = weatherData.weather?.[0]?.hourly?.[0] || {};
  
  // Extraer datos
  const localTime = current.localObsDateTime || new Date().toISOString();
  const hour = parseInt(localTime.split(' ')[1]?.split(':')[0]) || new Date().getHours();
  const weatherDesc = current.weatherDesc?.[0]?.value || '';
  const weatherCode = current.weatherCode;
  const temp = parseFloat(current.temp_C) || 22;
  const feelsLike = parseFloat(current.FeelsLikeC) || temp;
  const windSpeed = parseFloat(current.windspeedKmph) || 0;
  const chanceOfRain = parseFloat(hourly.chanceofrain) || 0;
  const precipMM = parseFloat(hourly.precipMM) || 0;
  
  // Clasificar
  const timeOfDay = classifyTimeOfDay(hour);
  let condition = classifyWeatherCondition(weatherDesc, weatherCode, windSpeed, chanceOfRain, precipMM);
  const tempCategory = classifyTemperature(feelsLike);
  
  // Si es calor o frío extremo, priorizar esa clasificación
  if (tempCategory === 'calor' && condition === 'soleado') {
    condition = 'calor';
  } else if (tempCategory === 'frio' && condition === 'soleado') {
    condition = 'frio';
  }
  
  // Detectar si es "nublado con lluvia"
  const hasRainWithNubes = condition === 'lluvia' && weatherDesc.includes('nublado');
  
  return {
    timeOfDay,
    condition,
    intensity: condition.includes('fuerte') ? 'fuerte' : (condition === 'lluvia' ? 'ligera' : null),
    temperature: temp,
    feelsLike: feelsLike,
    weatherDesc: weatherDesc,
    windSpeed: windSpeed,
    chanceOfRain: chanceOfRain,
    hasRainWithNubes,
    isDefault: false
  };
}

// ========== 7. SELECCIONAR IMAGEN ==========
function selectBackgroundImage(classified) {
  const imageKey = getImageKey(classified.timeOfDay, classified.condition, classified.hasRainWithNubes);
  
  // Buscar en el mapeo
  let fileId = WEATHER_IMAGES[imageKey];
  
  // Si no existe, intentar con versión sin modificador
  if (!fileId) {
    const fallbackKey = `${classified.timeOfDay}_${classified.condition.replace('_fuerte', '').replace('_ligera', '')}`;
    fileId = WEATHER_IMAGES[fallbackKey];
  }
  
  // Si aún no existe, usar default
  if (!fileId) {
    fileId = WEATHER_IMAGES['default'];
  }
  
  return getImageUrl(fileId);
}

// ========== 8. ACTUALIZAR UI ==========
function updateLooksNavBackground(imageUrl) {
  const looksNav = document.getElementById('looks-nav-bg');
  if (!looksNav) return;
  
  if (imageUrl) {
    // Precargar imagen para transición suave
    const img = new Image();
    img.onload = () => {
      looksNav.style.backgroundImage = `url('${imageUrl}')`;
      looksNav.style.backgroundSize = 'cover';
      looksNav.style.backgroundPosition = 'center 30%';
      looksNav.classList.remove('default-bg');
    };
    img.src = imageUrl;
  } else {
    // Fallback a color sólido
    looksNav.classList.add('default-bg');
    looksNav.style.backgroundImage = 'none';
  }
}

function updateWeatherWidget(classified) {
  const widget = document.getElementById('weather-widget');
  if (!widget) return;
  
  const temp = Math.round(classified.temperature);
  const feelsLike = Math.round(classified.feelsLike);
  const condition = classified.weatherDesc || 
    (classified.condition === 'soleado' ? 'Soleado' :
     classified.condition === 'lluvia' ? 'Lluvia' :
     classified.condition === 'nublado' ? 'Nublado' : 'Variable');
  
  // Elegir ícono según condición
  let icon = '🌡️';
  if (classified.condition.includes('lluvia')) icon = '☔';
  else if (classified.condition === 'tormenta') icon = '⛈️';
  else if (classified.condition === 'nieve') icon = '❄️';
  else if (classified.condition === 'soleado' || classified.condition === 'calor') icon = '☀️';
  else if (classified.condition === 'nublado') icon = '☁️';
  else if (classified.condition === 'nublado_parcial') icon = '⛅';
  else if (classified.condition === 'viento_fuerte') icon = '💨';
  
  let html = `<span class="weather-icon">${icon}</span>`;
  html += `<span>${temp}°C</span>`;
  
  if (Math.abs(temp - feelsLike) > 2) {
    html += `<span class="weather-temp">sensación ${feelsLike}°C</span>`;
  }
  
  html += `<span>${condition}</span>`;
  
  widget.innerHTML = html;
  widget.classList.remove('loading');
}

// ========== 9. FUNCIÓN PRINCIPAL ==========
async function initWeatherBackground() {
  const looksNav = document.getElementById('looks-nav-bg');
  const widget = document.getElementById('weather-widget');
  
  // Mostrar estado de carga
  if (widget) {
    widget.innerHTML = '<span class="weather-icon">🌡️</span><span class="weather-text">Cargando clima...</span>';
    widget.classList.add('loading');
  }
  
  if (looksNav) {
    looksNav.classList.add('default-bg');
  }
  
  // Obtener clima
  const weatherData = await fetchWeatherData();
  const classified = classifyWeather(weatherData);
  
  // Actualizar widget con texto
  updateWeatherWidget(classified);
  
  // Seleccionar y aplicar imagen de fondo
  const imageUrl = selectBackgroundImage(classified);
  updateLooksNavBackground(imageUrl);
  
  console.log('🌤️ Clima aplicado:', {
    hora: classified.timeOfDay,
    condición: classified.condition,
    temperatura: classified.temperature,
    imagen: imageUrl ? '✅' : '❌'
  });
}

// ========== 10. INICIALIZAR ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWeatherBackground);
} else {
  initWeatherBackground();
}

// Exportar para uso global
window.WeatherBG = {
  init: initWeatherBackground,
  fetchWeather: fetchWeatherData,
  classify: classifyWeather
};
