// multiplayer.js - V-FACTOR STUDIOS

window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); }
        checkLoginStatus(); 
    }, 2000);
});

let isTouchDevice = false;
window.addEventListener('touchstart', () => { isTouchDevice = true; }, { passive: true });

// --- ADVANCED AUDIO ENGINE (FEMALE AI VOICE) ---
const audio = (() => {
    let ac = null, master = null, muted = false, analyser = null, dataArray = null;
    let femaleVoice = null;

    function initVoice() {
        if (!window.speechSynthesis) return;
        let voices = window.speechSynthesis.getVoices();
        femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira')) || voices[0];
    }
    if (window.speechSynthesis) { window.speechSynthesis.onvoiceschanged = initVoice; initVoice(); }

    function ensure() {
        if (!ac && !muted) { 
            ac = new (window.AudioContext || window.webkitAudioContext)(); 
            master = ac.createGain(); master.gain.value = 0.4; 
            analyser = ac.createAnalyser(); analyser.fftSize = 64;
            master.connect(analyser); analyser.connect(ac.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
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
            if(w.id === '[ PULSE ]') tone(900, 0.1, 0.1, 'square', 400); else if(w.id === '[ RAIL ]') { noise(0.4, 3000, 100, 0.8); tone(150, 0.4, 0.5, 'sine', 40); } else if(w.id === '[ AEGIS ]') { noise(0.3, 1500, 200, 0.5); tone(200, 0.3, 0.4, 'sine', 80); } else if(w.id === '[ FLUX ]') tone(1200, 0.15, 0.1, 'triangle', 800);
        },
        hit: (isGold) => { ensure(); tone(isGold ? 1200 : 800, 0.15, 0.2, 'triangle', isGold ? 2000 : 1200); },
        doubleHit: () => { ensure(); tone(1800, 0.1, 0.2, 'square', 2400); setTimeout(()=>tone(2400, 0.1, 0.2, 'square', 3000), 100); },
        perfectHit: () => { ensure(); tone(2000, 0.2, 0.3, 'sine', 3000); noise(0.1, 5000, 1000, 0.2); },
        comboStreak: () => { ensure(); tone(800, 0.3, 0.3, 'sawtooth', 1600); tone(1200, 0.3, 0.3, 'sine', 2400); },
        jam: () => { ensure(); noise(1.0, 500, 100, 0.5); tone(200, 1.0, 0.3, 'sawtooth', 50); },
        gameover: (win) => { ensure(); if(win) { tone(400,0.2,0.2,'sine',600); setTimeout(()=>tone(600,0.4,0.2,'sine',800), 200); } else { tone(300, 0.5, 0.2, 'sawtooth', 100); } },
        getFreq: () => { if(!analyser) return 0; analyser.getByteFrequencyData(dataArray); let sum=0; for(let i=0;i<dataArray.length;i++) sum+=dataArray[i]; return sum/dataArray.length; },
        announce: (text) => {
            if (muted || !window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            if (femaleVoice) u.voice = femaleVoice;
            u.rate = 1.2; u.pitch = 1.3; u.volume = master ? master.gain.value * 2.5 : 1.0;
            window.speechSynthesis.speak(u);
        }
    };
})();

const haptics = {
    vibrate: (pattern) => { if (isTouchDevice && navigator.vibrate) navigator.vibrate(pattern); },
    shoot: (wId) => haptics.vibrate(wId === '[ RAIL ]' ? 50 : 15),
    hit: () => haptics.vibrate([25, 25, 25]),
    jam: () => haptics.vibrate([40, 30, 40, 30, 40])
};

const btnGlobalSound = document.getElementById('btnGlobalSound');
if(btnGlobalSound) {
    btnGlobalSound.addEventListener('click', () => {
        const isMuted = audio.toggle();
        btnGlobalSound.innerText = isMuted ? '[ SOUND: OFF ]' : '[ SOUND: ON ]';
        btnGlobalSound.style.color = isMuted ? '#ff3b3b' : '#22e0ff'; btnGlobalSound.style.borderColor = isMuted ? '#ff3b3b' : '#22e0ff';
    });
}

document.getElementById('btnOpenGuide').addEventListener('click', () => document.getElementById('guideModal').style.display = 'flex');
document.getElementById('btnCloseGuide').addEventListener('click', () => document.getElementById('guideModal').style.display = 'none');

// --- LOGIN & AUTHENTICATION (WITH LEGACY GUEST PURGE) ---
let myUsername = "Player"; 
const usernameInput = document.getElementById('regUsername');
const passwordInput = document.getElementById('regPassword');

function checkLoginStatus() { 
    let savedUser = sessionStorage.getItem('vfactor_username') || localStorage.getItem('vfactor_username'); 
    
    if (savedUser && savedUser.startsWith("Guest_")) {
        localStorage.removeItem('vfactor_username');
        sessionStorage.removeItem('vfactor_username');
        savedUser = null;
    }

    if (savedUser) { 
        myUsername = savedUser; 
        enterHub(); 
    } else { 
        document.getElementById('loginUI').style.display = 'flex'; 
    }
}

document.getElementById('btnLogin').addEventListener('click', () => {
    const user = usernameInput.value.trim(); const pass = passwordInput.value; const lowerUser = user.toLowerCase();
    if (user === "") { alert("Please enter a username."); return; }
    if (pass === "") { alert("Please enter a password to secure your ID."); return; }
    if ((lowerUser === 'vinay' || lowerUser === 'admin') && pass !== 'VFACTOR238') { alert("SECURITY ALERT: Invalid Developer Password."); return; }

    const storageKey = 'vfactor_pass_' + lowerUser;
    const savedPass = localStorage.getItem(storageKey);
    if (savedPass && savedPass !== pass) { alert("Incorrect password for this Username. Try again."); return; } 
    else if (!savedPass) { localStorage.setItem(storageKey, pass); }

    myUsername = user; localStorage.setItem('vfactor_username', user); sessionStorage.setItem('vfactor_username', user);
    enterHub();
});

function enterHub() {
    document.getElementById('loginUI').style.display = 'none'; document.getElementById('lobby').style.display = 'flex'; document.getElementById('hubUsernameDisplay').innerText = myUsername;
    document.getElementById('btnGlobalSound').style.display = 'block'; document.getElementById('btnOpenGuide').style.display = 'block';
    if (gameMode === 'DUEL') document.getElementById('statusContainer').style.display = 'block'; 
}

// --- HUB & UI ROUTING ---
let gameMode = 'SOLO'; let hostMatchTime = 60;
document.getElementById('btnPrimarySolo').addEventListener('click', (e) => {
    gameMode = 'SOLO'; e.target.classList.add('active'); document.getElementById('btnPrimaryMulti').classList.remove('active');
    document.getElementById('subModes').style.display = 'none'; document.getElementById('networkControls').style.display = 'none'; document.getElementById('statusContainer').style.display = 'none'; document.getElementById('launchSoloBtn').style.display = 'block';
});
document.getElementById('btnPrimaryMulti').addEventListener('click', (e) => {
    gameMode = 'DUEL'; e.target.classList.add('active'); document.getElementById('btnPrimarySolo').classList.remove('active');
    document.getElementById('subModes').style.display = 'grid'; document.getElementById('launchSoloBtn').style.display = 'none'; 
    if(peerUsername === "Waiting...") document.getElementById('networkControls').style.display = 'block'; 
    document.getElementById('statusContainer').style.display = 'block';
    document.getElementById('btnDuel').classList.add('active'); document.getElementById('btnSquad').classList.remove('active');
});

document.getElementById('btnSquad').addEventListener('click', () => alert("2v2 SQUAD Mode is COMING SOON! Stay tuned."));

document.getElementById('btnDuel').addEventListener('click', () => {
    gameMode = 'DUEL'; document.getElementById('btnDuel').classList.add('active'); document.getElementById('btnSquad').classList.remove('active');
    if(peerUsername === "Waiting...") document.getElementById('networkControls').style.display = 'block'; 
    document.getElementById('statusContainer').style.display = 'block';
}); 

document.getElementById('matchTimeSetting').addEventListener('change', (e) => {
    let val = parseInt(e.target.value) || 60; val = Math.max(60, Math.min(300, val)); e.target.value = val; hostMatchTime = val;
    if (connection && connection.open && isHost) { connection.send({ type: 'update_time', time: hostMatchTime }); updateMatchLobbyUI(); }
});
document.getElementById('copyIdBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('playerId').innerText); const btn = document.getElementById('copyIdBtn'); btn.innerText = "COPIED!"; btn.style.background = "#fff";
    setTimeout(() => { btn.innerText = "COPY"; btn.style.background = "#8dff5a"; }, 1500);
});
document.getElementById('launchSoloBtn').addEventListener('click', () => {
    isHost = true; hostMatchTime = 60; runCountdown(hostMatchTime);
});

// --- CORE PHYSICS VARIABLES & STATE LOCKS ---
const WEAPONS = [ { id: '[ PULSE ]', name: '[ PULSE ]', auto: true, rof: 0.1, spread: 0.05, pellets: 1, damage: 10, color: '#22e0ff' }, { id: '[ RAIL ]', name: '[ RAIL ]', auto: false, rof: 1.2, spread: 0.0, pellets: 1, damage: 100, color: '#ff2d95' }, { id: '[ AEGIS ]', name: '[ AEGIS ]', auto: false, rof: 0.8, spread: 0.15, pellets: 6, damage: 20, color: '#ffb020' }, { id: '[ FLUX ]', name: '[ FLUX ]', auto: true, rof: 0.4, spread: 0.04, pellets: 3, damage: 30, color: '#8dff5a' } ];
let currentWeaponIdx = 0; let isTriggerDown = false; let lastShotTime = 0; let isJammed = false;
let targets = [], flashes = [], hitMarkers = []; let screenShake = 0, lastTime = performance.now();
const myAim = { x: 0.5, y: 0.5 }; const peerAim = { x: 0.5, y: 0.5 }; 

let isGameRunning = false; let currentMatchTime = 60; let isMatchOver = false; let clockInterval, spawnInterval;
let myScore = 0, peerScore = 0; let myCombo = 1, peerCombo = 1; let myLastHitTime = 0, peerLastHitTime = 0;
let myShotsFired = 0, myShotsHit = 0; let peerShotsFired = 0, peerShotsHit = 0; let myMaxCombo = 1, peerMaxCombo = 1; 

let shards = []; let fct = []; let shockwaves = []; let railTrails = []; let timeScale = 1.0;
let myAccHistory = [0]; let peerAccHistory = [0]; let peripheralFlashOpacity = 0;

let aimPointerId = null; let shootPointerId = null;
let touchAnchor = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, startTime: 0 };
let autoFireHoverTime = 0; let lastAimSendTime = 0;

