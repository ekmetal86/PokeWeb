// Variables globales
const pokemonContainer = document.getElementById('pokemonContainer');
const pokeball = document.getElementById('pokeball');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let pokemons = [];

// Función para obtener datos de la PokeAPI
async function fetchPokemonData(id) {
    try {
        console.log(`Cargando Pokémon #${id}...`);
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await response.json();
        
        // Obtener datos de evolución
        const speciesResponse = await fetch(data.species.url);
        const speciesData = await speciesResponse.json();
        
        let evolutionData = null;
        if (speciesData.evolution_chain) {
            const evolutionResponse = await fetch(speciesData.evolution_chain.url);
            evolutionData = await evolutionResponse.json();
            console.log(`Cadena de evolución para ${data.name}:`, evolutionData);
        }
        
        const pokemon = {
            id: data.id,
            name: data.name,
            image: data.sprites.other['official-artwork'].front_default,
            types: data.types.map(type => type.type.name),
            stats: data.stats.map(stat => ({
                name: stat.stat.name,
                value: stat.base_stat
            })),
            evolutionChain: evolutionData
        };
        
        console.log(`Pokémon cargado: ${pokemon.name} (ID: ${pokemon.id})`);
        return pokemon;
    } catch (error) {
        console.error(`Error loading Pokémon #${id}:`, {
            message: error.message,
            type: error.name,
            stack: error.stack
        });
        return null;
    }
}

// Función para crear animación de transformación
// Update the loading progress function
function updateLoadingProgress(loaded, total) {
    // Actualizar silenciosamente en segundo plano
    console.log(`Progreso de carga: ${loaded}/${total}`);
}

// Modify the evolution animation
function createTransformationAnimation(card, fromState, toState) {
    const animationContainer = document.createElement('div');
    animationContainer.className = 'evolution-animation active';
    document.body.appendChild(animationContainer);
    
    const evolutionStage = document.createElement('div');
    evolutionStage.className = 'evolution-stage';
    animationContainer.appendChild(evolutionStage);
    
    const pokemonImg = document.createElement('img');
    pokemonImg.src = fromState.image;
    pokemonImg.className = 'evolution-pokemon';
    evolutionStage.appendChild(pokemonImg);
    
    const magicCircle = document.createElement('div');
    magicCircle.className = 'magic-circle';
    evolutionStage.appendChild(magicCircle);
    
    const particles = document.createElement('div');
    particles.className = 'particles';
    evolutionStage.appendChild(particles);
    
    const tl = gsap.timeline({
        onComplete: () => animationContainer.remove()
    });
    
    tl.to(animationContainer, {
        opacity: 1,
        duration: 0.3
    })
    .to(magicCircle, {
        scale: 1.5,
        rotation: 360,
        duration: 1.5,
        ease: "power2.inOut"
    })
    .to(pokemonImg, {
        scale: 1.2,
        filter: 'brightness(1.5)',
        duration: 0.5,
        ease: "power2.inOut"
    }, "-=1")
    .to(particles, {
        scale: 1.5,
        opacity: 1,
        duration: 0.5
    }, "-=0.5")
    .to(pokemonImg, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
            pokemonImg.src = toState.image;
        }
    })
    .to(pokemonImg, {
        opacity: 1,
        scale: 1,
        duration: 0.5
    })
    .to([magicCircle, particles], {
        opacity: 0,
        duration: 0.3
    });
}

