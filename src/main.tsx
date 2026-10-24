import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EnvioUnidad } from './EnvioUnidad.tsx'
import { paramsColecta } from './colecta.ts'
import { esNativo } from './nativo.ts'

const colecta = paramsColecta()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {colecta ? <EnvioUnidad peerId={colecta.peerId} token={colecta.token} /> : <App />}
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && !esNativo()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err)
    })
  })
}
