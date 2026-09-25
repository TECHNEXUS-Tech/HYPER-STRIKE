// js/game.js - Core Physics, Virtual Joystick, Game Over UI & Polish Features

let shakeEnabled = true;
const btnShake = document.getElementById('btnShakeToggle');
if (btnShake) {
    btnShake.addEventListener('click', () => {
        shakeEnabled = !shakeEnabled;
        btnShake.innerText = shakeEnabled ? '[ SHAKE: ON ]' : '[ SHAKE: OFF ]';
        btnShake.style.color = shakeEnabled ? '#8dff5a' : '#ff3b3b';
        btnShake.style.borderColor = shakeEnabled ? '#8dff5a' : '#ff3b3b';
    });
}

let autoFireEnabled = true;
const btnAutoFire = document.getElementById('btnAutoFireToggle');
if (btnAutoFire) {
    btnAutoFire.addEventListener('click', () => {
        autoFireEnabled = !autoFireEnabled;
        btnAutoFire.innerText = autoFireEnabled ? '[ AUTO: ON ]' : '[ AUTO: OFF ]';
        btnAutoFire.style.color = autoFireEnabled ? '#8dff5a' : '#555';
        btnAutoFire.style.borderColor = autoFireEnabled ? '#8dff5a' : '#555';
    });
}

if (typeof enterHub !== 'undefined') {
    const originalEnterHub = enterHub;
    enterHub = function() {
        originalEnterHub();
        if(document.getElementById('btnShakeToggle')) document.getElementById('btnShakeToggle').style.display = 'block';
    };
}

let wakeLock = null;
const requestWakeLock = async () => {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
};
const releaseWakeLock = async () => {
    try { if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch(e) {}
};

function playHitTick() {
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.05);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(); osc.stop(ac.currentTime + 0.05);
    } catch(e) {}
}

let joystickAlpha = 0;

function calculateMaxTargets() {
    if (gameMode === 'SOLO' || gameMode === 'DUEL') return maxTargetsLimit;
    let totalPlayers = 1 + Object.keys(squadPlayers).length;
    if (totalPlayers <= 2) return maxTargetsLimit;
    return maxTargetsLimit + ((totalPlayers - 2) * 4);
}

function resetToHub() {
    if (connectionTimeout) clearTimeout(connectionTimeout);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    const timerEl = document.getElementById('timerDisplay');
    if (timerEl) timerEl.classList.remove('timer-hurry');
    if (document.getElementById('reconnectOverlay')) document.getElementById('reconnectOverlay').style.display = 'none';
    if (document.getElementById('btnAutoFireToggle')) document.getElementById('btnAutoFireToggle').style.display = 'none';
    
    const netControls = document.getElementById('networkControls');
    if(netControls) netControls.style.opacity = '1';
    
    releaseWakeLock();

    const overlays = ['skeletonUI', 'matchLobby', 'gameUI', 'gameOverOverlay', 'countdownOverlay', 'gameCanvas', 'jamOverlay', 'weaponToggle'];
    overlays.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
    
    targets = []; flashes = []; hitMarkers = []; shards = []; fct = []; railTrails = []; shockwaves = [];
    myAccHistory = [0]; peerAccHistory = [0]; peripheralFlashOpacity = 0;
    peerAim.x = 0.5; peerAim.y = 0.5; myAim.x = 0.5; myAim.y = 0.5;
    isMatchOver = false; isGameRunning = false; timeScale = 1.0;
    
    myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0;
    myMaxCombo = 1; peerMaxCombo = 1;
    aimPointerId = null; shootPointerId = null; joystick.active = false; lastAimSendTime = 0;
    
    document.getElementById('myScore').innerText = '0'; document.getElementById('peerScore').innerText = '0'; document.getElementById('myCombo').innerText = 'x1'; document.getElementById('peerCombo').innerText = 'x1';
    
    if (clockInterval) clearInterval(clockInterval); if (spawnInterval) clearInterval(spawnInterval);

    if (connection) { connection.removeAllListeners(); connection.close(); } connection = null;
    if (connUnreliable) { connUnreliable.removeAllListeners(); connUnreliable.close(); } connUnreliable = null;
    if (trysteroRoom) { trysteroRoom.leave(); trysteroRoom = null; }
    squadPlayers = {}; squadAims = {}; isSquadHost = false;

    isHost = false; isPeerReady = false; peerUsername = "Waiting...";
    document.getElementById('status').innerText = 'Online'; document.getElementById('status').style.color = '#8dff5a';
    
    enterHub();
    
    if (gameMode === 'SOLO') {
        document.getElementById('btnPrimarySolo').classList.add('active');
        document.getElementById('btnPrimaryMulti').classList.remove('active');
        document.getElementById('subModes').style.display = 'none';
        document.getElementById('networkControls').style.display = 'none';
        document.getElementById('launchSoloBtn').style.display = 'block';
    } else {
        document.getElementById('btnPrimarySolo').classList.remove('active');
        document.getElementById('btnPrimaryMulti').classList.add('active');
        document.getElementById('subModes').style.display = 'grid';
        document.getElementById('launchSoloBtn').style.display = 'none';
        document.getElementById('networkControls').style.display = 'block';

        if (gameMode === 'SQUAD') {
            document.getElementById('btnSquad').classList.add('active');
            document.getElementById('btnDuel').classList.remove('active');
        } else {
            document.getElementById('btnDuel').classList.add('active');
            document.getElementById('btnSquad').classList.remove('active');
        }
    }
}

