# IMDF Floor Plan Builder

A free, open-source drag-and-drop floor plan builder that generates [IMDF](https://register.apple.com/resources/imdf/) ZIP packages for **Microsoft Places** — no expensive third-party tools needed.

## Features

- Drag & drop rooms (office, workspace, restroom, kitchen, walkway, stairs, elevator, etc.) onto a visual canvas
- Resize and reposition rooms with handles
- Multi-building and multi-floor support
- Exports valid IMDF ZIP files containing all 5 required GeoJSON files
- Converts canvas positions to real geographic coordinates
- Zero backend — runs entirely in the browser

## Quick Start (Local)

```bash
git clone https://github.com/YOUR_USERNAME/imdf-floor-plan-builder.git
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

### Step 2: Floor Editor
- **Drag** room types from the left palette onto the canvas
- **Click** a room to select it
- **Drag** a selected room to reposition it
- **Drag the handles** on edges/corners to resize
- **Press Delete** key or click the 🗑 button to remove
- Edit name, type, and dimensions in the right properties panel
- Switch floors with the tabs at the top

### Step 3: Export
- Click **Download ZIP** for each building
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
├── public/
├── src/
│   ├── main.jsx              ← React entry point
│   └── IMDFBuilder.jsx       ← Main app (all-in-one component)
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
| `CANVAS_W` | `IMDFBuilder.jsx` | `800` | Canvas width in pixels |
| `CANVAS_H` | `IMDFBuilder.jsx` | `600` | Canvas height in pixels |
| `METERS_PER_PX` | `IMDFBuilder.jsx` | `0.1` | Scale: 1 pixel = 0.1 meters |

For larger buildings, increase `CANVAS_W`/`CANVAS_H` or decrease `METERS_PER_PX`.

## License

MIT

## Contributing

PRs welcome! Ideas: snap-to-grid, copy/paste rooms, undo/redo, floor plan image overlay, Overpass API footprint fetch, Microsoft Graph PlaceId integration.
# imdf-floor-plan-builder