const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');

// --- PURE 1v1 NETWORK CORE (WITH ADVANCED ICE SERVERS) ---
function generateLobbyID() {
    return 'VFACT-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}
const myPeerId = generateLobbyID();

const peer = new Peer(myPeerId, {
    config: {
        'iceServers': [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
            { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
        ]
    }
});

let connection = null;         
let connUnreliable = null;     
let isHost = false; let isPeerReady = false; let peerUsername = "Waiting...";
let connectionTimeout = null; let heartbeatInterval = null;

peer.on('open', (id) => { 
    if(document.getElementById('playerId')) document.getElementById('playerId').innerText = id; 
    document.getElementById('status').innerText = 'Online'; document.getElementById('status').style.color = '#8dff5a';
});

peer.on('connection', (conn) => {
    if (gameMode === 'SOLO') { conn.close(); return; }
    isHost = true; 
    if (conn.label === 'unreliable') {
        connUnreliable = conn;
    } else {
        connection = conn; 
        document.getElementById('status').innerText = 'Connected';
        triggerSkeletonLoader();
    }
    setupChannel(conn);
});

document.getElementById('connectBtn').addEventListener('click', () => {
    const targetId = document.getElementById('joinId').value.trim();
    if (targetId) {
        document.getElementById('status').innerText = 'Authenticating...'; 
        triggerSkeletonLoader();
        
        connection = peer.connect(targetId, { reliable: true, label: 'reliable' }); 
        connUnreliable = peer.connect(targetId, { reliable: false, label: 'unreliable' }); 
        
        setupChannel(connection);
        setupChannel(connUnreliable);

        connectionTimeout = setTimeout(() => {
            if (!connection || !connection.open) {
                alert("Connection Timed Out. A firewall or strict NAT is blocking the data channel.");
                resetToHub();
            }
        }, 10000);
    }
});

function triggerSkeletonLoader() { document.getElementById('lobby').style.display = 'none'; document.getElementById('skeletonUI').style.display = 'block'; }

function resetToHub() {
    if (connectionTimeout) clearTimeout(connectionTimeout);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    const overlays = ['skeletonUI', 'matchLobby', 'gameUI', 'gameOverOverlay', 'countdownOverlay', 'gameCanvas', 'jamOverlay', 'weaponToggle'];
    overlays.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
    
    targets = []; flashes = []; hitMarkers = []; shards = []; fct = []; railTrails = []; shockwaves = [];
    myAccHistory = [0]; peerAccHistory = [0]; peripheralFlashOpacity = 0;
    peerAim.x = 0.5; peerAim.y = 0.5; myAim.x = 0.5; myAim.y = 0.5;
    isMatchOver = false; isGameRunning = false; timeScale = 1.0;
    
    myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0;
    myMaxCombo = 1; peerMaxCombo = 1;
    aimPointerId = null; shootPointerId = null; touchAnchor.active = false; lastAimSendTime = 0;
    
    document.getElementById('myScore').innerText = '0'; document.getElementById('peerScore').innerText = '0'; document.getElementById('myCombo').innerText = 'x1'; document.getElementById('peerCombo').innerText = 'x1';
    document.getElementById('networkControls').style.opacity = '1';

    if (clockInterval) clearInterval(clockInterval); if (spawnInterval) clearInterval(spawnInterval);

    if (connection) { connection.removeAllListeners(); connection.close(); } connection = null;
    if (connUnreliable) { connUnreliable.removeAllListeners(); connUnreliable.close(); } connUnreliable = null;
    
    isHost = false; isPeerReady = false; peerUsername = "Waiting...";
    document.getElementById('status').innerText = 'Online'; document.getElementById('status').style.color = '#8dff5a';
    
    enterHub(); gameMode = 'DUEL';
    document.getElementById('btnPrimaryMulti').classList.add('active'); document.getElementById('btnPrimarySolo').classList.remove('active');
    document.getElementById('subModes').style.display = 'grid'; document.getElementById('launchSoloBtn').style.display = 'none'; 
    document.getElementById('networkControls').style.display = 'block'; document.getElementById('statusContainer').style.display = 'block';
    document.getElementById('btnDuel').classList.add('active'); document.getElementById('btnSquad').classList.remove('active');
}

document.getElementById('btnLeaveRoom').addEventListener('click', () => {
    if (connection && connection.open) connection.send({ type: 'peer_left' });
    setTimeout(() => resetToHub(), 100); 
});

function enterMatchLobby() {
    document.getElementById('skeletonUI').style.display = 'none'; document.getElementById('matchLobby').style.display = 'flex'; document.getElementById('statusContainer').style.display = 'none'; 
    updateMatchLobbyUI();
}

function updateMatchLobbyUI() {
    document.getElementById('roomHostName').innerText = isHost ? myUsername : peerUsername;
    const peerNameEl = document.getElementById('roomPeerName');
    peerNameEl.innerText = (isHost ? peerUsername : myUsername) + (isPeerReady ? " (READY)" : "");
    peerNameEl.style.color = isPeerReady ? '#8dff5a' : '#ff2d95';
    
    if (peerUsername !== "Waiting...") {
        document.getElementById('networkControls').style.opacity = '0';
        setTimeout(() => document.getElementById('networkControls').style.display = 'none', 300);
    }
    
    hostMatchTime = parseInt(document.getElementById('matchTimeSetting').value) || 60;
    document.getElementById('roomMatchRules').innerText = `${gameMode} MODE | ${hostMatchTime} SECONDS`;

    const btnReady = document.getElementById('btnReady'), btnStart = document.getElementById('btnStartMatch'), btnTransfer = document.getElementById('btnTransferHost');
    const waitingText = document.getElementById('waitingText');

    if (isHost) {
        btnReady.style.display = 'none'; btnStart.style.display = 'block'; btnTransfer.style.display = 'block'; waitingText.style.display = 'none';
        if (isPeerReady) { btnStart.style.opacity = '1'; btnStart.style.pointerEvents = 'auto'; } else { btnStart.style.opacity = '0.4'; btnStart.style.pointerEvents = 'none'; }
    } else {
        btnStart.style.display = 'none'; btnTransfer.style.display = 'none'; btnReady.style.display = 'block';
        if (isPeerReady) { btnReady.innerText = '[ CANCEL READY ]'; btnReady.style.background = '#ffb020'; waitingText.style.display = 'block'; } else { btnReady.innerText = '[ HOLD TO READY ]'; btnReady.style.background = '#22e0ff'; waitingText.style.display = 'none'; }
    }
}

let readyHoldTimer;
const btnReady = document.getElementById('btnReady');
btnReady.addEventListener('pointerdown', (e) => {
    if (isHost) return;
    if (isPeerReady) {
        isPeerReady = false; 
        if (connection && connection.open) connection.send({ type: 'peer_ready', ready: false });
        updateMatchLobbyUI(); return;
    }
    btnReady.style.background = 'linear-gradient(90deg, #8dff5a 0%, #22e0ff 0%)';
    let progress = 0;
    readyHoldTimer = setInterval(() => {
        progress += 4;
        btnReady.style.background = `linear-gradient(90deg, #8dff5a ${progress}%, #22e0ff ${progress}%)`;
        if (progress >= 100) {
            clearInterval(readyHoldTimer);
            isPeerReady = true;
            if (connection && connection.open) connection.send({ type: 'peer_ready', ready: true });
            updateMatchLobbyUI();
        }
    }, 40);
});
const cancelReadyHold = () => { clearInterval(readyHoldTimer); if(!isPeerReady && !isHost) btnReady.style.background = '#22e0ff'; };
btnReady.addEventListener('pointerup', cancelReadyHold);
btnReady.addEventListener('pointerleave', cancelReadyHold);

document.getElementById('btnStartMatch').addEventListener('click', () => { if (!isPeerReady) return; if (connection && connection.open) connection.send({ type: 'start_countdown', time: hostMatchTime }); runCountdown(hostMatchTime); });
document.getElementById('btnTransferHost').addEventListener('click', () => { if (connection && connection.open) { connection.send({ type: 'transfer_host' }); isHost = false; isPeerReady = false; updateMatchLobbyUI(); } });

function setupChannel(conn) {
    conn.on('open', () => { 
        if (conn.label === 'reliable') {
            if (connectionTimeout) clearTimeout(connectionTimeout);
            document.getElementById('status').innerText = 'Connected'; 
            if (!isHost) conn.send({ type: 'auth_request', requestedName: myUsername }); 
            
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(() => { if(conn.open) conn.send({ type: 'ping' }); }, 3000);
        }
    });

    conn.on('data', (data) => {
        if (data.type === 'ping') { if (conn.open) conn.send({ type: 'pong' }); return; }
        if (data.type === 'pong') return;

        if (data.type === 'auth_request' && isHost) {
            if (data.requestedName.toLowerCase() === myUsername.toLowerCase()) {
                conn.send({ type: 'auth_reject', suggestedName: data.requestedName + (Math.random() > 0.5 ? "_Neon" : "_Flux") }); setTimeout(() => conn.close(), 500);
            } else { peerUsername = data.requestedName; conn.send({ type: 'auth_accept', hostName: myUsername, time: hostMatchTime }); enterMatchLobby(); }
        } 
        else if (data.type === 'auth_reject' && !isHost) { alert(`Username taken! Try using: ${data.suggestedName}`); resetToHub(); } 
        else if (data.type === 'auth_accept' && !isHost) { peerUsername = data.hostName; hostMatchTime = data.time; enterMatchLobby(); } 
        else if (data.type === 'peer_ready') { isPeerReady = data.ready; updateMatchLobbyUI(); } 
        else if (data.type === 'update_time') { hostMatchTime = data.time; updateMatchLobbyUI(); } 
        else if (data.type === 'transfer_host') { isHost = true; isPeerReady = false; updateMatchLobbyUI(); } 
        else if (data.type === 'start_countdown') { runCountdown(data.time); } 
        else if (data.type === 'peer_left') { alert("The other player left the room."); resetToHub(); }
        else if (data.type === 'reset_lobby') {
            document.getElementById('gameOverOverlay').style.display = 'none'; document.getElementById('gameCanvas').style.display = 'none'; document.getElementById('gameUI').style.display = 'none'; document.getElementById('holoCards').style.display = 'none';
            targets = []; flashes = []; hitMarkers = []; shards = []; fct = []; railTrails = []; shockwaves = []; myAccHistory = [0]; peerAccHistory = [0]; peripheralFlashOpacity = 0;
            isMatchOver = false; isGameRunning = false; timeScale = 1.0; aimPointerId = null; shootPointerId = null; touchAnchor.active = false; lastAimSendTime = 0;
            myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0; isPeerReady = false; myMaxCombo = 1; peerMaxCombo = 1;
            document.getElementById('btnGlobalSound').style.display = 'block'; document.getElementById('btnOpenGuide').style.display = 'block'; enterMatchLobby();
        }
        else if (data.type === 'aim') { peerAim.x = data.x; peerAim.y = data.y; } 
        else if (data.type === 'spawn') { targets.push(data.target); } 
        else if (data.type === 'shoot_anim') {
            const w = WEAPONS.find(w => w.id === data.weaponId); peerShotsFired += w.pellets; audio.shoot(w);
            if(w.id === '[ RAIL ]') { railTrails.push({x: data.x, y: data.y, life: 1.5}); screenShake = 10; }
            if(w.id === '[ AEGIS ]') shockwaves.push({x: data.x, y: data.y, life: 1, maxR: 0.15});
            for(let i = 0; i < w.pellets; i++) { flashes.push({ x: data.x + (Math.random() - 0.5) * w.spread, y: data.y + (Math.random() - 0.5) * w.spread, color: w.color, age: 0, poly: w.id!=='[ PULSE ]' }); }
        } else if (data.type === 'claim_hit') {
            if (isHost) {
                const t = targets.find(t => t.id === data.targetId);
                const w = WEAPONS.find(weap => weap.id === data.weaponId);
                if (t && t.active && w) { 
                    executeHit(t, data.shooter, w.damage); 
                    if (connection && connection.open) connection.send({ type: 'confirm_hit', target: t, shooter: data.shooter, damage: w.damage, shotX: data.shotX, shotY: data.shotY }); 
                }
            }
        } else if (data.type === 'confirm_hit') {
            executeHit(data.target, data.shooter, data.damage);
            if (data.shooter !== (isHost ? 'Host' : 'Peer')) hitMarkers.push({ x: data.shotX, y: data.shotY, age: 0 });
        } else if (data.type === 'emp_attack') { triggerJam(); }
    });
    
    conn.on('error', (err) => { console.error(err); alert("Network Error: " + err.type); resetToHub(); });
    conn.on('close', () => { 
        if(conn.label === 'reliable') { alert("Connection lost."); resetToHub(); }
    });
}

let gyroBase = { beta: null, gamma: null };
window.addEventListener('deviceorientation', (e) => {
    if (!isTouchDevice || !isGameRunning || isJammed || isMatchOver || !e.beta || !e.gamma) return;
    if (gyroBase.beta === null) { gyroBase.beta = e.beta; gyroBase.gamma = e.gamma; return; }
    let dBeta = e.beta - gyroBase.beta; let dGamma = e.gamma - gyroBase.gamma;
    if (Math.abs(dBeta) < 20 && Math.abs(dGamma) < 20 && aimPointerId) {
        myAim.x = Math.max(0, Math.min(1, myAim.x + dGamma * 0.001));
        myAim.y = Math.max(0, Math.min(1, myAim.y + dBeta * 0.001));
    }
    gyroBase.beta = e.beta; gyroBase.gamma = e.gamma;
});

// --- GAMEPLAY INITIALIZATION ---
function runCountdown(duration) {
    document.getElementById('lobby').style.display = 'none'; document.getElementById('matchLobby').style.display = 'none'; document.getElementById('btnGlobalSound').style.display = 'none'; document.getElementById('btnOpenGuide').style.display = 'none';
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
    
    document.getElementById('gameUI').style.display = 'block'; canvas.style.display = 'block'; document.getElementById('weaponToggle').style.display = 'block'; 
    document.getElementById('myNameDisplay').innerText = myUsername; document.getElementById('peerNameDisplay').innerText = gameMode==='SOLO' ? "TRAINING" : peerUsername;
    
    resize(); if (isHost) spawnInterval = setInterval(spawnTarget, 1500); 
    
    const timerEl = document.getElementById('timerDisplay'); timerEl.innerText = currentMatchTime;
    clockInterval = setInterval(() => {
        currentMatchTime--; timerEl.innerText = currentMatchTime;
        
        const myCurrentAcc = myShotsFired > 0 ? Math.round((myShotsHit / myShotsFired) * 100) : 0;
        const peerCurrentAcc = peerShotsFired > 0 ? Math.round((peerShotsHit / peerShotsFired) * 100) : 0;
        myAccHistory.push(myCurrentAcc); peerAccHistory.push(peerCurrentAcc);
        
        if (currentMatchTime <= 10) { timerEl.classList.add('timer-hurry'); if (isHost && currentMatchTime === 10) { clearInterval(spawnInterval); spawnInterval = setInterval(spawnTarget, 750); } }
        if (currentMatchTime <= 0) { clearInterval(clockInterval); endMatch(); }
    }, 1000);
    requestAnimationFrame((now) => { lastTime = now; renderLoop(now); });
}

function renderLineGraph(canvasId, history, colorHex) {
    const c = document.getElementById(canvasId); if(!c) return;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);

    const padX = 40; const padY = 20; const w = c.width - padX - 10; const h = c.height - padY * 2;
    let maxVal = Math.max(...history, 10); maxVal = Math.ceil(maxVal / 10) * 10; 

    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px monospace';
    
    for(let i=0; i<=4; i++) {
        const y = padY + (h * (i/4)); const val = Math.round(maxVal - (maxVal * (i/4)));
        ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(padX + w, y); ctx.stroke(); ctx.fillText(val + "%", 2, y + 4);
    }
    ctx.beginPath(); ctx.moveTo(padX, padY); ctx.lineTo(padX, h + padY); ctx.stroke();

    if(history.length < 2) return;

    ctx.beginPath(); ctx.strokeStyle = colorHex; ctx.lineWidth = 3; ctx.shadowBlur = 10; ctx.shadowColor = colorHex;
    for(let i=0; i<history.length; i++) {
        const x = padX + (i / (history.length - 1)) * w; const y = padY + h - (history[i] / maxVal) * h;
        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.lineTo(padX + w, h + padY); ctx.lineTo(padX, h + padY);
    ctx.globalAlpha = 0.15; ctx.fillStyle = colorHex; ctx.fill(); ctx.globalAlpha = 1.0;
}

function endMatch() {
    isMatchOver = true; isTriggerDown = false; timeScale = 0.05; gyroBase.beta = null; 
    document.getElementById('damageFlash').style.display = 'none';
    if (isHost && spawnInterval) clearInterval(spawnInterval);
    
    const overlay = document.getElementById('gameOverOverlay'), title = document.getElementById('goTitle'), returnBtn = document.getElementById('returnBtn');
    document.getElementById('weaponToggle').style.display = 'none';
    
    const myAcc = myShotsFired > 0 ? Math.round((myShotsHit / myShotsFired) * 100) : 0;
    const peerAcc = peerShotsFired > 0 ? Math.round((peerShotsHit / peerShotsFired) * 100) : 0;
    
    overlay.style.display = 'flex'; document.getElementById('holoCards').style.display = 'flex';
    
    if (gameMode === 'SOLO') {
        title.innerText = "TRAINING COMPLETE"; title.style.color = "#22e0ff"; title.style.textShadow = "0 0 30px #22e0ff";
        document.getElementById('goMyName').innerText = myUsername; document.getElementById('goMyScore').innerText = myScore; 
        document.getElementById('goMyAcc').innerText = myAcc + "%"; document.getElementById('goMyMaxCombo').innerText = 'x' + Math.floor(myMaxCombo); document.getElementById('goMyShots').innerText = myShotsHit + "/" + myShotsFired;
        document.getElementById('goPeerCard').style.display = 'none'; renderLineGraph("graphCanvasMy", myAccHistory, '#22e0ff'); audio.gameover(true);
    } else {
        if (myScore > peerScore) { title.innerText = "VICTORY"; title.style.color = "#8dff5a"; title.style.textShadow = "0 0 30px #8dff5a"; audio.gameover(true); } 
        else if (myScore < peerScore) { title.innerText = "DEFEAT"; title.style.color = "#ff3b3b"; title.style.textShadow = "0 0 30px #ff3b3b"; audio.gameover(false); } 
        else { title.innerText = "DRAW"; title.style.color = "#ffb020"; title.style.textShadow = "0 0 30px #ffb020"; }
        
        document.getElementById('goMyName').innerText = myUsername; document.getElementById('goMyScore').innerText = myScore; 
        document.getElementById('goMyAcc').innerText = myAcc + "%"; document.getElementById('goMyMaxCombo').innerText = 'x' + Math.floor(myMaxCombo); document.getElementById('goMyShots').innerText = myShotsHit + "/" + myShotsFired;
        
        document.getElementById('goPeerName').innerText = peerUsername; document.getElementById('goPeerScore').innerText = peerScore; 
        document.getElementById('goPeerAcc').innerText = peerAcc + "%"; document.getElementById('goPeerMaxCombo').innerText = 'x' + Math.floor(peerMaxCombo); document.getElementById('goPeerShots').innerText = peerShotsHit + "/" + peerShotsFired;
        
        renderLineGraph("graphCanvasMy", myAccHistory, '#22e0ff'); renderLineGraph("graphCanvasPeer", peerAccHistory, '#ff2d95');
        document.getElementById('goPeerCard').style.display = 'flex';
    }
    
    title.style.display = 'block'; returnBtn.style.display = 'block';
}

document.getElementById('returnBtn').addEventListener('click', () => {
    if (gameMode === 'SOLO') { resetToHub(); } 
    else { 
        if(connection && connection.open) connection.send({ type: 'reset_lobby' }); 
        document.getElementById('gameOverOverlay').style.display = 'none'; document.getElementById('gameCanvas').style.display = 'none'; document.getElementById('gameUI').style.display = 'none'; document.getElementById('holoCards').style.display = 'none';
        targets = []; flashes = []; hitMarkers = []; shards = []; fct = []; railTrails = []; shockwaves = []; isMatchOver = false; isGameRunning = false; timeScale = 1.0;
        myAccHistory = [0]; peerAccHistory = [0];
        myScore = 0; peerScore = 0; myCombo = 1; peerCombo = 1; myShotsFired = 0; myShotsHit = 0; peerShotsFired = 0; peerShotsHit = 0; myMaxCombo = 1; peerMaxCombo = 1;
        aimPointerId = null; shootPointerId = null; touchAnchor.active = false; lastAimSendTime = 0;
        document.getElementById('myScore').innerText = '0'; document.getElementById('peerScore').innerText = '0'; document.getElementById('myCombo').innerText = 'x1'; document.getElementById('peerCombo').innerText = 'x1';
        isPeerReady = false; document.getElementById('btnGlobalSound').style.display = 'block'; document.getElementById('btnOpenGuide').style.display = 'block'; enterMatchLobby();
    } 
});

const weaponToggleBtn = document.getElementById('weaponToggle');
if(weaponToggleBtn) { 
    weaponToggleBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); currentWeaponIdx = (currentWeaponIdx + 1) % WEAPONS.length; const w = WEAPONS[currentWeaponIdx]; 
        weaponToggleBtn.innerText = w.name; weaponToggleBtn.style.color = w.color; weaponToggleBtn.style.borderColor = w.color; 
    }); 
}

