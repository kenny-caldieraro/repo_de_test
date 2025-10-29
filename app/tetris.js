// Configuration du jeu
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000000', // vide
    '#00f0f0', // I - cyan
    '#f0f000', // O - jaune
    '#a000f0', // T - violet
    '#00f000', // S - vert
    '#f00000', // Z - rouge
    '#0000f0', // J - bleu
    '#f0a000', // L - orange
];

// Définition des formes des pièces (Tetrominos)
const SHAPES = [
    [], // vide
    [[1,1,1,1]], // I
    [[2,2],[2,2]], // O
    [[0,3,0],[3,3,3]], // T
    [[0,4,4],[4,4,0]], // S
    [[5,5,0],[0,5,5]], // Z
    [[6,0,0],[6,6,6]], // J
    [[0,0,7],[7,7,7]], // L
];

// Variables du jeu
let canvas, ctx, nextCanvas, nextCtx;
let grid = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameLoop = null;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = false;
let isGameOver = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextPieceCanvas');
    nextCtx = nextCanvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);

    document.addEventListener('keydown', handleKeyPress);

    initGrid();
    drawGrid();
});

// Initialiser la grille
function initGrid() {
    grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// Créer une nouvelle pièce
function createPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    const shape = SHAPES[type];
    return {
        shape: shape,
        type: type,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}

// Dessiner un bloc
function drawBlock(x, y, color, context = ctx) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    context.lineWidth = 2;
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    // Effet de brillance
    const gradient = context.createLinearGradient(
        x * BLOCK_SIZE,
        y * BLOCK_SIZE,
        x * BLOCK_SIZE + BLOCK_SIZE,
        y * BLOCK_SIZE + BLOCK_SIZE
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    context.fillStyle = gradient;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// Dessiner la grille
function drawGrid() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (grid[row][col] !== 0) {
                drawBlock(col, row, COLORS[grid[row][col]]);
            }
        }
    }

    if (currentPiece) {
        drawPiece(currentPiece);
    }
}

// Dessiner une pièce
function drawPiece(piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(piece.x + x, piece.y + y, COLORS[value]);
            }
        });
    });
}

// Dessiner la pièce suivante
function drawNextPiece() {
    nextCtx.fillStyle = 'white';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;

        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(offsetX + x, offsetY + y, COLORS[value], nextCtx);
                }
            });
        });
    }
}

// Vérifier les collisions
function checkCollision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x] !== 0) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && grid[newY][newX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Déplacer la pièce
function movePiece(dir) {
    if (!currentPiece || isPaused || isGameOver) return;

    if (!checkCollision(currentPiece, dir, 0)) {
        currentPiece.x += dir;
        drawGrid();
    }
}

// Faire tomber la pièce
function dropPiece() {
    if (!currentPiece || isPaused || isGameOver) return;

    if (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        drawGrid();
    } else {
        mergePiece();
        clearLines();
        spawnNextPiece();
    }
}

// Rotation de la pièce
function rotatePiece() {
    if (!currentPiece || isPaused || isGameOver) return;

    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );

    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;

    // Si la rotation cause une collision, essayer de décaler
    let offset = 0;
    if (checkCollision(currentPiece, 0, 0)) {
        // Essayer de décaler à droite puis à gauche
        if (!checkCollision(currentPiece, 1, 0)) {
            currentPiece.x += 1;
        } else if (!checkCollision(currentPiece, -1, 0)) {
            currentPiece.x -= 1;
        } else if (!checkCollision(currentPiece, 2, 0)) {
            currentPiece.x += 2;
        } else if (!checkCollision(currentPiece, -2, 0)) {
            currentPiece.x -= 2;
        } else {
            currentPiece.shape = previousShape;
            return;
        }
    }

    drawGrid();
}

// Chute instantanée
function hardDrop() {
    if (!currentPiece || isPaused || isGameOver) return;

    while (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    mergePiece();
    clearLines();
    spawnNextPiece();
    updateScore();
}

// Fusionner la pièce avec la grille
function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const gridY = currentPiece.y + y;
                const gridX = currentPiece.x + x;
                if (gridY >= 0) {
                    grid[gridY][gridX] = value;
                }
            }
        });
    });
}

// Supprimer les lignes complètes
function clearLines() {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (grid[row].every(cell => cell !== 0)) {
            grid.splice(row, 1);
            grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++; // Revérifier cette ligne
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;

        // Calcul du score
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;

        // Augmenter le niveau tous les 10 lignes
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);

        updateScore();
    }
}

// Générer la pièce suivante
function spawnNextPiece() {
    if (!nextPiece) {
        nextPiece = createPiece();
    }

    currentPiece = nextPiece;
    nextPiece = createPiece();

    drawNextPiece();

    if (checkCollision(currentPiece, 0, 0)) {
        gameOver();
    }

    drawGrid();
}

// Mettre à jour le score
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// Gestion des touches
function handleKeyPress(e) {
    if (isGameOver && e.key !== 'Enter') return;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            movePiece(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            movePiece(1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            dropPiece();
            break;
        case 'ArrowUp':
            e.preventDefault();
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
    }
}

// Toggle pause
function togglePause() {
    if (isGameOver) return;

    isPaused = !isPaused;
    const pauseOverlay = document.getElementById('pauseOverlay');

    if (isPaused) {
        pauseOverlay.classList.remove('hidden');
    } else {
        pauseOverlay.classList.add('hidden');
        lastTime = performance.now();
    }
}

// Démarrer le jeu
function startGame() {
    document.getElementById('startBtn').style.display = 'none';
    initGrid();
    score = 0;
    level = 1;
    lines = 0;
    isPaused = false;
    isGameOver = false;
    dropCounter = 0;
    dropInterval = 1000;

    updateScore();

    nextPiece = null;
    spawnNextPiece();

    lastTime = performance.now();
    gameLoop = requestAnimationFrame(update);
}

// Redémarrer le jeu
function restartGame() {
    document.getElementById('gameOver').classList.add('hidden');
    startGame();
}

// Game Over
function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(gameLoop);

    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Boucle de jeu principale
function update(time = 0) {
    if (isPaused || isGameOver) {
        gameLoop = requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        dropPiece();
        dropCounter = 0;
    }

    gameLoop = requestAnimationFrame(update);
}
