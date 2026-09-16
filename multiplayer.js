// multiplayer.js - V-FACTOR STUDIOS

window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); }
        checkLoginStatus(); 
    }, 2000);
});

// --- AUDIO ENGINE ---
const audio = (() => {
    let ac = null, master = null, muted = false;
    function ensure() {
        if (!ac && !muted) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.4; master.connect(ac.destination); }
    }
    function tone(f, dur, g, type='sine', slide) {
        if(muted || !ac) return;
        const o = ac.createOscillator(), gg = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, ac.currentTime);
        if(slide) o.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + dur);
        gg.gain.setValueAtTime(0, ac.currentTime); gg.gain.linearRampToValueAtTime(g, ac.currentTime + 0.01);
        gg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur); o.connect(gg).connect(master); o.start(); o.stop(ac.currentTime + dur);
    }
    function noise(dur, f0, f1, g) {
        if(muted || !ac) return;
        const n = ac.sampleRate * dur, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
        for(let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), gg = ac.createGain();
        src.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(f0, ac.currentTime);
        if(f1) f.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
        gg.gain.value = g; src.connect(f).connect(gg).connect(master); src.start();
    }
    return {
        init: () => { if (!muted && !ac) ensure(); if (ac && ac.state === 'suspended') ac.resume(); },
        toggle: () => { muted = !muted; return muted; },
        shoot: (w) => {
            ensure();
            if(w.id === 'PULSE') tone(900, 0.1, 0.1, 'square', 400); else if(w.id === 'RAIL') { noise(0.4, 3000, 100, 0.8); tone(150, 0.4, 0.5, 'sine', 40); } else if(w.id === 'AEGIS') { noise(0.3, 1500, 200, 0.5); tone(200, 0.3, 0.4, 'sine', 80); } else if(w.id === 'FLUX') tone(1200, 0.15, 0.1, 'triangle', 800);
        },
        hit: (isGold) => { ensure(); tone(isGold ? 1200 : 800, 0.15, 0.2, 'triangle', isGold ? 2000 : 1200); },
        jam: () => { ensure(); noise(1.0, 500, 100, 0.5); tone(200, 1.0, 0.3, 'sawtooth', 50); },
        gameover: (win) => { ensure(); if(win) { tone(400,0.2,0.2,'sine',600); setTimeout(()=>tone(600,0.4,0.2,'sine',800), 200); } else { tone(300, 0.5, 0.2, 'sawtooth', 100); } }
    };
})();

const btnGlobalSound = document.getElementById('btnGlobalSound');
if(btnGlobalSound) {
    btnGlobalSound.addEventListener('click', () => {
        const isMuted = audio.toggle();
        btnGlobalSound.innerText = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
        btnGlobalSound.style.color = isMuted ? '#ff3b3b' : '#22e0ff'; btnGlobalSound.style.borderColor = isMuted ? '#ff3b3b' : '#22e0ff';
    });
}

document.getElementById('btnOpenGuide').addEventListener('click', () => document.getElementById('guideModal').style.display = 'flex');
document.getElementById('btnCloseGuide').addEventListener('click', () => document.getElementById('guideModal').style.display = 'none');

// --- LOGIN & AUTHENTICATION (UPDATED SYSTEM) ---
let myUsername = "Player"; 
const usernameInput = document.getElementById('regUsername');
const passwordInput = document.getElementById('regPassword');

function checkLoginStatus() { 
    const savedUser = sessionStorage.getItem('vfactor_username') || localStorage.getItem('vfactor_username'); 
    if (savedUser) { 
        myUsername = savedUser; 
        enterHub(); 
    } else {
        document.getElementById('loginUI').style.display = 'flex';
    }
}