window.softResetToMatchLobby = function() {
    isMatchOver = false; isGameRunning = false; timeScale = 1.0; gyroBase.beta = null; 
    document.getElementById('damageFlash').style.display = 'none';
    const timerEl = document.getElementById('timerDisplay');
    if (timerEl) timerEl.classList.remove('timer-hurry');
    if (document.getElementById('reconnectOverlay')) document.getElementById('reconnectOverlay').style.display = 'none';
    if (document.getElementById('btnAutoFireToggle')) document.getElementById('btnAutoFireToggle').style.display = 'none';
    
    releaseWakeLock();

    const overlays = ['gameUI', 'gameOverOverlay', 'countdownOverlay', 'gameCanvas', 'jamOverlay', 'weaponToggle'];
    overlays.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
    
    targets = []; flashes = []; hitMarkers = []; shards = []; fct = []; railTrails = []; shockwaves = [];
    myAccHistory = [0]; peerAccHistory = [0]; peripheralFlashOpacity = 0;
    peerAim.x = 0.5; peerAim.y = 0.5; myAim.x = 0.5; myAim.y = 0.5;
    
    myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0;
    myMaxCombo = 1; peerMaxCombo = 1;
    aimPointerId = null; shootPointerId = null; joystick.active = false; lastAimSendTime = 0;
    
    document.getElementById('myScore').innerText = '0'; document.getElementById('peerScore').innerText = '0'; document.getElementById('myCombo').innerText = 'x1'; document.getElementById('peerCombo').innerText = 'x1';
    
    if (clockInterval) clearInterval(clockInterval); if (spawnInterval) clearInterval(spawnInterval);

    document.getElementById('matchLobby').style.display = 'flex';
    document.getElementById('settingsContainer').style.display = 'block';

    isPeerReady = false;
    if (gameMode === 'DUEL' && typeof updateMatchLobbyUI === 'function') updateMatchLobbyUI();
    if (gameMode === 'SQUAD' && typeof updateSquadLobbyUI === 'function') {
        Object.values(squadPlayers).forEach(p => p.isReady = false);
        updateSquadLobbyUI();
    }
};

function runCountdown(duration) {
    document.getElementById('lobby').style.display = 'none'; 
    document.getElementById('matchLobby').style.display = 'none'; 
    document.getElementById('settingsContainer').style.display = 'none';
    
    const cdOverlay = document.getElementById('countdownOverlay'); cdOverlay.style.display = 'flex';
    
    myAccHistory = [0]; peerAccHistory = [0]; gyroBase = { beta: null, gamma: null }; peripheralFlashOpacity = 0; document.getElementById('damageFlash').style.display = 'block';
    
    let count = 3; cdOverlay.innerText = count; audio.init(); audio.hit(false); 
    const intv = setInterval(() => {
        count--;
        if (count > 0) { cdOverlay.innerText = count; audio.hit(false); } 
        else if (count === 0) { cdOverlay.innerText = "GO!"; cdOverlay.style.color = "#ff2d95"; audio.hit(true); } 
        else { clearInterval(intv); cdOverlay.style.display = 'none'; cdOverlay.style.color = "#8dff5a"; startGameplay(duration); }
    }, 1000);
}

function startGameplay(duration) {
    if (isGameRunning) return; isGameRunning = true; currentMatchTime = duration; timeScale = 1.0;
    
    requestWakeLock();
    if (isTouchDevice && document.getElementById('btnAutoFireToggle')) document.getElementById('btnAutoFireToggle').style.display = 'block';
    
    document.getElementById('gameUI').style.display = 'block'; canvas.style.display = 'block'; document.getElementById('weaponToggle').style.display = 'block'; 
    document.getElementById('myNameDisplay').innerText = myUsername; 
    
    if (gameMode === 'SOLO') {
        document.getElementById('peerScoreBlock').style.display = 'none';
    } else {
        document.getElementById('peerScoreBlock').style.display = 'flex'; 
        document.getElementById('peerNameDisplay').innerText = (gameMode === 'SQUAD') ? "ENEMY SQUAD" : peerUsername;
    }
    
    resize();
    
    let isSpawner = (gameMode === 'SOLO') || (gameMode === 'DUEL' && isHost) || (gameMode === 'SQUAD' && isSquadHost);
    if (isSpawner) {
        let spawnRate = (gameMode === 'SQUAD') ? 1000 : 1500;
        spawnInterval = setInterval(spawnTarget, spawnRate); 
    }
    
    const timerEl = document.getElementById('timerDisplay'); timerEl.innerText = currentMatchTime;
    clockInterval = setInterval(() => {
        currentMatchTime--; timerEl.innerText = currentMatchTime;
        
        const myCurrentAcc = myShotsFired > 0 ? Math.round((myShotsHit / myShotsFired) * 100) : 0;
        const peerCurrentAcc = peerShotsFired > 0 ? Math.round((peerShotsHit / peerShotsFired) * 100) : 0;
        myAccHistory.push(myCurrentAcc); peerAccHistory.push(peerCurrentAcc);
        
        if (currentMatchTime <= 10) { 
            timerEl.classList.add('timer-hurry'); 
            if (isSpawner && currentMatchTime === 10) { 
                clearInterval(spawnInterval); 
                spawnInterval = setInterval(spawnTarget, (gameMode === 'SQUAD') ? 500 : 750); 
            } 
        }
        if (currentMatchTime <= 0) { clearInterval(clockInterval); endMatch(); }
    }, 1000);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    requestAnimationFrame((now) => { lastTime = now; renderLoop(now); });
}

