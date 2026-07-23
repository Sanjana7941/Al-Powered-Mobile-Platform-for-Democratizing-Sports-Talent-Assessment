// AthletaVision AI SPA Router and Main Application Controller

const App = {
  currentUser: null,
  currentView: 'auth',

  init() {
    // Check if token exists in localStorage
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (token && userJson) {
      this.currentUser = JSON.parse(userJson);
      this.setupNavigation();
      this.showView(this.currentUser.role === 'scout' ? 'scout-dashboard' : 'athlete-dashboard');
      this.updateHeaderStatus();
    } else {
      this.showView('auth');
    }

    this.bindEvents();
    lucide.createIcons();
  },

  // Show a specific SPA view
  showView(viewName) {
    this.currentView = viewName;
    
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show selected view
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Update bottom nav highlighting
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Trigger page-specific logic
    this.onViewLoad(viewName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Perform operations on specific views loading
  onViewLoad(viewName) {
    if (viewName === 'athlete-dashboard') {
      if (window.Dashboard) window.Dashboard.load();
    } else if (viewName === 'scout-dashboard') {
      if (window.Scout) window.Scout.load();
    } else if (viewName === 'assess') {
      if (window.Assessment) window.Assessment.load();
    } else if (viewName === 'drills') {
      this.loadDrillLibrary();
    } else if (viewName === 'connections') {
      this.loadConnections();
    }
  },

  // Dynamic Navigation Setup depending on Role
  setupNavigation() {
    const navContainer = document.getElementById('bottom-nav');
    if (!this.currentUser) {
      navContainer.innerHTML = '';
      return;
    }

    let navHtml = '';
    if (this.currentUser.role === 'athlete') {
      navHtml = `
        <button class="nav-item active" data-view="athlete-dashboard">
          <i data-lucide="layout-dashboard"></i>
          <span>Dashboard</span>
        </button>
        <button class="nav-item" data-view="assess">
          <i data-lucide="scan-face"></i>
          <span>AI Scan</span>
        </button>
        <button class="nav-item" data-view="drills">
          <i data-lucide="dribbble"></i>
          <span>Drills</span>
        </button>
        <button class="nav-item" data-view="connections">
          <i data-lucide="handshake"></i>
          <span>Invites</span>
        </button>
      `;
    } else if (this.currentUser.role === 'scout') {
      navHtml = `
        <button class="nav-item active" data-view="scout-dashboard">
          <i data-lucide="users"></i>
          <span>Talents</span>
        </button>
        <button class="nav-item" data-view="connections">
          <i data-lucide="handshake"></i>
          <span>Connections</span>
        </button>
      `;
    }
    navContainer.innerHTML = navHtml;
    lucide.createIcons();

    // Bind clicks to newly created navigation buttons
    navContainer.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.showView(view);
      });
    });
  },

  updateHeaderStatus() {
    const statusDiv = document.getElementById('header-user-status');
    const avatarImg = document.getElementById('header-avatar');
    const nameSpan = document.getElementById('header-name');
    const roleSpan = document.getElementById('header-role');

    if (this.currentUser) {
      statusDiv.style.display = 'flex';
      nameSpan.textContent = this.currentUser.name;
      roleSpan.textContent = this.currentUser.role;
      
      // Request details to get avatar image
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.profile_pic) {
          avatarImg.src = data.profile_pic;
        } else {
          avatarImg.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60';
        }
      })
      .catch(() => {
        avatarImg.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60';
      });
    } else {
      statusDiv.style.display = 'none';
    }
  },

  // Display Status Toast Notification
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    toast.textContent = message;
    
    // Customize styling based on message result
    if (type === 'error') {
      toast.style.borderColor = 'var(--color-danger)';
      toast.style.boxShadow = '0 4px 20px rgba(255, 62, 62, 0.35)';
    } else {
      toast.style.borderColor = 'var(--color-primary)';
      toast.style.boxShadow = '0 4px 20px var(--color-primary-glow)';
    }
    
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  // Drill library template population
  loadDrillLibrary() {
    const grid = document.getElementById('drills-grid-container');
    const drills = [
      { name: 'Shuttle Run & Agility Dribbling', sport: 'Football', difficulty: 'Intermediate', img: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=400&auto=format&fit=crop&q=60', desc: 'Evaluates lateral agility, acceleration, and ball retention under sharp turns.' },
      { name: 'Penalty Kick Release Angle', sport: 'Football', difficulty: 'Beginner', img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&auto=format&fit=crop&q=60', desc: 'Analyzes leg extension force, launch posture alignment, and target spot precision.' },
      { name: 'Free Throw Form & Wrist Extension', sport: 'Basketball', difficulty: 'Beginner', img: 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=400&auto=format&fit=crop&q=60', desc: 'Measures angle of release at the elbow and fluid vertical wrist alignment.' },
      { name: 'Defensive Agility Shuffle', sport: 'Basketball', difficulty: 'Advanced', img: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=400&auto=format&fit=crop&q=60', desc: 'Tracks hip rotation and stance stability during quick side-to-side guard movement.' },
      { name: '100m Block Start Angle', sport: 'Athletics', difficulty: 'Advanced', img: 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=400&auto=format&fit=crop&q=60', desc: 'Analyzes body extension clearance from standard sprinting blocks.' }
    ];

    grid.innerHTML = drills.map(d => `
      <div class="drill-card glass">
        <img class="drill-card-img" src="${d.img}" alt="${d.name}">
        <div class="drill-card-info">
          <div class="drill-card-meta">
            <span class="athlete-badge">${d.sport}</span>
            <span class="drill-difficulty ${d.difficulty.toLowerCase()}">${d.difficulty}</span>
          </div>
          <h3>${d.name}</h3>
          <p>${d.desc}</p>
          <button class="btn btn-secondary btn-block btn-start-drill-nav" data-drill="${d.name}" style="margin-top: 10px;">
            <i data-lucide="scan"></i> Select for Assessment
          </button>
        </div>
      </div>
    `).join('');
    lucide.createIcons();

    // Bind drill selection navigation
    grid.querySelectorAll('.btn-start-drill-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const drillName = btn.getAttribute('data-drill');
        this.showView('assess');
        const select = document.getElementById('assess-drill-select');
        for (let option of select.options) {
          if (option.text === drillName) {
            select.value = option.value;
            break;
          }
        }
        if (window.Assessment) window.Assessment.updateHUD();
      });
    });
  },

  // Connection/Scouting requests loading
  loadConnections() {
    const listContainer = document.getElementById('connections-list-container');
    const token = localStorage.getItem('token');
    
    fetch('/api/scout/connections', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(conns => {
      if (conns.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <p>No active connections. ${this.currentUser.role === 'scout' ? 'Invite athletes to connect.' : 'Your profile is public. Scouts will contact you here.'}</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = conns.map(c => `
        <div class="connection-item glass">
          <img class="conn-avatar" src="${c.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60'}" alt="${c.name}">
          <div class="conn-details">
            <h4>${c.name}</h4>
            <p>${this.currentUser.role === 'scout' ? `Athlete - ${c.sport}` : `Talent Scout`}</p>
            <p style="font-size: 0.65rem; color: var(--color-text-dim);">${c.bio || ''}</p>
          </div>
          <span class="conn-status ${c.status}">${c.status}</span>
        </div>
      `).join('');
    })
    .catch(() => {
      listContainer.innerHTML = '<div class="empty-state"><p>Failed to load connections.</p></div>';
    });
  },

  bindEvents() {
    // Logout Click
    document.getElementById('btn-logout').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.currentUser = null;
      this.setupNavigation();
      this.showView('auth');
      this.updateHeaderStatus();
      this.showToast('Logged out successfully');
    });

    // Helper linking dashboard buttons
    document.querySelectorAll('.btn-assess-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showView('assess');
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