document.getElementById('btnLogin').addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;
    const lowerUser = user.toLowerCase();
    
    if (user === "") { alert("Please enter a username."); return; }
    if (pass === "") { alert("Please enter a password to secure your ID."); return; }
    
    // Developer Override
    if ((lowerUser === 'vinay' || lowerUser === 'admin') && pass !== 'VFACTOR238') { 
        alert("SECURITY ALERT: Invalid Developer Password."); 
        return; 
    }

    // New Password Vault Logic
    const storageKey = 'vfactor_pass_' + lowerUser;
    const savedPass = localStorage.getItem(storageKey);

    if (savedPass) {
        if (savedPass !== pass) {
            alert("Incorrect password for this Username. Please try again.");
            return;
        }
    } else {
        // Create new ID and tie password to it
        localStorage.setItem(storageKey, pass);
    }

    myUsername = user; 
    localStorage.setItem('vfactor_username', user); 
    sessionStorage.setItem('vfactor_username', user);
    enterHub();
});

document.getElementById('btnGuest').addEventListener('click', () => { 
    myUsername = "Guest_" + Math.floor(Math.random() * 9999); 
    sessionStorage.setItem('vfactor_username', myUsername);
    enterHub(); 
});

function enterHub() {
    document.getElementById('loginUI').style.display = 'none';
    document.getElementById('lobby').style.display = 'flex';
    document.getElementById('hubUsernameDisplay').innerText = myUsername;
    
    document.getElementById('btnGlobalSound').style.display = 'block';
    document.getElementById('btnOpenGuide').style.display = 'block';
    
    if (gameMode === 'DUEL') document.getElementById('statusContainer').style.display = 'block'; 
}

// --- HUB & UI ROUTING ---
let gameMode = 'SOLO'; 
let hostMatchTime = 60;
const btnPrimarySolo = document.getElementById('btnPrimarySolo'); 
const btnPrimaryMulti = document.getElementById('btnPrimaryMulti');
const subModes = document.getElementById('subModes'); 
const networkControls = document.getElementById('networkControls');
const launchSoloBtn = document.getElementById('launchSoloBtn'); 
const statusContainer = document.getElementById('statusContainer');

btnPrimarySolo.addEventListener('click', () => {
    gameMode = 'SOLO'; btnPrimarySolo.classList.add('active'); btnPrimaryMulti.classList.remove('active');
    subModes.style.display = 'none'; networkControls.style.display = 'none'; statusContainer.style.display = 'none'; launchSoloBtn.style.display = 'block';
});

btnPrimaryMulti.addEventListener('click', () => {
    gameMode = 'DUEL'; btnPrimaryMulti.classList.add('active'); btnPrimarySolo.classList.remove('active');
    subModes.style.display = 'grid'; launchSoloBtn.style.display = 'none'; networkControls.style.display = 'block'; statusContainer.style.display = 'block';
});

document.getElementById('btnSquad').addEventListener('click', () => {
    alert("2v2 SQUAD Mode is COMING SOON! Master your skills in 1v1 DUEL first.");
});

document.getElementById('matchTimeSetting').addEventListener('change', (e) => {
    let val = parseInt(e.target.value) || 60; val = Math.max(60, Math.min(300, val)); e.target.value = val; hostMatchTime = val;
    if (connection && connection.open && isHost) { connection.send({ type: 'update_time', time: hostMatchTime }); updateMatchLobbyUI(); }
});

document.getElementById('copyIdBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('playerId').innerText); 
    const btn = document.getElementById('copyIdBtn'); btn.innerText = "COPIED!"; btn.style.background = "#fff";
    setTimeout(() => { btn.innerText = "COPY"; btn.style.background = "#8dff5a"; }, 1500);
});

document.getElementById('launchSoloBtn').addEventListener('click', () => {
    isHost = true; hostMatchTime = 60; document.getElementById('peerScoreBlock').style.display = 'none'; runCountdown(hostMatchTime);
});