function renderLineGraph(canvasId, history, colorHex) {
    const c = document.getElementById(canvasId); if(!c) return;
    const ctxGraph = c.getContext('2d'); ctxGraph.clearRect(0, 0, c.width, c.height);

    const padX = 40; const padY = 20; const w = c.width - padX - 10; const h = c.height - padY * 2;
    let maxVal = Math.max(...history, 10); maxVal = Math.ceil(maxVal / 10) * 10; 

    ctxGraph.strokeStyle = 'rgba(255,255,255,0.15)'; ctxGraph.lineWidth = 1; ctxGraph.fillStyle = 'rgba(255,255,255,0.6)'; ctxGraph.font = '12px monospace';
    
    for(let i=0; i<=4; i++) {
        const y = padY + (h * (i/4)); const val = Math.round(maxVal - (maxVal * (i/4)));
        ctxGraph.beginPath(); ctxGraph.moveTo(padX, y); ctxGraph.lineTo(padX + w, y); ctxGraph.stroke(); ctxGraph.fillText(val + "%", 2, y + 4);
    }
    ctxGraph.beginPath(); ctxGraph.moveTo(padX, padY); ctxGraph.lineTo(padX, h + padY); ctxGraph.stroke();

    if(history.length < 2) return;

    ctxGraph.beginPath(); ctxGraph.strokeStyle = colorHex; ctxGraph.lineWidth = 3; ctxGraph.shadowBlur = 10; ctxGraph.shadowColor = colorHex; ctxGraph.lineJoin = 'round';
    for(let i=0; i<history.length; i++) {
        const x = padX + (i / (history.length - 1)) * w; const y = padY + h - (history[i] / maxVal) * h;
        if(i===0) ctxGraph.moveTo(x, y); else ctxGraph.lineTo(x, y);
    }
    ctxGraph.stroke(); ctxGraph.shadowBlur = 0;
    ctxGraph.lineTo(padX + w, h + padY); ctxGraph.lineTo(padX, h + padY);
    ctxGraph.globalAlpha = 0.15; ctxGraph.fillStyle = colorHex; ctxGraph.fill(); ctxGraph.globalAlpha = 1.0;
}

let playAgainBtn = document.getElementById('playAgainBtn');
if (!playAgainBtn) {
    playAgainBtn = document.createElement('button');
    playAgainBtn.id = 'playAgainBtn';
    playAgainBtn.className = 'brand-font';
    playAgainBtn.innerText = '[ PLAY AGAIN ]';
    playAgainBtn.style.padding = '16px 40px'; playAgainBtn.style.background = '#8dff5a'; playAgainBtn.style.color = '#000';
    playAgainBtn.style.border = 'none'; playAgainBtn.style.borderRadius = '6px'; playAgainBtn.style.cursor = 'pointer';
    playAgainBtn.style.fontSize = '16px'; playAgainBtn.style.fontWeight = '800'; playAgainBtn.style.boxShadow = '0 0 25px rgba(141,255,90,0.4)';
    playAgainBtn.style.marginTop = '15px'; playAgainBtn.style.display = 'none';
    document.getElementById('gameOverOverlay').appendChild(playAgainBtn);
    
    playAgainBtn.addEventListener('click', () => {
        document.getElementById('gameOverOverlay').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('gameUI').style.display = 'none';
        targets = []; flashes = []; hitMarkers = []; shards = []; fct = []; railTrails = []; shockwaves = [];
        myAccHistory = [0]; peerAccHistory = [0]; peripheralFlashOpacity = 0;
        myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; myMaxCombo = 1; 
        lastAimSendTime = 0;
        document.getElementById('myScore').innerText = '0'; document.getElementById('myCombo').innerText = 'x1';
        runCountdown(hostMatchTime);
    });
}

document.getElementById('btnToggleCarousel').addEventListener('click', () => {
    const slide1 = document.getElementById('slide-top3');
    const slide2 = document.getElementById('slide-graph');
    if (slide1.classList.contains('active')) {
        slide1.classList.remove('active'); slide1.classList.add('hidden');
        slide2.classList.remove('hidden'); slide2.classList.add('active');
    } else {
        slide2.classList.remove('active'); slide2.classList.add('hidden');
        slide1.classList.remove('hidden'); slide1.classList.add('active');
    }
});

function endMatch() {
    isMatchOver = true; isTriggerDown = false; timeScale = 0.05; gyroBase.beta = null; 
    document.getElementById('damageFlash').style.display = 'none';
    if (spawnInterval) clearInterval(spawnInterval);
    
    releaseWakeLock();
    if (document.getElementById('btnAutoFireToggle')) document.getElementById('btnAutoFireToggle').style.display = 'none';
    if (document.getElementById('reconnectOverlay')) document.getElementById('reconnectOverlay').style.display = 'none';
    
    const overlay = document.getElementById('gameOverOverlay'), title = document.getElementById('goTitle'), returnBtn = document.getElementById('returnBtn');
    document.getElementById('weaponToggle').style.display = 'none';
    
    const myAcc = myShotsFired > 0 ? Math.round((myShotsHit / myShotsFired) * 100) : 0;
    
    overlay.style.display = 'flex';
    
    if (gameMode === 'SOLO') {
        title.innerText = "TRAINING COMPLETE"; title.style.color = "#22e0ff"; title.style.textShadow = "0 0 30px #22e0ff";
        
        document.getElementById('slide-top3').classList.add('hidden'); document.getElementById('slide-top3').classList.remove('active');
        document.getElementById('slide-graph').classList.remove('hidden'); document.getElementById('slide-graph').classList.add('active');
        document.getElementById('btnToggleCarousel').style.display = 'none';
        
        document.getElementById('goMyAcc').innerText = myAcc + "%"; document.getElementById('goMyMaxCombo').innerText = 'x' + Math.floor(myMaxCombo); document.getElementById('goMyShots').innerText = myShotsHit + "/" + myShotsFired;
        
        renderLineGraph("performance-graph", myAccHistory, '#22e0ff'); audio.gameover(true);
        playAgainBtn.style.display = 'block'; 
    } else {
        playAgainBtn.style.display = 'none';
        document.getElementById('btnToggleCarousel').style.display = 'inline-block';
        
        let players = [{name: myUsername, score: myScore, maxCombo: myMaxCombo}];
        if (gameMode === 'DUEL') players.push({name: peerUsername, score: peerScore, maxCombo: peerMaxCombo});
        if (gameMode === 'SQUAD') Object.values(squadPlayers).forEach(p => players.push({name: p.name, score: p.score, maxCombo: p.combo}));
        
        const top3 = players.sort((a, b) => {
            if (b.score === a.score) return b.maxCombo - a.maxCombo;
            return b.score - a.score;
        }).slice(0, 3);
        
        document.getElementById('top3-list').innerHTML = top3.map((p, i) => `<li>#${i + 1} ${p.name} <span>${p.score}</span></li>`).join('');

        if (top3[0].name === myUsername) { 
            title.innerText = "VICTORY"; title.style.color = "#8dff5a"; title.style.textShadow = "0 0 30px #8dff5a"; audio.gameover(true); 
        } else if (top3[0].score === myScore && top3[0].name !== myUsername) {
            title.innerText = "DRAW"; title.style.color = "#ffb020"; title.style.textShadow = "0 0 30px #ffb020";
        } else { 
            title.innerText = "DEFEAT"; title.style.color = "#ff3b3b"; title.style.textShadow = "0 0 30px #ff3b3b"; audio.gameover(false); 
        } 
        
        document.getElementById('goMyAcc').innerText = myAcc + "%"; document.getElementById('goMyMaxCombo').innerText = 'x' + Math.floor(myMaxCombo); document.getElementById('goMyShots').innerText = myShotsHit + "/" + myShotsFired;
        renderLineGraph("performance-graph", myAccHistory, '#22e0ff'); 
    }
    
    title.style.display = 'block'; returnBtn.style.display = 'block';
}

