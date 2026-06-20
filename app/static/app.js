(function () {
    "use strict";

    // ================================================================
    //                         STATE
    // ================================================================
    let currentFileId = null;
    let manuscriptOptions = {};
    let currentClassifiedData = [];
    let currentRules = {};
    let formatterInitialized = false;

    // ================================================================
    //                      UTILITIES
    // ================================================================

    function $(id) { return document.getElementById(id); }

    function showLoader(msg) {
        $('loader-text').innerText = msg;
        $('global-loader').classList.remove('hidden');
    }

    function hideLoader() {
        $('global-loader').classList.add('hidden');
    }

    function showToast(msg, type = 'info') {
        const container = $('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast-item animate-slide-in-right pointer-events-auto';
        let icon = 'info', iconColor = 'text-indigo-400';
        if (type === 'success') { icon = 'check-circle'; iconColor = 'text-green-500'; }
        if (type === 'error') { icon = 'alert-circle'; iconColor = 'text-rose-500'; }
        toast.innerHTML = `
            <div class="${iconColor}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
            <div class="flex-1 text-sm font-medium text-slate-200">${msg}</div>
            <button class="text-slate-600 hover:text-slate-400"><i data-lucide="x" class="w-4 h-4"></i></button>
        `;
        container.appendChild(toast);
        lucide.createIcons({ nodes: [toast] });
        const remove = () => { toast.classList.add('animate-fade-out'); setTimeout(() => toast.remove(), 300); };
        toast.querySelector('button').onclick = remove;
        setTimeout(remove, 4000);
    }

    // ================================================================
    //                      AUTH MANAGER
    // ================================================================

    const Auth = {
        STORAGE_KEY: 'manuscriptai_user',

        _pendingEmail: null,

        getUser() {
            try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)); } catch { return null; }
        },

        isLoggedIn() {
            return !!this.getUser();
        },

        async signup(name, email, password) {
            try {
                const res = await fetch('/api/auth/signup/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Signup failed');
                this._pendingEmail = email;
                return { success: true, qrCode: data.qrCode, secret: data.secret };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        async login(email, password) {
            try {
                const res = await fetch('/api/auth/login/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Login failed');
                this._pendingEmail = email;
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        async verifySignupOTP(code) {
            try {
                const res = await fetch('/api/auth/signup/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this._pendingEmail, code })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Verification failed');
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ ...data.user, token: data.token }));
                this._pendingEmail = null;
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        async verifyLoginOTP(code) {
            try {
                const res = await fetch('/api/auth/login/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this._pendingEmail, code })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Verification failed');
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ ...data.user, token: data.token }));
                this._pendingEmail = null;
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        logout() {
            localStorage.removeItem(this.STORAGE_KEY);
            this._pendingEmail = null;
        },

        getInitials() {
            const user = this.getUser();
            if (!user || !user.name) return 'U';
            return user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        }
    };

    // ================================================================
    //                     HISTORY MANAGER
    // ================================================================

    const History = {
        STORAGE_KEY: 'manuscriptai_history',

        getAll() {
            try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || []; } catch { return []; }
        },
        
        async fetchFromServer() {
            const user = Auth.getUser();
            if (!user) return [];
            try {
                const res = await fetch(`/api/history?email=${encodeURIComponent(user.email)}`);
                if (res.ok) {
                    const data = await res.json();
                    const mapped = data.map(d => ({
                        id: d.id,
                        fileName: d.filename,
                        timestamp: d.created_at,
                        status: d.status,
                        venue: d.publication_venue,
                        docType: d.document_type
                    }));
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mapped));
                    return mapped;
                }
            } catch(e) { console.error('Error fetching history:', e); }
            return this.getAll();
        },

        save(session) {
            const all = this.getAll();
            all.unshift({ ...session, id: Date.now(), timestamp: new Date().toISOString() });
            if (all.length > 50) all.length = 50;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
        },

        clear() {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    };

    // ================================================================
    //                        ROUTER
    // ================================================================

    const Router = {
        currentRoute: 'home',

        init() {
            window.addEventListener('hashchange', () => this.handleRoute());
            this.handleRoute();
        },

        navigate(route) {
            window.location.hash = '#/' + route;
        },

        handleRoute() {
            const hash = window.location.hash.replace('#/', '') || 'home';
            this.currentRoute = hash;

            if (!Auth.isLoggedIn() && hash !== 'login') {
                this.navigate('login');
                return;
            }
            if (Auth.isLoggedIn() && hash === 'login') {
                this.navigate('home');
                return;
            }

            this.updateNav(hash);
            this.renderPage(hash);

            // Close mobile menu on navigate
            const mobileMenu = $('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }

            // Close profile dropdown
            const dropdown = $('profile-dropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
                dropdown.classList.remove('visible');
            }
        },

        updateNav(route) {
            document.querySelectorAll('.nav-link').forEach(el => {
                el.classList.toggle('active', el.dataset.route === route);
            });
            document.querySelectorAll('.mobile-nav-link').forEach(el => {
                el.classList.toggle('active', el.dataset.route === route);
            });
        },

        renderPage(route) {
            const content = $('page-content');
            if (!content) return;

            formatterInitialized = false;
            content.style.opacity = '0';
            content.style.transform = 'translateY(12px)';

            setTimeout(() => {
                switch (route) {
                    case 'home': content.innerHTML = renderHomePage(); break;
                    case 'about': content.innerHTML = renderAboutPage(); break;
                    case 'history': content.innerHTML = renderHistoryPage(); break;
                    case 'profile': content.innerHTML = renderProfilePage(); break;
                    default: content.innerHTML = renderHomePage(); break;
                }

                lucide.createIcons();

                if (route === 'home') initFormatterLogic();
                if (route === 'profile') initProfileLogic();
                if (route === 'history') initHistoryLogic();

                requestAnimationFrame(() => {
                    content.style.transition = 'opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)';
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                });

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 80);
        }
    };

    // ================================================================
    //                       AUTH UI
    // ================================================================

    function renderAuthUI() {
        const container = $('auth-container');
        if (!container) return;

        container.innerHTML = `
            <div class="auth-card animate-float-up">
                <!-- Logo -->
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20 rotate-3">
                        <i data-lucide="scroll-text" class="text-white w-8 h-8"></i>
                    </div>
                    <h2 class="font-black text-2xl tracking-tighter uppercase italic">Manuscript<span class="text-indigo-500">AI</span></h2>
                    <p class="text-xs text-slate-500 mt-1">Sign in to access neural formatting</p>
                </div>

                <!-- Tabs -->
                <div class="auth-tabs">
                    <button class="auth-tab active" id="tab-login" onclick="window.__authTab('login')">Sign In</button>
                    <button class="auth-tab" id="tab-signup" onclick="window.__authTab('signup')">Sign Up</button>
                </div>

                <!-- Form Container -->
                <div id="auth-form-area"></div>
            </div>
        `;

        lucide.createIcons();
        window.__authTab = showAuthForm;
        showAuthForm('login');
    }

    function showAuthForm(mode) {
        $('tab-login').classList.toggle('active', mode === 'login');
        $('tab-signup').classList.toggle('active', mode === 'signup');

        const area = $('auth-form-area');

        if (mode === 'login') {
            area.innerHTML = `
                <div class="space-y-4" style="animation: page-enter 0.35s ease forwards;">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                        <div class="relative">
                            <i data-lucide="mail" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                            <input type="email" id="login-email" class="glass-input pl-10" placeholder="you@university.edu" autocomplete="email">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                        <div class="relative">
                            <i data-lucide="lock" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                            <input type="password" id="login-password" class="glass-input pl-10" placeholder="••••••••" autocomplete="current-password">
                        </div>
                    </div>
                    <button onclick="window.__doLogin()" class="auth-btn auth-btn-primary mt-6 w-full group relative overflow-hidden">
                        <span class="relative z-10 flex items-center justify-center gap-2">Sign In <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i></span>
                        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </div>
            `;
        } else {
            area.innerHTML = `
                <div class="space-y-4" style="animation: page-enter 0.35s ease forwards;">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                        <div class="relative">
                            <i data-lucide="user" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                            <input type="text" id="signup-name" class="glass-input pl-10" placeholder="Dr. Jane Smith" autocomplete="name">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                        <div class="relative">
                            <i data-lucide="mail" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                            <input type="email" id="signup-email" class="glass-input pl-10" placeholder="you@university.edu" autocomplete="email">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                        <div class="relative">
                            <i data-lucide="lock" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                            <input type="password" id="signup-password" class="glass-input pl-10" placeholder="••••••••" autocomplete="new-password">
                        </div>
                    </div>
                    <button onclick="window.__doSignup()" class="auth-btn auth-btn-primary mt-6 w-full group relative overflow-hidden">
                        <span class="relative z-10 flex items-center justify-center gap-2">Create Account <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i></span>
                        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </div>
            `;
        }
        lucide.createIcons();
    }

    function showOTPStep(qrCodeUrl = null, mode = 'login') {
        const area = $('auth-form-area');
        
        let qrSection = '';
        if (qrCodeUrl) {
            qrSection = `
                <div class="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
                    <p class="text-xs text-slate-400 mb-3 text-center">1. Scan this QR Code with <strong class="text-indigo-400">Microsoft Authenticator</strong></p>
                    <div class="p-2 bg-white rounded-lg inline-block shadow-lg">
                        <img src="${qrCodeUrl}" alt="Authenticator QR Code" class="w-32 h-32">
                    </div>
                </div>
            `;
        }

        area.innerHTML = `
            <div class="text-center" style="animation: page-enter 0.35s ease forwards;">
                <div class="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                    <i data-lucide="smartphone" class="text-indigo-400 w-7 h-7"></i>
                </div>
                <h3 class="text-lg font-bold mb-1">Two-Factor Authentication</h3>
                <p class="text-sm text-slate-500 mb-6">${qrCodeUrl ? '2. Enter the 6-digit code from the app' : 'Enter the 6-digit code from Microsoft Authenticator'}</p>

                ${qrSection}

                <div class="otp-container" id="otp-group">
                    <input type="text" maxlength="1" class="otp-input" data-index="0" inputmode="numeric" autofocus>
                    <input type="text" maxlength="1" class="otp-input" data-index="1" inputmode="numeric">
                    <input type="text" maxlength="1" class="otp-input" data-index="2" inputmode="numeric">
                    <input type="text" maxlength="1" class="otp-input" data-index="3" inputmode="numeric">
                    <input type="text" maxlength="1" class="otp-input" data-index="4" inputmode="numeric">
                    <input type="text" maxlength="1" class="otp-input" data-index="5" inputmode="numeric">
                </div>

                <div id="otp-error" class="text-rose-400 text-xs font-bold hidden mt-2">Invalid code.</div>

                <button onclick="window.__verifyOTP('${mode}')" class="auth-btn auth-btn-primary mt-6 w-full" id="verify-otp-btn">
                    Verify & Continue
                </button>
                <button onclick="window.__authTab('login')" class="mt-4 text-xs text-slate-500 hover:text-indigo-400 transition-colors">Cancel</button>
            </div>
        `;

        lucide.createIcons();
        initOTPInputs();
    }

    function initOTPInputs() {
        const inputs = document.querySelectorAll('.otp-input');
        inputs.forEach((inp, i) => {
            inp.addEventListener('input', (e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val;
                if (val && i < inputs.length - 1) {
                    inputs[i + 1].focus();
                }
                e.target.classList.toggle('filled', !!val);
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    inputs[i - 1].focus();
                    inputs[i - 1].value = '';
                    inputs[i - 1].classList.remove('filled');
                }
                if (e.key === 'Enter') $('verify-otp-btn').click();
            });
            // Handle paste
            inp.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                inputs.forEach((input, j) => {
                    if (paste[j]) {
                        input.value = paste[j];
                        input.classList.add('filled');
                    }
                });
                if (paste.length >= 6) inputs[5].focus();
            });
        });
        if(inputs[0]) inputs[0].focus();
    }

    // Global auth handlers
    window.__doLogin = async function () {
        const email = $('login-email').value.trim();
        const password = $('login-password').value;
        if (!email || !password) { showToast('Please fill all fields', 'error'); return; }
        
        const btn = document.querySelector('button[onclick="window.__doLogin()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
        lucide.createIcons();
        btn.disabled = true;

        const res = await Auth.login(email, password);
        
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res.success) {
            showOTPStep(null, 'login');
        } else {
            showToast(res.error, 'error');
        }
    };

    window.__doSignup = async function () {
        const name = $('signup-name').value.trim();
        const email = $('signup-email').value.trim();
        const password = $('signup-password').value;
        if (!name || !email || !password) { showToast('Please fill all fields', 'error'); return; }
        
        const btn = document.querySelector('button[onclick="window.__doSignup()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
        lucide.createIcons();
        btn.disabled = true;

        const res = await Auth.signup(name, email, password);
        
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res.success) {
            showOTPStep(res.qrCode, 'signup');
        } else {
            showToast(res.error, 'error');
        }
    };

    window.__verifyOTP = async function (mode) {
        const inputs = document.querySelectorAll('.otp-input');
        const code = Array.from(inputs).map(i => i.value).join('');
        if (code.length < 6) { showToast('Enter complete 6-digit code', 'error'); return; }

        const btn = $('verify-otp-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
        lucide.createIcons();
        btn.disabled = true;

        let res;
        if (mode === 'signup') {
            res = await Auth.verifySignupOTP(code);
        } else {
            res = await Auth.verifyLoginOTP(code);
        }

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res.success) {
            showToast('Welcome to ManuscriptAI!', 'success');
            $('auth-overlay').classList.add('hidden');
            $('app-shell').classList.remove('hidden');
            updateProfileUI();
            Router.navigate('home');
        } else {
            const errEl = $('otp-error');
            if (errEl) {
                errEl.innerText = res.error;
                errEl.classList.remove('hidden');
            }
            showToast('Invalid OTP code', 'error');
        }
    };

    // ================================================================
    //                   PAGE: HOME (FORMATTER)
    // ================================================================

    function renderHomePage() {
        return `
        <div class="max-w-7xl mx-auto px-6 py-12 relative">
            <!-- Upload Section -->
            <section id="upload-section" class="max-w-4xl mx-auto py-20 text-center animate-float-up">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-12">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Neural Formatting v3.2
                </div>

                <h2 class="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85] uppercase">
                    Submit with <br><span class="font-serif italic text-indigo-500 lowercase font-light tracking-normal">Precision.</span>
                </h2>
                <p class="text-slate-500 text-xl mb-16 max-w-xl mx-auto leading-relaxed font-light">
                    Our structural reconstruction engine ensures your manuscript meets the rigorous standards of top-tier academic venues.
                </p>

                <div class="max-w-xl mx-auto group relative">
                    <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <label class="relative block bg-black border border-white/10 hover:border-indigo-500/50 rounded-[2rem] p-16 transition-all cursor-pointer overflow-hidden">
                        <input type="file" id="file-input" class="hidden" accept=".docx">
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(99,102,241,0.1),_transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="relative z-10 flex flex-col items-center">
                            <div class="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner border border-white/5">
                                <i data-lucide="file-up" class="w-10 h-10"></i>
                            </div>
                            <span class="text-2xl font-bold mb-2 tracking-tight">Drop manuscript source</span>
                            <p class="text-slate-600 text-sm font-medium">Supporting IEEE, Nature, Cell & more (.docx)</p>
                        </div>
                    </label>
                </div>
            </section>

            <!-- Stage 1: Document Structure & Configuration -->
            <section id="details-section" class="hidden">
                <div class="max-w-3xl mx-auto space-y-6 animate-float-up">
                    <div class="bg-black/40 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                        <div class="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
                        
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                            <div class="flex items-center gap-5">
                                <div class="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 shadow-inner">
                                    <i data-lucide="binary" class="text-indigo-400 w-7 h-7"></i>
                                </div>
                                <div>
                                    <h3 class="text-2xl font-black tracking-tighter uppercase">Document <span class="text-indigo-500">Structure</span></h3>
                                    <p class="text-slate-500 text-xs mt-1 font-medium">Verify structural mapping and configure target venue.</p>
                                </div>
                            </div>
                            <button id="restart-btn" class="text-xs px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 font-bold uppercase tracking-wider text-slate-400 hover:text-white">
                                <i data-lucide="rotate-ccw" class="w-3 h-3 inline mr-1"></i> Restart
                            </button>
                        </div>

                        <!-- Venue Config -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label class="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Document Type</label>
                                <select id="doc-type-select" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/30 appearance-none">
                                    <option value="" class="text-slate-900">Select Type</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Publication / Venue</label>
                                <select id="publication-select" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/30 appearance-none">
                                    <option value="" class="text-slate-900">Select Venue</option>
                                </select>
                            </div>
                        </div>
                        <div id="rule-preview" class="mb-6"></div>

                        <label class="flex items-center gap-3 cursor-pointer group mb-6">
                            <div class="relative">
                                <input type="checkbox" id="ai-ref-fix" class="sr-only peer" checked>
                                <div class="w-10 h-5 bg-slate-800 rounded-full peer-checked:bg-indigo-500/40 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                            </div>
                            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">Auto-Correct References (AI)</span>
                        </label>

                        <!-- Validation Panel -->
                        <div id="validation-panel" class="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl hidden">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="alert-circle" class="text-amber-500 w-4 h-4"></i>
                                <h4 class="text-xs font-bold text-amber-500 uppercase tracking-widest">Refinement Warnings</h4>
                            </div>
                            <ul id="validation-list" class="text-[10px] text-amber-200/80 space-y-1.5 list-none pl-1"></ul>
                        </div>

                        <!-- Interactive Mapper -->
                        <div class="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar mb-8" id="interactive-mapper"></div>

                        <!-- Format & Preview Button -->
                        <button id="process-btn" class="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                            <i data-lucide="sparkles" class="w-5 h-5"></i>
                            <span>Format & Preview</span>
                        </button>
                    </div>
                </div>
            </section>

            <!-- Stage 2: Full-Page Preview (Read-Only) -->
            <section id="preview-section" class="hidden">
                <div class="animate-float-up">
                    <!-- Preview Top Bar -->
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                        <div class="flex items-center gap-5">
                            <div class="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center shadow-lg">
                                <i data-lucide="eye" class="text-green-500 w-7 h-7"></i>
                            </div>
                            <div>
                                <div class="inline-flex px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Preview Mode</div>
                                <h2 class="text-2xl font-black tracking-tighter uppercase">Formatted <span class="gradient-text">Document</span></h2>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <button id="edit-manuscript-btn" class="bg-white/5 hover:bg-white/10 text-slate-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-white/10 transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs uppercase tracking-widest">
                                <i data-lucide="pencil" class="w-4 h-4"></i> Edit Manuscript
                            </button>
                            <button id="preview-download-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs uppercase tracking-widest">
                                <i data-lucide="download" class="w-4 h-4"></i> Export .docx
                            </button>
                            <button id="preview-latex-btn" class="bg-white/5 hover:bg-white/10 text-slate-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-white/10 transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs uppercase tracking-widest">
                                <i data-lucide="code-2" class="w-4 h-4"></i> LaTeX
                            </button>
                            <button id="preview-back-btn" class="bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-3 rounded-xl font-bold flex items-center gap-2 border border-white/5 transition-all text-xs uppercase tracking-widest">
                                <i data-lucide="arrow-left" class="w-4 h-4"></i> Back
                            </button>
                        </div>
                    </div>

                    <!-- A4 Preview Container -->
                    <div class="max-w-4xl mx-auto">
                        <div class="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-white/10">
                            <div id="preview-content" class="p-16 sm:p-20 font-serif text-slate-900 min-h-[800px] leading-relaxed" style="font-size: 12pt;"></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stage 3: Full-Page WYSIWYG Editor -->
            <section id="editor-section" class="hidden">
                <div class="animate-float-up">
                    <!-- Editor Top Bar -->
                    <div class="flex items-center justify-between gap-4 mb-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                                <i data-lucide="file-pen-line" class="text-indigo-400 w-6 h-6"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-black tracking-tighter uppercase">Editing <span class="gradient-text">Mode</span></h2>
                                <p class="text-slate-500 text-[11px] font-medium">Make manual adjustments. Changes sync to your preview.</p>
                            </div>
                        </div>
                        <button id="save-preview-btn" class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs uppercase tracking-widest">
                            <i data-lucide="check" class="w-4 h-4"></i> Save & Preview
                        </button>
                    </div>

                    <!-- Quill Editor -->
                    <div class="quill-container-wrapper max-w-5xl mx-auto">
                        <div id="editor-container"></div>
                    </div>
                </div>
            </section>

            <!-- Hidden review section (kept for backward compat) -->
            <section id="review-section" class="hidden"></section>
        </div>`;
    }

    // ================================================================
    //                   PAGE: ABOUT
    // ================================================================

    function renderAboutPage() {
        const features = [
            { icon: 'brain', color: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/20', title: 'AI-Powered Classification', desc: 'Gemini-powered neural engine classifies manuscript segments into titles, abstracts, bodies, references, and more with high accuracy.' },
            { icon: 'file-check', color: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/20', title: 'Multi-Venue Formatting', desc: 'Pre-configured rules for 15+ major academic venues including IEEE, Nature, ACM, Springer, and Elsevier.' },
            { icon: 'pencil-ruler', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20', title: 'Interactive Editor', desc: 'Re-label, edit, and delete paragraph blocks in real-time before final formatting with live validation.' },
            { icon: 'code-2', color: 'from-cyan-500/20 to-sky-500/20', border: 'border-cyan-500/20', title: 'LaTeX Export', desc: 'One-click LaTeX source generation compatible with your target venue\'s style requirements.' },
            { icon: 'shield-check', color: 'from-rose-500/20 to-pink-500/20', border: 'border-rose-500/20', title: 'Compliance Scoring', desc: 'Real-time compliance index validates your manuscript structure against venue-specific requirements.' },
            { icon: 'sparkles', color: 'from-indigo-500/20 to-blue-500/20', border: 'border-indigo-500/20', title: 'AI Reference Correction', desc: 'Automatically reformat citations and references to match your target publication\'s style guide.' },
        ];

        const techs = [
            'Gemini AI', 'Express.js', 'FastAPI', 'Python', 'Mammoth.js',
            'docx.js', 'Tailwind CSS', 'Lucide Icons', 'Node.js'
        ];

        return `
        <div class="max-w-6xl mx-auto px-6 py-20">
            <!-- Hero -->
            <div class="text-center max-w-3xl mx-auto mb-24 animate-float-up">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                    <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> About the Project
                </div>
                <h2 class="text-5xl md:text-7xl font-black tracking-tighter mb-6 uppercase leading-[0.9]">
                    Neural <span class="gradient-text">Formatting</span><br>
                    <span class="font-serif italic lowercase font-light tracking-normal text-slate-400">for Academia.</span>
                </h2>
                <p class="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto">
                    ManuscriptAI transforms raw manuscripts into perfectly formatted, submission-ready documents using Google's Gemini AI and deep understanding of academic publication standards.
                </p>
            </div>

            <!-- Features Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
                ${features.map((f, i) => `
                    <div class="feature-card animate-card-enter" style="animation-delay: ${i * 80}ms; opacity: 0;">
                        <div class="feature-icon bg-gradient-to-br ${f.color} border ${f.border}">
                            <i data-lucide="${f.icon}" class="w-6 h-6 text-slate-300"></i>
                        </div>
                        <h3 class="text-lg font-bold mb-2 tracking-tight">${f.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">${f.desc}</p>
                    </div>
                `).join('')}
            </div>

            <!-- Tech Stack -->
            <div class="text-center mb-24 animate-float-up" style="animation-delay: 0.5s; opacity: 0;">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Built With</h3>
                <div class="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                    ${techs.map(t => `<span class="tech-badge"><i data-lucide="cpu" class="w-3.5 h-3.5 text-indigo-400"></i>${t}</span>`).join('')}
                </div>
            </div>

            <!-- How It Works -->
            <div class="max-w-4xl mx-auto">
                <h3 class="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">How It Works</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    ${[
                        { step: '01', icon: 'upload', title: 'Upload', desc: 'Drop your .docx manuscript file' },
                        { step: '02', icon: 'scan', title: 'Analyze', desc: 'AI classifies each paragraph segment' },
                        { step: '03', icon: 'settings-2', title: 'Configure', desc: 'Select venue and formatting rules' },
                        { step: '04', icon: 'download', title: 'Export', desc: 'Download formatted .docx or LaTeX' }
                    ].map((s, i) => `
                        <div class="text-center animate-card-enter" style="animation-delay: ${600 + i * 100}ms; opacity: 0;">
                            <div class="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                                <i data-lucide="${s.icon}" class="w-6 h-6 text-indigo-400"></i>
                            </div>
                            <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Step ${s.step}</div>
                            <h4 class="font-bold mb-1">${s.title}</h4>
                            <p class="text-xs text-slate-500">${s.desc}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    }

    // ================================================================
    //                   PAGE: HISTORY
    // ================================================================

    function renderHistoryPage() {
        const sessions = History.getAll();

        const cardsHTML = sessions.length === 0
            ? `<div class="empty-state col-span-full">
                    <div class="empty-state-icon">
                        <i data-lucide="archive" class="w-8 h-8 text-slate-600"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2 text-slate-400">No history yet</h3>
                    <p class="text-sm text-slate-600 max-w-xs mx-auto mb-6">Format your first manuscript and it will appear here</p>
                    <a href="#/home" class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-1">
                        <i data-lucide="plus" class="w-4 h-4"></i> Format a Document
                    </a>
               </div>`
            : sessions.map((s, i) => `
                <div class="history-card animate-card-enter" style="animation-delay: ${i * 60}ms; opacity: 0;">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="file-text" class="w-5 h-5 text-indigo-400"></i>
                            </div>
                            <div>
                                <p class="font-bold text-sm truncate max-w-[200px]">${s.fileName || 'Untitled Document'}</p>
                                <p class="text-xs text-slate-600">${new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                        <span class="history-status ${s.status === 'completed' ? 'completed' : 'processing'}">
                            <span class="w-1.5 h-1.5 rounded-full ${s.status === 'completed' ? 'bg-green-400' : 'bg-indigo-400'}"></span>
                            ${s.status || 'completed'}
                        </span>
                    </div>
                    <div class="flex items-center gap-3 flex-wrap">
                        ${s.venue ? `<span class="venue-tag">${s.venue}</span>` : ''}
                        ${s.docType ? `<span class="venue-tag">${s.docType}</span>` : ''}
                        ${s.paragraphs ? `<span class="text-[10px] text-slate-600">${s.paragraphs} blocks</span>` : ''}
                    </div>
                </div>
            `).join('');

        return `
        <div class="max-w-5xl mx-auto px-6 py-20">
            <div class="flex items-center justify-between mb-12 animate-float-up">
                <div>
                    <h2 class="text-4xl font-black tracking-tighter uppercase">Formatting <span class="text-indigo-500">History</span></h2>
                    <p class="text-slate-500 text-sm mt-1">Your past formatting sessions</p>
                </div>
                ${sessions.length > 0 ? `
                <button id="clear-history-btn" class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-2">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Clear All
                </button>` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                ${cardsHTML}
            </div>
        </div>`;
    }

    function initHistoryLogic() {
        const attachClearBtn = () => {
            const clearBtn = $('clear-history-btn');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    if (confirm('Clear all formatting history?')) {
                        History.clear();
                        Router.renderPage('history');
                        showToast('History cleared', 'success');
                    }
                };
            }
        };

        attachClearBtn();

        History.fetchFromServer().then(() => {
            if (Router.currentRoute === 'history') {
                const content = $('page-content');
                if (content) {
                    content.innerHTML = renderHistoryPage();
                    lucide.createIcons();
                    attachClearBtn();
                }
            }
        });
    }

    // ================================================================
    //                   PAGE: PROFILE
    // ================================================================

    function renderProfilePage() {
        const user = Auth.getUser() || { name: 'User', email: 'user@email.com', joinedAt: new Date().toISOString() };
        const initials = Auth.getInitials();
        const sessions = History.getAll();
        const completedCount = sessions.filter(s => s.status === 'completed').length;

        return `
        <div class="max-w-3xl mx-auto px-6 py-20">
            <div class="profile-card animate-float-up">
                <div class="relative z-10 flex flex-col items-center text-center pt-8">
                    <div class="profile-avatar-large mb-6">${initials}</div>
                    <h2 class="text-2xl font-black tracking-tight mb-1">${user.name}</h2>
                    <p class="text-sm text-slate-500 mb-2">${user.email}</p>
                    <p class="text-xs text-slate-600">Joined ${new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-3 gap-4 mt-10 relative z-10">
                    <div class="profile-stat">
                        <p class="text-2xl font-black text-indigo-400 mb-1">${sessions.length}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Sessions</p>
                    </div>
                    <div class="profile-stat">
                        <p class="text-2xl font-black text-green-400 mb-1">${completedCount}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</p>
                    </div>
                    <div class="profile-stat">
                        <p class="text-2xl font-black text-amber-400 mb-1">${sessions.length - completedCount}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Progress</p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="mt-10 space-y-4 relative z-10">
                    <div class="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i data-lucide="user-pen" class="w-4 h-4 text-slate-500"></i>
                            <div>
                                <p class="text-sm font-bold">Display Name</p>
                                <p class="text-xs text-slate-500">Change how your name appears</p>
                            </div>
                        </div>
                        <input type="text" id="profile-name-input" value="${user.name}" class="glass-input text-right text-sm max-w-[200px]" style="padding: 0.5rem 0.75rem; border-radius: 0.75rem;">
                    </div>

                    <div class="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i data-lucide="mail" class="w-4 h-4 text-slate-500"></i>
                            <div>
                                <p class="text-sm font-bold">Email Address</p>
                                <p class="text-xs text-slate-500">${user.email}</p>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Verified</span>
                    </div>

                    <button id="save-profile-btn" class="w-full auth-btn auth-btn-primary mt-4">
                        Save Changes
                    </button>

                    <button id="profile-logout-btn" class="w-full py-3 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-bold flex items-center justify-center gap-2">
                        <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
                    </button>
                </div>
            </div>
        </div>`;
    }

    function initProfileLogic() {
        const saveBtn = $('save-profile-btn');
        const logoutBtn = $('profile-logout-btn');
        const nameInput = $('profile-name-input');

        if (saveBtn) {
            saveBtn.onclick = () => {
                const user = Auth.getUser();
                if (user && nameInput) {
                    user.name = nameInput.value.trim() || user.name;
                    localStorage.setItem(Auth.STORAGE_KEY, JSON.stringify(user));
                    updateProfileUI();
                    showToast('Profile updated!', 'success');
                }
            };
        }

        if (logoutBtn) {
            logoutBtn.onclick = () => doLogout();
        }
    }

    // ================================================================
    //               FORMATTER LOGIC (from existing app)
    // ================================================================

    function initFormatterLogic() {
        if (formatterInitialized) return;
        formatterInitialized = true;

        const fileInput = $('file-input');
        const uploadSection = $('upload-section');
        const detailsSection = $('details-section');
        const previewSection = $('preview-section');
        const editorSection = $('editor-section');
        const reviewSection = $('review-section');
        const docTypeSelect = $('doc-type-select');
        const pubSelect = $('publication-select');
        const rulePreview = $('rule-preview');
        const processBtn = $('process-btn');
        const mapperCont = $('interactive-mapper');
        const validationPanel = $('validation-panel');
        const validationList = $('validation-list');

        if (!fileInput) return;

        // Track the last formatted HTML for the preview/editor round-trip
        let lastPreviewHtml = '';

        // ---- Helper: Show only one section ----
        function showSection(sectionToShow) {
            [uploadSection, detailsSection, previewSection, editorSection, reviewSection].forEach(s => {
                if (s) s.classList.add('hidden');
            });
            if (sectionToShow) {
                sectionToShow.classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // ---- Fetch Options ----
        async function fetchOptions() {
            try {
                const r = await fetch('/api/options');
                manuscriptOptions = await r.json();
                docTypeSelect.innerHTML = '<option value="">Select Type</option>';
                Object.keys(manuscriptOptions).forEach(type => {
                    const opt = document.createElement('option');
                    opt.value = type;
                    opt.innerText = type;
                    opt.className = "text-slate-900";
                    docTypeSelect.appendChild(opt);
                });
            } catch (e) {
                console.error("Failed to fetch options", e);
            }
        }

        docTypeSelect.onchange = () => {
            const type = docTypeSelect.value;
            pubSelect.innerHTML = '<option value="">Select Venue</option>';
            rulePreview.innerHTML = '<p class="text-xs text-slate-500 italic">Select a venue to preview rules...</p>';
            if (type && manuscriptOptions[type]) {
                Object.keys(manuscriptOptions[type]).forEach(pub => {
                    const opt = document.createElement('option');
                    opt.value = pub;
                    opt.innerText = pub;
                    opt.className = "text-slate-900";
                    pubSelect.appendChild(opt);
                });
            }
            const aiOpt = document.createElement('option');
            aiOpt.value = "CUSTOM_AI";
            aiOpt.innerText = "Other (AI resolve from venue name...)";
            aiOpt.className = "text-indigo-400 font-bold";
            pubSelect.appendChild(aiOpt);
        };

        pubSelect.onchange = () => {
            const type = docTypeSelect.value;
            const pub = pubSelect.value;
            if (type && pub && manuscriptOptions[type] && manuscriptOptions[type][pub]) {
                currentRules = manuscriptOptions[type][pub];
                renderRulesPreview(currentRules);
                validateManuscript();
            } else if (pub === "CUSTOM_AI") {
                rulePreview.innerHTML = '<p class="text-xs text-indigo-400 animate-pulse">AI will dynamically resolve rules for this venue...</p>';
            }
        };

        function renderRulesPreview(rules) {
            rulePreview.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <div class="bg-slate-800/40 p-2 rounded"><span class="text-slate-500 block uppercase font-bold">Font</span><span>${rules.font_family} (${rules.font_size_body}pt)</span></div>
                    <div class="bg-slate-800/40 p-2 rounded"><span class="text-slate-500 block uppercase font-bold">Layout</span><span>${rules.columns}-Column</span></div>
                    <div class="bg-slate-800/40 p-2 rounded"><span class="text-slate-500 block uppercase font-bold">Spacing</span><span>${rules.line_spacing}x</span></div>
                    <div class="bg-indigo-500/10 p-2 rounded border border-indigo-500/30"><span class="text-indigo-400 block uppercase font-bold">Alignment</span><span class="text-indigo-200">✨ ${rules.alignment || 'JUSTIFIED'}</span></div>
                </div>
            `;
        }

        // ---- Render Mapper (Stage 1 structural blocks) ----
        function renderMapper() {
            mapperCont.innerHTML = '';
            if (!Array.isArray(currentClassifiedData) || currentClassifiedData.length === 0) {
                mapperCont.innerHTML = '<p class="text-slate-500 text-center py-8">No classified data available.</p>';
                return;
            }
            currentClassifiedData.forEach((block, idx) => {
                const el = document.createElement('div');
                el.className = `mapper-block group relative label-${block.label}`;
                el.style.animation = `card-enter 0.5s cubic-bezier(0.22,1,0.36,1) ${idx * 40}ms forwards`;
                el.style.opacity = '0';
                const wordCount = block.text.split(/\s+/).filter(w => w.length > 0).length;
                el.innerHTML = `
                    <div class="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.03]">
                        <div class="flex items-center gap-3">
                            <select class="block-type-select bg-white/5 border border-white/10 rounded-xl text-[10px] px-4 py-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-300 font-black uppercase tracking-wider">
                                <option value="BODY" ${block.label === 'BODY' ? 'selected' : ''}>Body Paragraph</option>
                                <option value="TITLE" ${block.label === 'TITLE' ? 'selected' : ''}>Manuscript Title</option>
                                <option value="AUTHORS" ${block.label === 'AUTHORS' ? 'selected' : ''}>Authors & Affiliation</option>
                                <option value="ABSTRACT" ${block.label === 'ABSTRACT' ? 'selected' : ''}>Abstract Segment</option>
                                <option value="HEADING1" ${block.label === 'HEADING1' ? 'selected' : ''}>Primary Heading</option>
                                <option value="HEADING2" ${block.label === 'HEADING2' ? 'selected' : ''}>Sub-Heading</option>
                                <option value="EQUATION" ${block.label === 'EQUATION' ? 'selected' : ''}>Math Equation</option>
                                <option value="TABLE" ${block.label === 'TABLE' ? 'selected' : ''}>Data Table</option>
                                <option value="FIGURE" ${block.label === 'FIGURE' ? 'selected' : ''}>Figure/Image</option>
                                <option value="REFERENCES" ${block.label === 'REFERENCES' ? 'selected' : ''}>Citation/Ref</option>
                            </select>
                            <div class="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                <span class="w-1 h-1 rounded-full bg-slate-500"></span>
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">${wordCount} words</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="edit-btn p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all" title="Modify content">
                                <i data-lucide="pencil-line" class="w-4 h-4"></i>
                            </button>
                            <button class="delete-btn p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all" title="Remove block">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <div class="block-content text-[15px] text-slate-400 outline-none font-serif leading-relaxed px-1 transition-all" contenteditable="false">${block.text}</div>
                `;

                const select = el.querySelector('.block-type-select');
                select.onchange = () => {
                    block.label = select.value;
                    validateManuscript();
                };

                const content = el.querySelector('.block-content');
                content.onblur = () => {
                    if (block.text !== content.innerText) {
                        block.text = content.innerText;
                        validateManuscript();
                    }
                };
                content.onkeydown = (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); content.blur(); }
                };

                const editBtn = el.querySelector('.edit-btn');
                editBtn.onclick = () => {
                    const isEditing = content.contentEditable === "true";
                    content.contentEditable = !isEditing;
                    if (!isEditing) {
                        content.focus();
                        content.classList.add('editing-content', 'p-2', 'rounded-lg');
                        editBtn.classList.add('bg-indigo-500/20', 'text-indigo-400');
                        showToast("Editing mode active. Click out to save.", "info");
                    } else {
                        content.classList.remove('editing-content', 'p-2', 'rounded-lg');
                        editBtn.classList.remove('bg-indigo-500/20', 'text-indigo-400');
                    }
                };

                const delBtn = el.querySelector('.delete-btn');
                delBtn.onclick = () => {
                    if (confirm("Permanently remove this paragraph from the document?")) {
                        currentClassifiedData.splice(idx, 1);
                        renderMapper();
                        validateManuscript();
                        showToast("Paragraph deleted.", "error");
                    }
                };

                mapperCont.appendChild(el);
            });
            lucide.createIcons();
        }

        function validateManuscript() {
            const issues = [];
            if (!Array.isArray(currentClassifiedData)) currentClassifiedData = [];

            const labels = currentClassifiedData.map(b => b.label);

            if (!labels.includes('TITLE')) { issues.push("Missing Title block."); }
            if (!labels.includes('ABSTRACT')) { issues.push("Missing Abstract."); }
            if (!labels.includes('REFERENCES')) { issues.push("Missing Reference section."); }

            const abstractText = currentClassifiedData.find(b => b.label === 'ABSTRACT')?.text || "";
            const abstractWords = abstractText.split(/\s+/).filter(w => w.length > 0).length;
            const pub = pubSelect.value;
            if (pub === "Nature (Main)" && abstractWords > 200) {
                issues.push(`Nature abstracts must be < 200 words (Current: ${abstractWords}).`);
            }
            const totalWords = currentClassifiedData.reduce((acc, b) => acc + b.text.split(/\s+/).filter(w => w.length > 0).length, 0);
            if (totalWords < 500) { issues.push("Manuscript length is unusually short (< 500 words)."); }

            validationList.innerHTML = issues.map(i => `
                <li class="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group transition-all hover:bg-white/10">
                    <i data-lucide="info" class="w-4 h-4 text-amber-500 mt-0.5"></i>
                    <span class="leading-tight">${i}</span>
                </li>
            `).join('');
            lucide.createIcons();
            validationPanel.classList.toggle('hidden', issues.length === 0);
        }

        // ============================================
        //  Stage 1 → Stage 2: Format & Preview
        // ============================================
        fileInput.onchange = async () => {
            if (!fileInput.files.length) return;
            const file = fileInput.files[0];
            showLoader("Scanning manuscript content...");
            const fd = new FormData();
            fd.append('file', file);
            try {
                const r = await fetch('/api/upload', { method: 'POST', body: fd });
                const data = await r.json();
                if (!r.ok) throw new Error(data.detail || "Upload failed");
                showToast("Manuscript uploaded and analyzed.", "success");
                currentFileId = data.file_id;
                currentClassifiedData = (data.classified || data.paragraphs || []);
                if (!Array.isArray(currentClassifiedData)) throw new Error("Invalid classified data format received from server");
                if (currentClassifiedData.length === 0) throw new Error("No paragraphs were extracted from the document");

                History.save({
                    fileName: file.name,
                    status: 'processing',
                    paragraphs: currentClassifiedData.length,
                    venue: '',
                    docType: ''
                });

                renderMapper();
                validateManuscript();
                showSection(detailsSection);
            } catch (e) {
                console.error("Upload error:", e);
                showToast(e.message, "error");
            } finally {
                hideLoader();
            }
        };

        // Format & Preview button → calls /api/process, then shows Stage 2
        processBtn.onclick = async () => {
            const type = docTypeSelect.value;
            let pub = pubSelect.value;
            const fixRefs = $('ai-ref-fix') ? $('ai-ref-fix').checked : false;
            if (!type || !pub) { showToast("Please select a document type and venue first.", "error"); return; }
            if (pub === "CUSTOM_AI") {
                const custom = prompt("Journal/Conference name:");
                if (!custom) return;
                pub = custom;
            }
            showLoader("Formatting manuscript...");
            try {
                const r = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_id: currentFileId, doc_type: type, publication: pub, classified: currentClassifiedData, fix_references: fixRefs, preview_only: true, email: Auth.getUser()?.email })
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.detail || "Formatting failed");

                // Update history
                const sessions = History.getAll();
                if (sessions.length > 0) {
                    sessions[0].status = 'completed';
                    sessions[0].venue = pub;
                    sessions[0].docType = type;
                    localStorage.setItem(History.STORAGE_KEY, JSON.stringify(sessions));
                }

                lastPreviewHtml = data.preview_html;
                $('preview-content').innerHTML = lastPreviewHtml;
                showSection(previewSection);
                showToast("Formatting complete!", "success");
            } catch (e) {
                showToast(e.message, "error");
            } finally {
                hideLoader();
            }
        };

        // ============================================
        //  Stage 2: Preview actions
        // ============================================

        // Edit Manuscript → opens Stage 3 (full-page Quill editor)
        const editBtn = $('edit-manuscript-btn');
        if (editBtn) {
            editBtn.onclick = () => {
                // Initialize Quill if not already created
                if (!window.quillEditor) {
                    window.quillEditor = new Quill('#editor-container', {
                        theme: 'snow',
                        modules: {
                            toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                [{ 'font': [] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'script': 'sub'}, { 'script': 'super' }],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                [{ 'indent': '-1'}, { 'indent': '+1' }],
                                [{ 'align': [] }],
                                [{ 'color': [] }, { 'background': [] }],
                                ['clean']
                            ]
                        }
                    });
                }
                window.quillEditor.clipboard.dangerouslyPasteHTML(lastPreviewHtml);
                showSection(editorSection);
            };
        }

        // Save & Preview → captures Quill content back to preview
        const savePreviewBtn = $('save-preview-btn');
        if (savePreviewBtn) {
            savePreviewBtn.onclick = () => {
                if (window.quillEditor) {
                    lastPreviewHtml = window.quillEditor.root.innerHTML;
                    $('preview-content').innerHTML = lastPreviewHtml;
                }
                showSection(previewSection);
                showToast("Changes saved to preview.", "success");
            };
        }

        // Back to Structure → goes back to Stage 1
        const previewBackBtn = $('preview-back-btn');
        if (previewBackBtn) {
            previewBackBtn.onclick = () => {
                showSection(detailsSection);
            };
        }

        // Export .docx from preview
        const previewDownloadBtn = $('preview-download-btn');
        if (previewDownloadBtn) {
            previewDownloadBtn.onclick = async () => {
                const originalText = previewDownloadBtn.innerHTML;
                previewDownloadBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Exporting...';
                lucide.createIcons();
                try {
                    const fixRefs = $('ai-ref-fix') ? $('ai-ref-fix').checked : false;
                    await fetch('/api/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_id: currentFileId,
                            doc_type: docTypeSelect.value,
                            publication: pubSelect.value,
                            classified: currentClassifiedData,
                            fix_references: fixRefs,
                            preview_only: false,
                            email: Auth.getUser()?.email
                        })
                    });
                    window.location = `/api/download/${currentFileId}`;
                } catch(e) {
                    showToast("Export failed", "error");
                } finally {
                    previewDownloadBtn.innerHTML = originalText;
                    lucide.createIcons();
                }
            };
        }

        // LaTeX from preview
        const previewLatexBtn = $('preview-latex-btn');
        if (previewLatexBtn) {
            previewLatexBtn.onclick = async () => {
                showLoader("Generating LaTeX source...");
                try {
                    const r = await fetch('/api/latex', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ classified: currentClassifiedData, publication: pubSelect.value })
                    });
                    const data = await r.json();
                    const blob = new Blob([data.latex], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `manuscript_${currentFileId}.tex`;
                    a.click();
                    showToast("LaTeX source file generated and downloaded.", "success");
                } catch (e) {
                    showToast("LaTeX generation failed. Ensure your structure is valid.", "error");
                } finally {
                    hideLoader();
                }
            };
        }

        // Restart
        const restartBtn = $('restart-btn');
        if (restartBtn) {
            restartBtn.onclick = () => {
                currentFileId = null;
                currentClassifiedData = [];
                currentRules = {};
                lastPreviewHtml = '';
                window.quillEditor = null;
                Router.renderPage('home');
            };
        }

        fetchOptions();
    }

    // ================================================================
    //                    HEADER LOGIC
    // ================================================================

    function initHeader() {
        // Profile dropdown toggle
        const profileBtn = $('profile-btn');
        const dropdown = $('profile-dropdown');

        if (profileBtn && dropdown) {
            profileBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');
                if (isHidden) {
                    dropdown.classList.remove('hidden');
                    requestAnimationFrame(() => dropdown.classList.add('visible'));
                } else {
                    dropdown.classList.remove('visible');
                    setTimeout(() => dropdown.classList.add('hidden'), 200);
                }
            };

            document.addEventListener('click', (e) => {
                if (!$('profile-wrapper').contains(e.target)) {
                    dropdown.classList.remove('visible');
                    setTimeout(() => dropdown.classList.add('hidden'), 200);
                }
            });
        }

        // Dropdown profile link
        const dropdownProfileLink = $('dropdown-profile-link');
        if (dropdownProfileLink) {
            dropdownProfileLink.onclick = () => {
                dropdown.classList.remove('visible');
                setTimeout(() => dropdown.classList.add('hidden'), 200);
            };
        }

        // Mobile menu
        const mobileBtn = $('mobile-menu-btn');
        const mobileMenu = $('mobile-menu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.onclick = () => {
                mobileMenu.classList.toggle('hidden');
            };
        }

        // Logout
        const logoutBtn = $('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => doLogout();
        }

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = $('main-header');
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 20);
            }
        });
    }

    function updateProfileUI() {
        const user = Auth.getUser();
        if (!user) return;
        const initials = Auth.getInitials();
        const avatarText = $('profile-avatar-text');
        const dropdownName = $('dropdown-name');
        const dropdownEmail = $('dropdown-email');

        if (avatarText) avatarText.textContent = initials;
        if (dropdownName) dropdownName.textContent = user.name;
        if (dropdownEmail) dropdownEmail.textContent = user.email;
    }

    function doLogout() {
        Auth.logout();
        $('app-shell').classList.add('hidden');
        $('auth-overlay').classList.remove('hidden');
        renderAuthUI();
        showToast('Signed out successfully', 'info');
    }

    // ================================================================
    //                       BOOTSTRAP
    // ================================================================

    lucide.createIcons();

    if (Auth.isLoggedIn()) {
        $('auth-overlay').classList.add('hidden');
        $('app-shell').classList.remove('hidden');
        updateProfileUI();
        initHeader();
        Router.init();
    } else {
        $('auth-overlay').classList.remove('hidden');
        $('app-shell').classList.add('hidden');
        renderAuthUI();
    }

})();
