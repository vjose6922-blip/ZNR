(function () {
  'use strict';
  
  // Reemplaza con la URL COMPLETA de tu implementación
  // No la partas en partes, usa la URL completa
  const API_URL = 'https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec';
  
  // Si quieres mantener la estructura de partes, asegúrate de que esté completa
  const _p = [
    'https://script.google.com',
    '/macros/s/',
    'AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww', // <-- ESTE ID DEBE SER CORRECTO
    '/exec'
  ];
  
  const _w = ['52', '867', '178', '1272'];
  
  function _buildApiUrl()  { return _p.join(''); }
  function _buildWaNumber(){ return _w.join(''); }
  
  Object.defineProperties(window, {
    API_URL: {
      get: _buildApiUrl,
      configurable: false,
      enumerable: false
    },
    WHATSAPP_NUMBER: {
      get: _buildWaNumber,
      configurable: false,
      enumerable: false
    }
  });
})();
