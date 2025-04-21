console.log('app.js betöltve');
let deck = [];
let currentIndex = 0;
let correct = 0;
let total = 0;
let currentDeckName = '';
let decks = {};
let bestScores = {};
let deckName = '';
let userId = localStorage.getItem('userId');
const API_URL = 'https://szotanulo-backend.onrender.com';

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    if (type !== 'loading') {
        setTimeout(() => {
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        }, 3000);
    }
}
window.showMessage = showMessage;

function checkUser() {
    if (!userId) {
        showUserPrompt();
    } else {
        showLanding();
    }
}

function showUserPrompt() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <h1>Üdvözlünk!</h1>
        <p>Kérlek, add meg a felhasználónevedet:</p>
        <input type="text" id="userIdInput" placeholder="Felhasználónév">
        <button onclick="setUserId()">Tovább</button>
    `;
}

function setUserId() {
    const userIdInput = document.getElementById('userIdInput');
    if (userIdInput && userIdInput.value.trim()) {
        userId = userIdInput.value.trim();
        localStorage.setItem('userId', userId);
        showLanding();
    } else {
        showMessage('Kérlek, add meg a felhasználónevedet!', 'error');
    }
}
window.setUserId = setUserId;

async function fetchData() {
    try {
        const response = await fetch(`${API_URL}/decks?userId=${userId}`);
        const data = await response.json();
        if (response.ok) {
            decks = data.decks;
            bestScores = data.bestScores;
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Hiba történt az adatok lekérésekor!', 'error');
    }
}

async function showPractice() {
    if (!userId) {
        showUserPrompt();
        return;
    }
    await fetchData();
    const content = document.getElementById('content');
    
    // Ellenőrizzük, hogy vannak-e paklik a decks objektumban
    if (Object.keys(decks).length === 0) {
        content.innerHTML = `
            <h1>Gyakorlás</h1>
            <p>Még nincs paklid, amit gyakorolhatnál. Hozz létre egy új paklit az \"Új pakli\" menüpontban!</p>
            <button onclick="showLanding()">Vissza a kezdőlapra</button>
        `;
        return;
    }

    // Válasszuk ki az első paklit, ha nincs legalacsonyabb pontszám
    let lowestScore = Infinity;
    let lowestDeckName = null;
    for (let deckName in bestScores) {
        const score = parseFloat(bestScores[deckName]);
        if (score < lowestScore) {
            lowestScore = score;
            lowestDeckName = deckName;
        }
    }

    // Ha nincs legalacsonyabb pontszámú pakli, válasszuk az első paklit a decks-ből
    if (!lowestDeckName) {
        lowestDeckName = Object.keys(decks)[0];
    }

    loadDeck(lowestDeckName);
    content.innerHTML = `
        <div id="practiceSection">
            <h2 id="deckTitle">${lowestDeckName}</h2>
            <div class="card" id="card" onclick="flipCard()">
                <div class="card-inner">
                    <div class="card-front" id="cardFront"></div>
                    <div class="card-back" id="cardBack"></div>
                </div>
            </div>
            <button onclick="markCorrect()">Helyes</button>
            <button class="incorrect-btn" onclick="markIncorrect()">Helytelen</button>
            <div class="result" id="result"></div>
        </div>
    `;
    showCard();
}
window.showPractice = showPractice;

function showNewDeck() {
    if (!userId) {
        showUserPrompt();
        return;
    }
    deck = [];
    deckName = '';
    const content = document.getElementById('content');
    content.innerHTML = `
        <h1>Új pakli létrehozása</h1>
        <input type="text" id="deckName" placeholder="Pakli neve">
        <button onclick="setDeckName()">Tovább</button>
    `;
    
    const deckNameInput = document.getElementById('deckName');
    if (deckNameInput) {
        deckNameInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                setDeckName();
            }
        });
    }
}
window.showNewDeck = showNewDeck;

async function showDecks() {
    if (!userId) {
        showUserPrompt();
        return;
    }
    await fetchData();
    const content = document.getElementById('content');
    if (Object.keys(decks).length === 0) {
        content.innerHTML = `
            <h1>Paklik</h1>
            <p>Még nincs paklid. Hozz létre egy új paklit az \"Új pakli\" menüpontban!</p>
            <button onclick="showLanding()">Vissza a kezdőlapra</button>
        `;
        return;
    }

    let deckListItems = Object.keys(decks).map(deckName => {
        const bestScore = bestScores[deckName] || 0;
        return `
            <li id="deck-${deckName}">
                <span onclick="startPractice('${deckName}')">${deckName} (${bestScore}%)</span>
                <div>
                    <button class="practice-btn" onclick="startPractice('${deckName}')">Gyakorlás</button>
                    <button class="delete-btn" onclick="confirmDelete('${deckName}', this)">Törlés</button>
                </div>
            </li>
        `;
    }).join('');

    content.innerHTML = `
        <h1>Paklik</h1>
        <ul class="deck-list">
            ${deckListItems}
        </ul>
        <button onclick="showLanding()">Vissza a kezdőlapra</button>
    `;
}
window.showDecks = showDecks;

function confirmDelete(deckName, button) {
    const li = button.parentElement.parentElement;
    li.innerHTML = `
        <span>Tényleg törölni akarod?</span>
        <div class="confirm-delete">
            <button class="yes-btn" onclick="deleteDeck('${deckName}')">Igen</button>
            <button class="no-btn" onclick="cancelDelete('${deckName}', this)">Nem</button>
        </div>
    `;
}
window.confirmDelete = confirmDelete;

async function cancelDelete(deckName, button) {
    const li = button.parentElement.parentElement;
    const bestScore = bestScores[deckName] || 0;
    li.innerHTML = `
        <span onclick="startPractice('${deckName}')">${deckName} (${bestScore}%)</span>
        <div>
            <button class="practice-btn" onclick="startPractice('${deckName}')">Gyakorlás</button>
            <button class="delete-btn" onclick="confirmDelete('${deckName}', this)">Törlés</button>
        </div>
    `;
}
window.cancelDelete = cancelDelete;

async function deleteDeck(deckName) {
    try {
        const response = await fetch(`${API_URL}/decks/${deckName}?userId=${userId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            await fetchData();
            showDecks();
            showMessage('Pakli törölve!', 'success');
        } else {
            showMessage('Hiba történt a törlés során!', 'error');
        }
    } catch (error) {
        showMessage('Hiba történt a törlés során!', 'error');
    }
}
window.deleteDeck = deleteDeck;

