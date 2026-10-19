/* web.app 和 firebaseapp.com 是兩個不同的網站來源。
 * 雲端登入（authDomain）只穩定在 firebaseapp.com。
 * 從另一個網址進來的人會被送到這裡，帳號和房間才對得上。
 */
(function () {
  if (location.hostname !== 'aulf-friends-game.web.app') return;
  location.replace('https://aulf-friends-game.firebaseapp.com' + location.pathname + location.search + location.hash);
})();
