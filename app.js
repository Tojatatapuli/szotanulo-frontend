console.log('app.js betöltve');
let deck = [];
let currentIndex = 0;
let correct = 0;
let total = 0;
let currentDeckName = '';
let decks = {};
let bestScores = {};
let manuallyEdited = { hungarian: false, german: false };
let deckName = '';
const API_URL = 'https://szotanulo-backend.onrender.com'; // Helyettesítsd a Render URL-lel

// Adatok lekérése a szervertől
async function fetchData() {
    try {
        const response = await fetch(`${API_URL}/decks`);
        const data = await response.json();
        decks = data.decks;
        bestScores = data.bestScores;
    } catch (error) {
        console.error('Hiba az adatok lekérésekor:', error);
        showMessage('Hiba történt az adatok betöltésekor!', 'error');
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    if (type !== 'loading') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}
window.showMessage = showMessage;

function findMatchingWord(inputWord, language) {
    for (let deckName in decks) {
        const words = decks[deckName];
        for (let word of words) {
            if (language === 'hungarian' && word.hungarian.toLowerCase() === inputWord.toLowerCase()) {
                return word.german;
            }
            if (language === 'german' && word.german.toLowerCase() === inputWord.toLowerCase()) {
                return word.hungarian;
            }
        }
    }
    return null;
}
window.findMatchingWord = findMatchingWord;

async function fetchTranslation(word, sourceLang, targetLang) {
    try {
        showMessage('Betöltés...', 'loading');
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${sourceLang}|${targetLang}`);
        const data = await response.json();
        if (data.responseStatus === 200 && data.matches && data.matches.length > 0) {
            return data.matches[0].translation;
        }
        return null;
    } catch (error) {
        console.error('Hiba a fordítás során:', error);
        return null;
    } finally {
        const messageDiv = document.getElementById('message');
        messageDiv.style.display = 'none';
    }
}
window.fetchTranslation = fetchTranslation;

function setupAutoFill() {
    const hungarianInput = document.getElementById('hungarianWord');
    const germanInput = document.getElementById('germanWord');

    if (hungarianInput && germanInput) {
        hungarianInput.addEventListener('input', async function() {
            const hungarianWord = hungarianInput.value.trim();
            manuallyEdited.hungarian = true;

            if (!hungarianWord) {
                if (!manuallyEdited.german) {
                    germanInput.value = '';
                }
                return;
            }

            if (!manuallyEdited.german) {
                let match = findMatchingWord(hungarianWord, 'hungarian');
                if (match) {
                    germanInput.value = match;
                } else {
                    const translation = await fetchTranslation(hungarianWord, 'hu', 'de');
                    if (translation) {
                        germanInput.value = translation;
                    } else {
                        germanInput.value = '';
                    }
                }
            }
        });

        germanInput.addEventListener('input', async function() {
            const germanWord = germanInput.value.trim();
            manuallyEdited.german = true;

            if (!germanWord) {
                if (!manuallyEdited.hungarian) {
                    hungarianInput.value = '';
                }
                return;
            }

            if (!manuallyEdited.hungarian) {
                let match = findMatchingWord(germanWord, 'german');
                if (match) {
                    hungarianInput.value = match;
                } else {
                    const translation = await fetchTranslation(germanWord, 'de', 'hu');
                    if (translation) {
                        hungarianInput.value = translation;
                    } else {
                        hungarianInput.value = '';
                    }
                }
            }
        });
    }
}
window.setupAutoFill = setupAutoFill;

async function showPractice() {
    await fetchData();
    const content = document.getElementById('content');
    let lowestScore = Infinity;
    let lowestDeckName = null;
    for (let deckName in bestScores) {
        const score = parseFloat(bestScores[deckName]);
        if (score < lowestScore) {
            lowestScore = score;
            lowestDeckName = deckName;
        }
    }

    if (!lowestDeckName) {
        content.innerHTML = `
            <h1>Gyakorlás</h1>
            <p>Még nincs paklid, amit gyakorolhatnál. Hozz létre egy új paklit az \"Új pakli\" menüpontban!</p>
            <button onclick="showLanding()">Vissza a kezdőlapra</button>
        `;
        return;
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
    deck = [];
    deckName = '';
    const content = document.getElementById('content');
    content.innerHTML = `
        <h1>Új pakli létrehozása</h1>
        <input type="text" id="deckName" placeholder="Pakli neve">
        <div id="message" class="message"></div>
        <button onclick="setDeckName()">Tovább</button>
    `;
    
    // ENTER billentyű kezelése
    document.getElementById('deckName').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            setDeckName();
        }
    });
}
window.showNewDeck = showNewDeck;

async function showDecks() {
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
        const response = await fetch(`${API_URL}/decks/${deckName}`, {
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
    const content = document.getElementById('content');
    content.innerHTML = `
        <h1>Üdvözlünk a Német Szótanulóban!</h1>
        <h2>Hogyan működik az alkalmazás?</h2>
        <p>A Német Szótanuló segít hatékonyan megtanulni a német szavakat. Hozz létre paklikat magyar-német szópárokkal, és gyakorolj kártyák segítségével.</p>
        <h2>Hogyan kezdj neki?</h2>
        <p>A fenti menüben válaszd az "Új pakli" opciót, hogy létrehozz egy új paklit. Add meg a pakli nevét, majd vidd fel a magyar-német szópárokat.</p>
    `;
}
window.showLanding = showLanding;

async function setDeckName() {
    deckName = document.getElementById('deckName').value.trim();
    if (!deckName) {
        showMessage('Kérlek, add meg a pakli nevét!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/decks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: deckName })
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
    
    let tableRows = deck.map(word => `
        <tr>
            <td>${word.hungarian}</td>
            <td>${word.german}</td>
        </tr>
    `).join('');
    
    content.innerHTML = `
        <h1>Szavak hozzáadása a paklihoz</h1>
        <p>Pakli neve: ${deckName}</p>
        
        <table id="wordTable" class="word-table">
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
        
        <input type="text" id="hungarianWord" placeholder="Magyar szó">
        <input type="text" id="germanWord" placeholder="Német szó">
        <button onclick="addWord()">Szó hozzáadása</button>
        <button onclick="saveAndShowDecks()">Paklik listázása</button>
        <button onclick="saveAndFinish()">Pakli mentése</button>
    `;
    setupAutoFill();
    
    document.getElementById('germanWord').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addWord();
        }
    });
}
window.showAddWords = showAddWords;

async function addWord() {
    const hungarianWord = document.getElementById('hungarianWord').value;
    const germanWord = document.getElementById('germanWord').value;
    if (hungarianWord && germanWord) {
        try {
            const response = await fetch(`${API_URL}/words`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deckName, hungarian: hungarianWord, german: germanWord })
            });
            if (response.ok) {
                deck.push({ hungarian: hungarianWord, german: germanWord });
                
                const wordTable = document.getElementById('wordTable').getElementsByTagName('tbody')[0];
                const newRow = wordTable.insertRow();
                const hunCell = newRow.insertCell(0);
                const gerCell = newRow.insertCell(1);
                hunCell.textContent = hungarianWord;
                gerCell.textContent = germanWord;
                
                document.getElementById('hungarianWord').value = '';
                document.getElementById('germanWord').value = '';
                document.getElementById('hungarianWord').focus();
                showMessage('Szó hozzáadva!', 'success');
                
                manuallyEdited = { hungarian: false, german: false };
            } else {
                showMessage('Hiba történt a szó hozzáadása során!', 'error');
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
            showDecks();
        }
    } else {
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
    card.classList.toggle('flipped');
}
window.flipCard = flipCard;

async function showCard() {
    const cardFront = document.getElementById('cardFront');
    const cardBack = document.getElementById('cardBack');
    const resultDiv = document.getElementById('result');

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
                    body: JSON.stringify({ deckName: currentDeckName, score: percentage })
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

// Új függvény: Pakli mentése és visszalépés a kezdőlapra
async function saveAndFinish() {
    showMessage('Pakli mentve!', 'success');
    await fetchData();
    showLanding();
}
window.saveAndFinish = saveAndFinish;