// --- CORE PHYSICS VARIABLES ---
const WEAPONS = [ { id: 'PULSE', name: 'PULSE [SMG]', auto: true, rof: 0.1, spread: 0.05, pellets: 1, damage: 10, color: '#22e0ff' }, { id: 'RAIL', name: 'RAIL [SNIPER]', auto: false, rof: 1.2, spread: 0.0, pellets: 1, damage: 100, color: '#ff2d95' }, { id: 'AEGIS', name: 'AEGIS [SHOTGUN]', auto: false, rof: 0.8, spread: 0.15, pellets: 6, damage: 20, color: '#ffb020' }, { id: 'FLUX', name: 'FLUX [BURST]', auto: true, rof: 0.4, spread: 0.04, pellets: 3, damage: 30, color: '#8dff5a' } ];
let currentWeaponIdx = 0; let isTriggerDown = false; let lastShotTime = 0; let isJammed = false;
let targets = [], flashes = [], hitMarkers = []; let screenShake = 0, lastTime = performance.now();

const myAim = { x: 0.5, y: 0.5 }; 
const peerAim = { x: 0.5, y: 0.5 }; 

let myScore = 0, peerScore = 0; let myCombo = 1, peerCombo = 1; let myLastHitTime = 0, peerLastHitTime = 0;
let myShotsFired = 0, myShotsHit = 0; let peerShotsFired = 0, peerShotsHit = 0;

const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');

// --- NETWORK CORE ---
const peer = new Peer();
let connection = null; 
let isHost = false;
let isPeerReady = false;
let peerUsername = "Waiting...";

peer.on('open', (id) => { 
    if(document.getElementById('playerId')) document.getElementById('playerId').innerText = id; 
    document.getElementById('status').innerText = 'Online'; document.getElementById('status').style.color = '#8dff5a';
});

peer.on('connection', (conn) => {
    if (gameMode === 'SOLO') { conn.close(); return; }
    isHost = true; connection = conn;
    document.getElementById('status').innerText = 'Connected';
    triggerSkeletonLoader(); setupChannel();
});

document.getElementById('connectBtn').addEventListener('click', () => {
    const targetId = document.getElementById('joinId').value.trim();
    if (targetId) {
        document.getElementById('status').innerText = 'Authenticating...';
        triggerSkeletonLoader();
        connection = peer.connect(targetId, { reliable: true });
        setupChannel();
    }
});

function triggerSkeletonLoader() { document.getElementById('lobby').style.display = 'none'; document.getElementById('skeletonUI').style.display = 'block'; }

document.getElementById('btnLeaveRoom').addEventListener('click', () => {
    if (connection && connection.open) { connection.send({ type: 'peer_left' }); }
    setTimeout(() => location.reload(), 150); 
});

// --- MATCH LOBBY & SLOTS ---
function enterMatchLobby() {
    document.getElementById('skeletonUI').style.display = 'none';
    document.getElementById('matchLobby').style.display = 'flex';
    document.getElementById('statusContainer').style.display = 'none'; 
    updateMatchLobbyUI();
}

function updateMatchLobbyUI() {
    document.getElementById('roomHostName').innerText = isHost ? myUsername : peerUsername;
    const peerNameEl = document.getElementById('roomPeerName');
    peerNameEl.innerText = (isHost ? peerUsername : myUsername) + (isPeerReady ? " (READY)" : "");
    peerNameEl.style.color = isPeerReady ? '#8dff5a' : '#ff2d95';
    
    hostMatchTime = parseInt(document.getElementById('matchTimeSetting').value) || 60;
    document.getElementById('roomMatchRules').innerText = `${gameMode} MODE | ${hostMatchTime} SECONDS`;

    const btnReady = document.getElementById('btnReady'), btnStart = document.getElementById('btnStartMatch'), btnTransfer = document.getElementById('btnTransferHost');
    const waitingText = document.getElementById('waitingText');

    if (isHost) {
        btnReady.style.display = 'none'; btnStart.style.display = 'block'; btnTransfer.style.display = 'block'; waitingText.style.display = 'none';
        if (isPeerReady) { btnStart.style.opacity = '1'; btnStart.style.pointerEvents = 'auto'; } 
        else { btnStart.style.opacity = '0.4'; btnStart.style.pointerEvents = 'none'; }
    } else {
        btnStart.style.display = 'none'; btnTransfer.style.display = 'none'; btnReady.style.display = 'block';
        if (isPeerReady) { btnReady.innerText = 'CANCEL READY'; btnReady.style.background = '#ffb020'; waitingText.style.display = 'block'; } 
        else { btnReady.innerText = 'READY'; btnReady.style.background = '#22e0ff'; waitingText.style.display = 'none'; }
    }
}

