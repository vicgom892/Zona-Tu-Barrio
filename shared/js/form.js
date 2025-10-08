
        function showQuestionsPrompt() {
            const category = document.getElementById('category').value;
            const questionsPrompt = document.getElementById('questions-prompt');
            if (category) {
                questionsPrompt.style.display = 'block';
            } else {
                questionsPrompt.style.display = 'none';
                document.getElementById('questions-section').classList.remove('show');
            }
        }

        function showQuestions(accept) {
            const category = document.getElementById('category').value;
            const questionsSection = document.getElementById('questions-section');
            questionsSection.innerHTML = '';

            if (!accept || !category) {
                questionsSection.classList.remove('show');
                return;
            }

            let questions = [];
            if (category === 'Sugerencia') {
                questions = [
                    { id: 'q1', label: '¿Qué nueva funcionalidad te gustaría ver?', type: 'text' },
                    { id: 'q2', label: '¿Qué rubro te interesa más?', type: 'select', options: ['Panadería', 'Farmacia', 'Kiosco', 'Barbería', 'Otro'] }
                ];
            } else if (category === 'Reclamo') {
                questions = [
                    { id: 'q1', label: '¿En qué rubro ocurrió el problema?', type: 'select', options: ['Panadería', 'Farmacia', 'Kiosco', 'Barbería', 'Otro'] },
                    { id: 'q2', label: '¿Qué podemos mejorar?', type: 'text' }
                ];
            } else if (category === 'Consulta') {
                questions = [
                    { id: 'q1', label: '¿Sobre qué rubro es tu consulta?', type: 'select', options: ['Panadería', 'Farmacia', 'Kiosco', 'Barbería', 'Otro'] },
                    { id: 'q2', label: '¿Necesitas ayuda con algo específico?', type: 'text' }
                ];
            }

            questions.forEach(q => {
                const div = document.createElement('div');
                div.classList.add('question-option');
                if (q.type === 'text') {
                    div.innerHTML = `
                        <label for="${q.id}">${q.label}</label>
                        <input type="text" id="${q.id}" placeholder="Tu respuesta">
                    `;
                } else if (q.type === 'select') {
                    let options = q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                    div.innerHTML = `
                        <label for="${q.id}">${q.label}</label>
                        <select id="${q.id}">
                            <option value="">Selecciona una opción</option>
                            ${options}
                        </select>
                    `;
                }
                questionsSection.appendChild(div);
            });

            questionsSection.classList.add('show');
        }

        function submitForm() {
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const category = document.getElementById('category').value;
            const message = document.getElementById('message').value.trim();
            const questionsSection = document.getElementById('questions-section');

            if (!name || !email || !category || !message) {
                alert('Por favor, completa todos los campos requeridos.');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Ingresa un correo electrónico válido.');
                return;
            }

            const questions = [];
            if (questionsSection.classList.contains('show')) {
                const inputs = questionsSection.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.value) {
                        const label = input.previousElementSibling.textContent;
                        questions.push(`${label}: ${input.value}`);
                    }
                });
            }

            const formData = {
                name,
                email,
                category,
                message,
                questions,
                timestamp: new Date().toISOString()
            };

            // Guardar en localStorage
            let feedback = JSON.parse(localStorage.getItem('feedback')) || [];
            feedback.push(formData);
            localStorage.setItem('feedback', JSON.stringify(feedback));

            // Enviar a WhatsApp (cambiar por tu número real)
            const whatsappMessage = encodeURIComponent(
                `Nuevo mensaje de ${name}\n` +
                `Correo: ${email}\n` +
                `Categoría: ${category}\n` +
                `Mensaje: ${message}\n` +
                (questions.length ? `Respuestas:\n${questions.join('\n')}` : '')
            );
            const whatsappUrl = `https://wa.me/5491157194796?text=${whatsappMessage}`;
            window.open(whatsappUrl, '_blank');

            // Mostrar modal de éxito
            document.getElementById('success-modal').classList.add('show');
            document.getElementById('contact-form').reset();
            document.getElementById('questions-prompt').style.display = 'none';
            document.getElementById('questions-section').classList.remove('show');
        }

        function closeModal() {
            document.getElementById('success-modal').classList.remove('show');
        }

        // Cerrar modal con tecla Esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    