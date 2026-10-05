# Nivis Hotel & Spa — sito nuovo

Landing page statica in tre lingue (italiano, inglese, tedesco) per il Nivis Hotel & Spa, Folgarida (Val di Sole).
Fatti, prezzi e orari sono quelli del sito attuale (nivishotel.it); il ritmo delle sezioni segue il reference
atlantis.com/dubai/atlantis-the-royal (solo studio di struttura: non è incluso alcun asset di Atlantis).
Stessa architettura del progetto `Sito Hotel` (Belfiore): template unico + JSON per lingua + build PowerShell.

## Struttura

```
src/template.html        template unico con segnaposto {{chiave}} e [[IMG ...]]
src/lang/*.json          testi in it / en / de (stesse chiavi)
src/assets/css/          00-base.css (griglia, header, menu, carosello, modulo) + 10-nivis.css (componenti Nivis)
src/assets/main.js       header, menu, pannelli a scorrimento, neve, carosello, mappa, modulo
src/assets/img/          qui vanno le foto (vedi sotto)
build.ps1                genera site/ (IT in radice, /en/, /de/) + robots.txt + sitemap.xml
serve.ps1                anteprima locale su http://localhost:5175/
```

## Comandi (Windows PowerShell)

```powershell
# genera il sito
powershell -ExecutionPolicy Bypass -File build.ps1

# anteprima locale
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 5175
```

Parametri di `build.ps1`: `-Site` (URL finale per canonical, hreflang, sitemap), `-Booking` (motore di prenotazione), `-NoIndex` (anteprime).

## Foto e video

Ogni foto è un segnaposto nel template. Se in `src/assets/img/` esiste un file con il nome giusto
(`.jpg`, `.jpeg`, `.webp`, `.avif` o `.png`) la build usa la foto, altrimenti mostra un placeholder illustrato con l'etichetta
`FOTO · nome`. Per sostituire un placeholder: salva la foto con quel nome e rilancia la build.

| Nome | Dove | Formato consigliato |
|---|---|---|
| `hero` | Hero a tutto schermo (e anteprima social Open Graph) | 1920×1080 o più, orizzontale, inverno/tramonto |
| `story1` … `story6` | Pannelli a scorrimento: Adults Only, natura, spa, cucina, piste, esperienze | 1920×1080, soggetto al centro (il testo è centrato) |
| `stay` | Banner "Camere & Suite" | 1920×1000 |
| `room1` … `room4` | Card camere: Classic/Superior, Junior Suite/Prestige, Nivis/Alpin, Traditional | quadrata, 1200×1200 |
| `spot1` … `spot6` | Carosello: Early Booking, pet friendly, Natale, Tovel, San Romedio, Mendola | quadrata, 1000×1000 |
| `fin` | Sfondo della chiusura | 1920×1080 |

Pesi consigliati: hero e pannelli sotto i 400 KB, card sotto i 150 KB (WebP o AVIF).

### Stato attuale: foto prese dal sito nivishotel.it

Tutti i 19 slot usano foto del sito attuale dell'hotel, ridimensionate (max 2200 px per l'hero, 1920 per i pannelli, 1000 per le card)
e ricompresse in JPEG qualità 82. File originali (in `wp-content/uploads/` del sito attuale):

| Slot | Originale |
|---|---|
| `hero` | `2024/12/Nivis_hotel_1-scaled.jpg` |
| `story1` | `2026/08/Adults-only_V1.jpg` |
| `story2` | `2024/11/Nivis_Hotel_Esterno-21.jpg` |
| `story3` | `2024/11/nivis_piscina-6-2.jpg` |
| `story4` | `2026/03/nivis_ristorante-15.jpg` |
| `story5` | `2024/11/skier-is-going-down-mountain-with-mountain-him.jpg` (stock) |
| `story6` | `2024/11/passo-mendola-tornanti.jpg` (ritagliata: tolto il 15% inferiore, c'era il credito del fotografo) |
| `stay` | `2024/11/nivis_camere_suite-23.jpg` |
| `room1` … `room4` | `nivis_Matrimoniale-Superior_1`, `nivis_Suite-prestige_1`, `nivis_Suite-Nivis_1`, `nivis_Suite-traditional_1` (tutte `2024/11/`) |
| `spot1` | `2024/11/nivis_camere_suite-59.jpg` |
| `spot2` | `2024/11/dog-lifestyle-care-with-owner.jpg` (stock) |
| `spot3` | `2024/11/mercatini-natale-bolzano.jpg` (terzi) |
| `spot4` | `2024/11/Lago-di-Tovel-Trentino.jpg` (terzi) |
| `spot5` | `2024/11/San-romedio.jpg` (terzi) |
| `spot6` | `2024/11/passo-mendola.jpg` (terzi) |
| `fin` | `2024/12/Nivis_Hotel_Esterno-8.jpg` |

Da sapere prima del go-live:
- Le foto del sito attuale sono quasi tutte **autunnali**: l'hotel non ha scatti con la neve (l'unica foto invernale è la stock dello sciatore).
  Il titolo dell'hero parla di inverno, quindi conviene un servizio invernale. Basta salvare i nuovi file con gli stessi nomi.
