import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "./components/AppHeader";
import ExportStep from "./components/ExportStep";
import FloorEditorStep from "./components/FloorEditorStep";
import SetupStep from "./components/SetupStep";
import { CANVAS_H, CANVAS_W, CAT_MAP, ROOM_TYPES } from "./constants/editor";
import { createBuilding, createItemFromCategory, createLevel, createPastedItem } from "./state/factories";
import { alignRectToItems, clampRectToCanvas, snapValue } from "./utils/editorMath";
import { createHistoryState, commitFromSnapshot, redoHistory, undoHistory, updateHistoryPresent } from "./utils/history";
import { generateImdfFiles } from "./utils/imdfExport";
import { buildZip } from "./utils/zip";

function isEditableTarget(target) {
  if (!target) {
    return false;
  }
  const tagName = target.tagName;
  return (
    ["INPUT", "SELECT", "TEXTAREA"].includes(tagName) ||
    Boolean(target.isContentEditable)
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidLatitude(value) {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) && num >= -90 && num <= 90;
}

function isValidLongitude(value) {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) && num >= -180 && num <= 180;
}

function getBuildingReadiness(building) {
  const hasName = isNonEmptyString(building?.name);
  const hasValidLat = isValidLatitude(building?.lat);
  const hasValidLng = isValidLongitude(building?.lng);
  const levels = Array.isArray(building?.levels) ? building.levels : [];
  const hasLevels = levels.length > 0;
  const missingFloorNameIndexes = levels
    .map((level, idx) => (isNonEmptyString(level?.name) ? -1 : idx))
    .filter((idx) => idx >= 0);
  const hasFloorNames = missingFloorNameIndexes.length === 0;
  const roomCount = levels.reduce(
    (sum, level) => sum + (Array.isArray(level.items) ? level.items.length : 0),
    0
  );

  const setupMissing = [];
  if (!hasName) setupMissing.push("building name");
  if (!hasValidLat) setupMissing.push("valid latitude");
  if (!hasValidLng) setupMissing.push("valid longitude");
  if (!hasLevels) setupMissing.push("at least one floor");
  if (hasLevels && !hasFloorNames) setupMissing.push("floor names");

  const setupReady = setupMissing.length === 0;
  const exportMissing = [...setupMissing];
  if (roomCount === 0) {
    exportMissing.push("at least one room on any floor");
  }

  return {
    hasName,
    hasValidLat,
    hasValidLng,
    hasLevels,
    hasFloorNames,
    missingFloorNameIndexes,
    roomCount,
    setupReady,
    exportReady: exportMissing.length === 0,
    setupMissing,
    exportMissing,
  };
}

