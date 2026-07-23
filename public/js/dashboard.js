// Athlete Dashboard Renderer and Chart Coordinator

const Dashboard = {
  chartInstance: null,

  async load() {
    if (!App.currentUser) return;
    
    // Set Name
    document.getElementById('dash-athlete-name').textContent = App.currentUser.name;

    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch History
      const resHistory = await fetch('/api/assessments/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const history = await resHistory.json();

      // 2. Fetch Connections Count
      const resConns = await fetch('/api/scout/connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conns = await resConns.json();
      
      // Update Connections Count
      document.getElementById('dash-connections-count').textContent = conns.length;

      // Process Stats & Metrics
      if (history.length > 0) {
        let totalScore = 0;
        let avgTech = 0;
        let avgSpeed = 0;
        let avgPower = 0;

        history.forEach(a => {
          totalScore += a.score;
          avgTech += a.technique_score;
          avgSpeed += a.speed_score;
          avgPower += a.power_score;
        });

        const count = history.length;
        const avgOverall = Math.round(totalScore / count);
        
        avgTech = Math.round(avgTech / count);
        avgSpeed = Math.round(avgSpeed / count);
        avgPower = Math.round(avgPower / count);

        // Update cards
        document.getElementById('dash-overall-score').textContent = avgOverall;
        document.getElementById('dash-drill-count').textContent = count;

        // Render chart with actual data
        this.renderRadarChart(avgTech, avgSpeed, avgPower);
        
        // Generate AI coaching tips
        this.generateAITips(avgTech, avgSpeed, avgPower);

        // Populate recent history list
        this.populateHistory(history);

      } else {
        // Set fallback values
        document.getElementById('dash-overall-score').textContent = '--';
        document.getElementById('dash-drill-count').textContent = 0;
        
        // Render empty chart
        this.renderRadarChart(50, 50, 50);
        this.populateHistory([]);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      App.showToast('Failed to load dashboard metrics', 'error');
    }
  },

  renderRadarChart(technique, speed, power) {
    const ctx = document.getElementById('athleteRadarChart');
    if (!ctx) return;

    // Destroy existing chart if present
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Chart.js Configuration
    this.chartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Technique', 'Speed & Agility', 'Power & Force', 'Posture Balance', 'Consistency'],
        datasets: [{
          label: 'Skill Bio-Metrics',
          data: [technique, speed, power, Math.round((technique + speed) / 2), Math.round((technique + power) / 2)],
          backgroundColor: 'rgba(212, 255, 0, 0.2)',
          borderColor: '#d4ff00',
          borderWidth: 2,
          pointBackgroundColor: '#00f0ff',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#d4ff00'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            angleLines: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            pointLabels: {
              color: '#9ca3af',
              font: {
                family: 'Outfit',
                size: 10,
                weight: '500'
              }
            },
            ticks: {
              backdropColor: 'transparent',
              color: '#6b7280',
              font: {
                size: 8
              },
              beginAtZero: true,
              max: 100,
              stepSize: 20
            }
          }
        }
      }
    });
  },

  generateAITips(tech, speed, power) {
    const container = document.getElementById('ai-tips-container');
    if (!container) return;

    const tips = [];
    
    // Tech tip
    if (tech < 85) {
      tips.push({
        title: 'Form Alignment Alert',
        text: 'Your technique scores show minor kinetic leakage. Focus on keeping your elbow locked at 90 degrees before release.',
        icon: 'shield-alert',
        color: 'color-primary'
      });
    } else {
      tips.push({
        title: 'Technique Mastery',
        text: 'Posture stability matches high-level baselines. You have solid limb symmetry during acceleration frames.',
        icon: 'check-check',
        color: 'color-success'
      });
    }

    // Speed tip
    if (speed < 85) {
      tips.push({
        title: 'Speed & Agility Focus',
        text: 'Lateral agility transition time is slightly high. Engage in shuttle sprints to improve quick foot pivots.',
        icon: 'zap',
        color: 'color-secondary'
      });
    } else {
      tips.push({
        title: 'Explosive Velocity',
        text: 'Excellent acceleration rate and recovery stride frequency. Stride length matches biomechanical targets.',
        icon: 'zap-off',
        color: 'color-secondary'
      });
    }

    // Power tip
    if (power < 85) {
      tips.push({
        title: 'Force Transfer',
        text: 'Ground reaction force transfer can be heightened. Try plyometrics to increase ankle stiffness and lift velocity.',
        icon: 'dumbbell',
        color: 'color-accent'
      });
    } else {
      tips.push({
        title: 'High Kinetic Power',
        text: 'Excellent hip extension power. Great load control before exploding upward.',
        icon: 'gauge',
        color: 'color-accent'
      });
    }

    container.innerHTML = tips.map(t => `
      <div class="tip-item">
        <i data-lucide="${t.icon}" class="tip-icon ${t.color}"></i>
        <div class="tip-content">
          <h4>${t.title}</h4>
          <p>${t.text}</p>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  },

  populateHistory(history) {
    const list = document.getElementById('athlete-history-list');
    if (history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>No assessment sessions recorded. Let's record one now!</p>
        </div>
      `;
      return;
    }

    list.innerHTML = history.map(h => {
      const date = new Date(h.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `
        <div class="history-item glass">
          <div class="history-info">
            <span class="history-drill">${h.drill_name}</span>
            <div class="history-meta">
              <span class="athlete-badge">${h.sport}</span>
              <span><i data-lucide="calendar" style="width: 10px; height: 10px; display: inline; vertical-align: middle;"></i> ${date}</span>
            </div>
          </div>
          <div class="history-score">${h.score}</div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  }
};

window.Dashboard = Dashboard;
