const API_BASE = 'https://pokeapi.co/api/v2';
let currentPage = 1;
const POKEMON_PER_PAGE = 20;
let currentPokemonList = [];
let allLoadedPokemon = [];
let isSearching = false;

// Elementos DOM
const pokemonContainer = document.getElementById('pokemonContainer');
const searchInput = document.getElementById('searchInput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

// Función para obtener lista de Pokémon de la API con offset
async function fetchPokemonList(offset = 0) {
    try {
        // Verificar si es local file (CORS issue)
        if (window.location.protocol === 'file:') {
            throw new Error('Archivo local detectado - usa GitHub Pages o servidor local');
        }

        const response = await fetch(`${API_BASE}/pokemon?limit=${POKEMON_PER_PAGE}&offset=${offset}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        // Obtener detalles para cada Pokémon (con manejo de errores individuales)
        const pokemonPromises = data.results.map(async (poke) => {
            try {
                const detailResponse = await fetch(poke.url);
                if (!detailResponse.ok) return null;
                const detailData = await detailResponse.json();
                const image = detailData.sprites.front_default || detailData.sprites.other?.['official-artwork']?.front_default;
                if (!image) return null;
                return {
                    name: detailData.name,
                    image: image,
                    id: detailData.id
                };
            } catch (err) {
                console.warn(`Error en detalle de ${poke.name}:`, err);
                return null;
            }
        });
        
        const results = await Promise.all(pokemonPromises);
        return results.filter(poke => poke !== null);
    } catch (error) {
        console.error('Error fetching Pokémon:', error);
        let errorMsg = 'Error al cargar Pokémon.';
        if (error.message.includes('file') || error.message.includes('CORS')) {
            errorMsg += ' <br>¡Importante! Abre en GitHub Pages o un servidor HTTP (no file://).';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMsg += ' <br>Verifica tu conexión a internet.';
        } else {
            errorMsg += ` <br>Detalles: ${error.message}`;
        }
        showError(errorMsg);
        return [];
    }
}

// Renderizar tarjetas
function renderPokemon(pokemonList) {
    pokemonContainer.innerHTML = '';
    
    if (pokemonList.length === 0) {
        pokemonContainer.innerHTML = '<div class="no-results">No se encontraron Pokémon. Intenta otra búsqueda o navega a otra página.</div>';
        return;
    }
    
    pokemonList.forEach(poke => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.innerHTML = `
            <img src="${poke.image}" alt="${poke.name}" onclick="openImage('${poke.image}')" 
                 onerror="this.src='https://via.placeholder.com/180x180/0a0a0a/ffffff?text=${poke.name.charAt(0).toUpperCase()}'">
            <h3>${poke.name}</h3>
        `;
        pokemonContainer.appendChild(card);
    });
}

// Abrir imagen en nueva pestaña
function openImage(imageUrl) {
    if (imageUrl && !imageUrl.includes('placeholder.com')) {
        window.open(imageUrl, '_blank');
    } else {
        console.log('Imagen no disponible para abrir.');
    }
}

// Mostrar error
function showError(message) {
    pokemonContainer.innerHTML = `<div class="error"><strong>Error:</strong> ${message}</div>`;
    nextBtn.disabled = true;
    prevBtn.disabled = true;
}

// Mostrar loading
function showLoading() {
    pokemonContainer.innerHTML = '<div class="loading">Cargando Pokémon...</div>';
}

// Actualizar paginación
function updatePagination() {
    pageInfo.textContent = `Página ${currentPage}`;
    prevBtn.disabled = currentPage === 1;
    if (isSearching) {
        const filtered = allLoadedPokemon.filter(poke => 
            poke.name.toLowerCase().includes(searchInput.value.toLowerCase())
        );
        nextBtn.disabled = (currentPage * POKEMON_PER_PAGE) >= filtered.length;
    } else {
        nextBtn.disabled = currentPokemonList.length < POKEMON_PER_PAGE;
    }
}

// Cargar página
async function loadPage(page) {
    currentPage = page;
    const offset = (page - 1) * POKEMON_PER_PAGE;
    showLoading();

    let pokemonToShow = [];
    if (!isSearching) {
        // Paginación normal: cargar de API
        currentPokemonList = await fetchPokemonList(offset);
        allLoadedPokemon = allLoadedPokemon.concat(currentPokemonList); // Acumular para búsquedas futuras
        pokemonToShow = currentPokemonList;
    } else {
        // Búsqueda: filtrar de lo acumulado y paginar
        const filtered = allLoadedPokemon.filter(poke => 
            poke.name.toLowerCase().includes(searchInput.value.toLowerCase())
        );
        const start = (page - 1) * POKEMON_PER_PAGE;
        const end = start + POKEMON_PER_PAGE;
        pokemonToShow = filtered.slice(start, end);
        currentPokemonList = pokemonToShow;
    }

    renderPokemon(pokemonToShow);
    updatePagination();
}

// Event listeners
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) loadPage(currentPage - 1);
});

nextBtn.addEventListener('click', async () => {
    loadPage(currentPage + 1);
});

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    isSearching = query !== '';
    currentPage = 1; // Reset a página 1 en búsqueda
    if (isSearching && allLoadedPokemon.length === 0) {
        showError('Primero carga algunos Pokémon navegando o desactiva la búsqueda.');
        return;
    }
    loadPage(1);
});

// Carga inicial
loadPage(1);