document.getElementById('returnBtn').addEventListener('click', () => {
    if (gameMode === 'SOLO') { 
        resetToHub(); 
    } else { 
        if (connection && connection.open) connection.send({ type: 'reset_lobby' }); 
        if (gameMode === 'SQUAD' && window.trysteroSendState) window.trysteroSendState({ type: 'reset_lobby' });
        window.softResetToMatchLobby();
    } 
});

const weaponToggleBtn = document.getElementById('weaponToggle');
const weaponText = document.getElementById('weaponText');
if(weaponToggleBtn) { 
    weaponToggleBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); currentWeaponIdx = (currentWeaponIdx + 1) % WEAPONS.length; const w = WEAPONS[currentWeaponIdx]; 
        weaponText.innerText = w.name; weaponToggleBtn.style.color = w.color; weaponToggleBtn.style.borderColor = w.color; 
    }); 
}

function showNotification(text, colorHex) {
    const el = document.getElementById('inGameNotification');
    el.innerText = text; el.style.color = colorHex; el.style.opacity = 1;
    clearTimeout(notifyTimeout); notifyTimeout = setTimeout(() => { el.style.opacity = 0; }, 1500);
}

function drawOctagon(canvasCtx, x, y, r, rotationOffset = 0) {
    canvasCtx.beginPath();
    for(let i=0; i<8; i++) {
        const a = (i * Math.PI / 4) + rotationOffset; const px = x + r * Math.cos(a); const py = y + r * Math.sin(a);
        if(i===0) canvasCtx.moveTo(px, py); else canvasCtx.lineTo(px, py);
    }
    canvasCtx.closePath(); canvasCtx.stroke();
}

function spawnTarget() {
    if (targets.filter(t => t.active).length >= calculateMaxTargets()) return;
    const typeRoll = Math.random(); let anomalyType = 'standard', targetColor = '141, 255, 90', speed = 0.15 + Math.random() * 0.2; 
    if (typeRoll > 0.9) { anomalyType = 'gold'; targetColor = '255, 213, 74'; speed *= 1.6; } 
    else if (typeRoll > 0.8 && allowEMPs) { anomalyType = 'emp'; targetColor = '34, 224, 255'; }
    
    const angle = Math.random() * Math.PI * 2;
    const t = { id: Date.now() + Math.random(), x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, r: 0.04, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 8, active: true, anomaly: anomalyType, rgb: targetColor };
    targets.push(t); 
    
    if (gameMode === 'DUEL' && connection && connection.open) connection.send({ type: 'spawn', target: t });
    if (gameMode === 'SQUAD' && window.trysteroSendSpawn) window.trysteroSendSpawn(t);
}

function triggerJam() {
    isJammed = true; screenShake = 20; audio.jam(); haptics.jam();
    document.body.classList.add('emp-glitch'); peripheralFlashOpacity = 1.0;
    const overlay = document.getElementById('jamOverlay'); overlay.style.display = 'flex'; isTriggerDown = false; 
    setTimeout(() => { isJammed = false; overlay.style.display = 'none'; document.body.classList.remove('emp-glitch'); }, 2000); 
}

canvas.addEventListener('pointerdown', (e) => { 
    if (e.pointerType === 'touch' && (e.clientY < 24 || e.clientY > window.innerHeight - 24)) return; 
    canvas.setPointerCapture(e.pointerId); audio.init(); 

    if (e.pointerType === 'mouse') {
        myAim.x = Math.max(0, Math.min(1, e.clientX / window.innerWidth)); 
        myAim.y = Math.max(0, Math.min(1, e.clientY / window.innerHeight)); 
        isTriggerDown = true; 
        if (!isJammed && !isMatchOver) attemptFire(performance.now() / 1000);
    } else {
        if (e.clientX < window.innerWidth / 2) {
            aimPointerId = e.pointerId;
            joystick.active = true;
            joystick.originX = e.clientX; joystick.originY = e.clientY;
            joystick.deltaX = 0; joystick.deltaY = 0;
        } else {
            shootPointerId = e.pointerId;
            isTriggerDown = true;
            if (!isJammed && !isMatchOver) attemptFire(performance.now() / 1000);
        }
    }
});