async function showWordList() {
    if (!userId) {
        showUserPrompt();
        return;
    }
    await fetchData();
    const content = document.getElementById('content');
    let allWords = [];
    for (let deckName in decks) {
        const words = decks[deckName];
        allWords = allWords.concat(words.map(word => ({ hungarian: word.hungarian, german: word.german })));
    }

    if (allWords.length === 0) {
        content.innerHTML = `
            <h1>Szavak listázása</h1>
            <p>Még nem vittél fel szavakat. Hozz létre egy új paklit az \"Új pakli\" menüpontban!</p>
            <button onclick="showLanding()">Vissza a kezdőlapra</button>
        `;
        return;
    }

    let tableRows = allWords.map(word => `
        <tr>
            <td>${word.hungarian}</td>
            <td>${word.german}</td>
        </tr>
    `).join('');

    content.innerHTML = `
        <h1>Szavak listázása</h1>
        <table>
            <thead>
                <tr>
                    <th>Magyar</th>
                    <th>Német</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <button onclick="showLanding()">Vissza a kezdőlapra</button>
    `;
}
window.showWordList = showWordList;

function showLanding() {
    if (!userId) {
        showUserPrompt();
        return;
    }
    const content = document.getElementById('content');
    content.innerHTML = `
        <h1>Üdvözlünk a Német Szótanulóban, ${userId}!</h1>
        <h2>Hogyan működik az alkalmazás?</h2>
        <p>A Német Szótanuló segít hatékonyan megtanulni a német szavakat. Hozz létre paklikat magyar-német szópárokkal, és gyakorolj kártyák segítségével.</p>
        <h2>Hogyan kezdj neki?</h2>
        <p>A fenti menüben válaszd az "Új pakli" opciót, hogy létrehozz egy új paklit. Add meg a pakli nevét, majd vidd fel a magyar-német szópárokat.</p>
    `;
}
window.showLanding = showLanding;

async function setDeckName() {
    const deckNameInput = document.getElementById('deckName');
    if (!deckNameInput) {
        showMessage('Hiba: A pakli neve mező nem található!', 'error');
        return;
    }
    deckName = deckNameInput.value.trim();
    if (!deckName) {
        showMessage('Kérlek, add meg a pakli nevét!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/decks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name: deckName })
        });
        if (response.ok) {
            showAddWords();
        } else {
            const data = await response.json();
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Hiba történt a pakli létrehozása során!', 'error');
    }
}
window.setDeckName = setDeckName;

function showAddWords() {
    const content = document.getElementById('content');
    if (!content) {
        console.error('A content elem nem található!');
        return;
    }
    
    let tableRows = deck.map(word => `
        <tr>
            <td>${word.hungarian}</td>
            <td>${word.german}</td>
        </tr>
    `).join('');
    
    const tableClass = deck.length > 0 ? 'word-table' : '';
    
    content.innerHTML = `
        <h1>Szavak hozzáadása a paklihoz</h1>
        <p>Pakli neve: ${deckName}</p>
        
        <table id="wordTable" class="${tableClass}">
            <thead>
                <tr>
                    <th>Magyar</th>
                    <th>Német</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        
        <div class="input-container">
            <div class="input-group">
                <input type="text" id="hungarianWord" placeholder="Magyar szó">
            </div>
            <div class="input-group">
                <input type="text" id="germanWord" placeholder="Német szó">
            </div>
        </div>
        <div class="button-container">
            <button onclick="addWord()">Szó hozzáadása</button>
            <button onclick="saveAndShowDecks()">Paklik listázása</button>
            <button onclick="saveAndFinish()">Pakli mentése</button>
        </div>
    `;
    
    const germanWordInput = document.getElementById('germanWord');
    if (germanWordInput) {
        germanWordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                addWord();
            }
        });
    } else {
        console.error('A germanWord elem nem található!');
    }
}
window.showAddWords = showAddWords;