let notifyTimeout;
function showNotification(text, colorHex) {
    const el = document.getElementById('inGameNotification');
    el.innerText = text; el.style.color = colorHex; el.style.opacity = 1;
    clearTimeout(notifyTimeout); notifyTimeout = setTimeout(() => { el.style.opacity = 0; }, 1500);
}

function drawOctagon(ctx, x, y, r, rotationOffset = 0) {
    ctx.beginPath();
    for(let i=0; i<8; i++) {
        const a = (i * Math.PI / 4) + rotationOffset; const px = x + r * Math.cos(a); const py = y + r * Math.sin(a);
        if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
}

function spawnTarget() {
    if (targets.filter(t => t.active).length >= 6) return;
    const typeRoll = Math.random(); let anomalyType = 'standard', targetColor = '141, 255, 90', speed = 0.15 + Math.random() * 0.2; 
    if (typeRoll > 0.9) { anomalyType = 'gold'; targetColor = '255, 213, 74'; speed *= 1.6; } else if (typeRoll > 0.8) { anomalyType = 'emp'; targetColor = '34, 224, 255'; }
    const angle = Math.random() * Math.PI * 2;
    const t = { id: Date.now() + Math.random(), x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, r: 0.04, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 8, active: true, anomaly: anomalyType, rgb: targetColor };
    targets.push(t); if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'spawn', target: t });
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
            touchAnchor = { active: true, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, startTime: performance.now() };
            baseAim = { x: myAim.x, y: myAim.y };
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
        if (e.pointerId === aimPointerId) {
            let sensitivity = 1.5; 
            for (let i = 0; i < targets.length; i++) {
                if (!targets[i].active) continue;
                const dist = Math.hypot(myAim.x - targets[i].x, myAim.y - targets[i].y);
                if (dist <= targets[i].r * 1.8) { sensitivity *= 0.65; break; }
            }
            const dx = (e.clientX - touchAnchor.lastX) / window.innerWidth; const dy = (e.clientY - touchAnchor.lastY) / window.innerHeight;
            myAim.x = Math.max(0, Math.min(1, myAim.x + dx * sensitivity)); myAim.y = Math.max(0, Math.min(1, myAim.y + dy * sensitivity));
            touchAnchor.lastX = e.clientX; touchAnchor.lastY = e.clientY;
        }
    }
    const now = performance.now(); 
    if (gameMode !== 'SOLO' && connUnreliable && connUnreliable.open && (now - lastAimSendTime > 30)) { 
        lastAimSendTime = now; connUnreliable.send({ type: 'aim', x: myAim.x, y: myAim.y }); 
    }
});

