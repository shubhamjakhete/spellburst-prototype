export const SKETCH_WIDTH = 600
export const SKETCH_HEIGHT = 400

// Pinned to 1.x. p5 2.0 changed setup and removed preload, and generated code
// is written in 1.x idioms.
const P5_SRC = 'https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/p5.min.js'

// Time for p5 to load and start drawing before the first capture.
const SETTLE_MS = 1200
// Gap between the two captures. Motion is measured across this window.
const GAP_MS = 500

const DEFAULT_TIMEOUT_MS = 12000

export type SketchFrames = {
  frameA: string
  frameB: string
}

export type SketchFailureKind =
  | 'load'
  | 'syntax'
  | 'runtime'
  | 'canvas'
  | 'timeout'

export class SketchError extends Error {
  kind: SketchFailureKind

  constructor(kind: SketchFailureKind, message: string) {
    super(message)
    this.name = 'SketchError'
    this.kind = kind
  }
}

type FramesMessage = { type: 'frames'; a: string; b: string }
type ErrorMessage = { type: 'error'; kind: SketchFailureKind; message: string }
type SketchMessage = FramesMessage | ErrorMessage

const FAILURE_KINDS: readonly string[] = [
  'load',
  'syntax',
  'runtime',
  'canvas',
  'timeout',
]

function isFailureKind(value: unknown): value is SketchFailureKind {
  return typeof value === 'string' && FAILURE_KINDS.includes(value)
}

/**
 * The iframe is untrusted, so nothing it posts is taken on faith. Anything
 * unrecognised, or tagged with another run's id, is ignored.
 */
function readMessage(value: unknown, runId: string): SketchMessage | null {
  if (typeof value !== 'object' || value === null) return null

  const data = value as Record<string, unknown>
  if (data.runId !== runId) return null

  if (
    data.type === 'frames' &&
    typeof data.a === 'string' &&
    typeof data.b === 'string'
  ) {
    return { type: 'frames', a: data.a, b: data.b }
  }

  if (data.type === 'error') {
    return {
      type: 'error',
      kind: isFailureKind(data.kind) ? data.kind : 'runtime',
      message:
        typeof data.message === 'string' ? data.message : 'the sketch failed',
    }
  }

  return null
}

// Kept out of the template literal below so the sequence never has to be
// escaped inside it.
const CLOSE_SCRIPT = '</' + 'script>'

// The browser reports error lines relative to the whole generated document.
// This marker sits immediately above the sketch so the harness can subtract
// the wrapper and report a line number the author can find in their own code.
const START_MARKER = '//@sketch-start'
const OFFSET_TOKEN = '__SKETCH_LINE_OFFSET__'

/**
 * The document the sketch runs inside. Exported so a live preview can mount
 * the same environment the captures were taken from.
 */