document.getElementById('btnReady').addEventListener('click', () => {
    isPeerReady = !isPeerReady;
    if (connection && connection.open) connection.send({ type: 'peer_ready', ready: isPeerReady });
    updateMatchLobbyUI();
});

document.getElementById('btnStartMatch').addEventListener('click', () => {
    if (!isPeerReady) return; 
    if (connection && connection.open) connection.send({ type: 'start_countdown', time: hostMatchTime });
    runCountdown(hostMatchTime);
});

document.getElementById('btnTransferHost').addEventListener('click', () => {
    if (connection && connection.open) {
        connection.send({ type: 'transfer_host' });
        isHost = false; 
        isPeerReady = false; 
        updateMatchLobbyUI();
    }
});

function setupChannel() {
    connection.on('open', () => {
        document.getElementById('status').innerText = 'Connected';
        if (!isHost) connection.send({ type: 'auth_request', requestedName: myUsername });
    });

    connection.on('data', (data) => {
        // LOBBY SYNC
        if (data.type === 'auth_request' && isHost) {
            if (data.requestedName.toLowerCase() === myUsername.toLowerCase()) {
                connection.send({ type: 'auth_reject', suggestedName: data.requestedName + (Math.random() > 0.5 ? "_Neon" : "_Flux") });
                setTimeout(() => connection.close(), 500);
            } else {
                peerUsername = data.requestedName;
                connection.send({ type: 'auth_accept', hostName: myUsername, time: hostMatchTime });
                enterMatchLobby();
            }
        } 
        else if (data.type === 'auth_reject' && !isHost) { alert(`Username taken! Try using: ${data.suggestedName}`); location.reload(); } 
        else if (data.type === 'auth_accept' && !isHost) { peerUsername = data.hostName; hostMatchTime = data.time; enterMatchLobby(); } 
        else if (data.type === 'peer_ready') { isPeerReady = data.ready; updateMatchLobbyUI(); } 
        else if (data.type === 'update_time') { hostMatchTime = data.time; updateMatchLobbyUI(); } 
        else if (data.type === 'transfer_host') { isHost = true; isPeerReady = false; updateMatchLobbyUI(); } 
        else if (data.type === 'start_countdown') { runCountdown(data.time); } 
        else if (data.type === 'peer_left') { alert("The other player left the room."); location.reload(); }
        else if (data.type === 'reset_lobby') {
            document.getElementById('gameOverOverlay').style.display = 'none'; document.getElementById('gameCanvas').style.display = 'none'; document.getElementById('gameUI').style.display = 'none';
            targets = []; flashes = []; hitMarkers = []; isMatchOver = false; isGameRunning = false;
            myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0;
            isPeerReady = false; 
            document.getElementById('btnGlobalSound').style.display = 'block'; document.getElementById('btnOpenGuide').style.display = 'block';
            enterMatchLobby();
        }
        // GAMEPLAY SYNC
        else if (data.type === 'aim') { peerAim.x = data.x; peerAim.y = data.y; } 
        else if (data.type === 'spawn') { targets.push(data.target); } 
        else if (data.type === 'shoot_anim') {
            const w = WEAPONS.find(w => w.id === data.weaponId); peerShotsFired += w.pellets; 
            audio.shoot(w);
            for(let i = 0; i < w.pellets; i++) { flashes.push({ x: data.x + (Math.random() - 0.5) * w.spread, y: data.y + (Math.random() - 0.5) * w.spread, color: w.color, age: 0 }); }
            if (w.id === 'RAIL') screenShake = 10;
        } else if (data.type === 'claim_hit') {
            if (isHost) {
                const t = targets.find(t => t.id === data.targetId);
                if (t && t.active) {
                    executeHit(t, data.shooter, data.damage);
                    connection.send({ type: 'confirm_hit', target: t, shooter: data.shooter, damage: data.damage, shotX: data.shotX, shotY: data.shotY });
                }
            }
        } else if (data.type === 'confirm_hit') {
            executeHit(data.target, data.shooter, data.damage);
            if (data.shooter !== (isHost ? 'Host' : 'Peer')) hitMarkers.push({ x: data.shotX, y: data.shotY, age: 0 });
        } else if (data.type === 'emp_attack') { triggerJam(); }
    });
    
    connection.on('close', () => { 
        alert("Connection lost."); 
        location.reload(); 
    });
}

