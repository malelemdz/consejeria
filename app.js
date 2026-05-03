let counselorsData = null;
let activeFilters = new Set();

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data/counselors.json');
        counselorsData = await response.json();
        
        renderFilters();
        renderCounselors();
        initSearch();
        
        // Año dinámico
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // Inicializar iconos de Lucide
        lucide.createIcons();

        // Sincronizar barra de estado del móvil
        updateThemeColor();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);

    } catch (error) {
        console.error("Error cargando los datos:", error);
        document.getElementById('counselorsGrid').innerHTML = '<p class="error">Error al cargar la información. Inténtalo más tarde.</p>';
    }
});

function updateThemeColor() {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) return;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        themeColorMeta.setAttribute('content', '#130a2a'); // Púrpura profundo del header
    } else {
        themeColorMeta.setAttribute('content', '#ffffff'); // Blanco del header claro
    }
}

// Renderizar botones de filtro
function renderFilters() {
    const container = document.getElementById('categoryFilters');
    const categories = counselorsData.config.categorias;
    
    Object.keys(categories).forEach(id => {
        const cat = categories[id];
        const button = document.createElement('button');
        button.className = 'tag';
        button.textContent = cat.titulo;
        button.dataset.id = id;
        
        button.addEventListener('click', () => {
            if (activeFilters.has(id)) {
                activeFilters.delete(id);
                button.classList.remove('active');
            } else {
                activeFilters.add(id);
                button.classList.add('active');
            }
            renderCounselors();
        });
        
        container.appendChild(button);
    });
}

