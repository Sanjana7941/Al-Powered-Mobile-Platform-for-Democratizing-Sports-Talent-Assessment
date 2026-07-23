// Authentication Form Client Handling & Token Management

const Auth = {
  init() {
    this.bindEvents();
  },

  bindEvents() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const roleOptions = document.querySelectorAll('.role-option input');
    const athleteFields = document.getElementById('athlete-fields');

    // Toggle between login and registration forms
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.add('active');
      formRegister.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.classList.add('active');
      formLogin.classList.remove('active');
    });

    // Toggle Athlete specific fields on registration role select
    roleOptions.forEach(radio => {
      radio.addEventListener('change', (e) => {
        // Toggle visual active card state
        document.querySelectorAll('.role-option').forEach(opt => {
          opt.classList.remove('active');
        });
        e.target.closest('.role-option').classList.add('active');

        if (e.target.value === 'athlete') {
          athleteFields.style.display = 'block';
        } else {
          athleteFields.style.display = 'none';
        }
      });
    });

    // Login Form Submission
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Store credentials
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Bootstrap App state
        App.currentUser = data.user;
        App.setupNavigation();
        App.updateHeaderStatus();
        App.showToast(`Welcome back, ${data.user.name}!`);
        
        // Show correct dashboard
        if (data.user.role === 'scout') {
          App.showView('scout-dashboard');
        } else {
          App.showView('athlete-dashboard');
        }

        // Reset form
        formLogin.reset();

      } catch (error) {
        console.error('Login error:', error);
        App.showToast(error.message, 'error');
      }
    });

    // Register Form Submission
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const role = document.querySelector('input[name="reg-role"]:checked').value;
      const bio = document.getElementById('reg-bio').value.trim();
      
      let sport = '';
      let age = null;
      let profilePic = '';

      if (role === 'athlete') {
        sport = document.getElementById('reg-sport').value;
        age = parseInt(document.getElementById('reg-age').value) || null;
        
        // Pick an avatar picture matching sport
        if (sport === 'Football') {
          profilePic = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=60';
        } else if (sport === 'Basketball') {
          profilePic = 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=150&auto=format&fit=crop&q=60';
        } else {
          profilePic = 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=150&auto=format&fit=crop&q=60';
        }
      } else {
        // Coach avatar
        profilePic = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=60';
      }

      if (password.length < 6) {
        App.showToast('Password must be at least 6 characters.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role, name, sport, age, bio, profilePic })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        // Store credentials
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Bootstrap App state
        App.currentUser = data.user;
        App.setupNavigation();
        App.updateHeaderStatus();
        App.showToast(`Account created! Welcome, ${data.user.name}`);
        
        // Redirect
        if (data.user.role === 'scout') {
          App.showView('scout-dashboard');
        } else {
          App.showView('athlete-dashboard');
        }

        // Reset form
        formRegister.reset();

      } catch (error) {
        console.error('Registration error:', error);
        App.showToast(error.message, 'error');
      }
    });
  }
};

// Initialize Auth
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});

window.Auth = Auth;