// Crear tarjeta de Pokémon
// Inside createPokemonCard function, update the click event handler
function createPokemonCard(pokemon, originalId = null) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.pokemonId = pokemon.id;
    
    // Store the initial state when the card is first created
    const initialState = {
        id: pokemon.id,
        name: pokemon.name,
        image: pokemon.image,
        types: pokemon.types,
        stats: pokemon.stats
    };
    
    // Save current state for animations
    let currentState = { ...initialState };
    
    // Render card
    card.innerHTML = `
        <img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy">
        <h3>${pokemon.name}</h3>
        <div class="pokemon-info">
            <p>Tipos: ${pokemon.types.join(', ')}</p>
            <p>HP: ${pokemon.stats.find(stat => stat.name === 'hp').value}</p>
            <p>Ataque: ${pokemon.stats.find(stat => stat.name === 'attack').value}</p>
        </div>
    `;
    
    // Click handler to reset to initial state
    card.addEventListener('click', async () => {
        if (card.dataset.pokemonId !== initialState.id.toString()) {
            createTransformationAnimation(card, currentState, initialState);
            
            setTimeout(() => {
                card.innerHTML = `
                    <img src="${initialState.image}" alt="${initialState.name}" loading="lazy">
                    <h3>${initialState.name}</h3>
                    <div class="pokemon-info">
                        <p>Tipos: ${initialState.types.join(', ')}</p>
                        <p>HP: ${initialState.stats.find(stat => stat.name === 'hp').value}</p>
                        <p>Ataque: ${initialState.stats.find(stat => stat.name === 'attack').value}</p>
                    </div>
                `;
                
                // Reset to initial state
                currentState = { ...initialState };
                card.dataset.pokemonId = initialState.id.toString();
                card.removeAttribute('data-original-id');
            }, 2000);
        }
    });

    return card;
}

// At the top with other global variables
const pokemonVoice = new SpeechSynthesisUtterance();

// Update handleEvolution function
async function handleEvolution(pokemonId) {
    const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
    if (!card) return;
    
    const currentPokemon = pokemons.find(p => p.id === parseInt(pokemonId));
    if (!currentPokemon?.evolutionChain) return;
    
    let currentSpecies = currentPokemon.evolutionChain.chain;
    let evolutionTarget = null;
    
    // Make Pokemon say its name
    pokemonVoice.text = currentPokemon.name;
    pokemonVoice.rate = 1.0;
    pokemonVoice.pitch = 1.2;
    window.speechSynthesis.speak(pokemonVoice);
    
    // Play Pokemon cry if available
    if (currentPokemon.cry) {
        pokemonCry.src = currentPokemon.cry;
        try {
            await pokemonCry.play();
        } catch (error) {
            console.log('Could not play Pokemon cry');
        }
    }
    
    // Buscar la siguiente evolución
    while (currentSpecies) {
        if (currentSpecies.species.name === currentPokemon.name) {
            if (currentSpecies.evolves_to.length > 0) {
                evolutionTarget = currentSpecies.evolves_to[0].species.name;
            }
            break;
        }
        
        if (currentSpecies.evolves_to.length > 0) {
            currentSpecies = currentSpecies.evolves_to[0];
        } else {
            break;
        }
    }
    
    if (evolutionTarget) {
        const evolvedPokemon = pokemons.find(p => p.name === evolutionTarget);
        if (evolvedPokemon) {
            createTransformationAnimation(card, currentPokemon, evolvedPokemon);
            
            // Update card content after animation
            setTimeout(() => {
                card.innerHTML = `
                    <img src="${evolvedPokemon.image}" alt="${evolvedPokemon.name}" loading="lazy">
                    <h3>${evolvedPokemon.name}</h3>
                    <div class="pokemon-info">
                        <p>Tipos: ${evolvedPokemon.types.join(', ')}</p>
                        <p>HP: ${evolvedPokemon.stats.find(stat => stat.name === 'hp').value}</p>
                        <p>Ataque: ${evolvedPokemon.stats.find(stat => stat.name === 'attack').value}</p>
                    </div>
                `;
                
                // Update card data attributes
                card.dataset.originalId = currentPokemon.id.toString();
                card.dataset.pokemonId = evolvedPokemon.id.toString();
            }, 2000); // Wait for animation to complete
        }
    }
}

