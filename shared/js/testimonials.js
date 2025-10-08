// Testimonials
const testimonials = [
    {
        id: 1,
        name: "José Martínez",
        business: "Panadería Don José",
        rating: 5,
        content: "Desde que sumé mi negocio a Tu Barrio A Un Clic, aumentaron un 40% mis ventas. La plataforma es muy fácil de usar y los clientes me encuentran mucho más rápido.",
        avatar: "https://placehold.co/50x50/000000/white?text=J"
    },
    {
        id: 2,
        name: "María González",
        business: "Supermercado Vecino",
        rating: 5,
        content: "El plan Premium fue una excelente inversión. Las promociones exclusivas atrajeron a muchos nuevos clientes y el análisis de visitas me ayuda a tomar mejores decisiones.",
        avatar: "https://placehold.co/50x50/1a1a1a/white?text=M"
    },
    {
        id: 3,
        name: "Roberto Pérez",
        business: "Barbería El Gaucho",
        rating: 4.5,
        content: "Como nuevo en el rubro, Tu Barrio A Un Clic me dio la visibilidad que necesitaba. El soporte es excelente y los resultados se ven desde el primer mes.",
        avatar: "https://placehold.co/50x50/0f0f0f/white?text=R"
    },
    {
        id: 4,
        name: "Ana López",
        business: "Farmacia Saludable",
        rating: 5,
        content: "La aplicación es increíblemente intuitiva. Mis clientes ahora pueden ver fácilmente si estamos abiertos y contactarnos directamente desde la app.",
        avatar: "https://placehold.co/50x50/121212/white?text=A"
    }
];

// Create Testimonial Card HTML
function createTestimonialCard(testimonial) {
    return `
        <div class="testimonial-card" data-aos="fade-up" data-aos-delay="100">
            <p class="testimonial-content">"${testimonial.content}"</p>
            <div class="testimonial-author">
                <img src="${testimonial.avatar}" alt="${testimonial.name}" class="testimonial-avatar">
                <div class="testimonial-info">
                    <h4 class="testimonial-name">${testimonial.name}</h4>
                    <p class="testimonial-business">${testimonial.business}</p>
                </div>
            </div>
            <div class="testimonial-rating">
                ${Array.from({length: 5}, (_, i) => 
                    i < Math.floor(testimonial.rating) 
                        ? '<i class="fas fa-star"></i>' 
                        : i < testimonial.rating 
                            ? '<i class="fas fa-star-half-alt"></i>' 
                            : '<i class="far fa-star"></i>'
                ).join('')}
            </div>
        </div>
    `;
}

// Load Testimonials
function loadTestimonials() {
    const testimonialsContainer = document.getElementById('testimonialsContainer');
    if (!testimonialsContainer) return;
    
    testimonials.forEach(testimonial => {
        testimonialsContainer.innerHTML += createTestimonialCard(testimonial);
    });
    
    // Initialize AOS for testimonials
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Initialize testimonials when DOM is loaded
document.addEventListener('DOMContentLoaded', loadTestimonials);