// --- GAMEPLAY INITIALIZATION ---
let isGameRunning = false;
let currentMatchTime = 60; 
let isMatchOver = false;
let clockInterval, spawnInterval;

function runCountdown(duration) {
    document.getElementById('lobby').style.display = 'none'; document.getElementById('matchLobby').style.display = 'none';
    document.getElementById('btnGlobalSound').style.display = 'none'; 
    document.getElementById('btnOpenGuide').style.display = 'none';
    
    const cdOverlay = document.getElementById('countdownOverlay'); cdOverlay.style.display = 'flex';
    let count = 3; cdOverlay.innerText = count; audio.init(); audio.hit(false); 
    const intv = setInterval(() => {
        count--;
        if (count > 0) { cdOverlay.innerText = count; audio.hit(false); } 
        else if (count === 0) { cdOverlay.innerText = "GO!"; cdOverlay.style.color = "#ff2d95"; audio.hit(true); } 
        else { clearInterval(intv); cdOverlay.style.display = 'none'; cdOverlay.style.color = "#8dff5a"; startGameplay(duration); }
    }, 1000);
}

function startGameplay(duration) {
    if (isGameRunning) return; isGameRunning = true; currentMatchTime = duration;
    
    document.getElementById('gameUI').style.display = 'block'; 
    canvas.style.display = 'block'; 
    document.getElementById('weaponToggle').style.display = 'block'; 
    
    document.getElementById('myNameDisplay').innerText = myUsername; 
    document.getElementById('peerNameDisplay').innerText = gameMode==='SOLO' ? "TRAINING" : peerUsername;
    
    resize(); if (isHost) spawnInterval = setInterval(spawnTarget, 1500); 
    
    const timerEl = document.getElementById('timerDisplay'); timerEl.innerText = currentMatchTime;
    clockInterval = setInterval(() => {
        currentMatchTime--; timerEl.innerText = currentMatchTime;
        if (currentMatchTime <= 10) { timerEl.classList.add('timer-hurry'); if (isHost && currentMatchTime === 10) { clearInterval(spawnInterval); spawnInterval = setInterval(spawnTarget, 750); } }
        if (currentMatchTime <= 0) { clearInterval(clockInterval); endMatch(); }
    }, 1000);
    requestAnimationFrame((now) => { lastTime = now; renderLoop(now); });
}

