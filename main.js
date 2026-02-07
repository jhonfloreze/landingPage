/**
 * conR Landing Page - Main JavaScript
 * Handles: Parallax, mobile menu, form validation, scroll animations, and analytics tracking
 */

(function() {
  'use strict';

  // ==========================================================================
  // Configuration
  // ==========================================================================

  const CONFIG = {
    parallaxFactor: 0.15,
    headerScrollThreshold: 50,
    intersectionThreshold: 0.1,
    whatsappNumber: '5219982381667', // Replace with actual number
    whatsappMessage: 'Hola, me interesa conR para mi restaurante',
    supabaseUrl: 'https://dzcfhvqevjxewdvajeco.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Y2ZodnFldmp4ZXdkdmFqZWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzI2NjIsImV4cCI6MjA4Mjk0ODY2Mn0.ifqeps_1euVbK8m2GGoypEWLGYCn40TNsmDKeHoFPJc',
    formMinTimeSeconds: 3, // Minimum seconds before a submission is valid (anti-bot)
    rateLimitCooldownMs: 60000, // 1 minute cooldown between submissions
    turnstileSiteKey: '0x4AAAAAACY-rHzbFN-FTF56'
  };

  // ==========================================================================
  // Supabase Client
  // ==========================================================================

  const supabase = window.supabase
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
    : null;

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  const DOM = {
    header: document.querySelector('.header'),
    menuToggle: document.querySelector('.header__menu-toggle'),
    navList: document.querySelector('.header__nav-list'),
    navLinks: document.querySelectorAll('.header__nav-link'),
    parallaxLayers: document.querySelectorAll('.parallax-layer'),
    leadForm: document.getElementById('lead-form'),
    formSteps: document.querySelectorAll('.lead-form__step'),
    formNextBtn: document.querySelector('.lead-form__next'),
    formBackBtn: document.querySelector('.lead-form__back'),
    formSuccess: document.querySelector('.lead-form__success'),
    faqItems: document.querySelectorAll('.faq-item'),
    animatedElements: document.querySelectorAll('.problem-card, .step, .benefit-card, .testimonial')
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Check if user prefers reduced motion
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Throttle function execution
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Track analytics event
   */
  function trackEvent(eventName, eventData = {}) {
    // Google Analytics 4
    if (typeof gtag === 'function') {
      gtag('event', eventName, eventData);
    }

    // Console log for debugging (remove in production)
    console.log('Track Event:', eventName, eventData);

    // Custom analytics endpoint (uncomment and configure as needed)
    // fetch('/api/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event: eventName, data: eventData, timestamp: Date.now() })
    // });
  }

  // ==========================================================================
  // Header & Navigation
  // ==========================================================================

  /**
   * Handle header scroll state
   */
  function handleHeaderScroll() {
    if (!DOM.header) return;

    const scrolled = window.scrollY > CONFIG.headerScrollThreshold;
    DOM.header.classList.toggle('header--scrolled', scrolled);
  }

  /**
   * Toggle mobile menu
   */
  function toggleMobileMenu() {
    if (!DOM.menuToggle || !DOM.navList) return;

    const isExpanded = DOM.menuToggle.getAttribute('aria-expanded') === 'true';
    DOM.menuToggle.setAttribute('aria-expanded', !isExpanded);
    DOM.navList.classList.toggle('is-open', !isExpanded);

    // Prevent body scroll when menu is open
    document.body.style.overflow = isExpanded ? '' : 'hidden';
  }

  /**
   * Close mobile menu
   */
  function closeMobileMenu() {
    if (!DOM.menuToggle || !DOM.navList) return;

    DOM.menuToggle.setAttribute('aria-expanded', 'false');
    DOM.navList.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /**
   * Initialize navigation
   */
  function initNavigation() {
    // Mobile menu toggle
    if (DOM.menuToggle) {
      DOM.menuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Close menu on nav link click
    DOM.navLinks.forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (DOM.navList?.classList.contains('is-open') &&
          !e.target.closest('.header__nav') &&
          !e.target.closest('.header__menu-toggle')) {
        closeMobileMenu();
      }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const headerOffset = DOM.header?.offsetHeight || 0;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth'
          });
        }
      });
    });
  }

  // ==========================================================================
  // Parallax Effect
  // ==========================================================================

  /**
   * Update parallax positions
   */
  function updateParallax() {
    if (prefersReducedMotion() || !DOM.parallaxLayers.length) return;

    const scrollY = window.scrollY;

    DOM.parallaxLayers.forEach((layer, index) => {
      const speed = CONFIG.parallaxFactor * (index + 1) * 0.5;
      const yPos = scrollY * speed;
      layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
  }

  // ==========================================================================
  // Lead Form
  // ==========================================================================

  const FormState = {
    currentStep: 1,
    data: {},
    loadedAt: Date.now(),
    lastSubmitAt: 0
  };

  /**
   * Sanitize string input - strip tags and trim
   */
  function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Check honeypot field - returns true if bot is detected
   */
  function isBot() {
    const honeypot = document.getElementById('website');
    return honeypot && honeypot.value.length > 0;
  }

  /**
   * Check if form was filled too quickly (bot behavior)
   */
  function isFilledTooFast() {
    const elapsedSeconds = (Date.now() - FormState.loadedAt) / 1000;
    return elapsedSeconds < CONFIG.formMinTimeSeconds;
  }

  /**
   * Check rate limiting - returns true if rate limited
   */
  function isRateLimited() {
    if (FormState.lastSubmitAt === 0) return false;
    return (Date.now() - FormState.lastSubmitAt) < CONFIG.rateLimitCooldownMs;
  }

  /**
   * Validate form field
   */
  function validateField(field) {
    const value = field.value.trim();
    const errorEl = field.closest('.form-group')?.querySelector('.form-error');

    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (field.required && !value) {
      isValid = false;
      errorMessage = 'Este campo es requerido';
    }

    // Phone validation
    if (field.type === 'tel' && value) {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        isValid = false;
        errorMessage = 'Ingresa un número válido de 10 dígitos';
      }
    }

    // Radio group validation
    if (field.type === 'radio') {
      const radioGroup = field.closest('fieldset');
      const groupName = field.name;
      const isChecked = radioGroup?.querySelector(`input[name="${groupName}"]:checked`);
      if (field.required && !isChecked) {
        isValid = false;
        errorMessage = 'Selecciona una opción';
      }
    }

    // Update UI
    field.classList.toggle('is-invalid', !isValid);
    if (errorEl) {
      errorEl.textContent = errorMessage;
    }

    return isValid;
  }

  /**
   * Validate form step
   */
  function validateStep(stepNumber) {
    const step = document.querySelector(`.lead-form__step[data-step="${stepNumber}"]`);
    if (!step) return false;

    const inputs = step.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
      if (input.type === 'radio') {
        // Only validate once per radio group
        const groupName = input.name;
        const radioGroup = step.querySelector(`input[name="${groupName}"]`);
        if (radioGroup === input) {
          if (!validateField(input)) {
            isValid = false;
          }
        }
      } else {
        if (!validateField(input)) {
          isValid = false;
        }
      }
    });

    return isValid;
  }

  /**
   * Go to form step
   */
  function goToStep(stepNumber) {
    DOM.formSteps.forEach(step => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.toggle('lead-form__step--active', stepNum === stepNumber);
    });

    FormState.currentStep = stepNumber;

    // Focus first input of new step
    const newStep = document.querySelector(`.lead-form__step[data-step="${stepNumber}"]`);
    const firstInput = newStep?.querySelector('input, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  /**
   * Collect form data
   */
  function collectFormData() {
    if (!DOM.leadForm) return {};

    const formData = new FormData(DOM.leadForm);
    const data = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  }

  /**
   * Submit form with security checks and Supabase insert
   */
  async function submitForm() {
    // --- Security checks ---
    if (isBot()) {
      // Silently pretend success to not tip off the bot
      showFormSuccess();
      return;
    }

    if (isFilledTooFast()) {
      showFormSuccess();
      return;
    }

    if (isRateLimited()) {
      alert('Ya enviaste tu solicitud. Por favor espera un momento antes de intentar de nuevo.');
      return;
    }

    // --- Turnstile CAPTCHA check ---
    const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileResponse) {
      alert('Por favor completa la verificación de seguridad.');
      const submitBtn = DOM.leadForm?.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Agendar demo</span>';
      }
      return;
    }

    // --- Collect and sanitize data ---
    const rawData = collectFormData();
    const data = {
      full_name: sanitizeInput(rawData.fullName),
      whatsapp: sanitizeInput(rawData.whatsapp).replace(/\D/g, ''),
      business_name: sanitizeInput(rawData.businessName),
      city: sanitizeInput(rawData.city),
      fulfillment: sanitizeInput(rawData.fulfillment),
      mercado_pago: sanitizeInput(rawData.mercadoPago),
      notes: sanitizeInput(rawData.notes || '')
    };

    // Track form submission
    trackEvent('form_submit', {
      form_name: 'lead_form',
      fulfillment_type: data.fulfillment,
      mercado_pago_interest: data.mercado_pago
    });

    // --- Send to Supabase ---
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { error } = await supabase
        .from('leads')
        .insert([data]);

      if (error) throw error;

      FormState.lastSubmitAt = Date.now();
      showFormSuccess();

    } catch (error) {
      console.error('Form submission error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Error: ' + (error.message || error.details || 'Hubo un error al enviar. Por favor intenta de nuevo.'));
      // Re-enable submit button and reset captcha on error
      const submitBtn = DOM.leadForm?.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Agendar demo</span>';
      }
      if (typeof turnstile !== 'undefined') {
        turnstile.reset();
      }
    }
  }

  /**
   * Show form success state
   */
  function showFormSuccess() {
    DOM.formSteps.forEach(step => step.classList.remove('lead-form__step--active'));
    if (DOM.formSuccess) {
      DOM.formSuccess.hidden = false;
    }
  }

  /**
   * Initialize form
   */
  function initForm() {
    if (!DOM.leadForm) return;

    // Next button
    if (DOM.formNextBtn) {
      DOM.formNextBtn.addEventListener('click', () => {
        if (validateStep(1)) {
          trackEvent('form_step_complete', { step: 1 });
          goToStep(2);
        }
      });
    }

    // Back button
    if (DOM.formBackBtn) {
      DOM.formBackBtn.addEventListener('click', () => {
        goToStep(1);
      });
    }

    // Form submission
    DOM.leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (validateStep(2)) {
        const submitBtn = DOM.leadForm.querySelector('[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Enviando...</span>';
        }
        await submitForm();
      }
    });

    // Real-time validation
    DOM.leadForm.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.classList.contains('is-invalid')) {
          validateField(field);
        }
      });
    });

    // Track form start
    const firstInput = DOM.leadForm.querySelector('input');
    if (firstInput) {
      firstInput.addEventListener('focus', () => {
        trackEvent('form_start', { form_name: 'lead_form' });
      }, { once: true });
    }
  }

  // ==========================================================================
  // Scroll Animations
  // ==========================================================================

  /**
   * Initialize scroll animations with Intersection Observer
   */
  function initScrollAnimations() {
    if (prefersReducedMotion() || !DOM.animatedElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            // Stagger animation
            setTimeout(() => {
              entry.target.classList.add('is-visible');
            }, index * 100);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: CONFIG.intersectionThreshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    DOM.animatedElements.forEach(el => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });
  }

  // ==========================================================================
  // Analytics Tracking
  // ==========================================================================

  /**
   * Initialize click tracking
   */
  function initClickTracking() {
    document.querySelectorAll('[data-track]').forEach(element => {
      element.addEventListener('click', function() {
        const trackId = this.dataset.track;
        trackEvent('cta_click', {
          cta_id: trackId,
          cta_text: this.textContent?.trim()
        });
      });
    });

    // Track WhatsApp clicks separately
    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
      link.addEventListener('click', () => {
        trackEvent('whatsapp_click', {
          location: link.closest('section')?.id || 'unknown'
        });
      });
    });
  }

  // ==========================================================================
  // FAQ Accessibility
  // ==========================================================================

  /**
   * Initialize FAQ keyboard navigation
   */
  function initFAQ() {
    DOM.faqItems.forEach(item => {
      const summary = item.querySelector('summary');
      if (summary) {
        summary.addEventListener('click', () => {
          trackEvent('faq_toggle', {
            question: summary.textContent?.trim().substring(0, 50)
          });
        });
      }
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function init() {
    // Mark JS is enabled for progressive enhancement
    document.documentElement.classList.add('js-enabled');

    // Initialize all modules
    initNavigation();
    initForm();
    initScrollAnimations();
    initClickTracking();
    initFAQ();

    // Scroll handlers
    const throttledScroll = throttle(() => {
      handleHeaderScroll();
      updateParallax();
    }, 16);

    window.addEventListener('scroll', throttledScroll, { passive: true });

    // Initial calls
    handleHeaderScroll();
    updateParallax();

    // Track page view
    trackEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href
    });

    console.log('conR Landing initialized');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
