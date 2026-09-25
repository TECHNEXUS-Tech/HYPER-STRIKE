// js/main.js - Global States, Audio, and Hub UI

const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d');

let myUsername = "Player"; 
let gameMode = 'SOLO'; 
let hostMatchTime = 60;
let maxTargetsLimit = 8;
let allowEMPs = true;

const WEAPONS = [ 
    { id: '[ PULSE ]', name: '[ PULSE ]', auto: true, rof: 0.1, spread: 0.05, pellets: 1, damage: 10, color: '#22e0ff' }, 
    { id: '[ RAIL ]', name: '[ RAIL ]', auto: false, rof: 1.2, spread: 0.0, pellets: 1, damage: 100, color: '#ff2d95' }, 
    { id: '[ AEGIS ]', name: '[ AEGIS ]', auto: false, rof: 0.8, spread: 0.15, pellets: 6, damage: 20, color: '#ffb020' }, 
    { id: '[ FLUX ]', name: '[ FLUX ]', auto: true, rof: 0.4, spread: 0.04, pellets: 3, damage: 30, color: '#8dff5a' } 
];

let currentWeaponIdx = 0, isTriggerDown = false, lastShotTime = 0, isJammed = false;
let targets = [], flashes = [], hitMarkers = [], screenShake = 0, lastTime = performance.now();
const myAim = { x: 0.5, y: 0.5 }, peerAim = { x: 0.5, y: 0.5 }; 

let trysteroRoom = null;
let isSquadHost = false;
let squadPlayers = {}; 
let squadAims = {};    
let myTeam = 'blue';

let isGameRunning = false, currentMatchTime = 60, isMatchOver = false, clockInterval, spawnInterval;
let myScore = 0, peerScore = 0, myCombo = 1, peerCombo = 1, myLastHitTime = 0, peerLastHitTime = 0;
let myShotsFired = 0, myShotsHit = 0, peerShotsFired = 0, peerShotsHit = 0, myMaxCombo = 1, peerMaxCombo = 1; 

let shards = [], fct = [], shockwaves = [], railTrails = [], timeScale = 1.0;
let myAccHistory = [0], peerAccHistory = [0], peripheralFlashOpacity = 0;

let aimPointerId = null, shootPointerId = null;
let touchAnchor = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, lastX: 0, lastY: 0, startTime: 0 };
let joystick = { active: false, originX: 0, originY: 0, deltaX: 0, deltaY: 0, radius: 45 };
let autoFireHoverTime = 0, lastAimSendTime = 0;

let connection = null, connUnreliable = null;     
let isHost = false, isPeerReady = false, peerUsername = "Waiting...";
let connectionTimeout = null, heartbeatInterval = null, readyHoldTimer = null;
let pingStart = 0, currentPing = 0;
let peerLastShotTime = 0;

let gyroBase = { beta: null, gamma: null };
let globalParticleThrottle = 1.0, dtHistory = [];
let bgZ = 1.0, streams = [], rgbHue = 0, notifyTimeout = null;
let isTouchDevice = false;

function updatePingUI(ping) {
    const ind = document.getElementById('pingIndicator');
    const val = document.getElementById('pingValue');
    const icon = document.getElementById('wifiSvg');
    
    if(ind) ind.style.display = 'inline-flex';
    if(val) val.innerText = ping + "ms";
    
    if(icon) {
        icon.classList.remove('wifi-green', 'wifi-blue', 'wifi-red');
        if (ping < 80) icon.classList.add('wifi-green');
        else if (ping < 200) icon.classList.add('wifi-blue');
        else icon.classList.add('wifi-red');
    }
}

setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); }
    checkLoginStatus(); 
}, 1500);

window.addEventListener('touchstart', () => { isTouchDevice = true; }, { passive: true });

const btnSettingsMenu = document.getElementById('btnSettingsMenu');
const settingsDropdown = document.getElementById('settingsDropdown');

btnSettingsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDropdown.style.display = settingsDropdown.style.display === 'flex' ? 'none' : 'flex';
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#settingsContainer')) {
        settingsDropdown.style.display = 'none';
    }
});

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
        btnGlobalSound.style.color = isMuted ? '#ff3b3b' : '#22e0ff'; 
    });
}

document.getElementById('btnOpenGuide').addEventListener('click', () => {
    document.getElementById('guideModal').style.display = 'flex';
    settingsDropdown.style.display = 'none';
});
document.getElementById('btnCloseGuide').addEventListener('click', () => document.getElementById('guideModal').style.display = 'none');

document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('vfactor_username');
    sessionStorage.removeItem('vfactor_username');
    myUsername = "Player";
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('loginUI').style.display = 'flex';
    document.getElementById('statusContainer').style.display = 'none';
    document.getElementById('settingsContainer').style.display = 'none';
    
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    gameMode = 'SOLO';
});

const usernameInput = document.getElementById('regUsername');
const passwordInput = document.getElementById('regPassword');

