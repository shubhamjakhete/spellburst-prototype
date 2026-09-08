/**
 * Deciding which preserved items can be checked at all.
 *
 * Only two properties are measurable without a model: movement and colour.
 * Everything else has to be reported as unchecked rather than preserved.
 */

const MOVEMENT_WORDS =
  /\b(move|moves|movement|moving|motion|speed|fast|slow|pace|anima\w*|drift\w*|travel\w*|velocity|flow\w*|rotation|rotating|spin\w*|pulse|pulsing|twinkl\w*|orbit\w*)\b/i

const COLOUR_WORDS =
  /\b(colour\w*|color\w*|palette|hue|tone|tint|shade|saturation|red|orange|yellow|green|cyan|blue|purple|violet|pink|magenta|teal|amber|gold|silver|warm|cool|monochrome)\b/i

export function mentionsMovement(text: string): boolean {
  return MOVEMENT_WORDS.test(text)
}

export function mentionsColour(text: string): boolean {
  return COLOUR_WORDS.test(text)
}
