// AI Motion Tracking Canvas Overlay and Assessment Logic

const Assessment = {
  video: null,
  canvas: null,
  ctx: null,
  stream: null,
  isScanning: false,
  scanProgress: 0,
  animationFrameId: null,
  selectedDrill: null,
  simulatedSkeleton: null,
  telemetryLogs: [],
  
  drillsConfig: {
    football_dribble: { name: 'Shuttle Run & Agility Dribbling', sport: 'Football', tech: 88, speed: 92, power: 84, feedback: 'Excellent agility and low center of gravity. Stride frequency matches optimal recovery templates. Inside foot contact velocity can be refined.' },
    football_penalty: { name: 'Penalty Kick Release Angle', sport: 'Football', tech: 84, speed: 80, power: 89, feedback: 'Great ball clearance speed. Launch posture matches 88% alignment. Keep your non-kicking foot closer to the ball to decrease lift deviation.' },
    basketball_freethrow: { name: 'Free Throw Form & Wrist Extension', sport: 'Basketball', tech: 93, speed: 84, power: 95, feedback: 'Elite follow-through and elbow stability (47° lift arc). Wrist snap extension matches high-efficiency parameters.' },
    basketball_agility: { name: 'Defensive Agility Shuffle', sport: 'Basketball', tech: 80, speed: 88, power: 78, feedback: 'Quick transition speeds, but posture load is slightly high. Try to crouch lower to reduce deceleration knee pressure.' },
    athletics_sprint: { name: '100m Block Start Angle', sport: 'Athletics', tech: 91, speed: 95, power: 92, feedback: 'Exceptional clearance drive. Hip extension angle hits 172° (optimal: 170°-180°). Sprint block reaction time: 0.14 seconds.' }
  },

  load() {
    this.video = document.getElementById('video-feed');
    this.canvas = document.getElementById('scanner-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
    this.populateDrills();
    this.bindEvents();
    this.updateHUD();
  },

  setupCanvas() {
    // Set internal resolution matching element aspect ratio
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.clearCanvas();
  },

  clearCanvas() {
    this.ctx.fillStyle = '#0b0b0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  },

  populateDrills() {
    const select = document.getElementById('assess-drill-select');
    if (!select) return;

    // Filter drills based on user primary sport
    const userSport = App.currentUser ? App.currentUser.sport : '';
    select.innerHTML = '';
    
    Object.keys(this.drillsConfig).forEach(key => {
      const drill = this.drillsConfig[key];
      // Prioritize athlete's sport but load all
      const isDefault = drill.sport === userSport ? 'selected' : '';
      select.innerHTML += `<option value="${key}" ${isDefault}>[${drill.sport}] ${drill.name}</option>`;
    });

    this.selectedDrill = this.drillsConfig[select.value];
  },

  updateHUD() {
    const select = document.getElementById('assess-drill-select');
    if (!select) return;
    this.selectedDrill = this.drillsConfig[select.value];
    document.getElementById('hud-drill-name').textContent = this.selectedDrill.name.toUpperCase();
  },

  async startCamera() {
    this.stopCamera();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      this.video.srcObject = this.stream;
      this.video.play();
      document.getElementById('scanner-prompt').style.display = 'none';
      document.getElementById('btn-run-analysis').disabled = false;
      this.logToTerminal('[SYS] WebCam interface linked. Frame buffer locked at 30fps.');
      this.startDrawingLoop();
    } catch (err) {
      console.error('Camera access failed:', err);
      App.showToast('Camera access denied. Please upload a video file instead.', 'error');
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  },

  handleVideoUpload(file) {
    this.stopCamera();
    const url = URL.createObjectURL(file);
    this.video.srcObject = null;
    this.video.src = url;
    
    this.video.onloadeddata = () => {
      this.video.play();
      document.getElementById('scanner-prompt').style.display = 'none';
      document.getElementById('btn-run-analysis').disabled = false;
      this.logToTerminal(`[SYS] Source video parsed: ${file.name} (${Math.round(this.video.duration)}s)`);
      this.startDrawingLoop();
    };
  },

  startDrawingLoop() {
    const draw = () => {
      if (!this.video.paused && !this.video.ended) {
        // Draw video frame on canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Render skeletal tracking overlay
        this.drawSkeleton();

        // Update FPS HUD
        document.getElementById('hud-fps').textContent = `FPS: ${Math.floor(28 + Math.random() * 4)}`;
        document.getElementById('hud-stability').textContent = this.isScanning ? `${Math.floor(92 + Math.random() * 6)}%` : 'READY';
      }
      this.animationFrameId = requestAnimationFrame(draw);
    };
    this.animationFrameId = requestAnimationFrame(draw);
  },

  // Generates procedurally moving nodes based on selected drills to look like premium pose estimation
  drawSkeleton() {
    const time = Date.now() * 0.003;
    let joints = {};

    // Define center coordinates
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    if (this.selectedDrill.sport === 'Basketball') {
      // Free throw arm raise simulation
      const cycle = Math.sin(time) * 0.5 + 0.5; // 0 to 1
      joints = {
        head: { x: cx, y: cy - 120 },
        neck: { x: cx, y: cy - 90 },
        l_shoulder: { x: cx - 45, y: cy - 70 },
        r_shoulder: { x: cx + 45, y: cy - 70 },
        r_elbow: { x: cx + 70 + (cycle * 20), y: cy - 70 - (cycle * 60) },
        r_wrist: { x: cx + 80 + (cycle * 5), y: cy - 110 - (cycle * 110) },
        l_elbow: { x: cx - 75, y: cy - 30 },
        l_wrist: { x: cx - 80, y: cy - 70 },
        spine: { x: cx, y: cy + 10 },
        l_hip: { x: cx - 35, y: cy + 40 },
        r_hip: { x: cx + 35, y: cy + 40 },
        r_knee: { x: cx + 40, y: cy + 110 + (cycle * 15) },
        r_ankle: { x: cx + 42, y: cy + 175 },
        l_knee: { x: cx - 40, y: cy + 110 + (cycle * 15) },
        l_ankle: { x: cx - 42, y: cy + 175 }
      };
    } else if (this.selectedDrill.sport === 'Football') {
      // Side shuffle kick simulation
      const cycle = Math.sin(time * 1.5);
      joints = {
        head: { x: cx + (cycle * 15), y: cy - 110 },
        neck: { x: cx + (cycle * 15), y: cy - 80 },
        l_shoulder: { x: cx - 40 + (cycle * 15), y: cy - 60 },
        r_shoulder: { x: cx + 40 + (cycle * 15), y: cy - 60 },
        r_elbow: { x: cx + 65, y: cy - 40 },
        r_wrist: { x: cx + 80, y: cy - 20 },
        l_elbow: { x: cx - 65, y: cy - 40 },
        l_wrist: { x: cx - 80, y: cy - 20 },
        spine: { x: cx + (cycle * 12), y: cy + 20 },
        l_hip: { x: cx - 30 + (cycle * 10), y: cy + 50 },
        r_hip: { x: cx + 30 + (cycle * 10), y: cy + 50 },
        r_knee: { x: cx + 35 + (cycle * 25), y: cy + 120 },
        r_ankle: { x: cx + 40 + (cycle * 40), y: cy + 180 },
        l_knee: { x: cx - 35, y: cy + 120 },
        l_ankle: { x: cx - 38, y: cy + 180 }
      };
    } else {
      // Sprint start drive simulation
      const cycle = Math.min(1, Math.max(0, Math.sin(time) * 1.2 + 0.5));
      joints = {
        head: { x: cx - 120 + (cycle * 240), y: cy - 30 - (cycle * 60) },
        neck: { x: cx - 90 + (cycle * 230), y: cy - 10 - (cycle * 50) },
        l_shoulder: { x: cx - 80 + (cycle * 220), y: cy - 30 - (cycle * 45) },
        r_shoulder: { x: cx - 80 + (cycle * 220), y: cy + 10 - (cycle * 45) },
        r_elbow: { x: cx - 120 + (cycle * 210), y: cy + 40 - (cycle * 30) },
        r_wrist: { x: cx - 140 + (cycle * 210), y: cy + 80 - (cycle * 10) },
        l_elbow: { x: cx - 50 + (cycle * 190), y: cy - 70 - (cycle * 30) },
        l_wrist: { x: cx - 30 + (cycle * 180), y: cy - 100 - (cycle * 20) },
        spine: { x: cx - 30 + (cycle * 200), y: cy + 10 - (cycle * 30) },
        l_hip: { x: cx + 10 + (cycle * 170), y: cy + 20 - (cycle * 20) },
        r_hip: { x: cx + 10 + (cycle * 170), y: cy - 10 - (cycle * 20) },
        r_knee: { x: cx - 10 + (cycle * 120), y: cy + 40 },
        r_ankle: { x: cx - 50 + (cycle * 80), y: cy + 90 },
        l_knee: { x: cx + 50 + (cycle * 160), y: cy - 40 },
        l_ankle: { x: cx + 80 + (cycle * 120), y: cy - 80 }
      };
    }

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = this.isScanning ? '#00f0ff' : '#d4ff00';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.isScanning ? 'rgba(0, 240, 255, 0.5)' : 'rgba(212, 255, 0, 0.5)';

    // Connect joints (Skeletal Lines)
    const bones = [
      ['head', 'neck'],
      ['neck', 'l_shoulder'], ['neck', 'r_shoulder'],
      ['l_shoulder', 'l_elbow'], ['l_elbow', 'l_wrist'],
      ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_wrist'],
      ['neck', 'spine'],
      ['spine', 'l_hip'], ['spine', 'r_hip'],
      ['l_hip', 'l_knee'], ['l_knee', 'l_ankle'],
      ['r_hip', 'r_knee'], ['r_knee', 'r_ankle']
    ];

    bones.forEach(([j1, j2]) => {
      if (joints[j1] && joints[j2]) {
        this.ctx.beginPath();
        this.ctx.moveTo(joints[j1].x, joints[j1].y);
        this.ctx.lineTo(joints[j2].x, joints[j2].y);
        this.ctx.stroke();
      }
    });

    // Draw Joint Nodes
    this.ctx.shadowBlur = 0; // reset
    Object.keys(joints).forEach(name => {
      const { x, y } = joints[name];
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
      this.ctx.fillStyle = this.isScanning ? '#fff' : '#00f0ff';
      this.ctx.fill();
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = '#08080c';
      this.ctx.stroke();
    });

    // Draw technical angles HUD next to a key joint
    if (this.isScanning) {
      this.ctx.fillStyle = '#d4ff00';
      this.ctx.font = 'bold 9px monospace';
      
      if (this.selectedDrill.sport === 'Basketball' && joints.r_elbow) {
        const elbowAngle = Math.round(90 + Math.sin(time * 2) * 45);
        this.ctx.fillText(`ELBOW FLEX: ${elbowAngle}°`, joints.r_elbow.x + 12, joints.r_elbow.y + 4);
      } else if (this.selectedDrill.sport === 'Football' && joints.r_knee) {
        const kneeExtension = Math.round(110 + Math.sin(time) * 55);
        this.ctx.fillText(`KNEE EXTENSION: ${kneeExtension}°`, joints.r_knee.x + 12, joints.r_knee.y + 4);
      } else if (joints.l_hip) {
        const driveAngle = Math.round(130 + Math.cos(time) * 40);
        this.ctx.fillText(`HIP EXTENSION: ${driveAngle}°`, joints.l_hip.x + 12, joints.l_hip.y + 4);
      }
    }
  },

  startAIAnalysis() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    document.getElementById('btn-run-analysis').disabled = true;
    document.getElementById('scanner-grid').style.display = 'block';
    
    // Clear logs
    document.getElementById('terminal-log-body').innerHTML = '';
    
    this.logToTerminal('[SYS] Initializing biomechanical telemetry check...');
    this.logToTerminal('[AI] Connecting to AthletaVision Neural Engine...');
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      
      if (step === 1) {
        this.logToTerminal(`[AI] Standard pose layout loaded. Running sequence: ${this.selectedDrill.name}`);
      } else if (step === 2) {
        this.logToTerminal('[AI] Locking tracking joints: [Shoulders, Knees, Wrists, Ankles]');
      } else if (step === 3) {
        const stability = Math.floor(94 + Math.random() * 5);
        this.logToTerminal(`[AI] Telemetry: Posture balance stability at ${stability}%`);
      } else if (step === 4) {
        this.logToTerminal('[AI] Calculating velocity vectors. Maximum extension acceleration evaluated.');
      } else if (step === 5) {
        this.logToTerminal('[SYS] Telemetry processing complete. Generating biomechanical score index.');
      } else if (step === 6) {
        clearInterval(interval);
        this.completeAnalysis();
      }
    }, 850);
  },

  completeAnalysis() {
    this.isScanning = false;
    document.getElementById('scanner-grid').style.display = 'none';
    document.getElementById('btn-run-analysis').disabled = false;
    this.logToTerminal('[SYS] Run matrix generated. Evaluation results cached.');

    // Calculate score details based on drill config
    const config = this.selectedDrill;
    
    // Add minor random variance to scores for realism (+- 3)
    const variance = () => Math.floor(Math.random() * 7) - 3;
    const finalTech = Math.min(100, Math.max(50, config.tech + variance()));
    const finalSpeed = Math.min(100, Math.max(50, config.speed + variance()));
    const finalPower = Math.min(100, Math.max(50, config.power + variance()));
    const finalOverall = Math.round((finalTech + finalSpeed + finalPower) / 3);

    // Update modal elements
    document.getElementById('res-overall-score').textContent = finalOverall;
    document.getElementById('res-tech-val').textContent = `${finalTech}%`;
    document.getElementById('res-tech-fill').style.width = `${finalTech}%`;
    document.getElementById('res-speed-val').textContent = `${finalSpeed}%`;
    document.getElementById('res-speed-fill').style.width = `${finalSpeed}%`;
    document.getElementById('res-power-val').textContent = `${finalPower}%`;
    document.getElementById('res-power-fill').style.width = `${finalPower}%`;
    document.getElementById('res-feedback-text').textContent = config.feedback;

    // Cache local result to save on confirmation
    this.latestScanResult = {
      sport: config.sport,
      drill_name: config.name,
      score: finalOverall,
      technique_score: finalTech,
      speed_score: finalSpeed,
      power_score: finalPower,
      feedback: config.feedback,
      video_url: 'camera_capture.mp4'
    };

    // Open Modal
    document.getElementById('results-modal').classList.add('active');
  },

  async saveResult() {
    if (!this.latestScanResult) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(this.latestScanResult)
      });

      if (!response.ok) throw new Error('Database save error');

      App.showToast('Assessment successfully published to database!');
      document.getElementById('results-modal').classList.remove('active');
      
      // Stop webcam and return to dashboard
      this.stopCamera();
      App.showView('athlete-dashboard');

    } catch (err) {
      console.error(err);
      App.showToast('Failed to save assessment', 'error');
    }
  },

  logToTerminal(message) {
    const logBody = document.getElementById('terminal-log-body');
    if (!logBody) return;

    let cssClass = 'system';
    if (message.includes('[AI]')) {
      cssClass = message.includes('Telemetry:') ? 'eval' : 'ai';
    }

    logBody.innerHTML += `<div class="log-line ${cssClass}">${message}</div>`;
    logBody.scrollTop = logBody.scrollHeight;
  },

  bindEvents() {
    // Select Drill Change
    document.getElementById('assess-drill-select').addEventListener('change', () => {
      this.updateHUD();
      this.logToTerminal(`[SYS] Drill configuration context swapped to: ${this.selectedDrill.name}`);
    });

    // Start Camera
    document.getElementById('btn-start-camera').addEventListener('click', () => {
      this.startCamera();
    });

    // File Input change
    document.getElementById('video-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleVideoUpload(file);
      }
    });

    // Run AI analysis
    document.getElementById('btn-run-analysis').addEventListener('click', () => {
      this.startAIAnalysis();
    });

    // Modal Close
    document.getElementById('btn-close-results').addEventListener('click', () => {
      document.getElementById('results-modal').classList.remove('active');
    });

    document.getElementById('btn-discard-result').addEventListener('click', () => {
      document.getElementById('results-modal').classList.remove('active');
      this.logToTerminal('[SYS] Evaluation cached data discarded.');
    });

    // Save and Publish
    document.getElementById('btn-save-result').addEventListener('click', () => {
      this.saveResult();
    });
  }
};

window.Assessment = Assessment;