function endMatch() {
    isMatchOver = true; isTriggerDown = false; 
    if (isHost && spawnInterval) clearInterval(spawnInterval);
    
    const overlay = document.getElementById('gameOverOverlay'), title = document.getElementById('goTitle'), subtitle = document.getElementById('goSubtitle'), accDisplay = document.getElementById('goAccuracy'), returnBtn = document.getElementById('returnBtn');
    overlay.style.display = 'flex'; document.getElementById('weaponToggle').style.display = 'none';
    
    const myAcc = myShotsFired > 0 ? Math.round((myShotsHit / myShotsFired) * 100) : 0;
    const peerAcc = peerShotsFired > 0 ? Math.round((peerShotsHit / peerShotsFired) * 100) : 0;
    
    if (gameMode === 'SOLO') {
        title.innerText = "TRAINING COMPLETE"; title.style.color = "#22e0ff"; title.style.textShadow = "0 0 30px #22e0ff";
        subtitle.innerText = `${myUsername}: ${myScore} Pts`; accDisplay.innerText = `Accuracy: ${myAcc}%`; 
        returnBtn.innerText = "RETURN TO HUB";
        audio.gameover(true);
    } else {
        if (myScore > peerScore) { title.innerText = "VICTORY"; title.style.color = "#8dff5a"; title.style.textShadow = "0 0 30px #8dff5a"; audio.gameover(true); } 
        else if (myScore < peerScore) { title.innerText = "DEFEAT"; title.style.color = "#ff3b3b"; title.style.textShadow = "0 0 30px #ff3b3b"; audio.gameover(false); } 
        else { title.innerText = "DRAW"; title.style.color = "#ffb020"; title.style.textShadow = "0 0 30px #ffb020"; }
        subtitle.innerText = `${myUsername}: ${myScore}  |  ${peerUsername}: ${peerScore}`;
        accDisplay.innerText = `${myUsername} Accuracy: ${myAcc}%  |  ${peerUsername} Accuracy: ${peerAcc}%`;
        returnBtn.innerText = "RETURN TO MATCH ROOM";
    }
}

document.getElementById('returnBtn').addEventListener('click', () => {
    if (gameMode === 'SOLO') { 
        location.reload(); 
    } else { 
        if(connection && connection.open) connection.send({ type: 'reset_lobby' }); 
        
        document.getElementById('gameOverOverlay').style.display = 'none'; 
        document.getElementById('gameCanvas').style.display = 'none'; 
        document.getElementById('gameUI').style.display = 'none';
        targets = []; flashes = []; hitMarkers = []; isMatchOver = false; isGameRunning = false;
        myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0;
        document.getElementById('myScore').innerText = '0'; document.getElementById('peerScore').innerText = '0'; document.getElementById('myCombo').innerText = 'x1'; document.getElementById('peerCombo').innerText = 'x1';
        isPeerReady = false; 
        document.getElementById('btnGlobalSound').style.display = 'block'; 
        document.getElementById('btnOpenGuide').style.display = 'block';
        enterMatchLobby();
    } 
});

const weaponToggleBtn = document.getElementById('weaponToggle');
if(weaponToggleBtn) { 
    weaponToggleBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        currentWeaponIdx = (currentWeaponIdx + 1) % WEAPONS.length; 
        const w = WEAPONS[currentWeaponIdx]; 
        weaponToggleBtn.innerText = w.name; 
        weaponToggleBtn.style.color = w.color; 
        weaponToggleBtn.style.borderColor = w.color; 
    }); 
}

function spawnTarget() {
    if (targets.filter(t => t.active).length >= 6) return;
    const typeRoll = Math.random(); let anomalyType = 'standard', targetColor = '141, 255, 90', speed = 0.15 + Math.random() * 0.2; 
    if (typeRoll > 0.9) { anomalyType = 'gold'; targetColor = '255, 213, 74'; speed *= 1.6; } else if (typeRoll > 0.8) { anomalyType = 'emp'; targetColor = '34, 224, 255'; }
    const angle = Math.random() * Math.PI * 2;
    const t = { id: Date.now() + Math.random(), x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, r: 0.04, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 8, active: true, anomaly: anomalyType, rgb: targetColor };
    targets.push(t); 
    if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'spawn', target: t });
}

