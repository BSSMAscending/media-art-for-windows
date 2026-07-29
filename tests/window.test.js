const { createMainWindow, toggleFullscreen } = require('../src/main/window');

function createBrowserWindow() {
  const events = new Map();

  return {
    events,
    instance: {
      isDestroyed: vi.fn(() => false),
      isFullScreen: vi.fn(() => false),
      loadFile: vi.fn(),
      on: vi.fn((event, callback) => events.set(event, callback)),
      once: vi.fn((event, callback) => events.set(event, callback)),
      setFullScreen: vi.fn(),
      show: vi.fn(),
      webContents: {
        on: vi.fn(),
        send: vi.fn(),
      },
    },
  };
}

describe('main window', () => {
  it('opens as a framed window instead of fullscreen', () => {
    const window = createBrowserWindow();
    const BrowserWindow = vi.fn(function BrowserWindow() {
      return window.instance;
    });

    createMainWindow({
      BrowserWindow,
      htmlPath: '/app/renderer/index.html',
      preloadPath: '/app/preload.js',
    });

    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        frame: true,
        fullscreen: false,
        height: 720,
        width: 1280,
      })
    );

    window.events.get('ready-to-show')();

    expect(window.instance.setFullScreen).toHaveBeenCalledWith(false);
  });

  it('switches fullscreen on and off using the current window state', () => {
    const window = createBrowserWindow();

    expect(toggleFullscreen(window.instance)).toBe(true);
    expect(window.instance.setFullScreen).toHaveBeenLastCalledWith(true);

    window.instance.isFullScreen.mockReturnValue(true);

    expect(toggleFullscreen(window.instance)).toBe(false);
    expect(window.instance.setFullScreen).toHaveBeenLastCalledWith(false);
  });

  it('announces fullscreen state changes to the renderer', () => {
    const window = createBrowserWindow();
    const BrowserWindow = vi.fn(function BrowserWindow() {
      return window.instance;
    });

    createMainWindow({
      BrowserWindow,
      htmlPath: '/app/renderer/index.html',
      preloadPath: '/app/preload.js',
    });

    window.events.get('enter-full-screen')();
    window.events.get('leave-full-screen')();

    expect(window.instance.webContents.send).toHaveBeenNthCalledWith(1, 'fullscreen-changed', true);
    expect(window.instance.webContents.send).toHaveBeenNthCalledWith(2, 'fullscreen-changed', false);
  });
});
