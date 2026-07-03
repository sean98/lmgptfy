/**
 * Roast levels shared by the link builder (index.html) and the animated
 * redirect page (launch.html).
 *
 * Each level is a single message shown for the whole animation — no swapping
 * lines, just one thing to read while the question types itself. `{name}` is
 * replaced with the provider's name.
 *
 * The special `custom` level lets the sender write their own message
 * (carried in the link payload as `m`).
 */
(function (global) {
  const ROASTS = {
    gentle: {
      id: 'gentle',
      name: 'Gentle',
      emoji: '🙂',
      message: 'Let {name} handle this.',
    },
    sassy: {
      id: 'sassy',
      name: 'Sassy',
      emoji: '😏',
      message: 'Open {name}, paste it, and click "Send"...',
    },
    nuclear: {
      id: 'nuclear',
      name: 'Nuclear',
      emoji: '☢️',
      message: 'An absolute wate of human carbon.',
    },
    custom: {
      id: 'custom',
      name: 'Custom',
      emoji: '✍️',
      message: '', // replaced by the sender's custom message
    },
  };

  const ROAST_ORDER = ['gentle', 'sassy', 'nuclear', 'custom'];
  const DEFAULT_ROAST = 'sassy';

  global.LMATFY_ROASTS = {
    ROASTS,
    ROAST_ORDER,
    DEFAULT_ROAST,
    get(id) {
      return ROASTS[id] || ROASTS[DEFAULT_ROAST];
    },
  };
})(window);