function handlePointerEnd(e) {
    canvas.releasePointerCapture(e.pointerId); 
    if (e.pointerType === 'mouse') { isTriggerDown = false; } else {
        if (e.pointerId === aimPointerId) { 
            const swipeY = e.clientY - touchAnchor.startY; const swipeX = e.clientX - touchAnchor.startX; const swipeTime = performance.now() - touchAnchor.startTime;
            if (Math.abs(swipeY) > 50 && Math.abs(swipeY) > Math.abs(swipeX) * 2 && swipeTime < 300) {
                if (swipeY < 0) currentWeaponIdx = (currentWeaponIdx + 1) % WEAPONS.length; else currentWeaponIdx = (currentWeaponIdx - 1 + WEAPONS.length) % WEAPONS.length;
                const w = WEAPONS[currentWeaponIdx]; const btn = document.getElementById('weaponToggle'); btn.innerText = w.name; btn.style.color = w.color; btn.style.borderColor = w.color;
            }
            aimPointerId = null; touchAnchor.active = false; 
        }
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
        if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'shoot_anim', x: myAim.x, y: myAim.y, shooter: identity, weaponId: w.id });
        
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
        if (isHost) { 
            executeHit(hitTarget, 'Host', weapon.damage); 
            if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'confirm_hit', target: hitTarget, shooter: 'Host', damage: weapon.damage, shotX: shotX, shotY: shotY }); 
        } else { 
            hitTarget.active = false; 
            if (gameMode !== 'SOLO' && connection && connection.open) connection.send({ type: 'claim_hit', targetId: hitTarget.id, shooter: 'Peer', weaponId: weapon.id, shotX: shotX, shotY: shotY }); 
        }
    }
}

