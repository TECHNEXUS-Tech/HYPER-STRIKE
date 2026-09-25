// js/network-trystero.js - Mesh Networking for 2v2 Squads

const config = { appId: 'vfactor-arena-squads' };

window.trysteroSendAim = null;
window.trysteroSendShoot = null;
window.trysteroSendHit = null;
window.trysteroSendSpawn = null;
window.trysteroSendEmp = null;
window.trysteroSendState = null;

function updateSquadLobbyUI() {
    if (gameMode !== 'SQUAD') return;
    document.getElementById('roomTitle').innerText = "SQUAD 2v2";
    
    document.getElementById('slot3').style.display = 'block';
    document.getElementById('slot4').style.display = 'block';

    document.getElementById('roomHostName').innerText = myUsername + " (You)";
    
    const peers = Object.values(squadPlayers);
    document.getElementById('roomPeerName').innerText = peers[0] ? peers[0].name + (peers[0].isReady ? " (READY)" : "") : "Waiting...";
    document.getElementById('roomPeer3Name').innerText = peers[1] ? peers[1].name + (peers[1].isReady ? " (READY)" : "") : "Waiting...";
    document.getElementById('roomPeer4Name').innerText = peers[2] ? peers[2].name + (peers[2].isReady ? " (READY)" : "") : "Waiting...";

    document.getElementById('networkControls').style.opacity = '0';
    setTimeout(() => document.getElementById('networkControls').style.display = 'none', 300);

    hostMatchTime = parseInt(document.getElementById('matchTimeSetting').value) || 60;
    document.getElementById('roomMatchRules').innerText = `SQUAD BATTLE | ${hostMatchTime} SECONDS`;

    const allReady = peers.length > 0 && peers.every(p => p.isReady);
    const btnStart = document.getElementById('btnStartMatch');
    const waitingText = document.getElementById('waitingText');

    if (isSquadHost) {
        document.getElementById('btnReady').style.display = 'none'; 
        btnStart.style.display = 'block'; 
        waitingText.style.display = 'none';
        if (allReady) { btnStart.style.opacity = '1'; btnStart.style.pointerEvents = 'auto'; } 
        else { btnStart.style.opacity = '0.4'; btnStart.style.pointerEvents = 'none'; }
    } else {
        btnStart.style.display = 'none'; 
        document.getElementById('btnReady').style.display = 'block';
        if (isPeerReady) { 
            document.getElementById('btnReady').innerText = '[ CANCEL READY ]'; 
            document.getElementById('btnReady').style.background = '#ffb020'; 
            waitingText.style.display = 'block'; 
        } else { 
            document.getElementById('btnReady').innerText = '[ HOLD TO READY ]'; 
            document.getElementById('btnReady').style.background = '#22e0ff'; 
            waitingText.style.display = 'none'; 
        }
    }
}