function triggerJam() {
    isJammed = true; screenShake = 20; audio.jam(); 
    const overlay = document.getElementById('jamOverlay'); 
    overlay.style.display = 'flex'; 
    isTriggerDown = false; 
    setTimeout(() => { isJammed = false; overlay.style.display = 'none'; }, 2000); 
}

// --- ULTRA-RESPONSIVE MOBILE TOUCH TARGETING ---
function setAim(e) { 
    myAim.x = Math.max(0, Math.min(1, e.clientX / window.innerWidth)); 
    myAim.y = Math.max(0, Math.min(1, e.clientY / window.innerHeight)); 
}
canvas.addEventListener('pointerdown', (e) => { 
    canvas.setPointerCapture(e.pointerId); 
    audio.init(); 
    setAim(e); 
    isTriggerDown = true; 
    
    // Instantaneous tap-fire response
    if (!isJammed && !isMatchOver) attemptFire(performance.now() / 1000);
});
canvas.addEventListener('pointermove', (e) => { 
    setAim(e); 
    if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'aim', x: myAim.x, y: myAim.y }); 
});
canvas.addEventListener('pointerup', (e) => { 
    canvas.releasePointerCapture(e.pointerId); 
    isTriggerDown = false; 
});
canvas.addEventListener('pointercancel', (e) => { 
    isTriggerDown = false; 
});

function attemptFire(nowInSeconds) {
    if (isJammed || isMatchOver) return; 
    const w = WEAPONS[currentWeaponIdx];
    if (nowInSeconds - lastShotTime >= w.rof) {
        lastShotTime = nowInSeconds; const identity = isHost ? 'Host' : 'Peer'; audio.shoot(w); 
        myShotsFired += w.pellets; 
        
        if (w.id === 'RAIL') screenShake = 15; if (w.id === 'AEGIS') screenShake = 8;
        if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'shoot_anim', x: myAim.x, y: myAim.y, shooter: identity, weaponId: w.id });
        for(let i = 0; i < w.pellets; i++) {
            const shotX = myAim.x + (Math.random() - 0.5) * w.spread, shotY = myAim.y + (Math.random() - 0.5) * w.spread; flashes.push({ x: shotX, y: shotY, color: w.color, age: 0 }); checkHit(shotX, shotY, identity, w.damage);
        }
        if (!w.auto) isTriggerDown = false; 
    }
}

function checkHit(shotX, shotY, shooterIdentity, baseDamage) {
    const hitTarget = targets.find(t => { if (!t.active) return false; return Math.hypot(shotX * canvas.width - t.x * canvas.width, shotY * canvas.height - t.y * canvas.height) <= (t.r * Math.min(canvas.width, canvas.height) * 1.5); });
    if (hitTarget) {
        hitMarkers.push({ x: shotX, y: shotY, age: 0 });
        if (isHost) {
            executeHit(hitTarget, 'Host', baseDamage);
            if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'confirm_hit', target: hitTarget, shooter: 'Host', damage: baseDamage, shotX: shotX, shotY: shotY });
        } else {
            hitTarget.active = false;
            if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'claim_hit', targetId: hitTarget.id, shooter: 'Peer', damage: baseDamage, shotX: shotX, shotY: shotY });
        }
    }
}

function executeHit(targetData, shooterIdentity, baseDamage) {
    const localTarget = targets.find(t => t.id === (targetData.id || targetData)); if (localTarget) localTarget.active = false;
    const isMe = (gameMode === 'SOLO') ? true : (shooterIdentity === 'Host' ? isHost : !isHost);
    const nowInSeconds = performance.now() / 1000;
    let finalDamage = baseDamage; if (targetData.anomaly === 'gold') finalDamage *= 3; audio.hit(targetData.anomaly === 'gold');
    
    if (isMe) {
        myShotsHit++; myCombo += 0.5; myLastHitTime = nowInSeconds; myScore += Math.floor(finalDamage * Math.floor(myCombo));
        document.getElementById('myScore').innerText = myScore; document.getElementById('myCombo').innerText = 'x' + Math.floor(myCombo);
        if (gameMode !== 'SOLO' && targetData.anomaly === 'emp') { if (isHost) connection.send({ type: 'emp_attack' }); else connection.send({ type: 'emp_attack' }); }
    } else {
        peerShotsHit++; peerCombo += 0.5; peerLastHitTime = nowInSeconds; peerScore += Math.floor(finalDamage * Math.floor(peerCombo));
        document.getElementById('peerScore').innerText = peerScore; document.getElementById('peerCombo').innerText = 'x' + Math.floor(peerCombo);
    }
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } window.addEventListener('resize', resize);
function drawCrosshair(normX, normY, color) {
    const px = normX * canvas.width, py = normY * canvas.height; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px, py + 14); ctx.stroke(); ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke();
}

