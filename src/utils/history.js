const DEFAULT_HISTORY_LIMIT = 200;
const DEFAULT_ACTION_LIMIT = 30;

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function appendAction(actions, label, actionLimit = DEFAULT_ACTION_LIMIT) {
  return [...actions, { label, at: Date.now() }].slice(-actionLimit);
}

export function createHistoryState(initialPresent) {
  return {
    past: [],
    present: initialPresent,
    future: [],
    actions: [],
  };
}

export function updateHistoryPresent(
  history,
  nextPresent,
  {
    record = true,
    label = "Update",
    historyLimit = DEFAULT_HISTORY_LIMIT,
    actionLimit = DEFAULT_ACTION_LIMIT,
  } = {}
) {
  if (isEqual(nextPresent, history.present)) {
    return history;
  }
  if (!record) {
    return {
      ...history,
      present: nextPresent,
    };
  }

  return {
    past: [...history.past, history.present].slice(-historyLimit),
    present: nextPresent,
    future: [],
    actions: appendAction(history.actions, label, actionLimit),
  };
}

export function commitFromSnapshot(
  history,
  snapshot,
  {
    label = "Update",
    historyLimit = DEFAULT_HISTORY_LIMIT,
    actionLimit = DEFAULT_ACTION_LIMIT,
  } = {}
) {
  if (!snapshot || isEqual(snapshot, history.present)) {
    return history;
  }
  return {
    ...history,
    past: [...history.past, snapshot].slice(-historyLimit),
    future: [],
    actions: appendAction(history.actions, label, actionLimit),
  };
}

export function undoHistory(history, actionLimit = DEFAULT_ACTION_LIMIT) {
  if (history.past.length === 0) {
    return history;
  }
  const previous = history.past[history.past.length - 1];
  const nextPast = history.past.slice(0, -1);
  return {
    past: nextPast,
    present: previous,
    future: [history.present, ...history.future],
    actions: appendAction(history.actions, "Undo", actionLimit),
  };
}

export function redoHistory(history, actionLimit = DEFAULT_ACTION_LIMIT) {
  if (history.future.length === 0) {
    return history;
  }
  const [nextPresent, ...restFuture] = history.future;
  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: restFuture,
    actions: appendAction(history.actions, "Redo", actionLimit),
  };
}
