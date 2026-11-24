import * as tf from '@tensorflow/tfjs'
import { HORIZON, HOUR_MS, dataset, meanAbsoluteError, seasonalAverage } from './features.ts'
import type { HourlySeries } from './features.ts'

/** The last week stays out of training, to measure the model on hours it never saw. */
const HOLD_OUT = 7 * 24

export type TrainedModel = {
  kind: string
  /** Expected incidents for each of the HORIZON hours after the features' hour. */
  predict: (features: Array<number>) => Array<number>
  trainedHours: number
  modelError: number
  baselineError: number
}

/**
 * A small neural network (two hidden layers) trained on the incident history to forecast the
 * next HORIZON hours from the time of day and week and the last day's activity. Poisson loss,
 * because what it predicts are counts. Evaluated against the weekday-and-hour average.
 */
export async function trainModel(series: HourlySeries): Promise<TrainedModel> {
  await tf.setBackend('cpu')
  const { inputs, targets, hours } = dataset(series)
  const split = Math.max(1, inputs.length - HOLD_OUT)
  const width = inputs[0]?.length ?? 0

  const model = tf.sequential({
    layers: [
      tf.layers.dense({
        inputShape: [width],
        units: 32,
        activation: 'relu',
        kernelInitializer: tf.initializers.glorotUniform({ seed: 7 }),
      }),
      tf.layers.dense({
        units: 32,
        activation: 'relu',
        kernelInitializer: tf.initializers.glorotUniform({ seed: 11 }),
      }),
      tf.layers.dense({
        units: HORIZON,
        activation: 'softplus',
        kernelInitializer: tf.initializers.glorotUniform({ seed: 13 }),
      }),
    ],
  })
  model.compile({ optimizer: tf.train.adam(0.005), loss: 'poisson' })

  const x = tf.tensor2d(inputs.slice(0, split))
  const y = tf.tensor2d(targets.slice(0, split))
  await model.fit(x, y, { epochs: 80, batchSize: 32, shuffle: true, verbose: 0 })
  x.dispose()
  y.dispose()

  const predict = (features: Array<number>): Array<number> =>
    tf.tidy(() => Array.from((model.predict(tf.tensor2d([features])) as tf.Tensor).dataSync()))

  const testInputs = inputs.slice(split)
  const testTargets = targets.slice(split)
  const average = seasonalAverage(series, (hours[split] ?? 0) + 1)
  const baseline = hours
    .slice(split)
    .map((i) =>
      Array.from({ length: HORIZON }, (_, h) => average(series.start + (i + 1 + h) * HOUR_MS)),
    )

  return {
    kind: 'Neural network · 2×32 · TensorFlow.js',
    predict,
    trainedHours: split,
    modelError: round(meanAbsoluteError(testTargets, testInputs.map(predict))),
    baselineError: round(meanAbsoluteError(testTargets, baseline)),
  }
}

const round = (v: number) => Math.round(v * 100) / 100