export function buildSketchDocument(code: string, runId: string): string {
  const draft = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
  canvas { display: block; }
</style>
<script>
(function () {
  var RUN_ID = ${JSON.stringify(runId)};
  var sent = false;

  // First message wins. A sketch that throws inside draw() throws on every
  // frame, and an error after a successful capture is not worth reporting.
  function report(message) {
    if (sent) return;
    sent = true;
    message.runId = RUN_ID;
    parent.postMessage(message, '*');
  }

  window.__fail = function (kind, detail) {
    report({ type: 'error', kind: kind, message: String(detail) });
  };

  window.__frames = function (a, b) {
    report({ type: 'frames', a: a, b: b });
  };

  var LINE_OFFSET = ${OFFSET_TOKEN};

  window.onerror = function (message, _source, line) {
    var inSketch = line ? line - LINE_OFFSET : 0;
    var text = inSketch > 0 ? message + ' (line ' + inSketch + ')' : String(message);
    window.__fail(/SyntaxError/.test(String(message)) ? 'syntax' : 'runtime', text);
    return true;
  };

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    window.__fail('runtime', reason && reason.message ? reason.message : String(reason));
  });

  // p5 asks for device orientation and motion on start. A sandboxed frame is
  // refused the accelerometer permission and Chrome logs the refusal for every
  // sketch. Sensors are unreachable here anyway, so the requests are dropped.
  var SENSOR_EVENTS = ['deviceorientation', 'deviceorientationabsolute', 'devicemotion'];
  var addListener = window.addEventListener.bind(window);
  window.addEventListener = function (type) {
    if (SENSOR_EVENTS.indexOf(type) !== -1) return;
    return addListener.apply(null, arguments);
  };
})();
${CLOSE_SCRIPT}
<script src="${P5_SRC}" onerror="window.__fail('load', 'could not fetch p5.js')">${CLOSE_SCRIPT}
</head>
<body>
<script>
${START_MARKER}
${code}
${CLOSE_SCRIPT}
<script>
(function () {
  function grab() {
    var canvas = document.querySelector('canvas');
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch (error) {
      // A sketch that drew a cross-origin image taints the canvas and makes it
      // unreadable, which is a broken sketch rather than a broken runner.
      window.__fail('canvas', 'the canvas could not be read: ' + (error && error.message ? error.message : error));
      return null;
    }
  }

  setTimeout(function () {
    if (typeof window.p5 === 'undefined') {
      window.__fail('load', 'p5.js did not load');
      return;
    }

    var a = grab();
    if (!a) {
      window.__fail('canvas', 'the sketch never created a canvas');
      return;
    }

    setTimeout(function () {
      window.__frames(a, grab() || a);
    }, ${GAP_MS});
  }, ${SETTLE_MS});
})();
${CLOSE_SCRIPT}
</body>
</html>`

  // Substituting the token cannot change the line count, so the offset stays
  // accurate for the string that is actually returned.
  const markerLine = draft.split('\n').indexOf(START_MARKER) + 1
  return draft.replace(OFFSET_TOKEN, String(markerLine))
}

function newRunId(): string {
  const webCrypto = globalThis.crypto
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }
  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createHost(): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('data-sketch-host', '')
  // A 1x1 window onto a full-size iframe. The frame has to stay on screen and
  // actually be painted: with opacity:0, visibility:hidden, or a position off
  // screen the browser stops running requestAnimationFrame inside it and every
  // sketch captures as motionless. Clipping is the only one of those that keeps
  // the sketch running while staying invisible.
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'bottom:0',
    'width:1px',
    'height:1px',
    'overflow:hidden',
    'pointer-events:none',
    'z-index:0',
  ].join(';')
  document.body.appendChild(host)
  return host
}

/**
 * Runs p5 code in a sandboxed iframe and captures two frames 500ms apart.
 * Rejects with a SketchError if the code fails rather than letting it escape
 * into the app.
 */
export function runSketch(
  code: string,
  options: { timeoutMs?: number } = {},
): Promise<SketchFrames> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const runId = newRunId()

  return new Promise<SketchFrames>((resolve, reject) => {
    const host = createHost()
    const iframe = document.createElement('iframe')

    // No allow-same-origin: the sketch gets an opaque origin and cannot reach
    // the parent document or anything it holds.
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('title', 'sketch runner')
    iframe.width = String(SKETCH_WIDTH)
    iframe.height = String(SKETCH_HEIGHT)
    iframe.style.border = '0'
    iframe.style.display = 'block'

    let settled = false
    let timer = 0

    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      host.remove()
      action()
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return

      const message = readMessage(event.data, runId)
      if (!message) return

      if (message.type === 'frames') {
        finish(() => resolve({ frameA: message.a, frameB: message.b }))
        return
      }

      finish(() => reject(new SketchError(message.kind, message.message)))
    }

    window.addEventListener('message', onMessage)
    timer = window.setTimeout(() => {
      finish(() =>
        reject(
          new SketchError(
            'timeout',
            `the sketch did not report back within ${timeoutMs}ms`,
          ),
        ),
      )
    }, timeoutMs)

    iframe.srcdoc = buildSketchDocument(code, runId)
    host.appendChild(iframe)
  })
}