function renderLoop(now) {
    if (!isGameRunning) return; 
    let dt = (now - lastTime) / 1000; if (dt > 0.05) dt = 0.05; lastTime = now; const nowInSeconds = now / 1000;
    
    if (nowInSeconds - myLastHitTime > 3 && myCombo > 1) { myCombo = 1; document.getElementById('myCombo').innerText = 'x1'; }
    if (nowInSeconds - peerLastHitTime > 3 && peerCombo > 1) { peerCombo = 1; document.getElementById('peerCombo').innerText = 'x1'; }
    
    if (isTriggerDown) attemptFire(nowInSeconds);

    ctx.fillStyle = '#05060b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    screenShake *= Math.exp(-10 * dt); ctx.save(); if (screenShake > 0.5) ctx.translate((Math.random() * 2 - 1) * screenShake, (Math.random() * 2 - 1) * screenShake);

    targets.forEach(t => {
        if (!t.active) return; t.life -= dt; if (t.life <= 0) { t.active = false; return; }
        t.x += t.vx * dt; t.y += t.vy * dt;
        if (t.x - t.r <= 0) { t.x = t.r; t.vx *= -1; } if (t.x + t.r >= 1) { t.x = 1 - t.r; t.vx *= -1; }
        if (t.y - t.r <= 0.1) { t.y = 0.1 + t.r; t.vy *= -1; } if (t.y + t.r >= 1) { t.y = 1 - t.r; t.vy *= -1; }
        const px = t.x * canvas.width, py = t.y * canvas.height, radiusPx = t.r * Math.min(canvas.width, canvas.height), opacity = Math.min(1, t.life); 
        ctx.strokeStyle = `rgba(${t.rgb}, ${opacity})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, radiusPx, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(${t.rgb}, ${opacity * 0.15})`; ctx.fill();
    });

    for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]; f.age += dt * 20;
        ctx.beginPath(); ctx.arc(f.x * canvas.width, f.y * canvas.height, 25 * f.age, 0, Math.PI * 2);
        ctx.strokeStyle = f.color; ctx.globalAlpha = Math.max(0, 1 - f.age); ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1.0; if (f.age > 1) flashes.splice(i, 1);
    }

    for (let i = hitMarkers.length - 1; i >= 0; i--) {
        const hm = hitMarkers[i]; hm.age += dt * 4; const size = 10, px = hm.x * canvas.width, py = hm.y * canvas.height;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(0, 1 - hm.age);
        ctx.beginPath(); ctx.moveTo(px - size, py - size); ctx.lineTo(px + size, py + size); ctx.moveTo(px + size, py - size); ctx.lineTo(px - size, py + size); ctx.stroke(); ctx.globalAlpha = 1.0; if (hm.age > 1) hitMarkers.splice(i, 1);
    }

    if (gameMode !== 'SOLO') drawCrosshair(peerAim.x, peerAim.y, '#ff2d95');
    if (!isJammed && !isMatchOver) drawCrosshair(myAim.x, myAim.y, WEAPONS[currentWeaponIdx].color);

    ctx.restore(); targets = targets.filter(t => t.active); requestAnimationFrame(renderLoop);
}
