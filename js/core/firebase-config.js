/* ============ firebase-config.js — conexión con tu proyecto de Firebase ============
 * Pega aquí la configuración de tu app web de Firebase (Consola de Firebase >
 * Configuración del proyecto > Tus apps > SDK setup and configuration > Config).
 * Los pasos completos están en docs/FIREBASE.md.
 *
 * Estos datos NO son secretos: Firebase los diseña para ir en la web. Lo que
 * protege las partidas son las reglas de Firestore (firestore.rules).
 *
 * Si se pone a null, el juego funciona en modo local (sólo en el navegador).
 */
// Proyecto propio de AULF's friends GAME. No es el de pokesurvivor.com.
G.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCz8Xrp1U1Sxv-yIPwVwqWubqugVwbewq8',
  authDomain: 'aulf-friends-game.firebaseapp.com',
  projectId: 'aulf-friends-game',
  storageBucket: 'aulf-friends-game.firebasestorage.app',
  messagingSenderId: '430797822667',
  appId: '1:430797822667:web:37ca392a3b81ea7573994e',
  databaseURL: 'https://aulf-friends-game-default-rtdb.europe-west1.firebasedatabase.app'
};

/* Ejemplo de cómo debe quedar:
G.FIREBASE_CONFIG = {
  apiKey: 'AIza...',
  authDomain: 'tu-proyecto.firebaseapp.com',
  projectId: 'tu-proyecto',
  storageBucket: 'tu-proyecto.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123'
};
*/