// Renderizar las tarjetas
function renderCounselors() {
    const grid = document.getElementById('counselorsGrid');
    if (!grid) return;
    
    const normalize = (str) => {
        if (!str) return "";
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim();
    };

    const searchVal = normalize(document.getElementById('searchInput').value);
    grid.innerHTML = '';

    const filtered = counselorsData.consejeros.filter(c => {
        // Normalizar campos del consejero
        const nombreCompleto = normalize(`${c.nombre} ${c.apellido}`);
        const cargo = normalize(c.cargo || "");
        
        // Normalizar temas
        const temasMatch = c.temas.some(tId => {
            const temaTexto = counselorsData.config.temas[tId] || "";
            return normalize(temaTexto).includes(searchVal);
        });

        const matchSearch = nombreCompleto.includes(searchVal) || 
                            cargo.includes(searchVal) ||
                            temasMatch;
        
        const matchCategory = activeFilters.size === 0 || 
            c.categorias.some(catId => activeFilters.has(catId.toString()));
            
        return matchSearch && matchCategory;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="width: 100%; grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i data-lucide="search-x" style="width: 40px; height: 40px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p style="font-weight: 600;">No se encontraron resultados para tu búsqueda.</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">Intenta con otros términos o categorías.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Construir chips de categorías
        const catChips = c.categorias.map(id => {
            const cat = counselorsData.config.categorias[id];
            return `<span class="chip category" title="${cat.sub}">${cat.titulo}</span>`;
        }).join('');

        // Construir chips de temas
        const temaChips = c.temas.map(id => {
            const tema = counselorsData.config.temas[id];
            return `<span class="chip topic">${tema}</span>`;
        }).join('');

        card.innerHTML = `
            <div class="card-header">
                <img src="${c.foto}" alt="${c.nombre}" class="profile-img">
                <div class="counselor-info">
                    <h3>${c.nombre} ${c.apellido}</h3>
                    <span class="counselor-role">${c.cargo || 'Consejero'}</span>
                </div>
            </div>
            <div class="card-body">
                <p class="counselor-bio">${c.bio || ''}</p>
                
                <span class="section-label">Consejería para:</span>
                <div class="chips-group">${catChips}</div>
                
                ${temaChips ? `<span class="section-label">Áreas de apoyo:</span><div class="chips-group">${temaChips}</div>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-whatsapp" onclick="confirmAction('whatsapp', '${c.id}')">
                    <img src="images/icos/wpp.png" alt="WhatsApp" class="btn-icon"> WhatsApp
                </button>
                <button class="btn btn-call" onclick="confirmAction('call', '${c.id}')">
                    <i data-lucide="phone"></i> Llamar
                </button>
                <button class="btn btn-vcard" onclick="confirmAction('vcard', '${c.id}')">
                    <i data-lucide="user-plus"></i> Guardar Contacto
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    lucide.createIcons();
}

// Búsqueda
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const iconContainer = document.getElementById('searchIconContainer');

    searchInput.addEventListener('input', () => {
        // Cambiar el icono dinámicamente
        if (searchInput.value.length > 0) {
            iconContainer.innerHTML = '<i data-lucide="x"></i>';
        } else {
            iconContainer.innerHTML = '<i data-lucide="search"></i>';
        }
        lucide.createIcons(); // Pedirle a Lucide que dibuje el nuevo icono
        renderCounselors();
    });

    // Acción de limpiar al hacer clic en el icono
    iconContainer.addEventListener('click', () => {
        if (searchInput.value.length > 0) {
            searchInput.value = '';
            iconContainer.innerHTML = '<i data-lucide="search"></i>';
            lucide.createIcons();
            renderCounselors();
            searchInput.focus();
        }
    });
}

// Generador de vCard
function downloadVCard(id) {
    const c = counselorsData.consejeros.find(item => item.id === id);
    if (!c) return;

    const vCardData = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${c.nombre} ${c.apellido}`,
        `N:${c.apellido};${c.nombre};;;`,
        `TEL;TYPE=CELL:${c.celular}`,
        `ORG:Centro de Consejería - Iglesia`,
        `TITLE:${c.cargo}`,
        `NOTE:${c.bio}`,
        "END:VCARD"
    ].join("\n");

    const blob = new Blob([vCardData], { type: "text/vcard" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.nombre}_${c.apellido}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Lógica de Confirmación
function confirmAction(type, counselorId) {
    const counselor = counselorsData.consejeros.find(c => c.id === counselorId);
    const modal = document.getElementById('confirmModal');
    const title = document.getElementById('modalTitle');
    const msg = document.getElementById('modalMessage');
    const iconBox = document.getElementById('modalIcon');
    const btnConfirm = document.getElementById('btnConfirm');
    
    // Reset classes
    btnConfirm.className = 'modal-btn modal-btn-confirm';
    
    let action = () => {};
    
    if (type === 'whatsapp') {
        title.innerText = '¿Abrir WhatsApp?';
        msg.innerText = `Vas a escribirle a ${counselor.nombre}. ¿Deseas continuar?`;
        iconBox.innerHTML = `<img src="images/icos/wpp.png" style="width:32px; filter:brightness(0) invert(1)">`;
        btnConfirm.classList.add('whatsapp');
        action = () => window.open(`https://wa.me/${counselor.celular.replace(/\D/g, '')}`, '_blank');
    } else if (type === 'call') {
        title.innerText = '¿Llamar ahora?';
        msg.innerText = `Se iniciará una llamada a ${counselor.nombre}.`;
        iconBox.innerHTML = '<i data-lucide="phone"></i>';
        action = () => window.location.href = `tel:${counselor.celular}`;
    } else if (type === 'vcard') {
        title.innerText = '¿Guardar contacto?';
        msg.innerText = `Se descargará la ficha de contacto de ${counselor.nombre}.`;
        iconBox.innerHTML = '<i data-lucide="user-plus"></i>';
        action = () => downloadVCard(counselorId);
    }
    
    modal.classList.add('active');
    lucide.createIcons();

    // Handlers
    btnConfirm.onclick = () => {
        action();
        modal.classList.remove('active');
    };
    
    document.getElementById('btnCancel').onclick = () => {
        modal.classList.remove('active');
    };
}
