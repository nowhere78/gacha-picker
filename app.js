document.addEventListener('DOMContentLoaded', () => {
  const MAX_ITEMS = 8;
  const inputGrid = document.getElementById('input-grid');
  const btnGotoGacha = document.getElementById('btn-goto-gacha');
  
  const screenSetup = document.getElementById('screen-setup');
  const screenMachine = document.getElementById('screen-machine');
  const transitionOverlay = document.getElementById('transition-overlay');
  
  const btnBack = document.getElementById('btn-back');
  const btnSpin = document.getElementById('btn-spin');
  const lotteryDrum = document.getElementById('lottery-drum');
  const dispensedCapsule = document.getElementById('dispensed-capsule');
  const capsulesContainer = document.getElementById('capsules-container');
  
  const resultModal = document.getElementById('result-modal');
  const resultText = document.getElementById('result-text');
  const btnReset = document.getElementById('btn-reset');
  const particles = document.getElementById('particles');

  const colors = [
    '#f43f5e', '#3b82f6', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#d946ef', '#84cc16'
  ];

  let options = [];
  let physicsInterval = null;
  let capsulesData = [];
  let drumRotation = 0;
  let drumSpinSpeed = 0;

  for (let i = 0; i < MAX_ITEMS; i++) {
    const slot = document.createElement('div');
    slot.className = 'input-slot';
    slot.innerHTML = `
      <div class="slot-memo" id="memo-${i}" style="background: ${colors[i]}" data-color="${colors[i]}"></div>
      <input type="text" placeholder="입력 ${i + 1}" class="option-input" data-index="${i}">
    `;
    inputGrid.appendChild(slot);
  }

  const inputs = document.querySelectorAll('.option-input');

  inputs.forEach(input => {
    input.addEventListener('input', checkInputs);
  });

  function checkInputs() {
    options = [];
    inputs.forEach((input, i) => {
      if (input.value.trim() !== '') {
        options.push({
          text: input.value.trim(),
          color: colors[input.dataset.index],
          elId: `memo-${i}`
        });
      }
    });

    if (options.length >= 2) {
      btnGotoGacha.disabled = false;
      btnGotoGacha.classList.add('animate-pulse');
    } else {
      btnGotoGacha.disabled = true;
      btnGotoGacha.classList.remove('animate-pulse');
    }
  }

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'turn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'drop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  }

  // Phase 1-4 Transition Animation
  btnGotoGacha.addEventListener('click', () => {
    screenSetup.classList.remove('active');
    transitionOverlay.classList.remove('hidden');
    transitionOverlay.innerHTML = '';
    
    let animatedElements = [];

    // Phase 1: Clone memos and move to center
    options.forEach((opt, idx) => {
      const original = document.getElementById(opt.elId);
      const rect = original.getBoundingClientRect();
      
      const clone = document.createElement('div');
      clone.className = 'anim-memo';
      clone.style.background = opt.color;
      clone.style.top = rect.top + 'px';
      clone.style.left = rect.left + 'px';
      clone.innerText = opt.text;
      
      const shell = document.createElement('div');
      shell.className = 'anim-capsule-shell';
      clone.appendChild(shell);
      
      transitionOverlay.appendChild(clone);
      animatedElements.push({ clone, shell });
    });

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2 - 50;

    // Trigger animation
    setTimeout(() => {
      animatedElements.forEach((item, i) => {
        // Move to center with a slight random offset
        item.clone.style.transform = `translate(${centerX - parseInt(item.clone.style.left) - 50 + (Math.random()*40-20)}px, ${centerY - parseInt(item.clone.style.top) - 50 + (Math.random()*40-20)}px) scale(0.6)`;
      });
      playSound('drop');
    }, 100);

    // Phase 2: Shell appears
    setTimeout(() => {
      animatedElements.forEach(item => {
        item.shell.style.opacity = '1';
        item.shell.style.transform = 'translate(-50%, -50%) scale(1)';
      });
      playSound('pop');
    }, 500);

    // Phase 3 & 4: Drop to machine
    setTimeout(() => {
      screenMachine.classList.add('active');
      animatedElements.forEach((item, i) => {
        // Fall down animation
        setTimeout(() => {
          item.clone.style.top = (centerY + 300) + 'px';
          item.clone.style.opacity = '0';
          playSound('turn');
        }, i * 50);
      });
      
      setTimeout(() => {
        transitionOverlay.classList.add('hidden');
        initPhysics();
      }, 500 + options.length * 50);
    }, 1100);
  });

  btnBack.addEventListener('click', () => {
    screenMachine.classList.remove('active');
    screenSetup.classList.add('active');
    stopPhysics();
  });

  // Physics Engine
  function initPhysics() {
    capsulesContainer.innerHTML = '';
    capsulesData = [];
    
    const totalBalls = Math.max(15, options.length); // Fill drum with at least 15 balls
    
    for (let i = 0; i < totalBalls; i++) {
      let opt = options[i];
      let isDummy = false;
      if (!opt) {
        opt = { color: colors[Math.floor(Math.random() * colors.length)], text: '' };
        isDummy = true;
      }

      const el = document.createElement('div');
      el.className = 'physics-capsule';
      el.innerHTML = `<div class="paper" style="background: ${opt.color}"></div>`;
      capsulesContainer.appendChild(el);
      
      capsulesData.push({
        el: el,
        x: 126 + (Math.random() - 0.5) * 80,
        y: 20 + (Math.random() * 80),
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        color: opt.color,
        text: opt.text,
        rotation: Math.random() * 360,
        isDummy: isDummy
      });
    }

    if (physicsInterval) clearInterval(physicsInterval);
    physicsInterval = setInterval(updatePhysics, 1000/60);
  }

  function stopPhysics() {
    if (physicsInterval) clearInterval(physicsInterval);
  }

  function updatePhysics() {
    const r = 126; // Inner radius of drum (252px total inner width)
    const cx = 126, cy = 126; // Center
    
    if (drumSpinSpeed > 0) {
      drumRotation += drumSpinSpeed;
      drumSpinSpeed *= 0.98; // Friction
      if (drumSpinSpeed < 0.1) drumSpinSpeed = 0;
      lotteryDrum.style.transform = `rotate(${drumRotation}deg)`;
      if (drumSpinSpeed > 2 && Math.random() < 0.2) playSound('turn');
    }

    capsulesData.forEach((c, idx) => {
      c.vy += 0.8; // Stronger gravity to prevent floating
      
      // Drum spin forces
      if (drumSpinSpeed > 0) {
        const dx = (c.x + 20) - cx;
        const dy = (c.y + 20) - cy;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const tx = -dy / dist;
        const ty = dx / dist;
        // Strong rotational force
        c.vx += tx * drumSpinSpeed * 0.15;
        c.vy += ty * drumSpinSpeed * 0.15;
        // Pushing force towards center to mix
        c.vx -= (dx/dist) * drumSpinSpeed * 0.05;
        c.vy -= (dy/dist) * drumSpinSpeed * 0.05;
      }

      c.vx *= 0.99; // Less air friction
      c.vy *= 0.99;

      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.vx * 2;

      // Circle collision against drum wall
      const dx = c.x + 20 - cx;
      const dy = c.y + 20 - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > r - 20) {
        const nx = dx / dist;
        const ny = dy / dist;
        
        c.x = cx + nx * (r - 20) - 20;
        c.y = cy + ny * (r - 20) - 20;
        
        const dot = c.vx * nx + c.vy * ny;
        c.vx -= 2 * dot * nx * 0.5; // Less restitution
        c.vy -= 2 * dot * ny * 0.5;
        
        // Anti-stick logic: if stuck at top, push down
        if (ny < -0.8 && Math.abs(c.vy) < 1 && drumSpinSpeed === 0) {
           c.vx += (Math.random() - 0.5) * 3;
           c.vy += 2;
        }
      }
      
      // Capsule collision
      for (let j = idx + 1; j < capsulesData.length; j++) {
        const c2 = capsulesData[j];
        const dx2 = (c2.x) - (c.x);
        const dy2 = (c2.y) - (c.y);
        const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        
        if (dist2 < 40) {
          const nx2 = dx2 / (dist2 || 1);
          const ny2 = dy2 / (dist2 || 1);
          const overlap = 40 - dist2;
          
          c.x -= nx2 * overlap / 2;
          c.y -= ny2 * overlap / 2;
          c2.x += nx2 * overlap / 2;
          c2.y += ny2 * overlap / 2;
          
          const tx = c.vx;
          const ty = c.vy;
          c.vx = c2.vx * 0.8;
          c.vy = c2.vy * 0.8;
          c2.vx = tx * 0.8;
          c2.vy = ty * 0.8;
        }
      }

      c.el.style.left = c.x + 'px';
      c.el.style.top = c.y + 'px';
      c.el.style.transform = `rotate(${c.rotation}deg)`;
    });
  }

  // Spin Button Interaction
  let isSpinning = false;

  btnSpin.addEventListener('click', () => {
    if (isSpinning) return;
    isSpinning = true;
    btnSpin.disabled = true;
    
    drumSpinSpeed = 25; // Huge initial speed
    playSound('drop');
    
    // Spin for 4 seconds, then dispense
    setTimeout(() => {
      dispenseCapsule();
    }, 4000);
  });

  function dispenseCapsule() {
    playSound('drop');
    const winner = options[Math.floor(Math.random() * options.length)];
    
    const paper = dispensedCapsule.querySelector('.inner-paper');
    paper.style.background = winner.color;
    dispensedCapsule.className = 'dispensed-capsule drop-anim';
    
    setTimeout(() => {
      showResult(winner);
    }, 1000);
  }

  function showResult(winner) {
    resultText.textContent = winner.text;
    resultText.style.color = '#ffffff';
    
    const top = document.querySelector('.capsule-top');
    top.style.background = winner.color;
    top.style.boxShadow = `0 0 20px ${winner.color}, inset -10px -10px 20px rgba(0,0,0,0.2)`;

    resultModal.classList.add('show');
    
    setTimeout(() => {
      playSound('pop');
      resultModal.classList.add('opened');
      createParticles(winner.color);
    }, 500);
  }

  function createParticles(color) {
    particles.innerHTML = '';
    for(let i=0; i<30; i++) {
      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.width = '10px';
      p.style.height = '10px';
      p.style.background = Math.random() > 0.5 ? color : '#fff';
      p.style.borderRadius = '50%';
      p.style.top = '50%';
      p.style.left = '50%';
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      const tx = Math.cos(angle) * speed;
      const ty = Math.sin(angle) * speed;
      
      p.style.transition = 'all 1s cubic-bezier(0.1, 0.8, 0.3, 1)';
      p.style.transform = 'translate(-50%, -50%)';
      
      particles.appendChild(p);
      
      requestAnimationFrame(() => {
        p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
        p.style.opacity = '0';
      });
    }
  }

  btnReset.addEventListener('click', () => {
    resultModal.classList.remove('show');
    resultModal.classList.remove('opened');
    dispensedCapsule.className = 'dispensed-capsule hidden';
    isSpinning = false;
    btnSpin.disabled = false;
  });

});