export default function IMDFBuilder() {
  const [history, setHistory] = useState(() => createHistoryState([createBuilding()]));
  const [bi, setBi] = useState(0);
  const [li, setLi] = useState(0);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [clipboardItem, setClipboardItem] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);

  const canvasRef = useRef(null);
  const gestureSnapshotRef = useRef(null);

  const buildings = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const bldg = buildings[bi] || buildings[0];
  const levels = bldg?.levels || [];
  const level = levels[li];
  const items = level?.items || [];
  const selectedItem = items.find((item) => item.id === selected) || null;

  const totalItems = useMemo(
    () =>
      buildings.reduce(
        (buildingTotal, building) =>
          buildingTotal + building.levels.reduce((levelTotal, lv) => levelTotal + lv.items.length, 0),
        0
      ),
    [buildings]
  );
  const readinessByBuilding = useMemo(
    () => buildings.map((building) => getBuildingReadiness(building)),
    [buildings]
  );
  const activeBuildingReadiness = readinessByBuilding[bi] || {
    setupReady: false,
    exportReady: false,
    setupMissing: [],
    exportMissing: [],
    missingFloorNameIndexes: [],
    roomCount: 0,
    hasName: false,
    hasValidLat: false,
    hasValidLng: false,
  };
  const setupReadyCount = useMemo(
    () => readinessByBuilding.filter((readiness) => readiness.setupReady).length,
    [readinessByBuilding]
  );
  const exportReadyCount = useMemo(
    () => readinessByBuilding.filter((readiness) => readiness.exportReady).length,
    [readinessByBuilding]
  );

  const applyBuildingsUpdate = useCallback((updater, options = {}) => {
    setHistory((prevHistory) => {
      const nextPresent =
        typeof updater === "function" ? updater(prevHistory.present) : updater;
      return updateHistoryPresent(prevHistory, nextPresent, options);
    });
  }, []);

  const setActiveItems = useCallback(
    (updater, options = {}) => {
      applyBuildingsUpdate(
        (prevBuildings) =>
          prevBuildings.map((building, buildingIndex) => {
            if (buildingIndex !== bi) {
              return building;
            }
            return {
              ...building,
              levels: building.levels.map((lv, levelIndex) => {
                if (levelIndex !== li) {
                  return lv;
                }
                return {
                  ...lv,
                  items: typeof updater === "function" ? updater(lv.items) : updater,
                };
              }),
            };
          }),
        options
      );
    },
    [applyBuildingsUpdate, bi, li]
  );

  const updateItem = useCallback(
    (id, patch, options = {}) => {
      setActiveItems(
        (prevItems) => prevItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        { label: "Update room", ...options }
      );
    },
    [setActiveItems]
  );

  const deleteItem = useCallback(
    (id, label = "Delete room") => {
      setActiveItems((prevItems) => prevItems.filter((item) => item.id !== id), { label });
      if (selected === id) {
        setSelected(null);
      }
    },
    [selected, setActiveItems]
  );

  const selectBuilding = useCallback((nextBuildingIndex) => {
    setBi(nextBuildingIndex);
    setLi(0);
    setSelected(null);
    setAlignmentGuides([]);
  }, []);

  const selectLevel = useCallback((nextLevelIndex) => {
    setLi(nextLevelIndex);
    setSelected(null);
    setAlignmentGuides([]);
  }, []);

  const addBuilding = useCallback(() => {
    applyBuildingsUpdate((prevBuildings) => [...prevBuildings, createBuilding()], {
      label: "Add building",
    });
    setBi(buildings.length);
    setLi(0);
    setSelected(null);
    setAlignmentGuides([]);
  }, [applyBuildingsUpdate, buildings.length]);

  const deleteBuilding = useCallback(
    (buildingIndex) => {
      if (buildings.length <= 1) {
        return;
      }
      applyBuildingsUpdate(
        (prevBuildings) => prevBuildings.filter((_, idx) => idx !== buildingIndex),
        { label: "Delete building" }
      );
      setBi((prevBi) => {
        if (prevBi > buildingIndex) {
          return prevBi - 1;
        }
        if (prevBi === buildingIndex) {
          return Math.max(0, prevBi - 1);
        }
        return prevBi;
      });
      setLi(0);
      setSelected(null);
      setAlignmentGuides([]);
    },
    [applyBuildingsUpdate, buildings.length]
  );

  const updateBuilding = useCallback(
    (buildingIndex, patch) => {
      applyBuildingsUpdate(
        (prevBuildings) =>
          prevBuildings.map((building, idx) =>
            idx === buildingIndex ? { ...building, ...patch } : building
          ),
        { label: "Update building" }
      );
    },
    [applyBuildingsUpdate]
  );

  const addLevel = useCallback(
    (buildingIndex) => {
      applyBuildingsUpdate(
        (prevBuildings) =>
          prevBuildings.map((building, idx) => {
            if (idx !== buildingIndex) {
              return building;
            }
            return {
              ...building,
              levels: [...building.levels, createLevel(building.levels.length + 1, building.levels.length)],
            };
          }),
        { label: "Add floor" }
      );
    },
    [applyBuildingsUpdate]
  );

  const updateLevel = useCallback(
    (buildingIndex, levelIndex, patch) => {
      applyBuildingsUpdate(
        (prevBuildings) =>
          prevBuildings.map((building, idx) => {
            if (idx !== buildingIndex) {
              return building;
            }
            return {
              ...building,
              levels: building.levels.map((lv, lvIndex) =>
                lvIndex === levelIndex ? { ...lv, ...patch } : lv
              ),
            };
          }),
        { label: "Update floor" }
      );
    },
    [applyBuildingsUpdate]
  );

  const deleteLevel = useCallback(
    (buildingIndex, levelIndex) => {
      const targetBuilding = buildings[buildingIndex];
      if (!targetBuilding || targetBuilding.levels.length <= 1) {
        return;
      }
      applyBuildingsUpdate(
        (prevBuildings) =>
          prevBuildings.map((building, idx) => {
            if (idx !== buildingIndex) {
              return building;
            }
            return {
              ...building,
              levels: building.levels.filter((_, lvIndex) => lvIndex !== levelIndex),
            };
          }),
        { label: "Delete floor" }
      );
      if (buildingIndex === bi) {
        setLi((prevLi) => {
          if (prevLi > levelIndex) {
            return prevLi - 1;
          }
          if (prevLi === levelIndex) {
            return Math.max(0, prevLi - 1);
          }
          return prevLi;
        });
      }
      setSelected(null);
    },
    [applyBuildingsUpdate, bi, buildings]
  );

  const onCanvasMouseDown = useCallback(
    (e) => {
      if (e.target === canvasRef.current) {
        setSelected(null);
      }
    },
    [setSelected]
  );

  const onItemMouseDown = useCallback(
    (e, item) => {
      e.stopPropagation();
      setSelected(item.id);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      gestureSnapshotRef.current = buildings;
      setDragging({
        id: item.id,
        offX: e.clientX - rect.left - item.x,
        offY: e.clientY - rect.top - item.y,
      });
      setAlignmentGuides([]);
    },
    [buildings]
  );

  const onResizeMouseDown = useCallback(
    (e, item, handle) => {
      e.stopPropagation();
      setSelected(item.id);
      gestureSnapshotRef.current = buildings;
      setResizing({
        id: item.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: item.w,
        startH: item.h,
        startItemX: item.x,
        startItemY: item.y,
      });
      setAlignmentGuides([]);
    },
    [buildings]
  );

  const onPaletteDragStart = useCallback((_, cat) => {
    const roomType = CAT_MAP[cat];
    setDragging({
      fromPalette: true,
      cat,
      offX: roomType.w / 2,
      offY: roomType.h / 2,
    });
    setAlignmentGuides([]);
  }, []);

  const onMouseMove = useCallback(
    (e) => {
      if (dragging?.id) {
        const item = items.find((currentItem) => currentItem.id === dragging.id);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!item || !rect) {
          return;
        }

        const candidate = {
          x: e.clientX - rect.left - dragging.offX,
          y: e.clientY - rect.top - dragging.offY,
          w: item.w,
          h: item.h,
        };
        if (snapEnabled) {
          candidate.x = snapValue(candidate.x);
          candidate.y = snapValue(candidate.y);
        }
        const alignment = alignRectToItems({
          rect: candidate,
          items,
          activeItemId: dragging.id,
          canvasW: CANVAS_W,
          canvasH: CANVAS_H,
        });
        const nextRect = clampRectToCanvas(alignment.rect, CANVAS_W, CANVAS_H);
        setAlignmentGuides(alignment.guides);
        updateItem(
          dragging.id,
          {
            x: nextRect.x,
            y: nextRect.y,
          },
          { record: false }
        );
      } else if (resizing) {
        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;
        const handle = resizing.handle;
        let nextRect = {
          x: resizing.startItemX,
          y: resizing.startItemY,
          w: resizing.startW,
          h: resizing.startH,
        };

        if (handle.includes("e")) {
          nextRect.w = resizing.startW + dx;
        }
        if (handle.includes("w")) {
          nextRect.w = resizing.startW - dx;
          nextRect.x = resizing.startItemX + dx;
        }
        if (handle.includes("s")) {
          nextRect.h = resizing.startH + dy;
        }
        if (handle.includes("n")) {
          nextRect.h = resizing.startH - dy;
          nextRect.y = resizing.startItemY + dy;
        }

        if (snapEnabled) {
          nextRect.w = snapValue(nextRect.w);
          nextRect.h = snapValue(nextRect.h);
          if (handle.includes("w")) {
            nextRect.x = snapValue(nextRect.x);
          }
          if (handle.includes("n")) {
            nextRect.y = snapValue(nextRect.y);
          }
        }

        nextRect = clampRectToCanvas(nextRect, CANVAS_W, CANVAS_H);
        setAlignmentGuides([]);
        updateItem(
          resizing.id,
          {
            x: nextRect.x,
            y: nextRect.y,
            w: nextRect.w,
            h: nextRect.h,
          },
          { record: false }
        );
      }
    },
    [dragging, items, resizing, snapEnabled, updateItem]
  );

  const onMouseUp = useCallback(
    (e) => {
      if (dragging?.fromPalette) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const itemX = e.clientX - rect.left - dragging.offX;
          const itemY = e.clientY - rect.top - dragging.offY;
          if (itemX >= -50 && itemX <= CANVAS_W + 50 && itemY >= -50 && itemY <= CANVAS_H + 50) {
            let nextItem = createItemFromCategory(dragging.cat, itemX, itemY);
            if (snapEnabled) {
              nextItem = {
                ...nextItem,
                x: snapValue(nextItem.x),
                y: snapValue(nextItem.y),
              };
            }
            const clampedRect = clampRectToCanvas(
              { x: nextItem.x, y: nextItem.y, w: nextItem.w, h: nextItem.h },
              CANVAS_W,
              CANVAS_H
            );
            nextItem = {
              ...nextItem,
              x: clampedRect.x,
              y: clampedRect.y,
              w: clampedRect.w,
              h: clampedRect.h,
            };
            setActiveItems((prevItems) => [...prevItems, nextItem], {
              label: `Add ${CAT_MAP[nextItem.cat]?.label || "room"}`,
            });
            setSelected(nextItem.id);
          }
        }
      } else if ((dragging || resizing) && gestureSnapshotRef.current) {
        const label = dragging ? "Move room" : "Resize room";
        setHistory((prevHistory) =>
          commitFromSnapshot(prevHistory, gestureSnapshotRef.current, { label })
        );
      }

      gestureSnapshotRef.current = null;
      setDragging(null);
      setResizing(null);
      setAlignmentGuides([]);
    },
    [dragging, resizing, setActiveItems, snapEnabled]
  );

  const pasteClipboardItem = useCallback(() => {
    if (!clipboardItem || !level) {
      return;
    }
    const baseX = selectedItem ? selectedItem.x + 20 : clipboardItem.x + 20;
    const baseY = selectedItem ? selectedItem.y + 20 : clipboardItem.y + 20;
    let rect = {
      x: baseX,
      y: baseY,
      w: clipboardItem.w,
      h: clipboardItem.h,
    };
    if (snapEnabled) {
      rect = {
        ...rect,
        x: snapValue(rect.x),
        y: snapValue(rect.y),
      };
    }
    rect = clampRectToCanvas(rect, CANVAS_W, CANVAS_H);

    const pasted = createPastedItem(clipboardItem, rect.x, rect.y);
    pasted.w = rect.w;
    pasted.h = rect.h;
    setActiveItems((prevItems) => [...prevItems, pasted], { label: "Paste room" });
    setSelected(pasted.id);
  }, [clipboardItem, level, selectedItem, setActiveItems, snapEnabled]);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }
    return undefined;
  }, [dragging, resizing, onMouseMove, onMouseUp]);

  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();
      const isMod = e.ctrlKey || e.metaKey;
      const editable = isEditableTarget(e.target);

      if (isMod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          setHistory((prevHistory) => redoHistory(prevHistory));
        } else {
          setHistory((prevHistory) => undoHistory(prevHistory));
        }
        setAlignmentGuides([]);
        return;
      }
      if (isMod && key === "y") {
        e.preventDefault();
        setHistory((prevHistory) => redoHistory(prevHistory));
        setAlignmentGuides([]);
        return;
      }

      if (step !== 1) {
        return;
      }

      if (editable) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        deleteItem(selected);
        return;
      }

      if (key === "g" && !isMod) {
        e.preventDefault();
        setSnapEnabled((prev) => !prev);
        return;
      }

      if (isMod && key === "c" && selectedItem) {
        e.preventDefault();
        setClipboardItem({ ...selectedItem });
        return;
      }

      if (isMod && key === "v" && clipboardItem) {
        e.preventDefault();
        pasteClipboardItem();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clipboardItem, deleteItem, pasteClipboardItem, selected, selectedItem, step]);

  useEffect(() => {
    if (bi >= buildings.length) {
      setBi(Math.max(0, buildings.length - 1));
    }
  }, [bi, buildings.length]);

  useEffect(() => {
    const levelCount = buildings[bi]?.levels.length || 0;
    if (li >= levelCount) {
      setLi(Math.max(0, levelCount - 1));
    }
  }, [bi, buildings, li]);

  useEffect(() => {
    if (selected && !items.some((item) => item.id === selected)) {
      setSelected(null);
    }
  }, [items, selected]);

  const exportBuilding = useCallback((building) => {
    const files = generateImdfFiles(building);
    try {
      const zipData = buildZip(files);
      const blob = new Blob([zipData], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(building.name || "building").replace(/\s+/g, "_")}_IMDF.zip`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 2000);
      setExportStatus(`✓ Downloaded ${anchor.download}`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      if (typeof sendPrompt === "function") {
        const payload = JSON.stringify({
          buildingName: building.name || "building",
          files: files.map((file) => ({ name: file.name, content: file.content })),
        });
        sendPrompt(`Please create an IMDF ZIP file from this data:\n\`\`\`json\n${payload}\n\`\`\``);
      } else {
        const combined = {};
        files.forEach((file) => {
          combined[file.name] = JSON.parse(file.content);
        });
        const blob = new Blob([JSON.stringify(combined, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    }
  }, []);

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
        background: "#0c0c14",
        color: "#e2e8f0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      <AppHeader step={step} setStep={setStep} exportStatus={exportStatus} />

      {step === 0 && (
        <SetupStep
          buildings={buildings}
          readinessByBuilding={readinessByBuilding}
          activeBuildingReadiness={activeBuildingReadiness}
          setupReadyCount={setupReadyCount}
          activeBuildingIndex={bi}
          onSelectBuilding={selectBuilding}
          onDeleteBuilding={deleteBuilding}
          onAddBuilding={addBuilding}
          onUpdateBuilding={updateBuilding}
          onAddLevel={addLevel}
          onUpdateLevel={updateLevel}
          onDeleteLevel={deleteLevel}
          onOpenEditor={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <FloorEditorStep
          buildings={buildings}
          bi={bi}
          li={li}
          levels={levels}
          items={items}
          selected={selected}
          selectedItem={selectedItem}
          roomTypes={ROOM_TYPES}
          catMap={CAT_MAP}
          canvasRef={canvasRef}
          alignmentGuides={alignmentGuides}
          isPaletteDragging={Boolean(dragging?.fromPalette)}
          snapEnabled={snapEnabled}
          canUndo={canUndo}
          canRedo={canRedo}
          historyActions={history.actions}
          onUndo={() => {
            setHistory((prevHistory) => undoHistory(prevHistory));
            setAlignmentGuides([]);
          }}
          onRedo={() => {
            setHistory((prevHistory) => redoHistory(prevHistory));
            setAlignmentGuides([]);
          }}
          onToggleSnap={() => setSnapEnabled((prev) => !prev)}
          onSelectBuilding={selectBuilding}
          onSelectLevel={selectLevel}
          onPaletteDragStart={onPaletteDragStart}
          onCanvasMouseDown={onCanvasMouseDown}
          onItemMouseDown={onItemMouseDown}
          onResizeMouseDown={onResizeMouseDown}
          onDeleteSelected={() => setSelected(null)}
          onUpdateItem={(id, patch) => updateItem(id, patch, { label: "Edit room properties" })}
          onDeleteItem={deleteItem}
        />
      )}

      {step === 2 && (
        <ExportStep
          buildings={buildings}
          readinessByBuilding={readinessByBuilding}
          exportReadyCount={exportReadyCount}
          totalItems={totalItems}
          onExportBuilding={exportBuilding}
          onBackToEditor={() => setStep(1)}
        />
      )}
    </div>
  );
}
