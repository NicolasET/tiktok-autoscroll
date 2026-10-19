# Chrome Web Store listing — Autoscroll for TikTok

Upload: `autoscroll-for-tiktok-1.0.0.zip` (manifest, src, popup, icons, LICENSE).

## Store listing tab

**Language:** Español (Latinoamérica). Add English as a second language if desired, using the text in the English section below.

**Category:** Productividad → Herramientas (or "Diversión")

**Summary (≤132 chars)**
> Pasa automáticamente al siguiente video de TikTok web cuando termina el actual. Salta LIVEs y anuncios.

**Description**
```
Autoscroll for TikTok avanza al siguiente video del feed de TikTok web en cuanto termina el actual, para que puedas ver sin tocar el mouse ni el teclado.

Funciones
• Avanza al terminar cada video (respeta la duración de cada uno, no usa un timer fijo).
• Salta LIVEs y anuncios automáticamente (opcional).
• Se pausa mientras interactúas: si mueves el mouse sobre el video, abres los comentarios o estás escribiendo, espera a que termines.
• Publicaciones de fotos: avanza después de N segundos (configurable).
• Contador de videos vistos, con botón para reiniciar.
• Tres formas de activarlo: el popup, un botón flotante en la página y el atajo Alt+Shift+S (configurable en chrome://extensions/shortcuts).

Privacidad
No recolecta ni envía ningún dato. La configuración y el contador se guardan solo en tu navegador (chrome.storage.local). Sin analytics, sin servidores, sin código remoto.

Código abierto: https://github.com/NicolasET/tiktok-autoscroll

Esta extensión no está afiliada, patrocinada ni respaldada por TikTok o ByteDance.
```

**Graphic assets**
- Store icon 128×128: `icons/icon128.png`
- Screenshot 1280×800: `store/screenshot-1280x800.png`
- Small promo tile 440×280: `store/promo-tile-440x280.png`

**Homepage URL:** https://github.com/NicolasET/tiktok-autoscroll
**Support URL:** https://github.com/NicolasET/tiktok-autoscroll/issues

## Privacy practices tab

**Single purpose**
> Avanzar automáticamente al siguiente video en el feed de TikTok web cuando el video actual termina.

**Permission justification**
- `storage`: Guarda localmente las preferencias del usuario (activado/desactivado, saltar LIVEs/anuncios, pausar al interactuar, botón flotante, segundos para fotos) y el contador de videos vistos.
- Host permission `https://www.tiktok.com/*`: El content script necesita leer el estado del reproductor de video y hacer clic en el botón "siguiente" del feed de TikTok. No se ejecuta en ningún otro sitio.

**Remote code:** No, I am not using remote code.

**Data usage:** Check none of the data types. Certify all three disclosures:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL** (optional when no data is collected): https://github.com/NicolasET/tiktok-autoscroll#privacy

## Distribution tab
- Visibility: Public
- Regions: All regions

---

## English (optional second language)

**Summary**
> Automatically moves to the next TikTok web video when the current one ends. Skips LIVEs and ads.

**Description**
```
Autoscroll for TikTok moves your TikTok web feed to the next video as soon as the current one ends, so you can watch hands-free.

Features
• Advances when each video ends (follows each video's real length, not a fixed timer).
• Skips LIVEs and ads automatically (optional).
• Pauses while you interact: moving the mouse over the video, opening comments or typing holds the advance until you're done.
• Photo posts: advances after N seconds (configurable).
• Watched-video counter with a reset button.
• Three ways to toggle it: the popup, a floating in-page button, and Alt+Shift+S (configurable at chrome://extensions/shortcuts).

Privacy
Collects and sends no data. Settings and the counter stay in your browser (chrome.storage.local). No analytics, no servers, no remote code.

Open source: https://github.com/NicolasET/tiktok-autoscroll

Not affiliated with, sponsored by, or endorsed by TikTok or ByteDance.
```