function initTrysteroRoom(roomId, asHost) {
    // TRACKING PREVENTION DETECTOR: Captures Edge/Brave blocking the CDN
    if (typeof trystero === 'undefined') {
        alert("SQUAD MODE BLOCKED: Your browser's Tracking Prevention is blocking the mesh network. Please click the Lock/Shield icon in your URL bar, disable Tracking Prevention for this site, and refresh.");
        if (typeof resetToHub === "function") resetToHub();
        return;
    }

    if (trysteroRoom) trysteroRoom.leave();
    trysteroRoom = trystero.joinRoom(config, roomId);
    
    isSquadHost = asHost;
    myTeam = isSquadHost ? 'blue' : 'red';
    squadPlayers = {};
    squadAims = {};

    document.getElementById('skeletonUI').style.display = 'none';
    document.getElementById('matchLobby').style.display = 'flex';
    document.getElementById('statusContainer').style.display = 'none';
    updateSquadLobbyUI();

    const [sendAim, getAim] = trysteroRoom.makeAction('aim');
    const [sendShoot, getShoot] = trysteroRoom.makeAction('shoot');
    const [sendHit, getHit] = trysteroRoom.makeAction('hit');
    const [sendSpawn, getSpawn] = trysteroRoom.makeAction('spawn');
    const [sendEmp, getEmp] = trysteroRoom.makeAction('emp');
    const [sendState, getState] = trysteroRoom.makeAction('state');

    window.trysteroSendAim = sendAim;
    window.trysteroSendShoot = sendShoot;
    window.trysteroSendHit = sendHit;
    window.trysteroSendSpawn = sendSpawn;
    window.trysteroSendEmp = sendEmp;
    window.trysteroSendState = sendState;

    trysteroRoom.onPeerJoin(peerId => {
        if (Object.keys(squadPlayers).length >= 3) {
            console.warn("Anti-Cheat: Lobby capacity reached. Ignoring extra peer connection.");
            return;
        }

        const teamAssign = (Object.keys(squadPlayers).length % 2 === 0) ? 'red' : 'blue';
        squadPlayers[peerId] = { id: peerId, name: "Connecting...", team: teamAssign, score: 0, combo: 1, isReady: false };
        squadAims[peerId] = { x: 0.5, y: 0.5, team: teamAssign };
        
        sendState({ type: 'handshake', name: myUsername }, peerId);
    });

    trysteroRoom.onPeerLeave(peerId => {
        delete squadPlayers[peerId];
        delete squadAims[peerId];
        updateSquadLobbyUI();
    });

    getState((data, peerId) => {
        if (data.type === 'handshake') {
            if(squadPlayers[peerId]) squadPlayers[peerId].name = data.name;
            updateSquadLobbyUI();
        }
        else if (data.type === 'ready') {
            if(squadPlayers[peerId]) squadPlayers[peerId].isReady = data.state;
            updateSquadLobbyUI();
        }
        else if (data.type === 'start') {
            if (!isSquadHost && !squadPlayers[peerId]?.isReady && !isPeerReady) return; 
            if (typeof runCountdown === "function") runCountdown(data.time);
        }
        else if (data.type === 'reset_lobby') {
            if (typeof resetToHub === "function") resetToHub();
        }
    });

    getAim((data, peerId) => {
        if (squadAims[peerId]) { squadAims[peerId].x = data.x; squadAims[peerId].y = data.y; }
    });

    getShoot((data, peerId) => {
        const w = WEAPONS.find(weap => weap.id === data.weaponId);
        if (w && typeof audio !== 'undefined') {
            audio.shoot(w);
            if(w.id === '[ RAIL ]') { railTrails.push({x: data.x, y: data.y, life: 1.5}); screenShake = 10; }
            if(w.id === '[ AEGIS ]') shockwaves.push({x: data.x, y: data.y, life: 1, maxR: 0.15});
            for(let i = 0; i < w.pellets; i++) { 
                const color = (squadPlayers[peerId] && squadPlayers[peerId].team === 'blue') ? '#22e0ff' : '#ff2d95';
                flashes.push({ x: data.x + (Math.random() - 0.5) * w.spread, y: data.y + (Math.random() - 0.5) * w.spread, color: color, age: 0, poly: w.id!=='[ PULSE ]' }); 
            }
        }
    });

    getHit((data, peerId) => {
        if(squadPlayers[peerId]) {
            squadPlayers[peerId].score += data.damage; 
            hitMarkers.push({ x: data.shotX, y: data.shotY, age: 0 });
            executeHit(data.targetId, 'Peer', data.damage);
        }
    });

    getSpawn((target) => {
        targets.push(target);
    });

    getEmp(() => {
        if (typeof triggerJam === "function") triggerJam();
    });
}

document.getElementById('connectBtn').addEventListener('click', () => {
    if (gameMode !== 'SQUAD') return;
    const targetId = document.getElementById('joinId').value.trim();
    if (targetId) {
        document.getElementById('status').innerText = 'Joining Mesh...'; 
        document.getElementById('lobby').style.display = 'none'; 
        document.getElementById('skeletonUI').style.display = 'block';
        initTrysteroRoom(targetId, false);
    }
});

document.getElementById('btnSquad').addEventListener('click', () => {
    if (gameMode !== 'SQUAD') return;
    initTrysteroRoom(document.getElementById('playerId').innerText, true);
});

document.getElementById('btnStartMatch').addEventListener('click', () => { 
    if (gameMode !== 'SQUAD') return;
    if (window.trysteroSendState) window.trysteroSendState({ type: 'start', time: hostMatchTime }); 
    if (typeof runCountdown === "function") runCountdown(hostMatchTime); 
});

document.getElementById('btnReady').addEventListener('pointerdown', (e) => {
    if (gameMode !== 'SQUAD' || isSquadHost) return;
    if (isPeerReady) {
        isPeerReady = false; 
        if (window.trysteroSendState) window.trysteroSendState({ type: 'ready', state: false });
        updateSquadLobbyUI(); return;
    }
    const btnReady = document.getElementById('btnReady');
    btnReady.style.background = 'linear-gradient(90deg, #8dff5a 0%, #22e0ff 0%)';
    let progress = 0;
    readyHoldTimer = setInterval(() => {
        progress += 4;
        btnReady.style.background = `linear-gradient(90deg, #8dff5a ${progress}%, #22e0ff ${progress}%)`;
        if (progress >= 100) {
            clearInterval(readyHoldTimer);
            isPeerReady = true;
            if (window.trysteroSendState) window.trysteroSendState({ type: 'ready', state: true });
            updateSquadLobbyUI();
        }
    }, 40);
});