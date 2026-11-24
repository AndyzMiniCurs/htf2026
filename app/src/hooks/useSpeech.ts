import { useEffect, useRef, useState } from 'react'

// The Web Speech API is still prefixed in Chromium/Safari and has no lib.dom types.
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult:
    | ((event: {
        resultIndex: number
        results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
      }) => void)
    | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Dictation for the echo form. `supported` is false until mounted (and stays false where the
 * browser has no speech recognition), so the server and first client render agree.
 */
export function useSpeech(onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const handler = useRef(onText)
  handler.current = onText

  useEffect(() => setSupported(recognitionCtor() !== null), [])
  useEffect(() => () => recognition.current?.stop(), [])

  function start() {
    const Ctor = recognitionCtor()
    if (!Ctor) return
    const r = new Ctor()
    r.lang = navigator.language || 'en-GB'
    r.continuous = true
    r.interimResults = true
    r.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) handler.current(result[0].transcript.trim(), true)
        else interim += result[0].transcript
      }
      if (interim) handler.current(interim.trim(), false)
    }
    r.onerror = (event) =>
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked.'
          : 'Could not hear you. Try again.',
      )
    r.onend = () => setListening(false)
    recognition.current = r
    setError(null)
    setListening(true)
    r.start()
  }

  function stop() {
    recognition.current?.stop()
  }

  return { supported, listening, error, start, stop }
}
