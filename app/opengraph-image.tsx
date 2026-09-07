import { ImageResponse } from 'next/og'

export const alt = 'Aman Mehtar — Orbital Portfolio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(ellipse 90% 70% at 50% 110%, #10243f 0%, #050a14 55%, #000000 100%)',
          color: '#e6f4ff',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 9999,
              border: '2px solid rgba(159, 216, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 9999,
                background: '#ffb84d',
                boxShadow: '0 0 30px rgba(255, 184, 77, 0.9)',
              }}
            />
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            letterSpacing: 18,
            textTransform: 'uppercase',
            color: 'rgba(159, 216, 255, 0.75)',
            marginBottom: 20,
          }}
        >
          Orbital Portfolio
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -1 }}>
          Aman Mehtar
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 26,
            color: 'rgba(214, 238, 255, 0.7)',
            maxWidth: 820,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Pilot a spaceship through a solar system where every planet is a project.
        </div>
      </div>
    ),
    size,
  )
}
