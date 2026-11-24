export type Prediction = { className: string; probability: number }
export type ModerationResult = 'ok' | 'explicit' | 'unchecked'

/** Explicit when the model is fairly sure the photo is pornographic, hentai or strongly sexual. */
export function isExplicit(predictions: Array<Prediction>): boolean {
  const p = (name: string) => predictions.find((x) => x.className === name)?.probability ?? 0
  return p('Porn') + p('Hentai') >= 0.6 || p('Sexy') >= 0.85
}

type Model = { classify: (image: HTMLImageElement) => Promise<Array<Prediction>> }
let model: Promise<Model> | null = null

/** Loads the bundled MobileNetV2 model once, on first use, so only the report page pays for it. */
function loadModel(): Promise<Model> {
  model ??= (async () => {
    const [{ load }, { MobileNetV2Model }] = await Promise.all([
      import('nsfwjs/core'),
      import('nsfwjs/models/mobilenet_v2'),
    ])
    return load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] })
  })()
  return model
}

/**
 * Checks a photo in the browser before it is uploaded. Fails open (`unchecked`) when the model
 * cannot run, like every AI step: a guardian's report is never blocked by moderation itself.
 * shortcut: client-side only, so a crafted request can skip it; move it server-side after the hackathon.
 */
export async function moderateImage(file: File): Promise<ModerationResult> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const predictions = await (await loadModel()).classify(image)
    return isExplicit(predictions) ? 'explicit' : 'ok'
  } catch {
    model = null
    return 'unchecked'
  } finally {
    URL.revokeObjectURL(url)
  }
}