async function addWord() {
    const hungarianWordInput = document.getElementById('hungarianWord');
    const germanWordInput = document.getElementById('germanWord');
    const wordTable = document.getElementById('wordTable');

    if (!hungarianWordInput || !germanWordInput || !wordTable) {
        showMessage('Hiba: Az űrlap elemei nem találhatók! Kérlek, frissítsd az oldalt.', 'error');
        return;
    }

    const hungarianWord = hungarianWordInput.value.trim();
    const germanWord = germanWordInput.value.trim();

    if (hungarianWord && germanWord) {
        try {
            const response = await fetch(`${API_URL}/words`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, deckName, hungarian: hungarianWord, german: germanWord })
            });
            if (response.ok) {
                deck.push({ hungarian: hungarianWord, german: germanWord });
                
                const updatedWordTable = document.getElementById('wordTable');
                if (!updatedWordTable) {
                    showMessage('Hiba: A táblázat nem található a frissítéshez!', 'error');
                    return;
                }

                updatedWordTable.classList.add('word-table');
                
                const tbody = updatedWordTable.getElementsByTagName('tbody')[0];
                if (!tbody) {
                    showMessage('Hiba: A táblázat törzse nem található!', 'error');
                    return;
                }

                const newRow = tbody.insertRow();
                const hunCell = newRow.insertCell(0);
                const gerCell = newRow.insertCell(1);
                hunCell.textContent = hungarianWord;
                gerCell.textContent = germanWord;
                
                const updatedHungarianWordInput = document.getElementById('hungarianWord');
                const updatedGermanWordInput = document.getElementById('germanWord');
                if (updatedHungarianWordInput && updatedGermanWordInput) {
                    updatedHungarianWordInput.value = '';
                    updatedGermanWordInput.value = '';
                    updatedHungarianWordInput.focus();
                }

                showMessage('Szó hozzáadva!', 'success');
            } else {
                const data = await response.json();
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Hiba történt a szó hozzáadása során!', 'error');
        }
    } else {
        showMessage('Kérlek, add meg a magyar és a német szót is!', 'error');
    }
}
window.addWord = addWord;

async function saveAndShowDecks() {
    if (deck.length > 0) {
        if (confirm('Szeretnéd menteni a paklit?')) {
            showMessage('Pakli mentve!', 'success');
            await fetchData();
            showDecks();
        } else {
            await fetchData();
            showDecks();
        }
    } else {
        await fetchData();
        showDecks();
    }
}
window.saveAndShowDecks = saveAndShowDecks;

function loadDeck(deckName) {
    deck = decks[deckName] || [];
    currentDeckName = deckName;
    currentIndex = 0;
    correct = 0;
    total = 0;
}
window.loadDeck = loadDeck;

async function startPractice(deckName) {
    loadDeck(deckName);
    showPractice();
}
window.startPractice = startPractice;

function flipCard() {
    const card = document.getElementById('card');
    if (card) {
        card.classList.toggle('flipped');
    }
}
window.flipCard = flipCard;

async function showCard() {
    const cardFront = document.getElementById('cardFront');
    const cardBack = document.getElementById('cardBack');
    const resultDiv = document.getElementById('result');

    if (!cardFront || !cardBack || !resultDiv) {
        console.error('A kártya elemei nem találhatók!');
        return;
    }

    if (deck.length === 0) {
        cardFront.textContent = 'Nincs több szó a pakliban!';
        cardBack.textContent = 'Nincs több szó a pakliban!';
        return;
    }

    if (currentIndex < deck.length) {
        cardFront.textContent = deck[currentIndex].hungarian;
        cardBack.textContent = deck[currentIndex].german;
        resultDiv.textContent = '';
    } else {
        let percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        resultDiv.innerHTML = `Vége a paklinak! Eredmény: ${percentage}% (${correct} / ${total})
            <button onclick="startPractice('${currentDeckName}')">Újrakezdés</button>
            <button onclick="showDecks()">Paklik listázása</button>
        `;
        if (percentage > (bestScores[currentDeckName] || 0)) {
            try {
                const response = await fetch(`${API_URL}/scores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, deckName: currentDeckName, score: percentage })
                });
                if (response.ok) {
                    bestScores[currentDeckName] = percentage;
                    showMessage('Új rekord!', 'success');
                }
            } catch (error) {
                showMessage('Hiba történt az eredmény mentésekor!', 'error');
            }
        }
    }
}
window.showCard = showCard;

async function markCorrect() {
    if (currentIndex < deck.length) {
        total++;
        correct++;
        currentIndex++;
        showCard();
    }
}
window.markCorrect = markCorrect;

async function markIncorrect() {
    if (currentIndex < deck.length) {
        total++;
        currentIndex++;
        showCard();
    }
}
window.markIncorrect = markIncorrect;

async function saveAndFinish() {
    showMessage('Pakli mentve!', 'success');
    await fetchData();
    showLanding();
}
window.saveAndFinish = saveAndFinish;

// Alkalmazás indítása
checkUser();