canvas.addEventListener('pointermove', (e) => { 
    if (e.pointerType === 'mouse') {
        myAim.x = Math.max(0, Math.min(1, e.clientX / window.innerWidth)); 
        myAim.y = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
    } else {
        if (e.pointerId === aimPointerId && joystick.active) {
            let dx = e.clientX - joystick.originX;
            let dy = e.clientY - joystick.originY;
            let dist = Math.hypot(dx, dy);
            
            const maxDist = joystick.radius - 15;
            if (dist > maxDist) { 
                dx = (dx / dist) * maxDist; 
                dy = (dy / dist) * maxDist; 
            }
            joystick.deltaX = dx; joystick.deltaY = dy;
        }
    }
    const now = performance.now(); 
    if (now - lastAimSendTime > 30) {
        lastAimSendTime = now;
        if (gameMode === 'DUEL' && connUnreliable && connUnreliable.open) connUnreliable.send({ type: 'aim', x: myAim.x, y: myAim.y }); 
        if (gameMode === 'SQUAD' && window.trysteroSendAim) window.trysteroSendAim({ x: myAim.x, y: myAim.y });
    }
});

function handlePointerEnd(e) {
    canvas.releasePointerCapture(e.pointerId); 
    if (e.pointerType === 'mouse') { isTriggerDown = false; } else {
        if (e.pointerId === aimPointerId) { joystick.active = false; aimPointerId = null; }
        if (e.pointerId === shootPointerId) { shootPointerId = null; isTriggerDown = false; }
    }
}
canvas.addEventListener('pointerup', handlePointerEnd); canvas.addEventListener('pointercancel', handlePointerEnd);

function attemptFire(nowInSeconds) {
    if (isJammed || isMatchOver) return; 
    const w = WEAPONS[currentWeaponIdx];
    if (nowInSeconds - lastShotTime >= w.rof) {
        lastShotTime = nowInSeconds; const identity = isHost ? 'Host' : 'Peer'; audio.shoot(w); haptics.shoot(w.id); myShotsFired += w.pellets; 
        if (w.id === '[ RAIL ]') { railTrails.push({x: myAim.x, y: myAim.y, life: 1.5}); screenShake = 10; } 
        if (w.id === '[ AEGIS ]') { shockwaves.push({x: myAim.x, y: myAim.y, life: 1, maxR: 0.15}); screenShake = 8; }
        
        if (gameMode === 'DUEL' && connection && connection.open) connection.send({ type: 'shoot_anim', x: myAim.x, y: myAim.y, shooter: identity, weaponId: w.id });
        if (gameMode === 'SQUAD' && window.trysteroSendShoot) window.trysteroSendShoot({ x: myAim.x, y: myAim.y, weaponId: w.id });
        
        let flashCount = Math.max(1, Math.floor(w.pellets * globalParticleThrottle));
        for(let i = 0; i < flashCount; i++) {
            const shotX = myAim.x + (Math.random() - 0.5) * w.spread, shotY = myAim.y + (Math.random() - 0.5) * w.spread; flashes.push({ x: shotX, y: shotY, color: w.color, age: 0, poly: w.id!=='[ PULSE ]' }); checkHit(shotX, shotY, identity, w);
        }
        if (!w.auto) isTriggerDown = false; 
    }
}

function checkHit(shotX, shotY, shooterIdentity, weapon) {
    const hitTarget = targets.find(t => { if (!t.active) return false; return Math.hypot(shotX * canvas.width - t.x * canvas.width, shotY * canvas.height - t.y * canvas.height) <= (t.r * Math.min(canvas.width, canvas.height) * 1.5); });
    if (hitTarget) {
        hitMarkers.push({ x: shotX, y: shotY, age: 0 });
        if (gameMode === 'SOLO') {
            executeHit(hitTarget, 'Host', weapon.damage);
        } else if (gameMode === 'DUEL') {
            if (isHost) { 
                executeHit(hitTarget, 'Host', weapon.damage); 
                if (connection && connection.open) connection.send({ type: 'confirm_hit', target: hitTarget, shooter: 'Host', damage: weapon.damage, shotX: shotX, shotY: shotY }); 
            } else { 
                hitTarget.active = false; 
                if (connection && connection.open) connection.send({ type: 'claim_hit', targetId: hitTarget.id, shooter: 'Peer', weaponId: weapon.id, shotX: shotX, shotY: shotY }); 
            }
        } else if (gameMode === 'SQUAD') {
            hitTarget.active = false;
            executeHit(hitTarget, 'Me', weapon.damage);
            if (window.trysteroSendHit) window.trysteroSendHit({ targetId: hitTarget.id, damage: weapon.damage, shotX: shotX, shotY: shotY });
        }
    }
}