function executeHit(targetData, shooterIdentity, baseDamage) {
    const localTarget = targets.find(t => t.id === (targetData.id || targetData)); if (localTarget) localTarget.active = false;
    const isMe = (gameMode === 'SOLO') ? true : (shooterIdentity === 'Host' ? isHost : !isHost);
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
        if (gameMode !== 'SOLO' && targetData.anomaly === 'emp') { if (isHost) connection.send({ type: 'emp_attack' }); else connection.send({ type: 'emp_attack' }); }
    } else {
        if (nowInSeconds - peerLastHitTime < 0.4 && peerShotsHit > 0) audio.doubleHit();
        peerShotsHit++; peerCombo += 0.5; peerLastHitTime = nowInSeconds; peerScore += Math.floor(finalDamage * Math.floor(peerCombo));
        if (peerCombo > peerMaxCombo) peerMaxCombo = peerCombo;
        document.getElementById('peerScore').innerText = peerScore; document.getElementById('peerCombo').innerText = 'x' + Math.floor(peerCombo);
    }
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } window.addEventListener('resize', resize);

function drawCrosshair(normX, normY, color, wIdx = 0) {
    const px = normX * canvas.width, py = normY * canvas.height; ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (wIdx === 0) { ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px, py + 14); ctx.stroke(); } 
    else if (wIdx === 1) { ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.arc(px, py, 15, performance.now()/500, Math.PI*2 + performance.now()/500); ctx.stroke(); ctx.setLineDash([]); } 
    else if (wIdx === 2) { ctx.beginPath(); ctx.moveTo(px - 10, py - 10); ctx.lineTo(px - 15, py - 10); ctx.lineTo(px - 15, py + 10); ctx.lineTo(px - 10, py + 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px + 10, py - 10); ctx.lineTo(px + 15, py - 10); ctx.lineTo(px + 15, py + 10); ctx.lineTo(px + 10, py + 10); ctx.stroke(); } 
    else { ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px - 10, py + 8); ctx.lineTo(px + 10, py + 8); ctx.closePath(); ctx.stroke(); }
    const w = WEAPONS[wIdx]; const cd = Math.min(1, (performance.now()/1000 - lastShotTime) / w.rof);
    if(cd < 1) { ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.arc(px, py, 20, -Math.PI/2, -Math.PI/2 + (Math.PI*2*cd)); ctx.stroke(); }
}