// Configurar el drag and drop
function setupDragAndDrop() {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let lastHoveredCard = null;

    // Mouse Events
    pokeball.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDragging);

    // Touch Events
    pokeball.addEventListener('touchstart', startDragging);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('touchend', stopDragging);

    function startDragging(e) {
        if (e.type === 'touchstart') {
            e.preventDefault(); // Prevenir scroll en móviles
        }
        const event = e.type.includes('mouse') ? e : e.touches[0];
        
        initialX = event.clientX - xOffset;
        initialY = event.clientY - yOffset;
        
        if (e.target === pokeball || e.target.parentElement === pokeball) {
            isDragging = true;
            pokeball.style.cursor = 'grabbing';
            console.log('Iniciando arrastre de pokebola');
        }
    }

    function handleDrag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        const event = e.type.includes('mouse') ? e : e.touches[0];
        
        currentX = event.clientX - initialX;
        currentY = event.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        
        setTranslate(currentX, currentY, pokeball);
        
        // Verificar colisión durante el arrastre
        const pokeballRect = pokeball.getBoundingClientRect();
        const cards = document.querySelectorAll('.pokemon-card');
        
        // Remover el efecto de hover de la última carta
        if (lastHoveredCard) {
            lastHoveredCard.classList.remove('drag-over');
        }
        
        // Verificar colisión con cada carta
        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            if (pokeballRect.right > cardRect.left && pokeballRect.left < cardRect.right && pokeballRect.bottom > cardRect.top && pokeballRect.top < cardRect.bottom) {
                card.classList.add('drag-over');
                lastHoveredCard = card;
            } else {
                card.classList.remove('drag-over');
            }
        });
    }

    function stopDragging(e) {
        if (!isDragging) return;
        
        console.log('Soltando pokebola');
        isDragging = false;
        pokeball.style.cursor = 'grab';
        
        // Obtener la posición final de la pokebola
        const pokeballRect = pokeball.getBoundingClientRect();
        const cards = document.querySelectorAll('.pokemon-card');
        
        console.log('Número de cartas encontradas:', cards.length);
        
        // Remover el efecto de hover de todas las cartas
        cards.forEach(card => card.classList.remove('drag-over'));
        lastHoveredCard = null;
        
        // Verificar colisión con cada carta
        let collision = false;
        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            if (pokeballRect.right > cardRect.left && pokeballRect.left < cardRect.right && pokeballRect.bottom > cardRect.top && pokeballRect.top < cardRect.bottom) {
                collision = true;
                console.log('¡Colisión detectada! ID del Pokémon:', card.dataset.pokemonId);
                handleEvolution(card.dataset.pokemonId);
            }
        });
        
        // Animar el retorno de la pokebola
        gsap.to(pokeball, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "elastic.out(1, 0.5)",
            onComplete: () => {
                xOffset = 0;
                yOffset = 0;
            }
        });
    }

    function setTranslate(xPos, yPos, el) {
        gsap.set(el, {
            x: xPos,
            y: yPos
        });
    }
}

