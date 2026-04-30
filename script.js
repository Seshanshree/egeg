const toggleBtn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
if (toggleBtn && nav) {
  toggleBtn.addEventListener('click', () => nav.classList.toggle('open'));
}

const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');

if (contactForm && formStatus) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      message: String(formData.get('message') || '').trim(),
    };

    formStatus.textContent = 'Sending your message...';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to send message right now.');
      }

      formStatus.textContent = result.message || 'Thanks! Your message has been sent.';
      contactForm.reset();
    } catch (error) {
      formStatus.textContent = error.message || 'Something went wrong. Please try again.';
    }
  });
}