let globalParticleThrottle = 1.0; let dtHistory = [];

function renderLoop(now) {
    if (!isGameRunning && timeScale === 1.0) return; 
    let dt = ((now - lastTime) / 1000) * timeScale; if (dt > 0.05) dt = 0.05; lastTime = now; const nowInSeconds = now / 1000;
    
    dtHistory.push(dt); if(dtHistory.length > 20) dtHistory.shift();
    let avgDt = dtHistory.reduce((a,b)=>a+b, 0) / dtHistory.length;
    globalParticleThrottle = (avgDt > 0.018 && isTouchDevice) ? 0.3 : 1.0;
    
    if (nowInSeconds - myLastHitTime > 3 && myCombo > 1) { myCombo = 1; document.getElementById('myCombo').innerText = 'x1'; peripheralFlashOpacity = 0.8; }
    if (nowInSeconds - peerLastHitTime > 3 && peerCombo > 1) { peerCombo = 1; document.getElementById('peerCombo').innerText = 'x1'; }
    
    if (isTouchDevice && !isJammed && !isMatchOver) {
        let hovering = false;
        for (let i = 0; i < targets.length; i++) {
            if (!targets[i].active) continue;
            const dist = Math.hypot(myAim.x - targets[i].x, myAim.y - targets[i].y);
            if (dist <= targets[i].r * 1.2) { hovering = true; break; }
        }
        if (hovering) { autoFireHoverTime += dt * 1000; if (autoFireHoverTime >= 60) isTriggerDown = true; } else { autoFireHoverTime = 0; if (!shootPointerId) isTriggerDown = false; }
    }
    if (isTriggerDown) attemptFire(nowInSeconds);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    screenShake *= Math.exp(-10 * dt); ctx.save(); if (screenShake > 0.5) ctx.translate((Math.random() * 2 - 1) * screenShake, (Math.random() * 2 - 1) * screenShake);

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
    
    if (touchAnchor.active) { ctx.beginPath(); ctx.strokeStyle = 'rgba(34, 224, 255, 0.3)'; ctx.lineWidth = 2; ctx.arc(touchAnchor.startX, touchAnchor.startY, 40, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.fillStyle = 'rgba(34, 224, 255, 0.5)'; ctx.arc(touchAnchor.startX, touchAnchor.startY, 4, 0, Math.PI * 2); ctx.fill(); }
    if (gameMode !== 'SOLO') drawCrosshair(peerAim.x, peerAim.y, '#ff2d95');
    if (!isJammed && !isMatchOver) drawCrosshair(myAim.x, myAim.y, WEAPONS[currentWeaponIdx].color, currentWeaponIdx);
    ctx.restore(); targets = targets.filter(t => t.active); requestAnimationFrame(renderLoop);
}

// --- 3D HYPERSPACE BACKGROUND ENGINE ---
const bgCanvas = document.getElementById('bgCanvas'); const bgCtx = bgCanvas.getContext('2d');
let bgZ = 1.0; let streams = []; let rgbHue = 0;

function resizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeBg);
resizeBg();

function renderBgLoop() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
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
