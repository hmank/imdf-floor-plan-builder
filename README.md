# IMDF Floor Plan Builder

A free, open-source drag-and-drop floor plan builder that generates [IMDF](https://register.apple.com/resources/imdf/) ZIP packages for **Microsoft Places** — no expensive third-party tools needed.

## Features

- Drag & drop rooms (office, workspace, restroom, kitchen, walkway, stairs, elevator, etc.) onto a visual canvas
- Resize and reposition rooms with handles
- Snap-to-grid placement and resize behavior
- Auto-alignment guides to line up room edges/centers
- Undo/redo with action history
- Copy/paste selected rooms with keyboard shortcuts
- Room dimensions editable in meters with live pixel preview
- Auto-trace a floor-plan image: detects every enclosed room and the wall blueprint in one click
- Multi-building and multi-floor support
- Exports valid IMDF ZIP files containing all 5 required GeoJSON files
- Setup checklist and export-readiness status to guide publish flow
- Optional configuration upload for local/self-hosted deployments
- Converts canvas positions to real geographic coordinates
- Zero backend — runs entirely in the browser

## Quick Start (Local)

```bash
git clone https://github.com/hmank/imdf-floor-plan-builder.git
cd imdf-floor-plan-builder
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to GitHub Pages (Step-by-Step)

### 1. Create the GitHub repo

Go to https://github.com/new and create a new repository named `imdf-floor-plan-builder`. Do **not** initialize with a README (you already have one).

### 2. Push the code

```bash
cd imdf-floor-plan-builder
git init
git add .
git commit -m "Initial commit - IMDF Floor Plan Builder"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/imdf-floor-plan-builder.git
git push -u origin main
```

### 3. Update the base path

Open `vite.config.js` and make sure the `base` matches your repo name:

```js
base: '/imdf-floor-plan-builder/',
```

If your repo has a different name, change this to match. For example if your repo is `my-imdf-tool`, use `'/my-imdf-tool/'`.

### 4. Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select **GitHub Actions**
4. That's it — the included workflow file (`.github/workflows/deploy.yml`) handles the rest

### 5. Trigger the deploy

The deploy runs automatically on every push to `main`. Your first push in step 2 should have already triggered it.

Check the deploy status at: `https://github.com/YOUR_USERNAME/imdf-floor-plan-builder/actions`

### 6. Access your live site

Once the deploy completes (usually 1-2 minutes), your app is live at:

```
https://YOUR_USERNAME.github.io/imdf-floor-plan-builder/
```

Share this URL with anyone who needs to create IMDF files.

## How to Use the App

### Step 1: Setup
- Enter building name, latitude/longitude (right-click Google Maps to copy), and category
- Add floors with names and ordinal numbers (0 = ground, 1 = 2nd floor, -1 = basement)
- Ordinals must match the `SortOrder` value configured in Microsoft Places
- Follow the built-in **Publish checklist** and resolve any **Needs Input** badges
- Optional: use **Upload Configuration (JSON)** to load a saved layout (disabled on GitHub Pages)

### Step 2: Floor Editor
- **Drag** room types from the left palette onto the canvas, **or**
- Click **🪄 Auto-Trace from Image** and pick a floor-plan image — the app detects every enclosed room and shows them as green outlines over the traced walls
- Click **+ Add Detected Rooms** to turn every outline into an editable room in one step. The green overlay disappears and the wall blueprint (outer + interior walls) stays behind as a guide
- **Click** a room to select it
- **Drag** a selected room to reposition it
- **Drag the handles** on edges/corners to resize
- **Snap to grid** is enabled by default (toggle with **G**)
- **Alignment guides** appear while dragging near other rooms
- **Press Delete/Backspace** key or click the 🗑 button to remove
- **Undo / Redo** with toolbar buttons or keyboard shortcuts
- **Copy / Paste** selected rooms with keyboard shortcuts
- Edit name, type, and dimensions in the right properties panel
- Enter **Width (m)** and **Length (m)** directly; corresponding pixel values are shown in brackets
- Switch floors with the tabs at the top
- When ready, click **Ready? Open Export Tab →** (or the Export tab in the header)

#### How Auto-Trace works
- Every pixel is classified as wall / not-wall using an adaptive threshold; colored room fills are ignored so they never count as walls
- Doorways and anti-aliasing breaks are sealed automatically (the closing radius is swept 1–12 px and the best pass wins)
- Every enclosed region becomes a room; hallways, the exterior, and regions that swallow other rooms are filtered out
- Rooms with a colored fill in the source image are typed **Room**; plain ones are typed **Office** — change types afterwards in the properties panel
- Rooms are named `Room 1…N` in reading order (top-to-bottom, left-to-right); rename as needed

#### Auto-Trace tips
- Crop the image tightly to the floor plan (no toolbars or sidebars) for the cleanest result
- Higher-resolution source images give tighter room boundaries
- Trace overlays are per-floor and non-destructive: click **Clear** and re-run any time
- Auto-trace creates a starting layout; review names, types and sizes before export

#### Testing the tracer on your own image (dev)
```bash
npx vite-node scripts/trace-harness.mjs plan.png
npx vite-node scripts/trace-harness.mjs plan.png 120,80,900,600 debug.png   # optional crop x,y,w,h + debug PNG
```
The harness prints the room count and writes a debug PNG (walls in black, detected rooms in green).

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Shift+Z` or `Ctrl+Y` | `Cmd+Shift+Z` |
| Copy selected room | `Ctrl+C` | `Cmd+C` |
| Paste room | `Ctrl+V` | `Cmd+V` |
| Toggle grid snap | `G` | `G` |
| Delete selected room | `Delete` / `Backspace` | `Delete` / `Backspace` |

### Step 3: Export
- Click **Download ZIP** for each building
- Buildings must be export-ready (required setup complete + at least one room)
- Use **Export All Ready Buildings** to download all valid configurations
- Each ZIP contains: `building.geojson`, `footprint.geojson`, `level.geojson`, `unit.geojson`, `fixture.geojson`

### Step 4: Import into Microsoft Places

```powershell
# Install and connect
Install-Module -Name MicrosoftPlaces -AllowPrerelease -Force
Connect-MicrosoftPlaces

# Find your building PlaceId
Get-PlaceV3 -Type Building | Where-Object {$_.DisplayName -eq 'Your Building'} | ft DisplayName,PlaceId

# Generate correlation CSV from your IMDF zip
Import-MapCorrelations -MapFilePath "C:\path\to\Your_Building_IMDF.zip"

# Edit the generated mapfeatures.csv:
#   - Match each room/floor to its PlaceId from Microsoft Places
#   - Save the file

# Create the correlated IMDF package
Import-MapCorrelations -MapFilePath "C:\path\to\Your_Building_IMDF.zip" -CorrelationsFilePath "C:\path\to\mapfeatures.csv"

# Upload to Microsoft Places
New-Map -BuildingId <BuildingPlaceId> -FilePath "C:\path\to\imdf_correlated.zip"
```

Maps may take up to 1 hour to appear.

## Project Structure

```
imdf-floor-plan-builder/
├── .github/
│   └── workflows/
│       └── deploy.yml        ← Auto-deploys to GitHub Pages
├── scripts/
│   └── trace-harness.mjs     ← Dev tool: run the tracer on a PNG from the CLI
├── src/
│   ├── components/
│   │   ├── AppHeader.jsx
│   │   ├── ExportStep.jsx
│   │   ├── FloorEditorStep.jsx
│   │   └── SetupStep.jsx
│   ├── constants/
│   │   └── editor.js
│   ├── state/
│   │   └── factories.js
│   ├── styles/
│   │   └── ui.js
│   ├── utils/
│   │   ├── autoTrace.js
│   │   ├── editorMath.js
│   │   ├── geo.js
│   │   ├── history.js
│   │   ├── imdfExport.js
│   │   ├── uid.js
│   │   └── zip.js
│   ├── IMDFBuilder.jsx       ← App orchestrator
│   └── main.jsx              ← React entry point
├── index.html
├── package.json
├── vite.config.js
├── LICENSE
└── README.md
```

## Configuration

| Setting | File | Default | Purpose |
|---------|------|---------|---------|
| `base` | `vite.config.js` | `/imdf-floor-plan-builder/` | Must match your GitHub repo name |
| `CANVAS_W` | `src/constants/editor.js` | `800` | Canvas width in pixels |
| `CANVAS_H` | `src/constants/editor.js` | `600` | Canvas height in pixels |
| `METERS_PER_PX` | `src/constants/editor.js` | `0.1` | Scale: 1 pixel = 0.1 meters |
| `GRID_SIZE` | `src/constants/editor.js` | `20` | Snap/grid spacing in pixels |
| `TRACE_MIN_ROOM_SIZE_PX` | `src/constants/editor.js` | `14` | Smallest width/height (px) an enclosed region needs to become a room |
| `TRACE_MAX_ROOM_SUGGESTIONS` | `src/constants/editor.js` | `250` | Maximum rooms added from one trace |

For larger buildings, increase `CANVAS_W`/`CANVAS_H` or decrease `METERS_PER_PX`.

## Tests

Run unit tests for history, geometry, snap/alignment, and export logic:

```bash
npm run test
```

Run tests in watch mode while developing:

```bash
npm run test:watch
```

## License

MIT

## Contributing

PRs welcome! Current roadmap ideas include configurable auto-trace sensitivity controls, Overpass API footprint fetch, and Microsoft Graph PlaceId integration.
