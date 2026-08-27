# Higgsfield workflow-film handoff

Status: prepared, not generated

The current signed-out browser session could not create the final clip. No
Higgsfield credit was spent in this pass. This handoff deliberately separates a
production-ready prompt from a claim that the render exists.

## Locked source frames

- Start: `public/media/proofrail-workflow-start-v1.webp`
- End: `public/media/proofrail-workflow-end-v1.webp`
- Aspect ratio: 16:9
- Composition: one ivory publication sheet, cobalt evidence rail, coral only
  for unresolved claim tabs, no people, logo, product UI, or customer asset

The end frame is an illustrative release-ready state. It must only be shown by
the application when the real ProofRail gate passes.

## Recommended Higgsfield job

Use an official Start & End Frames image-to-video workflow:

- Duration: 5 seconds
- Test render: 720p
- Approved final render: 1080p
- Camera: subtle controlled push-in
- Audio: none
- Text and logo generation: disabled / absent from source frames

Prompt:

> Subtle controlled push-in. Editorial evidence fragments align into one precise cobalt review rail. Warm paper, navy ink, restrained studio light. No text, no logos, no people, no floating orb, no explosive effects. Preserve composition and geometry.

## Acceptance gate before integration

1. Start and end geometry match without morphing, duplicated rails, or invented
   text.
2. The film reads as draft → evidence alignment → release-ready, not as an
   automatic publishing action.
3. No customer logo, quote, KPI, product image, face, voice, or music appears.
4. C2PA/provenance metadata is retained where the downloaded output provides it.
5. The MP4 is not wired into the page until a human has reviewed the entire
   five seconds.
6. Runtime logic still binds the final reveal to `gate.status === "pass"`; the
   film can never become evidence of approval on its own.

Official references checked on 2026-08-27:

- [Higgsfield Start & End Frames](https://higgsfield.ai/blog/what-is-first-and-last-frame-animation)
- [Higgsfield Camera Controls](https://higgsfield.ai/blog/how-to-use-higgsfield-camera-controls)
- [Higgsfield Terms of Use](https://higgsfield.ai/terms-of-use-agreement)
