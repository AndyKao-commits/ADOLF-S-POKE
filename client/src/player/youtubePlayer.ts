export type YtPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (v: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  loadVideoById: (opts: string | { videoId: string; startSeconds?: number }) => void;
  destroy: () => void;
  getIframe?: () => HTMLIFrameElement;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YtPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;

export function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => {
      reject(new Error('YouTube API 載入逾時（請確認平板能連外網）'));
    }, 20000);
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('無法載入 YouTube（請確認平板能連外網）'));
    };
    document.head.appendChild(tag);
  });
  return apiReady;
}

export function hardenYoutubeIframe(player: YtPlayer) {
  try {
    const iframe = player.getIframe?.();
    if (!iframe) return;
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    );
    // Some browsers still drop Referer without this on the parent document.
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  } catch {
    /* ignore */
  }
}

export function describeYtError(code: number): string {
  switch (code) {
    case 2:
      return '影片參數無效';
    case 5:
      return 'HTML5 播放器錯誤';
    case 100:
      return '找不到影片（可能已下架）';
    case 101:
    case 150:
      return '此影片禁止嵌入播放，請換一首';
    case 153:
      return '播放器設定錯誤（Referer）。請重新整理頁面再試';
    default:
      return `YouTube 錯誤 ${code}`;
  }
}

export async function createPlayer(
  elementId: string,
  handlers: {
    onReady?: () => void;
    onStateChange?: (state: number) => void;
    onError?: (code: number) => void;
  } = {},
): Promise<YtPlayer> {
  await loadYoutubeApi();
  return new Promise((resolve, reject) => {
    const host = document.getElementById(elementId);
    if (!host) {
      reject(new Error(`找不到播放器容器 #${elementId}`));
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) reject(new Error('YouTube 播放器初始化逾時'));
    }, 20000);

    const player = new window.YT!.Player(elementId, {
      width: '100%',
      height: '100%',
      host: 'https://www.youtube.com',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        fs: 1,
        iv_load_policy: 3,
        enablejsapi: 1,
        origin: window.location.origin,
        widget_referrer: window.location.href,
      },
      events: {
        onReady: () => {
          settled = true;
          window.clearTimeout(timer);
          hardenYoutubeIframe(player);
          handlers.onReady?.();
          resolve(player);
        },
        onStateChange: (e: { data: number }) => handlers.onStateChange?.(e.data),
        onError: (e: { data: number }) => handlers.onError?.(e.data),
      },
    });
  });
}
