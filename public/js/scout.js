// Scout Dashboard Talent Directory and Profile Viewer

const Scout = {
  athletes: [],
  selectedSport: '',
  modalChartInstance: null,

  async load(sport = '') {
    this.selectedSport = sport;
    const token = localStorage.getItem('token');
    
    // Construct query parameter
    let url = '/api/scout/athletes';
    if (sport) url += `?sport=${encodeURIComponent(sport)}`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      this.athletes = data;

      this.renderAthletesGrid(this.athletes);
      this.setupFilters();
      this.bindEvents();

    } catch (err) {
      console.error('Failed to load scout data:', err);
      App.showToast('Failed to fetch talent list.', 'error');
    }
  },

  renderAthletesGrid(athletesList) {
    const grid = document.getElementById('scout-athletes-grid');
    if (!grid) return;

    if (athletesList.length === 0) {
      grid.innerHTML = `
        <div class="empty-state glass" style="grid-column: 1/-1;">
          <p>No athletes found matching the criteria.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = athletesList.map(a => `
      <div class="athlete-card glass" data-id="${a.id}">
        <img class="athlete-card-avatar" src="${a.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60'}" alt="${a.name}">
        <div class="athlete-card-details">
          <div class="athlete-card-name">${a.name}</div>
          <div class="athlete-card-meta">
            <span class="athlete-badge">${a.sport}</span>
            <span>Age: ${a.age || 'N/A'}</span>
          </div>
          <p style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 4px; line-height: 1.2;">
            ${a.bio ? a.bio.substring(0, 50) + (a.bio.length > 50 ? '...' : '') : 'No bio provided.'}
          </p>
        </div>
        <div class="athlete-card-score">
          <span class="num">${a.avg_score || '--'}</span>
          <span class="label">AI RATING</span>
        </div>
        <button class="btn btn-secondary btn-block btn-view-profile" data-id="${a.id}" style="margin-top: 8px; font-size: 0.75rem; padding: 8px;">
          View Metrics
        </button>
      </div>
    `).join('');

    // Bind profile modal openers
    grid.querySelectorAll('.btn-view-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.getAttribute('data-id'));
        const athlete = this.athletes.find(ath => ath.id === id);
        if (athlete) {
          this.openAthleteModal(athlete);
        }
      });
    });
  },

  setupFilters() {
    // Highlighting current filter chip
    document.querySelectorAll('.filter-chip').forEach(chip => {
      const chipSport = chip.getAttribute('data-sport');
      if (chipSport === this.selectedSport) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  },

  async openAthleteModal(athlete) {
    const modal = document.getElementById('athlete-detail-modal');
    const body = document.getElementById('scout-modal-body');
    
    // Check if there is already a connection
    const token = localStorage.getItem('token');
    let connectionStatus = 'none';

    try {
      const resConns = await fetch('/api/scout/connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conns = await resConns.json();
      const existing = conns.find(c => c.name === athlete.name);
      if (existing) {
        connectionStatus = existing.status;
      }
    } catch (err) {
      console.error(err);
    }

    let contactButtonHtml = '';
    if (connectionStatus === 'pending') {
      contactButtonHtml = `<button class="btn btn-secondary btn-block" disabled>Connection Request Pending</button>`;
    } else if (connectionStatus === 'accepted') {
      contactButtonHtml = `<button class="btn btn-primary btn-block" style="background:var(--color-success); color:#fff;" disabled><i data-lucide="check"></i> Connected</button>`;
    } else {
      contactButtonHtml = `<button class="btn btn-primary btn-block" id="btn-scout-connect" data-id="${athlete.id}"><i data-lucide="handshake"></i> Send Trial Invitation</button>`;
    }

    // Render detailed HTML
    body.innerHTML = `
      <div class="scout-athlete-profile">
        <div class="profile-meta-top">
          <img class="profile-large-avatar" src="${athlete.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60'}" alt="${athlete.name}">
          <div class="profile-meta-right">
            <h3>${athlete.name}</h3>
            <p><span class="athlete-badge">${athlete.sport}</span></p>
            <p style="margin-top: 6px;">Age: <strong>${athlete.age || 'N/A'}</strong></p>
            <p>Assessments: <strong>${athlete.drill_count || 0} drills</strong></p>
          </div>
        </div>

        <div class="profile-bio">
          <strong>Athlete Bio:</strong>
          <p style="margin-top: 4px;">${athlete.bio || 'No biography uploaded.'}</p>
        </div>

        <div class="glass" style="padding: 12px; margin-top: 4px;">
          <h4 style="font-size: 0.9rem; margin-bottom: 12px; text-align: center;">Kinetic Performance Map</h4>
          <div class="chart-container" style="height: 200px;">
            <canvas id="scoutRadarChart"></canvas>
          </div>
        </div>

        <div class="history-list" style="margin-top: 10px;">
          <strong style="font-size: 0.85rem;">Drill Score Breakdown</strong>
          ${athlete.drills.length === 0 ? '<p style="font-size:0.75rem; color:var(--color-text-dim);">No completed drills.</p>' : 
            athlete.drills.map(d => `
              <div class="history-item glass" style="padding: 8px 12px; margin-top: 6px;">
                <div class="history-info">
                  <span class="history-drill" style="font-size:0.8rem;">${d.drill_name}</span>
                  <span style="font-size:0.65rem; color:var(--color-text-muted);">${d.feedback}</span>
                </div>
                <div class="history-score" style="width:36px; height:36px; font-size:0.85rem;">${d.score}</div>
              </div>
            `).join('')
          }
        </div>

        <div style="margin-top: 16px;">
          ${contactButtonHtml}
        </div>
      </div>
    `;

    lucide.createIcons();
    modal.classList.add('active');

    // Create Modal Chart.js
    this.renderModalChart(athlete);

    // Bind Connect Request Action
    const connectBtn = document.getElementById('btn-scout-connect');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        const id = parseInt(connectBtn.getAttribute('data-id'));
        try {
          const res = await fetch('/api/scout/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ athlete_id: id })
          });
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.message || 'Failed to connect');

          App.showToast('Trial request sent successfully!');
          connectBtn.textContent = 'Connection Request Pending';
          connectBtn.disabled = true;
          connectBtn.classList.replace('btn-primary', 'btn-secondary');

        } catch (err) {
          App.showToast(err.message, 'error');
        }
      });
    }
  },

  renderModalChart(athlete) {
    const ctx = document.getElementById('scoutRadarChart');
    if (!ctx) return;

    if (this.modalChartInstance) {
      this.modalChartInstance.destroy();
    }

    let tech = 50, speed = 50, power = 50;
    if (athlete.drills.length > 0) {
      let t = 0, s = 0, p = 0;
      athlete.drills.forEach(d => {
        t += d.technique_score;
        s += d.speed_score;
        p += d.power_score;
      });
      tech = Math.round(t / athlete.drills.length);
      speed = Math.round(s / athlete.drills.length);
      power = Math.round(p / athlete.drills.length);
    }

    this.modalChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Technique', 'Speed & Agility', 'Power & Force', 'Posture', 'Consistency'],
        datasets: [{
          data: [tech, speed, power, Math.round((tech+speed)/2), Math.round((tech+power)/2)],
          backgroundColor: 'rgba(0, 240, 255, 0.15)',
          borderColor: '#00f0ff',
          borderWidth: 2,
          pointBackgroundColor: '#d4ff00',
          pointBorderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: { color: '#9ca3af', font: { family: 'Outfit', size: 9 } },
            ticks: { backdropColor: 'transparent', color: '#6b7280', font: { size: 7 }, beginAtZero: true, max: 100, stepSize: 25 }
          }
        }
      }
    });
  },

  bindEvents() {
    // Close Modal Button
    const closeBtn = document.getElementById('btn-close-scout-modal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.getElementById('athlete-detail-modal').classList.remove('active');
      };
    }

    // Sport chip filters
    document.querySelectorAll('.filter-chip').forEach(chip => {
      // Remove old handlers to prevent multiples
      const newChip = chip.cloneNode(true);
      chip.parentNode.replaceChild(newChip, chip);
      
      newChip.addEventListener('click', () => {
        const sport = newChip.getAttribute('data-sport');
        this.load(sport);
      });
    });

    // Real-time search filter input
    const searchInput = document.getElementById('scout-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = this.athletes.filter(a => a.name.toLowerCase().includes(query));
        this.renderAthletesGrid(filtered);
      };
    }
  }
};

window.Scout = Scout;
