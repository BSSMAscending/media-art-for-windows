const { createMainWindow, toggleFullscreen } = require('../src/main/window');

function createBrowserWindow() {
  const events = new Map();

  return {
    events,
    instance: {
      isDestroyed: vi.fn(() => false),
      isFullScreen: vi.fn(() => false),
      isSimpleFullScreen: vi.fn(() => false),
      loadFile: vi.fn(),
      on: vi.fn((event, callback) => events.set(event, callback)),
      once: vi.fn((event, callback) => events.set(event, callback)),
      setFullScreen: vi.fn(),
      setSimpleFullScreen: vi.fn(),
      show: vi.fn(),
      webContents: {
        on: vi.fn(),
        send: vi.fn(),
      },
    },
  };
}

describe('main window', () => {
  it('opens directly in fullscreen without a window frame', () => {
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
        frame: false,
        fullscreen: true,
        height: 720,
        width: 1280,
      })
    );

    window.events.get('ready-to-show')();

    expect(window.instance.show).toHaveBeenCalled();
  });

  it('switches fullscreen on and off using the current window state', () => {
    const window = createBrowserWindow();

    expect(toggleFullscreen(window.instance, 'win32')).toBe(true);
    expect(window.instance.setFullScreen).toHaveBeenLastCalledWith(true);

    window.instance.isFullScreen.mockReturnValue(true);

    expect(toggleFullscreen(window.instance, 'win32')).toBe(false);
    expect(window.instance.setFullScreen).toHaveBeenLastCalledWith(false);
  });

  it('uses macOS simple fullscreen for an immediate native transition', () => {
    const window = createBrowserWindow();

    expect(toggleFullscreen(window.instance, 'darwin')).toBe(true);
    expect(window.instance.setSimpleFullScreen).toHaveBeenCalledWith(true);
    expect(window.instance.setFullScreen).not.toHaveBeenCalled();
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
    expect(window.instance.webContents.send).toHaveBeenNthCalledWith(
      2,
      'fullscreen-changed',
      false
    );
  });
});