function executeHit(targetData, shooterIdentity, baseDamage) {
    const localTarget = targets.find(t => t.id === (targetData.id || targetData)); if (localTarget) localTarget.active = false;
    const isMe = (gameMode === 'SOLO' || gameMode === 'SQUAD') ? (shooterIdentity === 'Me' || shooterIdentity === 'Host') : (shooterIdentity === 'Host' ? isHost : !isHost);
    const nowInSeconds = performance.now() / 1000;
    let finalDamage = baseDamage; if (targetData.anomaly === 'gold') finalDamage *= 3; 
    
    if (localTarget) {
        fct.push({ x: localTarget.x, y: localTarget.y, text: finalDamage, life: 1, vx: (Math.random()-0.5)*0.1, vy: -0.1 });
        let shardCount = Math.max(1, Math.floor(6 * globalParticleThrottle));
        for(let i=0; i<shardCount; i++) {
            const a = Math.random() * Math.PI*2; const v = 0.05 + Math.random()*0.1;
            shards.push({ x: localTarget.x, y: localTarget.y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, life: 1, color: `rgba(${targetData.rgb},1)` });
        }
    }

    if (isMe) {
        playHitTick();
        let isPerfect = (targetData.anomaly === 'gold');
        let isDouble = (nowInSeconds - myLastHitTime < 0.4 && myShotsHit > 0);
        
        myShotsHit++; myCombo += 0.5; myLastHitTime = nowInSeconds; myScore += Math.floor(finalDamage * Math.floor(myCombo));
        if (myCombo > myMaxCombo) myMaxCombo = myCombo;
        let isCombo = (Math.floor(myCombo) > 1 && Math.floor(myCombo) % 5 === 0 && myCombo % 1 === 0);

        if (isPerfect) { showNotification("PERFECT HIT", "#ffd54a"); audio.perfectHit(); audio.announce("Perfect Hit"); }
        else if (isCombo) { showNotification("COMBO " + Math.floor(myCombo) + "X", "#8dff5a"); audio.comboStreak(); audio.announce("Combo Streak"); }
        else if (isDouble) { showNotification("DOUBLE HIT", "#22e0ff"); audio.doubleHit(); audio.announce("Double Hit"); }
        else audio.hit(false);
        haptics.hit();

        document.getElementById('myScore').innerText = myScore; document.getElementById('myCombo').innerText = 'x' + Math.floor(myCombo);
        
        if (targetData.anomaly === 'emp') { 
            if (gameMode === 'DUEL' && connection) connection.send({ type: 'emp_attack' }); 
            if (gameMode === 'SQUAD' && window.trysteroSendEmp) window.trysteroSendEmp({});
        }
    } else {
        if (nowInSeconds - peerLastHitTime < 0.4 && peerShotsHit > 0) audio.doubleHit();
        peerShotsHit++; peerCombo += 0.5; peerLastHitTime = nowInSeconds; 
        
        if (gameMode === 'DUEL' || gameMode === 'SQUAD') {
            peerScore += Math.floor(finalDamage * Math.floor(peerCombo));
            if (peerCombo > peerMaxCombo) peerMaxCombo = peerCombo;
            document.getElementById('peerScore').innerText = peerScore; document.getElementById('peerCombo').innerText = 'x' + Math.floor(peerCombo);
        }
    }
}

