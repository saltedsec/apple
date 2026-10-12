const BOARD_SIZE = 8;
const GAME_DURATION = 60;
const HIGH_SCORE_KEY = "apple-game-high-score";

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const timerElement = document.querySelector("#timer");
const progressElement = document.querySelector("#time-progress");
const overlayElement = document.querySelector("#board-overlay");
const overlayIconElement = overlayElement.querySelector(".overlay-icon");
const overlayMessageElement = overlayElement.querySelector("p");
const startButton = document.querySelector("#start-button");
const messageElement = document.querySelector("#game-message");
const selectionTotalElement = document.querySelector("#selection-total");
const selectionTargetElement = document.querySelector("#selection-target");
const boardFrameElement = document.querySelector(".board-frame");
const gameShellElement = document.querySelector(".game-shell");

let board = [];
let selectedCells = [];
let score = 0;
let bestScore = loadBestScore();
let timeLeft = GAME_DURATION;
let timerId = null;
let gameActive = false;
let isDragging = false;
let isResolving = false;
let fireworksShown = false;

bestScoreElement.textContent = bestScore.toLocaleString("ko-KR");
createBoard();

function loadBestScore() {
  try {
    const savedScore = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10);
    return Number.isFinite(savedScore) && savedScore >= 0 ? savedScore : 0;
  } catch (error) {
    console.warn("최고 점수를 불러오지 못했습니다.", error);
    return 0;
  }
}

function saveBestScore() {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(bestScore));
  } catch (error) {
    console.warn("최고 점수를 저장하지 못했습니다.", error);
    messageElement.textContent = "최고 점수를 저장할 수 없어요. 브라우저 설정을 확인해주세요.";
  }
}

function createBoard() {
  board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, randomNumber),
  );

  const tiles = document.createDocumentFragment();
  board.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.type = "button";
      tile.dataset.row = String(rowIndex);
      tile.dataset.column = String(columnIndex);
      const number = document.createElement("span");
      number.className = "tile-number";
      number.textContent = String(value);
      tile.append(number);
      tile.setAttribute("aria-label", `행 ${rowIndex + 1}, 열 ${columnIndex + 1}, 숫자 ${value}`);
      tiles.append(tile);
    });
  });
  boardElement.replaceChildren(tiles);
}

function randomNumber() {
  return Math.floor(Math.random() * 9) + 1;
}

