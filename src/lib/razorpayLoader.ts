/**
 * Loads Razorpay checkout.js and resolves when window.Razorpay is available.
 * Prevents races between async script load and opening checkout.
 */
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const SCRIPT_ID = 'rzp-checkout-sdk';

function razorpayReady(): boolean {
  return typeof (window as unknown as { Razorpay?: unknown }).Razorpay === 'function';
}

function findExistingScript(): HTMLScriptElement | null {
  return (
    (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ||
    (document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null) ||
    (document.querySelector('script[src*="checkout.razorpay.com"]') as HTMLScriptElement | null)
  );
}

export function loadRazorpayScript(timeoutMs = 25000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (razorpayReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const fail = (msg: string) => reject(new Error(msg));

    const waitForGlobal = () => {
      if (razorpayReady()) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        fail('Razorpay is taking too long to load. Check your connection and try again.');
        return;
      }
      window.setTimeout(waitForGlobal, 30);
    };

    let script = findExistingScript();

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => waitForGlobal();
      script.onerror = () =>
        fail('Could not load payment script. Check your connection or try again.');
      document.body.appendChild(script);
      return;
    }

    if (razorpayReady()) {
      resolve();
      return;
    }

    script.addEventListener('load', () => waitForGlobal(), { once: true });
    script.addEventListener(
      'error',
      () => fail('Could not load payment script.'),
      { once: true }
    );
    waitForGlobal();
  });
}