// Función para obtener la lista de todos los Pokemon
// Update the fetchAllPokemon function
async function fetchAllPokemon() {
    try {
        // Establecer un límite fijo al número real de Pokémon existentes
        const maxPokemonId = 1008; // ID del último Pokémon oficial
        
        console.log(`Total de Pokémon a cargar: ${maxPokemonId}`);
        
        // Get Pokemon list with the fixed limit
        const allPokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${maxPokemonId}`);
        const allPokemonData = await allPokemonResponse.json();
        
        // Sort by ID
        allPokemonData.results.sort((a, b) => {
            const idA = parseInt(a.url.split('/').slice(-2, -1)[0]);
            const idB = parseInt(b.url.split('/').slice(-2, -1)[0]);
            return idA - idB;
        });
        
        return allPokemonData.results;
    } catch (error) {
        console.error('Error al obtener la lista de Pokemon:', error);
        return [];
    }
}

// Función para cargar Pokemon en lotes
async function loadPokemonBatch(pokemonList, startIndex, batchSize) {
    const batch = pokemonList.slice(startIndex, startIndex + batchSize);
    const loadingPromises = batch.map(pokemon => {
        const id = pokemon.url.split('/').slice(-2, -1)[0];
        return fetchPokemonData(id);
    });
    
    const loadedPokemon = await Promise.all(loadingPromises);
    const validPokemon = loadedPokemon.filter(pokemon => pokemon !== null);
    
    // Ordenar por ID
    validPokemon.sort((a, b) => a.id - b.id);
    
    return validPokemon;
}

// Función para mostrar el progreso de carga
function updateLoadingProgress(loaded, total) {
    const percentage = Math.round((loaded / total) * 100);
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = `Cargando Pokémon... ${loaded} de ${total} (${percentage}%)`;
    
    const existingLoading = document.querySelector('.loading-text');
    if (existingLoading) {
        existingLoading.replaceWith(loadingText);
    } else {
        pokemonContainer.insertAdjacentElement('beforebegin', loadingText);
    }
    
    if (loaded === total) {
        loadingText.textContent = `¡${total} Pokémon cargados!`;
        setTimeout(() => loadingText.remove(), 2000);
    }
}

// Función para filtrar Pokémon por nombre
function filterPokemons(searchTerm) {
    if (!searchTerm) {
        searchResults.classList.remove('active');
        return;
    }
    
    const filteredPokemons = pokemons.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Limitar a 5 resultados
    
    displaySearchResults(filteredPokemons);
}

// Función para mostrar resultados de búsqueda
function displaySearchResults(results) {
    if (results.length === 0) {
        searchResults.classList.remove('active');
        return;
    }
    
    searchResults.innerHTML = results.map(pokemon => `
        <div class="search-result-item" data-pokemon-id="${pokemon.id}">
            <img src="${pokemon.image}" alt="${pokemon.name}">
            <div class="pokemon-info">
                <div class="pokemon-name">${pokemon.name}</div>
                <div class="pokemon-types">${pokemon.types.join(', ')}</div>
            </div>
        </div>
    `).join('');
    
    searchResults.classList.add('active');
    
    // Agregar eventos de clic a los resultados
    const resultItems = searchResults.querySelectorAll('.search-result-item');
    resultItems.forEach(item => {
        item.addEventListener('click', () => {
            const pokemonId = item.dataset.pokemonId;
            const pokemon = pokemons.find(p => p.id === parseInt(pokemonId));
            if (pokemon) {
                // Limpiar búsqueda
                searchInput.value = '';
                searchResults.classList.remove('active');
                
                // Encontrar la carta existente o crear una nueva
                let existingCard = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
                if (!existingCard) {
                    // Desplazarse suavemente al contenedor
                    pokemonContainer.scrollIntoView({ behavior: 'smooth' });
                    
                    // Crear y agregar la nueva carta con una animación
                    const card = createPokemonCard(pokemon);
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    pokemonContainer.insertBefore(card, pokemonContainer.firstChild);
                    
                    // Animar la entrada de la carta
                    requestAnimationFrame(() => {
                        card.style.transition = 'all 0.5s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    });
                } else {
                    // Si la carta ya existe, resaltarla
                    existingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    existingCard.style.animation = 'highlight 1s ease';
                }
            }
        });
    });
}

// Manejar eventos de la barra de búsqueda
searchInput.addEventListener('input', (e) => {
    filterPokemons(e.target.value);
});

// Cerrar resultados al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.classList.remove('active');
    }
});

// Agregar keydown event para navegación con teclado
searchInput.addEventListener('keydown', (e) => {
    const items = searchResults.querySelectorAll('.search-result-item');
    const activeItem = searchResults.querySelector('.search-result-item.active');
    let index = -1;
    
    if (items.length === 0) return;
    
    if (activeItem) {
        index = Array.from(items).indexOf(activeItem);
    }
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (index < items.length - 1) {
                if (activeItem) activeItem.classList.remove('active');
                items[index + 1].classList.add('active');
                items[index + 1].scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (index > 0) {
                if (activeItem) activeItem.classList.remove('active');
                items[index - 1].classList.add('active');
                items[index - 1].scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'Enter':
            e.preventDefault();
            if (activeItem) {
                activeItem.click();
            } else if (items.length > 0) {
                items[0].click();
            }
            break;
            
        case 'Escape':
            e.preventDefault();
            searchResults.classList.remove('active');
            searchInput.blur();
            break;
    }
});

// Inicializar la aplicación
// At the start of initApp function
async function initApp() {
    console.log('Iniciando aplicación...');
    pokeball.classList.add('loading');
    
    const allPokemon = await fetchAllPokemon();
    console.log(`Total de Pokemon encontrados: ${allPokemon.length}`);
    
    const batchSize = 20;
    let loadedCount = 0;
    
    while (loadedCount < allPokemon.length) {
        const newPokemon = await loadPokemonBatch(allPokemon, loadedCount, batchSize);
        pokemons.push(...newPokemon);
        
        newPokemon.forEach(pokemon => {
            const card = createPokemonCard(pokemon);
            pokemonContainer.appendChild(card);
        });
        
        loadedCount += batchSize;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Remove loading state when all Pokemon are loaded
    pokeball.classList.remove('loading');
    setupDragAndDrop();
    console.log('Aplicación inicializada con éxito');
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando aplicación...');
    initApp();
});
