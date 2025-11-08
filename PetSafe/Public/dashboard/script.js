 const firebaseConfig = {
      apiKey: "AIzaSyChNA-zH8CpAmwfR_pKIk7MFfbAEmnMSLc",
      authDomain: "pettracker-e5ba1.firebaseapp.com",
      projectId: "pettracker-e5ba1",
      storageBucket: "pettracker-e5ba1.appspot.com",
      messagingSenderId: "843455837201",
      appId: "1:843455837201:web:0e2b17ef9915fd369f6db0",
      databaseURL: "https://pettracker-e5ba1-default-rtdb.firebaseio.com/"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    document.addEventListener('DOMContentLoaded', () => {
      console.log("✅ Página carregada");

      let animais = [];
      const map = L.map('map').setView([-12.2664, -38.9663], 13);

      // 🗺️ Camadas do mapa
      const baseLayers = {
        streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles © Esri'
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: '&copy; OpenTopoMap contributors'
        })
      };
      baseLayers.streets.addTo(map);

      // ⚙️ Corrigir mapa se redimensionar
      setTimeout(() => map.invalidateSize(), 700);
      window.addEventListener("resize", () => map.invalidateSize());

      let animalMarkers = [];

      const limparMarcadores = () => {
        animalMarkers.forEach(marker => map.removeLayer(marker));
        animalMarkers = [];
      };

      const adicionarMarcadores = () => {
        limparMarcadores();
        animais.forEach(animal => {
          if (!animal.localizacao || !Array.isArray(animal.localizacao)) return;
          const [lat, lng] = animal.localizacao;
          if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return;

          const marker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>${animal.nome}</b><br>${animal.especie}`);
          marker.animalId = animal.id;
          marker.on('click', () => selecionarAnimal(animal.id));
          animalMarkers.push(marker);
        });
      };

      const selecionarAnimal = (id) => {
        const animal = animais.find(a => a.id === id);
        if (!animal) return;
        const detalhes = document.getElementById('selectedAnimalDetails');
        const content = document.getElementById('animalDetailsContent');
        content.innerHTML = `
          <div class="label">Nome:</div><div>${animal.nome}</div>
          <div class="label">Espécie:</div><div>${animal.especie}</div>
          <div class="label">Status:</div>
          <div><span style="color: ${animal.status === 'Ativo' ? 'green' : 'red'}; font-weight: bold;">${animal.status}</span></div>
          <div class="label">Última Atualização:</div><div>${animal.ultimaAtualizacao}</div>
          <div class="label">Coordenadas:</div><div>${animal.localizacao[0].toFixed(4)}, ${animal.localizacao[1].toFixed(4)}</div>
        `;
        detalhes.classList.remove('hidden');
        const marker = animalMarkers.find(m => m.animalId === id);
        if (marker) {
          map.setView(marker.getLatLng(), 15);
          marker.openPopup();
        }
      };

      document.getElementById('mapStyle').addEventListener('change', (e) => {
        const style = e.target.value;
        Object.values(baseLayers).forEach(layer => map.removeLayer(layer));
        if (baseLayers[style]) baseLayers[style].addTo(map);
      });

      // 🔹 Modal Cadastro
      const modal = document.getElementById("petModal");
      const petNomeInput = document.getElementById("petNome");
      const petEspecieInput = document.getElementById("petEspecie");
      const petLatInput = document.getElementById("petLat");
      const petLngInput = document.getElementById("petLng");
      const closeBtns = document.querySelectorAll(".close-btn, #cancelPet");

      const openModal = () => modal.style.display = "flex";
      const closeModal = () => {
        modal.style.display = "none";
        petNomeInput.value = "";
        petEspecieInput.value = "";
        petLatInput.value = "";
        petLngInput.value = "";
      };

      document.getElementById("addPetBtn").onclick = openModal;
      closeBtns.forEach(btn => btn.onclick = closeModal);

      map.on('click', (e) => {
        petLatInput.value = e.latlng.lat.toFixed(5);
        petLngInput.value = e.latlng.lng.toFixed(5);
        openModal();
      });

      // 🧩 Salvar Pet
      document.getElementById("savePet").onclick = async () => {
        const nome = petNomeInput.value.trim();
        const especie = petEspecieInput.value.trim();
        const status = document.getElementById("petStatus").value;
        const lat = parseFloat(petLatInput.value);
        const lng = parseFloat(petLngInput.value);

        if (!nome || !especie || isNaN(lat) || isNaN(lng)) {
          alert("Por favor, preencha todos os campos corretamente e clique no mapa.");
          return;
        }

        const novoPet = {
          nome,
          especie,
          status,
          localizacao: [lat, lng],
          ultimaAtualizacao: new Date().toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }),
        };

        try {
          const ref = db.ref("pets").push();
          await ref.set(novoPet);
          alert("✅ Pet cadastrado com sucesso!");
          closeModal();
        } catch (error) {
          alert("Erro ao salvar pet: " + error.message);
        }
      };

      // 🐾 Modal "Meus Pets"
      const myPetsModal = document.getElementById("myPetsModal");
      const myPetsBtn = document.getElementById("myPetsBtn");
      const closeMyPets = document.getElementById("closeMyPets");
      const myPetsList = document.getElementById("myPetsList");

      myPetsBtn.onclick = () => {
        myPetsModal.style.display = "flex";
        atualizarListaPets();
      };

      closeMyPets.onclick = () => {
        myPetsModal.style.display = "none";
      };

      function atualizarListaPets() {
        if (animais.length === 0) {
          myPetsList.innerHTML = "<p>Nenhum pet cadastrado ainda.</p>";
          return;
        }

        myPetsList.innerHTML = animais.map(a => `
          <div class="pet-item">
            <div>
              <strong>${a.nome}</strong> — ${a.especie}<br>
              <small>${a.status}</small>
            </div>
            <button onclick="removerPet('${a.id}')">🗑️ Apagar</button>
          </div>
        `).join("");
      }

      // 🗑️ Função para remover pet
      window.removerPet = async (id) => {
        if (confirm("Tem certeza que deseja apagar este pet?")) {
          try {
            await db.ref("pets/" + id).remove();
            alert("🐾 Pet removido com sucesso!");
            myPetsModal.style.display = "none";
          } catch (error) {
            alert("Erro ao remover pet: " + error.message);
          }
        }
      };

      // 🔁 Atualização em tempo real
      db.ref("pets").on("value", (snapshot) => {
        const data = snapshot.val();
        animais = [];
        if (data) {
          Object.entries(data).forEach(([id, pet]) => {
            animais.push({ id, ...pet });
          });
        }
        adicionarMarcadores();
        if (animais.length > 0) selecionarAnimal(animais[0].id);
      });
    });
    //