class SlotMachine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.symbols = ['7️⃣', '💎', '🎰', '🌟', '🍊', '🍋', '🍒'];
        this.rows = 3;
        this.reels = 5;
        this.spinning = false;
        this.credits = 1000;
        this.bet = 10;
        this.lines = 9; // Number of paylines
        this.currentBetLines = 1;
        this.spinPositions = Array(this.reels).fill(0);
        this.reelSymbols = Array(this.reels).fill().map(() => Array(this.rows).fill(0));

        // Define paylines
        this.paylines = [
            [[1,0], [1,1], [1,2], [1,3], [1,4]], // Middle horizontal
            [[0,0], [0,1], [0,2], [0,3], [0,4]], // Top horizontal
            [[2,0], [2,1], [2,2], [2,3], [2,4]], // Bottom horizontal
            [[0,0], [1,1], [2,2], [1,3], [0,4]], // V shape
            [[2,0], [1,1], [0,2], [1,3], [2,4]], // Inverted V
            [[1,0], [0,1], [0,2], [0,3], [1,4]], // Top zigzag
            [[1,0], [2,1], [2,2], [2,3], [1,4]], // Bottom zigzag
            [[0,0], [1,1], [1,2], [1,3], [0,4]], // Top curve
            [[2,0], [1,1], [1,2], [1,3], [2,4]]  // Bottom curve
        ];

        this.initializeCanvas();
        this.setupEventListeners();
        this.draw();
    }

    initializeCanvas() {
        this.canvas.width = Math.min(window.innerWidth - 40, 800);
        this.canvas.height = this.canvas.width * 0.6;
        this.symbolSize = this.canvas.width / (this.reels + 1);
        this.reelSpacing = this.symbolSize * 0.1;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.initializeCanvas();
            this.draw();
        });

        document.getElementById('spin').addEventListener('click', () => this.spin());
        document.getElementById('increaseBet').addEventListener('click', () => this.adjustBet(10));
        document.getElementById('decreaseBet').addEventListener('click', () => this.adjustBet(-10));
        document.getElementById('increaseLines').addEventListener('click', () => this.adjustLines(1));
        document.getElementById('decreaseLines').addEventListener('click', () => this.adjustLines(-1));
    }

    adjustBet(amount) {
        if (this.spinning) return;
        const newBet = this.bet + amount;
        if (newBet >= 10 && newBet <= 100 && newBet * this.currentBetLines <= this.credits) {
            this.bet = newBet;
            document.getElementById('bet').textContent = this.bet;
            document.getElementById('totalBet').textContent = this.bet * this.currentBetLines;
        }
    }

    adjustLines(amount) {
        if (this.spinning) return;
        const newLines = this.currentBetLines + amount;
        if (newLines >= 1 && newLines <= this.lines && this.bet * newLines <= this.credits) {
            this.currentBetLines = newLines;
            document.getElementById('activeLines').textContent = this.currentBetLines;
            document.getElementById('totalBet').textContent = this.bet * this.currentBetLines;
        }
    }

    async spin() {
        if (this.spinning || this.credits < this.bet * this.currentBetLines) return;

        await audioManager.init();
        this.spinning = true;
        this.credits -= this.bet * this.currentBetLines;
        document.getElementById('credits').textContent = this.credits;
        document.getElementById('message').textContent = '';

        audioManager.playSpinSound();

        // Generate final positions for all reels and rows
        const finalSymbols = Array(this.reels).fill().map(() => 
            Array(this.rows).fill().map(() => 
                Math.floor(Math.random() * this.symbols.length)
            )
        );

        const spinDuration = 2000; // 2 seconds
        const startTime = Date.now();

        const animate = () => {
            const currentTime = Date.now() - startTime;
            const progress = Math.min(currentTime / spinDuration, 1);

            for (let i = 0; i < this.reels; i++) {
                const reelProgress = Math.min((currentTime - i * 200) / (spinDuration - i * 200), 1);

                if (reelProgress < 1) {
                    this.spinPositions[i] = (this.spinPositions[i] + 0.3) % this.symbols.length;
                    for (let j = 0; j < this.rows; j++) {
                        this.reelSymbols[i][j] = Math.floor((this.spinPositions[i] + j) % this.symbols.length);
                    }
                } else {
                    this.reelSymbols[i] = finalSymbols[i];
                }
            }

            this.draw();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.spinning = false;
                this.checkWins(finalSymbols);
            }
        };

        animate();
    }

    checkWins(symbols) {
        let totalWin = 0;
        let winningLines = [];

        // Check each active payline
        for (let i = 0; i < this.currentBetLines; i++) {
            const line = this.paylines[i];
            const lineSymbols = line.map(([row, col]) => symbols[col][row]);

            // Check for matches
            const firstSymbol = lineSymbols[0];
            let matchCount = 1;

            for (let j = 1; j < lineSymbols.length; j++) {
                if (lineSymbols[j] === firstSymbol) {
                    matchCount++;
                } else {
                    break;
                }
            }

            // Calculate win based on match count
            if (matchCount >= 3) {
                const multiplier = this.getMultiplier(firstSymbol, matchCount);
                const win = this.bet * multiplier;
                totalWin += win;
                winningLines.push({line: i, win: win});
            }
        }

        if (totalWin > 0) {
            this.credits += totalWin;
            document.getElementById('credits').textContent = this.credits;
            document.getElementById('message').textContent = `Win! +${totalWin}`;
            audioManager.playWinSound();

            // Highlight winning lines
            this.animateWinningLines(winningLines);
        } else {
            document.getElementById('message').textContent = 'Try again!';
            audioManager.playLoseSound();
        }

        // Save high score
        const highScore = Math.max(this.credits, parseInt(localStorage.getItem('highScore') || 0));
        localStorage.setItem('highScore', highScore);
    }

    getMultiplier(symbol, matchCount) {
        // Define multipliers based on symbol and match count
        const multipliers = {
            '7️⃣': [0, 0, 5, 25, 100],
            '💎': [0, 0, 4, 20, 80],
            '🎰': [0, 0, 3, 15, 60],
            '🌟': [0, 0, 2, 10, 40],
            '🍊': [0, 0, 1, 5, 20],
            '🍋': [0, 0, 1, 4, 15],
            '🍒': [0, 0, 1, 3, 10]
        };

        return multipliers[symbol][matchCount - 1] || 0;
    }

    animateWinningLines(winningLines) {
        let opacity = 1;
        const animate = () => {
            this.draw();

            // Draw winning lines with current opacity
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;

            for (const {line} of winningLines) {
                const payline = this.paylines[line];
                this.ctx.beginPath();
                const firstPos = this.getSymbolPosition(payline[0][0], payline[0][1]);
                this.ctx.moveTo(firstPos.x, firstPos.y);

                for (let i = 1; i < payline.length; i++) {
                    const pos = this.getSymbolPosition(payline[i][0], payline[i][1]);
                    this.ctx.lineTo(pos.x, pos.y);
                }
                this.ctx.stroke();
            }

            opacity = Math.abs(Math.sin(Date.now() / 200));

            if (this.spinning) return;
            requestAnimationFrame(animate);
        };

        animate();
    }

    getSymbolPosition(row, col) {
        const x = (col + 0.5) * (this.symbolSize + this.reelSpacing);
        const y = (row + 0.5) * this.symbolSize + (this.canvas.height - this.symbolSize * this.rows) / 2;
        return {x, y};
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw machine frame
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw reels background
        const reelsWidth = this.reels * (this.symbolSize + this.reelSpacing) - this.reelSpacing;
        const reelsHeight = this.rows * this.symbolSize;
        const reelsX = (this.canvas.width - reelsWidth) / 2;
        const reelsY = (this.canvas.height - reelsHeight) / 2;

        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(reelsX - 10, reelsY - 10, reelsWidth + 20, reelsHeight + 20);

        // Draw symbols
        this.ctx.font = `${this.symbolSize * 0.7}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let i = 0; i < this.reels; i++) {
            for (let j = 0; j < this.rows; j++) {
                const pos = this.getSymbolPosition(j, i);
                const symbol = this.symbols[this.reelSymbols[i][j]];

                // Draw symbol background
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(
                    pos.x - this.symbolSize/2,
                    pos.y - this.symbolSize/2,
                    this.symbolSize,
                    this.symbolSize
                );

                // Draw symbol
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(symbol, pos.x, pos.y);
            }
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new SlotMachine();
});