function resize() { 
    if(canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
} 
window.addEventListener('resize', resize);

function drawCrosshair(normX, normY, color, wIdx = 0, currentCooldown = 1) {
    const px = normX * canvas.width, py = normY * canvas.height; ctx.strokeStyle = color; ctx.lineWidth = 2;
    const recoil = Math.max(0, (1 - currentCooldown) * 15); 
    
    if (wIdx === 0) { 
        ctx.beginPath(); ctx.moveTo(px - 14 - recoil, py); ctx.lineTo(px + 14 + recoil, py); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(px, py - 14 - recoil); ctx.lineTo(px, py + 14 + recoil); ctx.stroke(); 
    } 
    else if (wIdx === 1) { 
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.arc(px, py, 15 + recoil, performance.now()/500, Math.PI*2 + performance.now()/500); ctx.stroke(); ctx.setLineDash([]); 
    } 
    else if (wIdx === 2) { 
        ctx.beginPath(); ctx.moveTo(px - 10 - recoil, py - 10 - recoil); ctx.lineTo(px - 15 - recoil, py - 10 - recoil); ctx.lineTo(px - 15 - recoil, py + 10 + recoil); ctx.lineTo(px - 10 - recoil, py + 10 + recoil); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(px + 10 + recoil, py - 10 - recoil); ctx.lineTo(px + 15 + recoil, py - 10 - recoil); ctx.lineTo(px + 15 + recoil, py + 10 + recoil); ctx.lineTo(px + 10 + recoil, py + 10 + recoil); ctx.stroke(); 
    } 
    else { 
        ctx.beginPath(); ctx.moveTo(px, py - 12 - recoil); ctx.lineTo(px - 10 - recoil, py + 8 + recoil); ctx.lineTo(px + 10 + recoil, py + 8 + recoil); ctx.closePath(); ctx.stroke(); 
    }
}

function renderLoop(now) {
    if (!isGameRunning && timeScale === 1.0) return; 
    
    try {
        let dt = ((now - lastTime) / 1000) * timeScale; if (dt > 0.05) dt = 0.05; lastTime = now; const nowInSeconds = now / 1000;
        
        dtHistory.push(dt); if(dtHistory.length > 20) dtHistory.shift();
        let avgDt = dtHistory.reduce((a,b)=>a+b, 0) / dtHistory.length;
        globalParticleThrottle = (avgDt > 0.018 && isTouchDevice) ? 0.3 : 1.0;
        
        if (nowInSeconds - myLastHitTime > 3 && myCombo > 1) { myCombo = 1; document.getElementById('myCombo').innerText = 'x1'; peripheralFlashOpacity = 0.8; }
        if (nowInSeconds - peerLastHitTime > 3 && peerCombo > 1) { peerCombo = 1; document.getElementById('peerCombo').innerText = 'x1'; }
        
        const activeWeapon = WEAPONS[currentWeaponIdx];
        const cdProgress = Math.max(0, Math.min(1, (nowInSeconds - lastShotTime) / activeWeapon.rof));
        
        const weaponFill = document.getElementById('weaponFill');
        if (weaponFill) weaponFill.style.width = (100 - (cdProgress * 100)) + '%';

        const reconnectOverlay = document.getElementById('reconnectOverlay');
        if (gameMode !== 'SOLO' && connection && connection.open) {
            if (performance.now() - pingStart > 3500) { if (reconnectOverlay) reconnectOverlay.style.display = 'flex'; } 
            else { if (reconnectOverlay) reconnectOverlay.style.display = 'none'; }
        }

        if (isTouchDevice && !isJammed && !isMatchOver && autoFireEnabled && activeWeapon.auto) {
            let hovering = false;
            for (let i = 0; i < targets.length; i++) {
                if (!targets[i].active) continue;
                const dist = Math.hypot(myAim.x - targets[i].x, myAim.y - targets[i].y);
                if (dist <= targets[i].r * 1.2) { hovering = true; break; }
            }
            if (hovering) { autoFireHoverTime += dt * 1000; if (autoFireHoverTime >= 60) isTriggerDown = true; } else { autoFireHoverTime = 0; if (!shootPointerId) isTriggerDown = false; }
        }
        
        if (joystick.active && !isJammed && !isMatchOver) {
            // FIXED: Speed multiplier is now dynamically powered by the player's custom sensitivity slider
            myAim.x = Math.max(0, Math.min(1, myAim.x + (joystick.deltaX / joystick.radius) * joystickSensitivity * dt));
            myAim.y = Math.max(0, Math.min(1, myAim.y + (joystick.deltaY / joystick.radius) * joystickSensitivity * dt));
        }
        
        if (isTriggerDown) attemptFire(nowInSeconds);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (currentMatchTime <= 10 && !isMatchOver) {
            const pulseAlpha = (Math.sin(performance.now() / 150) + 1) / 2; 
            const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/4, canvas.width/2, canvas.height/2, canvas.height);
            grad.addColorStop(0, 'rgba(255,0,0,0)');
            grad.addColorStop(1, `rgba(255,0,0,${pulseAlpha * 0.4})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.save();
        if (shakeEnabled) {
            screenShake *= Math.exp(-10 * dt); if (screenShake > 0.5) ctx.translate((Math.random() * 2 - 1) * screenShake, (Math.random() * 2 - 1) * screenShake);
        }

        let threatNearTop = false;

        targets.forEach(t => {
            if (!t.active) return; t.life -= dt; if (t.life <= 0) { t.active = false; return; }
            t.x += t.vx * dt; t.y += t.vy * dt;
            if (t.x - t.r <= 0) { t.x = t.r; t.vx *= -1; } if (t.x + t.r >= 1) { t.x = 1 - t.r; t.vx *= -1; }
            if (t.y - t.r <= 0.1) { t.y = 0.1 + t.r; t.vy *= -1; } if (t.y + t.r >= 1) { t.y = 1 - t.r; t.vy *= -1; }
            const px = t.x * canvas.width, py = t.y * canvas.height, radiusPx = t.r * Math.min(canvas.width, canvas.height), opacity = Math.min(1, t.life); 
            
            if (t.y < 0.25) threatNearTop = true;

            ctx.strokeStyle = `rgba(${t.rgb}, ${opacity})`; ctx.lineWidth = 3; ctx.fillStyle = `rgba(${t.rgb}, ${opacity * 0.15})`;
            drawOctagon(ctx, px, py, radiusPx, (timeScale === 0.05 ? 0 : performance.now() / 1000)); ctx.fill();
            ctx.beginPath(); ctx.arc(px, py, radiusPx + 10, performance.now()/500, Math.PI + performance.now()/500); ctx.stroke();

            if (!isMatchOver) {
                const dx = t.x - myAim.x; const dy = t.y - myAim.y; const dist = Math.hypot(dx, dy);
                if (dist > 0.25) {
                    const angle = Math.atan2(dy, dx);
                    const ix = myAim.x * canvas.width + Math.cos(angle) * 45; const iy = myAim.y * canvas.height + Math.sin(angle) * 45;
                    ctx.save(); ctx.translate(ix, iy); ctx.rotate(angle);
                    ctx.strokeStyle = `rgba(${t.rgb}, ${opacity * 0.8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 0); ctx.lineTo(-6, 6); ctx.stroke(); ctx.restore();
                }
            }
        });

        const timerEl = document.getElementById('timerDisplay'); const scoreEl = document.getElementById('scoreHudContainer');
        if (threatNearTop) { timerEl.classList.add('threat-shade'); scoreEl.classList.add('threat-shade'); } else { timerEl.classList.remove('threat-shade'); scoreEl.classList.remove('threat-shade'); }

        if (peripheralFlashOpacity > 0 && !isMatchOver) {
            peripheralFlashOpacity -= dt * 2;
            document.getElementById('damageFlash').style.opacity = Math.max(0, peripheralFlashOpacity);
        }

        for (let i = shards.length - 1; i >= 0; i--) { const s = shards[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; ctx.fillStyle = s.color; ctx.globalAlpha = Math.max(0, s.life); ctx.fillRect(s.x * canvas.width, s.y * canvas.height, 4, 4); ctx.globalAlpha = 1.0; if (s.life <= 0) shards.splice(i, 1); }
        for (let i = fct.length - 1; i >= 0; i--) { const f = fct[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 0.2 * dt; f.life -= dt; ctx.fillStyle = `rgba(255,255,255,${Math.max(0, f.life)})`; ctx.font = 'bold 22px monospace'; ctx.fillText(f.text, f.x * canvas.width, f.y * canvas.height); if (f.life <= 0) fct.splice(i, 1); }
        for (let i = shockwaves.length - 1; i >= 0; i--) { const s = shockwaves[i]; s.life -= dt * 2; const r = (1 - s.life) * s.maxR * canvas.width; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, s.life)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.x * canvas.width, s.y * canvas.height, r, 0, Math.PI*2); ctx.stroke(); if (s.life <= 0) shockwaves.splice(i, 1); }
        for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.age += dt * 20; ctx.strokeStyle = f.color; ctx.globalAlpha = Math.max(0, 1 - f.age); ctx.lineWidth = 4; if(f.poly) drawOctagon(ctx, f.x * canvas.width, f.y * canvas.height, 25 * f.age); else { ctx.beginPath(); ctx.arc(f.x * canvas.width, f.y * canvas.height, 25 * f.age, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1.0; if (f.age > 1) flashes.splice(i, 1); }
        for (let i = hitMarkers.length - 1; i >= 0; i--) { const hm = hitMarkers[i]; hm.age += dt * 4; const size = 10, px = hm.x * canvas.width, py = hm.y * canvas.height; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(0, 1 - hm.age); ctx.beginPath(); ctx.moveTo(px - size, py - size); ctx.lineTo(px + size, py + size); ctx.moveTo(px + size, py - size); ctx.lineTo(px - size, py + size); ctx.stroke(); ctx.globalAlpha = 1.0; if (hm.age > 1) hitMarkers.splice(i, 1); }
        
        if (joystick.active) { joystickAlpha = Math.min(0.8, joystickAlpha + dt * 5); } 
        else { joystickAlpha = Math.max(0.1, joystickAlpha - dt * 2); }

        if (joystickAlpha > 0.11 || joystick.active) { 
            ctx.beginPath(); ctx.strokeStyle = `rgba(34, 224, 255, ${joystickAlpha * 0.5})`; ctx.lineWidth = 2; 
            ctx.arc(joystick.originX, joystick.originY, joystick.radius, 0, Math.PI * 2); ctx.stroke(); 
            ctx.beginPath(); ctx.fillStyle = `rgba(34, 224, 255, ${joystickAlpha})`; 
            ctx.arc(joystick.originX + joystick.deltaX, joystick.originY + joystick.deltaY, 15, 0, Math.PI * 2); ctx.fill(); 
        }
        
        if (gameMode === 'DUEL') drawCrosshair(peerAim.x, peerAim.y, '#ff2d95');
        if (gameMode === 'SQUAD') {
            Object.values(squadAims).forEach(aim => {
                const color = (aim.team === 'blue') ? '#22e0ff' : '#ff2d95';
                drawCrosshair(aim.x, aim.y, color);
            });
        }
        
        if (!isJammed && !isMatchOver) drawCrosshair(myAim.x, myAim.y, activeWeapon.color, currentWeaponIdx, cdProgress);
        
    } catch (e) {
        console.error("CRITICAL ENGINE ERROR:", e);
    } finally {
        ctx.restore(); 
        ctx.globalAlpha = 1.0;
        targets = targets.filter(t => t.active); 
        requestAnimationFrame(renderLoop);
    }
}