function checkLoginStatus() { 
    let savedUser = sessionStorage.getItem('vfactor_username') || localStorage.getItem('vfactor_username'); 
    if (savedUser && savedUser.startsWith("Guest_")) {
        localStorage.removeItem('vfactor_username');
        sessionStorage.removeItem('vfactor_username');
        savedUser = null;
    }
    if (savedUser) { myUsername = savedUser; enterHub(); } 
    else { document.getElementById('loginUI').style.display = 'flex'; }
}

document.getElementById('btnLogin').addEventListener('click', () => {
    const user = usernameInput.value.trim(); const pass = passwordInput.value; const lowerUser = user.toLowerCase();
    if (user === "") { alert("Please enter a username."); return; }
    if (pass === "") { alert("Please enter a password to secure your ID."); return; }

    const storageKey = 'vfactor_pass_' + lowerUser;
    const savedPass = localStorage.getItem(storageKey);
    if (savedPass && savedPass !== pass) { alert("Incorrect password for this Username. Try again."); return; } 
    else if (!savedPass) { localStorage.setItem(storageKey, pass); }

    myUsername = user; localStorage.setItem('vfactor_username', user); sessionStorage.setItem('vfactor_username', user);
    enterHub();
});

function enterHub() {
    document.getElementById('loginUI').style.display = 'none'; 
    document.getElementById('lobby').style.display = 'flex'; 
    document.getElementById('hubUsernameDisplay').innerText = myUsername;
    
    document.getElementById('settingsContainer').style.display = 'block';
    
    if (gameMode === 'DUEL' || gameMode === 'SQUAD') document.getElementById('statusContainer').style.display = 'block'; 
}

document.getElementById('btnPrimarySolo').addEventListener('click', (e) => {
    gameMode = 'SOLO'; e.target.classList.add('active'); document.getElementById('btnPrimaryMulti').classList.remove('active');
    document.getElementById('subModes').style.display = 'none'; document.getElementById('networkControls').style.display = 'none'; document.getElementById('statusContainer').style.display = 'none'; document.getElementById('launchSoloBtn').style.display = 'block';
});
document.getElementById('btnPrimaryMulti').addEventListener('click', (e) => {
    gameMode = 'DUEL'; e.target.classList.add('active'); document.getElementById('btnPrimarySolo').classList.remove('active');
    document.getElementById('subModes').style.display = 'grid'; document.getElementById('launchSoloBtn').style.display = 'none'; 
    if(peerUsername === "Waiting...") document.getElementById('networkControls').style.display = 'block'; 
    document.getElementById('statusContainer').style.display = 'block';
    document.getElementById('btnDuel').classList.add('active'); 
    
    const btnSquad = document.getElementById('btnSquad');
    btnSquad.classList.remove('active');
    btnSquad.innerText = "[ 2v2 SQUAD ]";
    btnSquad.style.color = "";
    btnSquad.style.borderColor = "";
});
document.getElementById('btnDuel').addEventListener('click', () => {
    gameMode = 'DUEL'; document.getElementById('btnDuel').classList.add('active'); 
    if(peerUsername === "Waiting...") document.getElementById('networkControls').style.display = 'block'; 
    document.getElementById('statusContainer').style.display = 'block';
    
    const btnSquad = document.getElementById('btnSquad');
    btnSquad.classList.remove('active');
    btnSquad.innerText = "[ 2v2 SQUAD ]";
    btnSquad.style.color = "";
    btnSquad.style.borderColor = "";
}); 

document.getElementById('btnSquad').addEventListener('click', () => {
    alert("Coming soon! Stay tuned!!!");
    
    const btnSquad = document.getElementById('btnSquad');
    btnSquad.innerText = "[ COMING SOON! ]";
    btnSquad.style.color = "#ffb020";
    btnSquad.style.borderColor = "#ffb020";
    
    setTimeout(() => {
        if (gameMode !== 'SQUAD') {
            btnSquad.innerText = "[ 2v2 SQUAD ]";
            btnSquad.style.color = "";
            btnSquad.style.borderColor = "";
        }
    }, 2000);
});

document.getElementById('matchTimeSetting').addEventListener('change', (e) => {
    let val = parseInt(e.target.value) || 60; val = Math.max(60, Math.min(300, val)); e.target.value = val; hostMatchTime = val;
    if (gameMode === 'DUEL' && connection && connection.open && isHost) connection.send({ type: 'update_time', time: hostMatchTime }); 
});
document.getElementById('maxTargetSetting').addEventListener('change', (e) => {
    let val = parseInt(e.target.value) || 8; maxTargetsLimit = Math.max(4, Math.min(20, val)); e.target.value = maxTargetsLimit;
});
document.getElementById('empSetting').addEventListener('change', (e) => {
    allowEMPs = e.target.checked;
});

document.getElementById('copyIdBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('playerId').innerText); const btn = document.getElementById('copyIdBtn'); btn.innerText = "COPIED!"; btn.style.background = "#fff";
    setTimeout(() => { btn.innerText = "COPY"; btn.style.background = "#8dff5a"; }, 1500);
});
document.getElementById('launchSoloBtn').addEventListener('click', () => {
    isHost = true; hostMatchTime = 60; 
    if (typeof runCountdown === "function") runCountdown(hostMatchTime);
});