- Le foto marcate "stock" o "terzi" sono verosimilmente su licenza: verificare con l'hotel che si possano riusare sul sito nuovo, oppure sostituirle.
- I testi alternativi (`*_alt` nei JSON) descrivono queste foto: se le sostituisci, aggiornali.

## Cosa fa la pagina

- CTA primaria: prenotazione diretta sul motore SimpleBooking dell'hotel (`hotel/10212`), lingua passata in automatico (`lang=IT|EN|DE`).
- CTA secondaria: modulo "proposta su misura" (apre il programma di posta con la richiesta compilata).
- Eventi su `dataLayer` (GTM/GA4 compatibile, nessuno script esterno): `booking_click`, `cta_click`, `generate_lead`.
- Dati strutturati `Hotel` e `FAQPage`, hreflang IT/EN/DE, sitemap con alternate.
- Nessun cookie, nessun tracker. La mappa OpenStreetMap si carica solo dopo il clic (nessuna connessione a terzi prima).
- Accessibilità: contrasti WCAG AA misurati (vedi `00-base.css`), focus visibile, menu e pannello con trap del focus,
  gerarchia titoli h1 → h2 → h3, `prefers-reduced-motion` (niente neve né animazioni).

## Prima del go-live

- **Foto**: oggi sono quelle del sito attuale (vedi "Stato attuale"); servono scatti invernali e la verifica delle licenze. Nessun video.
- **Date precompilate nel motore di prenotazione**: SimpleBooking è una SPA e non espone le date nell'URL.
  Oggi i pulsanti aprono il motore con la lingua; per avere una booking bar con date e ospiti serve il formato del deep link (chiederlo a SimpleBooking).
- **Font**: Cormorant Garamond e Jost sono caricati da Google Fonts. Per il pubblico tedesco conviene servirli dal proprio dominio (GDPR): scaricare i `.woff2` e sostituire il `<link>` nel template con `@font-face`.
- **Modulo**: oggi apre il programma di posta con `mailto:`. Per un invio vero serve un endpoint (es. Formspree).
- **Dominio**: cambiare `-Site` in `build.ps1` e togliere `-NoIndex` dalle anteprime.
- **Recensioni**: lo slot è predisposto nel template (commento "Slot recensioni"). Inserire solo recensioni reali con nome, provenienza, data e fonte.
- **Privacy e cookie policy**: i link puntano alle pagine del sito attuale (nivishotel.it).
- **Testi da far confermare all'hotel**: vedi elenco qui sotto.

### Affermazioni da confermare con l'hotel

1. Cosa è davvero incluso in ogni soggiorno diretto: colazione a buffet, accesso alla spa/piscina, navetta, Wi-Fi (sezione "Cosa include" e CTA finale).
2. Età minima: il sito attuale dice "dai 13-14 anni"; la pagina riporta la stessa formula (FAQ 2).
3. Capienza della Suite Nivis (nella tabella è "–": il sito attuale non la indica).
4. Prezzi "a partire da" (card e tabella): presi dal sito attuale, possono essere cambiati.
5. Early Booking −10% (soggiorni da 3 notti): offerta del sito attuale, verificarne la validità e le condizioni.
6. "Risponde la famiglia che gestisce l'hotel" (gestione familiare dal sito attuale).
7. CIN e indirizzo in footer (presi dal sito attuale).