const bgCanvas = document.getElementById('bgCanvas'); const bgCtx = bgCanvas.getContext('2d', { alpha: false });
function resizeBg() { 
    bgCanvas.width = window.innerWidth / 2; 
    bgCanvas.height = window.innerHeight / 2; 
    bgCanvas.style.width = window.innerWidth + 'px';
    bgCanvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeBg);
resizeBg();

function renderBgLoop() {
    bgCtx.fillStyle = '#030407';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    const cx = bgCanvas.width / 2, cy = bgCanvas.height / 2;
    const maxR = Math.max(bgCanvas.width, bgCanvas.height); 
    
    rgbHue = (rgbHue + 0.5) % 360;
    const freq = audio.getFreq(); const eqPulse = freq / 255; 
    
    const tunnelOpacity = isGameRunning ? 0.08 : 0.25; 
    bgZ -= 0.005; if(bgZ <= 0) bgZ += 0.2; 

    for(let i=0; i<8; i++) {
        let z = bgZ + (i * 0.125); if (z > 1) z -= 1.0; if (z <= 0) continue;
        const scale = 1 / z; const r = maxR * scale * 0.05 * (1 + eqPulse * 0.2); const opacity = Math.min(1, (1 - z) * 2) * tunnelOpacity; 
        
        bgCtx.beginPath(); bgCtx.strokeStyle = `hsla(${rgbHue}, 100%, 50%, ${opacity})`; bgCtx.lineWidth = Math.min(4, (1 / z)); 
        for(let j=0; j<8; j++) { 
            const a = (j * Math.PI / 4) + (performance.now()/5000); const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); 
            if(j===0) bgCtx.moveTo(px, py); else bgCtx.lineTo(px, py); 
        }
        bgCtx.closePath(); bgCtx.stroke();
    }

    if(Math.random() > 0.5 && streams.length < 30) {
        streams.push({ angle: (Math.floor(Math.random()*8) * Math.PI / 4), z: 1.0, speed: 0.02 + Math.random()*0.02, length: 0.1 + Math.random()*0.2 });
    }
    
    for(let i=streams.length-1; i>=0; i--) {
        const st = streams[i]; st.z -= st.speed; if(st.z <= 0) { streams.splice(i, 1); continue; } 
        const scaleFront = 1 / st.z, rFront = maxR * scaleFront * 0.05 * (1 + eqPulse * 0.2);
        const backZ = Math.min(1.0, st.z + st.length), scaleBack = 1 / backZ, rBack = maxR * scaleBack * 0.05 * (1 + eqPulse * 0.2);
        const a = st.angle + (performance.now()/5000); 
        
        bgCtx.beginPath(); bgCtx.strokeStyle = `hsla(${rgbHue + 180}, 100%, 60%, ${(1 - st.z) * (isGameRunning ? 0.2 : 0.6)})`; bgCtx.lineWidth = Math.min(5, 1 / st.z);
        bgCtx.moveTo(cx + rBack * Math.cos(a), cy + rBack * Math.sin(a)); bgCtx.lineTo(cx + rFront * Math.cos(a), cy + rFront * Math.sin(a)); bgCtx.stroke();
    }

    requestAnimationFrame(renderBgLoop);
}
renderBgLoop();
