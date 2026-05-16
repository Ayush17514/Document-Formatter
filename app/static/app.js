(function() {
    "use strict";

    // State
    let currentFileId = null;
    let manuscriptOptions = {};
    let currentClassifiedData = [];
    let currentRules = {};

    // Elements
    const fileInput = document.getElementById('file-input');
    const uploadSection = document.getElementById('upload-section');
    const detailsSection = document.getElementById('details-section');
    const reviewSection = document.getElementById('review-section');
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('loader-text');
    
    const docTypeSelect = document.getElementById('doc-type-select');
    const pubSelect = document.getElementById('publication-select');
    const rulePreview = document.getElementById('rule-preview');
    const processBtn = document.getElementById('process-btn');
    const mapperCont = document.getElementById('interactive-mapper');
    const validationPanel = document.getElementById('validation-panel');
    const validationList = document.getElementById('validation-list');
    
    function showLoader(msg) {
        loaderText.innerText = msg;
        loader.classList.remove('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-item animate-slide-in-right pointer-events-auto`;
        
        let icon = 'info';
        let iconColor = 'text-indigo-400';
        if (type === 'success') { icon = 'check-circle'; iconColor = 'text-green-500'; }
        if (type === 'error') { icon = 'alert-circle'; iconColor = 'text-rose-500'; }

        toast.innerHTML = `
            <div class="${iconColor}">
                <i data-lucide="${icon}" class="w-5 h-5"></i>
            </div>
            <div class="flex-1 text-sm font-medium text-slate-200">${msg}</div>
            <button class="text-slate-600 hover:text-slate-400">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(toast);
        lucide.createIcons();

        const remove = () => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('button').onclick = remove;
        setTimeout(remove, 4000);
    }

    lucide.createIcons();

    // Fetch Options
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
        
        if (type && pub && manuscriptOptions[type][pub]) {
            currentRules = manuscriptOptions[type][pub];
            renderRules(currentRules);
            validateManuscript();
        } else if (pub === "CUSTOM_AI") {
            rulePreview.innerHTML = '<p class="text-xs text-indigo-400 animate-pulse">AI will dynamically resolve rules for this venue...</p>';
        }
    };

    function renderRules(rules) {
        rulePreview.innerHTML = `
            <div class="grid grid-cols-2 gap-2 text-[10px]">
                <div class="bg-slate-800/40 p-2 rounded">
                    <span class="text-slate-500 block uppercase font-bold">Font</span>
                    <span>${rules.font_family} (${rules.font_size_body}pt)</span>
                </div>
                <div class="bg-slate-800/40 p-2 rounded">
                    <span class="text-slate-500 block uppercase font-bold">Layout</span>
                    <span>${rules.columns}-Column</span>
                </div>
                <div class="bg-slate-800/40 p-2 rounded">
                    <span class="text-slate-500 block uppercase font-bold">Spacing</span>
                    <span>${rules.line_spacing}x</span>
                </div>
                <div class="bg-indigo-500/10 p-2 rounded border border-indigo-500/30">
                    <span class="text-indigo-400 block uppercase font-bold">Alignment</span>
                    <span class="text-indigo-200">✨ ${rules.alignment || 'JUSTIFIED'}</span>
                </div>
            </div>
        `;
    }

    // Render the Interactive Mapper
    function renderMapper() {
        mapperCont.innerHTML = '';
        // Safety check: ensure currentClassifiedData is an array
        if (!Array.isArray(currentClassifiedData) || currentClassifiedData.length === 0) {
            mapperCont.innerHTML = '<p class="text-slate-500 text-center py-8">No classified data available.</p>';
            return;
        }
        
        currentClassifiedData.forEach((block, idx) => {
            const el = document.createElement('div');
            el.className = `mapper-block group relative animate-in fade-in slide-in-from-left-2 duration-500 label-${block.label}`;
            el.style.animationDelay = `${idx * 40}ms`;

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
                <div class="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-all"></div>
            `;

            // Events
            const select = el.querySelector('.block-type-select');
            select.onchange = () => {
                const oldLabel = block.label;
                block.label = select.value;
                showToast(`Block re-labeled from ${oldLabel} to ${block.label}`, 'success');
                validateManuscript();
            };

            const content = el.querySelector('.block-content');
            content.onblur = () => {
                if (block.text !== content.innerText) {
                    block.text = content.innerText;
                    showToast("Paragraph changes saved locally.", "info");
                    renderMapper(); // Re-render to update word count
                    validateManuscript();
                }
            };
            
            content.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    content.blur();
                }
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
        let score = 95;

        // Safety check
        if (!Array.isArray(currentClassifiedData)) {
            currentClassifiedData = [];
        }

        const labels = currentClassifiedData.map(b => b.label);
        const totalWords = currentClassifiedData.reduce((acc, b) => acc + b.text.split(/\s+/).filter(w => w.length > 0).length, 0);
        
        document.getElementById('word-count-display').innerText = totalWords;
        document.getElementById('para-count-display').innerText = currentClassifiedData.length;

        if (!labels.includes('TITLE')) { issues.push("Missing Title block."); score -= 10; }
        if (!labels.includes('ABSTRACT')) { issues.push("Missing Abstract."); score -= 10; }
        if (!labels.includes('REFERENCES')) { issues.push("Missing Reference section."); score -= 5; }

        const abstractText = currentClassifiedData.find(b => b.label === 'ABSTRACT')?.text || "";
        const abstractWords = abstractText.split(/\s+/).filter(w => w.length > 0).length;

        // Venue Specific Validation
        const pub = pubSelect.value;
        if (pub === "Nature (Main)" && abstractWords > 200) {
            issues.push(`Nature abstracts must be < 200 words (Current: ${abstractWords}).`);
            score -= 15;
        }
        
        if (totalWords < 500) {
            issues.push("Manuscript length is unusually short (< 500 words).");
            score -= 5;
        }

        validationList.innerHTML = issues.map(i => `
            <li class="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group transition-all hover:bg-white/10">
                <i data-lucide="info" class="w-4 h-4 text-amber-500 mt-0.5"></i>
                <span class="leading-tight">${i}</span>
            </li>
        `).join('');
        
        lucide.createIcons();
        validationPanel.classList.toggle('hidden', issues.length === 0);
        
        const scoreEl = document.getElementById('score-ring');
        const finalScore = Math.max(0, score);
        
        // Animate score shift
        let current = parseInt(scoreEl.innerText) || 0;
        const interval = setInterval(() => {
            if (current < finalScore) current++;
            else if (current > finalScore) current--;
            else clearInterval(interval);
            scoreEl.innerText = `${current}/100`;
            
            if (current < 70) scoreEl.className = "text-4xl font-black text-rose-500 tracking-tighter leading-none mb-1";
            else if (current < 90) scoreEl.className = "text-4xl font-black text-amber-500 tracking-tighter leading-none mb-1";
            else scoreEl.className = "text-4xl font-black text-indigo-500 tracking-tighter leading-none mb-1";
        }, 20);
    }

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
            // Safely extract classified data - fallback to empty array
            currentClassifiedData = (data.classified || data.paragraphs || []);
            
            if (!Array.isArray(currentClassifiedData)) {
                throw new Error("Invalid classified data format received from server");
            }

            if (currentClassifiedData.length === 0) {
                throw new Error("No paragraphs were extracted from the document");
            }
            
            renderMapper();
            validateManuscript();
            
            uploadSection.classList.add('hidden');
            detailsSection.classList.remove('hidden');
        } catch (e) {
            console.error("Upload error:", e);
            showToast(e.message, "error");
        } finally {
            hideLoader();
        }
    };

    processBtn.onclick = async () => {
        const type = docTypeSelect.value;
        let pub = pubSelect.value;
        const fixRefs = document.getElementById('ai-ref-fix').checked;
        
        if (!type || !pub) { 
            showToast("Please select a document type and venue first.", "error"); 
            return; 
        }
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
                body: JSON.stringify({
                    file_id: currentFileId,
                    doc_type: type,
                    publication: pub,
                    classified: currentClassifiedData,
                    fix_references: fixRefs
                })
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.detail || "Formatting failed");
            
            showToast("Formatting complete! Preview updated.", "success");
            
            // Render active rules list
            const rulesList = document.getElementById('rules-list');
            if (rulesList && currentRules) {
                const ruleIcons = {
                    font_family: 'type',
                    font_size_body: 'text-cursor-input',
                    columns: 'columns',
                    line_spacing: 'lines',
                    alignment: 'align-justify'
                };
                
                rulesList.innerHTML = Object.entries(currentRules).map(([key, value]) => {
                    if (key === 'margins') return ''; // Skip margins for now or handle separately
                    const icon = ruleIcons[key] || 'settings';
                    return `
                        <div class="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl animate-in slide-in-from-right-4 duration-500">
                            <div class="flex items-center gap-3">
                                <i data-lucide="${icon}" class="w-3.5 h-3.5 text-indigo-400"></i>
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">${key.replace(/_/g, ' ')}</span>
                            </div>
                            <span class="text-[10px] font-bold text-slate-200">${value}</span>
                        </div>
                    `;
                }).join('');
                lucide.createIcons();
            }

            document.getElementById('final-preview').innerHTML = data.preview_html;
            detailsSection.classList.add('hidden');
            reviewSection.classList.remove('hidden');
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            hideLoader();
        }
    };

    document.getElementById('latex-btn').onclick = async () => {
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

    document.getElementById('download-btn').onclick = () => {
        window.location = `/api/download/${currentFileId}`;
    };

    document.getElementById('restart-btn').onclick = () => { location.reload(); };

    fetchOptions();
})();