function startGame() {
  if (gameActive) return;

  clearInterval(timerId);
  score = 0;
  timeLeft = GAME_DURATION;
  gameActive = true;
  fireworksShown = false;
  scoreElement.textContent = "0";
  updateTimer();
  overlayElement.hidden = true;
  messageElement.textContent = "숫자를 드래그해서 10의 배수를 만들어보세요!";
  updateSelectionMessage();
  createBoard();

  timerId = window.setInterval(() => {
    timeLeft -= 1;
    updateTimer();
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  timerElement.classList.toggle("is-low", timeLeft <= 10);
  progressElement.style.width = `${(timeLeft / GAME_DURATION) * 100}%`;
}

function endGame() {
  gameActive = false;
  isDragging = false;
  clearInterval(timerId);
  clearSelection();
  overlayIconElement.textContent = "⏰";
  overlayMessageElement.innerHTML = `시간 종료!<br />최종 점수 <strong>${score.toLocaleString("ko-KR")}</strong>점`;
  startButton.textContent = "다시 하기";
  overlayElement.hidden = false;
  messageElement.textContent = "수고했어요! 다시 도전해보세요.";
  celebrateScoreMilestone();
}

function celebrateScoreMilestone() {
  if (score <= 100 || fireworksShown) return;
  fireworksShown = true;
  showFireworks();
}

function getTileFromPoint(event) {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  return target instanceof Element ? target.closest(".tile") : null;
}

function getCell(tile) {
  return {
    row: Number(tile.dataset.row),
    column: Number(tile.dataset.column),
    element: tile,
  };
}

function areAdjacent(first, second) {
  return (
    Math.abs(first.row - second.row) <= 1 &&
    Math.abs(first.column - second.column) <= 1 &&
    (first.row !== second.row || first.column !== second.column)
  );
}

function addCell(tile) {
  const cell = getCell(tile);
  const previous = selectedCells.at(-1);
  if (!previous || !areAdjacent(previous, cell)) return;

  const existingIndex = selectedCells.findIndex(
    (selected) => selected.row === cell.row && selected.column === cell.column,
  );
  if (existingIndex !== -1) {
    if (existingIndex === selectedCells.length - 2) {
      selectedCells.pop().element.classList.remove("is-selected");
      updateSelectionMessage();
    }
    return;
  }

  selectedCells.push(cell);
  tile.classList.add("is-selected");
  updateSelectionMessage();
}

function updateSelectionReadout() {
  const total = selectedCells.reduce(
    (sum, cell) => sum + board[cell.row][cell.column],
    0,
  );
  selectionTotalElement.textContent = String(total);
  selectionTargetElement.textContent =
    total > 0 && total % 10 === 0
      ? "10의 배수 달성!"
      : `다음 목표 ${Math.ceil((total + 1) / 10) * 10}`;
}

function updateSelectionMessage() {
  updateSelectionReadout();
  const total = selectedCells.reduce(
    (sum, cell) => sum + board[cell.row][cell.column],
    0,
  );
  messageElement.textContent =
    total > 0 && total % 10 === 0
      ? `${total}! 손을 떼면 점수를 얻어요.`
      : `${selectedCells.length}개 선택 · ${total} / 다음 목표 ${Math.ceil((total + 1) / 10) * 10}`;
}

function clearSelection() {
  selectedCells.forEach((cell) => cell.element.classList.remove("is-selected"));
  selectedCells = [];
  updateSelectionMessage();
}

function showAppleReward(total) {
  const reward = document.createElement("div");
  reward.className = "apple-reward";
  reward.setAttribute("aria-hidden", "true");

  const points = document.createElement("strong");
  points.className = "apple-reward-points";
  points.textContent = `+${total}`;

  const apples = document.createElement("span");
  apples.className = "apple-reward-fruits";
  apples.textContent = "🍎".repeat(total / 10);

  reward.append(points, apples);
  boardFrameElement.append(reward);
  window.setTimeout(() => reward.remove(), 1100);
}

function showConfetti() {
  const colors = ["#ef795f", "#e2b94e", "#78a86b", "#bf83bd", "#70b5bc", "#f08ab3", "#8a8ee8"];
  const confetti = document.createElement("div");
  confetti.className = "confetti";
  confetti.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 150; index += 1) {
    const piece = document.createElement("span");
    const styleIndex = index % 3;
    piece.className = ["confetti-petal", "confetti-ribbon", "confetti-star"][styleIndex];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.setProperty("--fall-duration", `${4.2 + Math.random() * 2.8}s`);
    piece.style.setProperty("--fall-delay", `${Math.random() * 1.8}s`);
    piece.style.setProperty("--fall-drift", `${Math.random() * 300 - 150}px`);
    piece.style.setProperty("--fall-spin", `${Math.random() * 1440 - 720}deg`);
    if (styleIndex === 2) piece.textContent = "✦";
    confetti.append(piece);
  }

  gameShellElement.append(confetti);
  window.setTimeout(() => confetti.remove(), 8500);
}

function showFireworks() {
  const colors = ["#ff5d5d", "#ffd166", "#52d6a1", "#66b8ff", "#d78bff", "#fff2a6"];
  const fireworks = document.createElement("div");
  fireworks.className = "fireworks";
  fireworks.setAttribute("aria-hidden", "true");

  [
    { x: 18, y: 30 },
    { x: 50, y: 20 },
    { x: 82, y: 34 },
    { x: 34, y: 52 },
    { x: 68, y: 48 },
  ].forEach(({ x, y }, burstIndex) => {
    const burst = document.createElement("div");
    burst.className = "firework-burst";
    burst.style.left = `${x}%`;
    burst.style.top = `${y}%`;
    burst.style.setProperty("--burst-delay", `${burstIndex * 0.28}s`);

    for (let index = 0; index < 28; index += 1) {
      const spark = document.createElement("span");
      const angle = (Math.PI * 2 * index) / 28 + Math.random() * 0.12;
      const distance = 55 + Math.random() * 75;
      spark.className = "firework-spark";
      spark.style.backgroundColor = colors[(index + burstIndex) % colors.length];
      spark.style.color = colors[(index + burstIndex) % colors.length];
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      burst.append(spark);
    }

    fireworks.append(burst);
  });

  document.body.append(fireworks);
  window.setTimeout(() => fireworks.remove(), 5000);
}

function applyGravity(clearedCells) {
  const clearedRowsByColumn = new Map();
  clearedCells.forEach(({ row, column }) => {
    if (!clearedRowsByColumn.has(column)) clearedRowsByColumn.set(column, new Set());
    clearedRowsByColumn.get(column).add(row);
  });

  clearedRowsByColumn.forEach((clearedRows, column) => {
    const remainingValues = board
      .map((row, rowIndex) => (clearedRows.has(rowIndex) ? null : row[column]))
      .filter((value) => value !== null);
    const newValues = [
      ...Array.from({ length: BOARD_SIZE - remainingValues.length }, randomNumber),
      ...remainingValues,
    ];

    newValues.forEach((value, row) => {
      board[row][column] = value;
      const tile = boardElement.querySelector(
        `.tile[data-row="${row}"][data-column="${column}"]`,
      );
      tile.querySelector(".tile-number").textContent = String(value);
      tile.setAttribute("aria-label", `행 ${row + 1}, 열 ${column + 1}, 숫자 ${value}`);
      tile.classList.remove("is-clearing");
      tile.classList.add("is-falling");
      tile.addEventListener(
        "animationend",
        () => tile.classList.remove("is-falling"),
        { once: true },
      );
    });
  });
}

function finishSelection() {
  if (!isDragging) return;
  isDragging = false;

  const total = selectedCells.reduce(
    (sum, cell) => sum + board[cell.row][cell.column],
    0,
  );
  if (selectedCells.length > 1 && total > 0 && total % 10 === 0) {
    const clearedCells = [...selectedCells];
    clearedCells.forEach(({ element }) => {
      element.classList.remove("is-selected");
      element.classList.add("is-clearing");
    });
    selectedCells = [];
    isResolving = true;
    score += total;
    scoreElement.textContent = score.toLocaleString("ko-KR");
    messageElement.textContent = `성공! ${total}점을 얻었어요.`;
    showAppleReward(total);
    celebrateScoreMilestone();
    window.setTimeout(() => {
      applyGravity(clearedCells);
      isResolving = false;
      updateSelectionReadout();
    }, 130);
    if (score > bestScore) {
      bestScore = score;
      bestScoreElement.textContent = bestScore.toLocaleString("ko-KR");
      saveBestScore();
      showConfetti();
    }
    return;
  }

  clearSelection();
  messageElement.textContent = "아쉬워요! 합이 10의 배수가 되도록 이어보세요.";
}

boardElement.addEventListener("pointerdown", (event) => {
  const tile = event.target.closest(".tile");
  if (!gameActive || isResolving || !tile) return;

  event.preventDefault();
  isDragging = true;
  clearSelection();
  const cell = getCell(tile);
  selectedCells.push(cell);
  tile.classList.add("is-selected");
  updateSelectionMessage();
});

document.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const tile = getTileFromPoint(event);
  if (tile) addCell(tile);
});

document.addEventListener("pointerup", finishSelection);
document.addEventListener("pointercancel", () => {
  isDragging = false;
  clearSelection();
});

startButton.addEventListener("click", startGame);
