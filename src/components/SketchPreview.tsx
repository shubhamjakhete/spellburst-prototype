import { useMemo } from 'react'
import {
  SKETCH_HEIGHT,
  SKETCH_WIDTH,
  buildSketchDocument,
} from '../lib/sketch'
import type { Reading } from '../lib/measure'

type Props = {
  code: string | null
  reading: Reading | null
  /** Said in the strip under the artwork when there is nothing to report. */
  status: string
}

export default function SketchPreview({ code, reading, status }: Props) {
  // A second, visible copy of the same document the measurements came from.
  // Remounted whenever the code changes, which is what keys the iframe.
  const document = useMemo(
    () => (code ? buildSketchDocument(code, 'preview') : null),
    [code],
  )

  return (
    <div className="stage">
      {document ? (
        <iframe
          key={code}
          title="the sketch"
          srcDoc={document}
          sandbox="allow-scripts"
          width={SKETCH_WIDTH}
          height={SKETCH_HEIGHT}
        />
      ) : (
        <div
          className="empty"
          style={{ aspectRatio: `${SKETCH_WIDTH} / ${SKETCH_HEIGHT}` }}
        />
      )}

      <div className="stagefoot">
        {reading ? (
          <>
            <span>
              motion <b>{reading.motion.toFixed(3)}</b>
            </span>
            <span>
              colour <b>{reading.palette}</b>
            </span>
            <span>{status}</span>
          </>
        ) : (
          <span>{status}</span>
        )}
      </div>
    </div>
  )
}
