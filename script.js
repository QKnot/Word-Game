let gameHistory = [];
let usedWords = new Set();
let lastWord = '';
let isProcessing = false;
let playerName = '';
let timerInterval;
let timeLeft = 30;
let initialTimeLimit = 30;
let gameActive = false;

function startGame() {
    const name = document.getElementById('playerName').value.trim();
    if (!name) {
        alert('Please enter your name!');
        return;
    }

    playerName = name;
    initialTimeLimit = parseInt(document.getElementById('timeLimit').value);
    timeLeft = initialTimeLimit;
    
    document.getElementById('playerRegistration').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('playerDisplay').textContent = `Player: ${playerName}`;
    
    resetGameState();
    startTimer();
    updateUsedWordsDisplay();
}

function startTimer() {
    timeLeft = initialTimeLimit;
    gameActive = true;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = minutes > 0 
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;
    document.getElementById('timer').textContent = `Time: ${timeString}`;
}

function handleTimeout() {
    clearInterval(timerInterval);
    gameActive = false;
    document.getElementById('message').textContent = "Time's up! Qbit wins!";
    document.getElementById('submitButton').disabled = true;
    showEndGameButtons();
}

function resetTimer() {
    timeLeft = initialTimeLimit;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    startTimer();
}

function updateUsedWordsDisplay() {
    const usedWordsDiv = document.getElementById('usedWords');
    if (usedWords.size === 0) {
        usedWordsDiv.textContent = 'No words used yet';
        return;
    }
    usedWordsDiv.innerHTML = '<strong>Used Words:</strong><br>' + 
        Array.from(usedWords).join(', ');
}

async function checkWordExists(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.ok;
    } catch (error) {
        console.error('Error checking word:', error);
        return false;
    }
}

async function getQbitWord(lastLetter) {
    try {
        const response = await fetch(`https://api.datamuse.com/words?sp=${lastLetter}*&max=100`);
        const data = await response.json();
        const possibleWords = data
            .map(item => item.word.toLowerCase())
            .filter(word => !usedWords.has(word));
        
        return possibleWords.length > 0 ? possibleWords[0] : null;
    } catch (error) {
        console.error('Error fetching Qbit word:', error);
        return null;
    }
}

async function submitWord() {
    if (isProcessing || !gameActive) return;
    
    const input = document.getElementById('wordInput');
    const message = document.getElementById('message');
    const submitButton = document.getElementById('submitButton');
    const word = input.value.trim().toLowerCase();

    input.value = '';

    if (!word) {
        message.textContent = 'Please enter a word!';
        return;
    }

    // Check for duplicate word
    if (usedWords.has(word)) {
        message.textContent = 'That word has already been used! Try another.';
        return;
    }

    isProcessing = true;
    submitButton.disabled = true;
    message.innerHTML = 'Checking word... <div class="loading"></div>';

    const wordExists = await checkWordExists(word);
    if (!wordExists) {
        message.textContent = 'That\'s not a valid word! Try again.';
        isProcessing = false;
        submitButton.disabled = false;
        return;
    }

    if (!lastWord) {
        lastWord = word;
        usedWords.add(word);
        gameHistory.push(`${playerName}: ${word}`);
        updateHistory();
        updateUsedWordsDisplay();
        
        message.innerHTML = 'Qbit is thinking... <div class="loading"></div>';
        const QbitWord = await getQbitWord(word[word.length - 1]);
        handleQbitTurn(QbitWord);
        return;
    }

    const lastLetter = lastWord[lastWord.length - 1];
    if (word[0] !== lastLetter) {
        message.textContent = `Your word must start with the letter '${lastLetter}'!`;
        isProcessing = false;
        submitButton.disabled = false;
        return;
    }

    lastWord = word;
    usedWords.add(word);
    gameHistory.push(`${playerName}: ${word}`);
    updateHistory();
    updateUsedWordsDisplay();
    resetTimer();
    
    message.innerHTML = 'Qbit is thinking... <div class="loading"></div>';
    const QbitWord = await getQbitWord(word[word.length - 1]);
    handleQbitTurn(QbitWord);
}

function handleQbitTurn(QbitWord) {
    if (QbitWord) {
        lastWord = QbitWord;
        usedWords.add(QbitWord);
        gameHistory.push(`Qbit: ${QbitWord}`);
        message.textContent = `Qbit's turn: ${QbitWord}`;
        updateUsedWordsDisplay();
        resetTimer();
    } else {
        message.textContent = "Qbit couldn't find a word. You win!";
        gameActive = false;
        clearInterval(timerInterval);
        showEndGameButtons();
    }
    
    updateHistory();
    isProcessing = false;
    submitButton.disabled = false;
}

function updateHistory() {
    const history = document.getElementById('history');
    history.innerHTML = '<strong>Game History:</strong><br>' + 
        gameHistory.join('<br>');
}

function showEndGameButtons() {
    document.getElementById('newGameButton').style.display = 'block';
    document.getElementById('downloadPDF').style.display = 'block';
}

function resetGame() {
    document.getElementById('playerRegistration').style.display = 'block';
    document.getElementById('gameArea').style.display = 'none';
    resetGameState();
}

function resetGameState() {
    gameHistory = [];
    usedWords = new Set();
    lastWord = '';
    isProcessing = false;
    updateHistory();
    updateUsedWordsDisplay();
    document.getElementById('message').textContent = '';
    document.getElementById('wordInput').value = '';
    document.getElementById('newGameButton').style.display = 'none';
    document.getElementById('downloadPDF').style.display = 'none';
}
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Word Chain Game - Match Summary', 20, 20);
    
    // Add player name
    doc.setFontSize(12);
    doc.text(`Player: ${playerName}`, 20, 30);
    
    // Add game history
    doc.setFontSize(10);
    let yPosition = 40;
    gameHistory.forEach((entry, index) => {
        if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
        }
        doc.text(`${index + 1}. ${entry}`, 20, yPosition);
        yPosition += 10;
    });
    
    // Save the PDF
    const name = playerName.replace(/\s/g, '-').toLowerCase();
    doc.save(`${name}.pdf`);
}

// Add enter key support
document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitWord();
    }
});

document.getElementById('playerName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startGame();
    }
});