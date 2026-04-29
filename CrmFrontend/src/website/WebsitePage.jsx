import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/website.css'

export default function WebsitePage() {
  const [navOpen, setNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ro = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            ro.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [])

  const scrollTo = (id) => {
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setNavOpen(false)
  }

  const goToLogin = (event) => {
    event?.preventDefault()
    setNavOpen(false)
    navigate('/crm/login')
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar" ref={navRef}>
        <div className="navbar-inner">
          <div className="navbar-card">
            <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); scrollTo('.hero') }}>
              <div className="nav-logo-mark">J</div>
              <div className="nav-logo-text">Jijau Hospital</div>
            </a>
            <div className={`nav-links${navOpen ? ' open' : ''}`} id="navLinks">
              <a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('#about') }}>About</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>Services</a>
              <a href="#journey" onClick={(e) => { e.preventDefault(); scrollTo('#journey') }}>Patient Care</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features') }}>Features</a>
              <a href="#pregnancy" onClick={(e) => { e.preventDefault(); scrollTo('#pregnancy') }}>Pregnancy</a>
              <a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollTo('#testimonials') }}>Reviews</a>
              <a href="/crm/login" className="nav-cta" onClick={goToLogin}>Book Appointment</a>
            </div>
            <button className="nav-mobile" onClick={() => setNavOpen((v) => !v)}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="hero-badge-dot"></span>
                <span className="hero-badge-text">Specialized Women's Healthcare</span>
                <span className="hero-badge-tag">Latur</span>
              </div>
              <h1>Complete <span className="highlight">Maternity &amp; Gynecology</span> Care You Can Trust</h1>
              <p className="hero-desc">
                From pregnancy tracking to IVF support and routine gynecology — Jijau Hospital delivers expert women's healthcare with automated WhatsApp updates, digital prescriptions, and personalized care plans.
              </p>
              <div className="hero-actions">
                <a href="/crm/login" className="btn-primary" onClick={goToLogin}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Appointment
                </a>
                <a href="https://wa.me/919876543210" className="btn-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                  WhatsApp Us
                </a>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="hero-stat-icon">👶</div>
                  <div>
                    <div className="hero-stat-num">5,000+</div>
                    <div className="hero-stat-label">Deliveries</div>
                  </div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-icon">💗</div>
                  <div>
                    <div className="hero-stat-num">10,000+</div>
                    <div className="hero-stat-label">Patients</div>
                  </div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-icon">⭐</div>
                  <div>
                    <div className="hero-stat-num">15+ Yrs</div>
                    <div className="hero-stat-label">Experience</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-img-container">
                <div className="icon-big">🏥</div>
                <h3>Jijau Hospital</h3>
                <p>Women's Health &amp; Maternity<br />Excellence Centre, Latur</p>
              </div>
              <div className="hero-float-card c1">
                <div className="fc-row">
                  <div className="fc-icon" style={{ background: 'var(--primary-50)' }}>📅</div>
                  <div>
                    <div className="fc-label">Next Appointment</div>
                    <div className="fc-val">Today, 10:30 AM</div>
                  </div>
                </div>
              </div>
              <div className="hero-float-card c2">
                <div className="fc-row">
                  <div className="fc-icon" style={{ background: 'var(--accent-50)' }}>🤰</div>
                  <div>
                    <div className="fc-label">Pregnancy Week</div>
                    <div className="fc-val">Week 24 of 40</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="container">
          <div className="trust-inner">
            <div className="trust-item"><span className="trust-icon">🏆</span> NABH Standards</div>
            <div className="trust-item"><span className="trust-icon">👩‍⚕️</span> Expert Gynecologists</div>
            <div className="trust-item"><span className="trust-icon">📱</span> WhatsApp Integrated</div>
            <div className="trust-item"><span className="trust-icon">🔬</span> In-House Lab</div>
            <div className="trust-item"><span className="trust-icon">🚑</span> 24/7 Emergency</div>
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="container">
          <div className="about-grid">
            <div className="reveal" style={{ position: 'relative' }}>
              <div className="about-img">
                <div className="about-img-inner">
                  <div className="emoji-lg">👩‍⚕️</div>
                  <p>Led by Dr. Monica — Dedicated to women's health for over 15 years</p>
                </div>
              </div>
              <div className="about-exp">
                <div className="about-exp-num">15+</div>
                <div className="about-exp-text">Years of Excellence</div>
              </div>
            </div>
            <div className="reveal">
              <div className="section-header">
                <div className="section-tag">About Our Hospital</div>
                <h2>Modern Healthcare Built Around Women's Needs</h2>
              </div>
              <p className="about-text">
                Jijau Hospital is a specialized gynecology and maternity centre equipped with advanced medical infrastructure. We provide end-to-end care for pregnancy, infertility treatment, gynecological conditions, and minimally invasive surgeries.
              </p>
              <p className="about-text">
                What sets us apart is our technology-driven approach — automated appointment reminders, digital prescriptions, pregnancy tracking via WhatsApp, and instant test report delivery — so you spend less time worrying and more time focusing on your health.
              </p>
              <div className="about-checks">
                {[
                  'Expert Female Gynecologists', 'Modern Operation Theatres',
                  'WhatsApp Health Updates', 'In-House Diagnostic Lab',
                  '24/7 Emergency Services', 'Digital Prescriptions',
                ].map((item) => (
                  <div className="about-check" key={item}>
                    <span className="about-check-icon">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section services-section" id="services">
        <div className="container">
          <div className="section-header center">
            <div className="section-tag">Our Specialties</div>
            <h2>Comprehensive Women's Healthcare Services</h2>
            <p>From routine check-ups to complex procedures — everything under one roof with expert care.</p>
          </div>
          <div className="services-grid">
            {[
              { icon: '🤰', title: 'Pregnancy Care', desc: 'Complete antenatal care with week-by-week tracking, automated milestone reminders, ultrasound scans, and personalized health tips on WhatsApp throughout your pregnancy.', chip: 'Week-wise Tracking' },
              { icon: '🧬', title: 'IVF & Infertility', desc: 'Advanced IVF treatments with complete cycle monitoring — stimulation, follicle tracking, embryo transfer, and result day support. Every step tracked with precision.', chip: 'Full Cycle Support' },
              { icon: '🩺', title: 'Gynecology', desc: 'Expert treatment for PCOS, endometriosis, fibroids, menstrual disorders, and routine screenings. Automated 6-month recall reminders keep your health on track.', chip: 'Preventive Care' },
              { icon: '🔬', title: 'Surgical Procedures', desc: 'Minimally invasive laparoscopic surgeries, hysterectomy, and other gynecological procedures in our modern, well-equipped operation theatres.', chip: 'Minimally Invasive' },
              { icon: '⚠️', title: 'High-Risk Pregnancy', desc: 'Specialized management for gestational diabetes, preeclampsia, and complicated pregnancies with enhanced monitoring, frequent follow-ups, and priority alerts.', chip: 'Enhanced Monitoring' },
              { icon: '👶', title: 'Delivery Services', desc: 'Normal delivery, assisted delivery, and planned C-sections with experienced obstetricians, dedicated labour rooms, NICU backup, and immediate newborn care.', chip: '24/7 Available' },
            ].map((svc) => (
              <div className="svc reveal" key={svc.title}>
                <div className="svc-icon">{svc.icon}</div>
                <h3>{svc.title}</h3>
                <p>{svc.desc}</p>
                <span className="svc-chip">{svc.chip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="section" id="journey">
        <div className="container">
          <div className="section-header center">
            <div className="section-tag">Patient Journey</div>
            <h2>How Patients Get Treated at Jijau Hospital</h2>
            <p>A streamlined, digital-first process from registration to recovery — every step is organized and communicated.</p>
          </div>
          <div className="j-steps">
            {[
              { n: '1', title: 'Registration', desc: 'Quick digital registration at reception. Unique patient ID and instant WhatsApp confirmation. No long queues.' },
              { n: '2', title: 'Doctor Consultation', desc: 'Doctor reviews history, conducts examination, assigns care category, orders tests, and creates your treatment plan.' },
              { n: '3', title: 'Treatment & Tracking', desc: 'Your journey tracked digitally. Milestones, test reports, prescriptions — everything monitored with WhatsApp alerts.' },
              { n: '4', title: 'Follow-up & Recovery', desc: 'Auto-scheduled follow-ups, test reports on WhatsApp, digital prescriptions, and ongoing health monitoring.' },
            ].map((step) => (
              <div className="j-step reveal" key={step.n}>
                <div className="j-num">{step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section feat-section" id="features">
        <div className="container">
          <div className="section-header center">
            <div className="section-tag">What Makes Us Different</div>
            <h2>Technology-Powered Patient Care</h2>
            <p>Smart automation meets compassionate healthcare — so you focus on health while we handle everything else.</p>
          </div>
          <div className="feat-grid">
            {[
              { icon: '📲', title: 'WhatsApp Updates', desc: 'Appointment confirmations, test reports, pregnancy tips, and medication reminders — all sent to your WhatsApp in English or Marathi.' },
              { icon: '🗓️', title: 'Smart Appointments', desc: 'Easy booking with automatic 24-hour and 2-hour reminders. Missed your visit? We follow up to reschedule so you never miss critical care.' },
              { icon: '💊', title: 'Digital Prescriptions', desc: 'Prescriptions generated digitally with medicine details and instructions. PDF sent to your WhatsApp instantly — no more losing paper slips.' },
              { icon: '📄', title: 'Test Report Delivery', desc: 'Doctor orders a test, results get uploaded and reviewed, then sent straight to your WhatsApp. No visits needed just to collect reports.' },
              { icon: '📊', title: 'Complete Health Timeline', desc: 'Every consultation, prescription, test, and follow-up is recorded in your health timeline — giving doctors your full picture at every visit.' },
              { icon: '🌐', title: 'Bilingual Support', desc: 'All communications, prescriptions, and health tips available in English and Marathi — making healthcare comfortable for every patient.' },
            ].map((f) => (
              <div className="feat reveal" key={f.title}>
                <span className="feat-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREGNANCY */}
      <section className="section" id="pregnancy">
        <div className="container">
          <div className="trk-grid">
            <div className="reveal">
              <div className="section-header">
                <div className="section-tag">Pregnancy Tracking</div>
                <h2>Your Pregnancy, Tracked Week by Week</h2>
              </div>
              <p className="trk-desc">
                When you register your pregnancy, our system auto-calculates your delivery date, schedules all milestone check-ups, and sends timely reminders plus weekly health tips — so you never miss an important scan or test.
              </p>
              <div className="milestones">
                {[
                  { w: '8', title: 'First Check-up', desc: 'Initial examination, blood tests, and early ultrasound' },
                  { w: '12', title: 'NT Scan', desc: 'Nuchal translucency scan for genetic screening' },
                  { w: '20', title: 'Anomaly Scan', desc: 'Detailed anatomy scan to check baby\'s development' },
                  { w: '28', title: 'Glucose Test', desc: 'Gestational diabetes screening and routine blood work' },
                  { w: '36', title: 'Delivery Prep', desc: 'Birth plan, bag checklist, and final preparations' },
                ].map((ms) => (
                  <div className="ms" key={ms.w}>
                    <div className="ms-badge">
                      <span className="ms-num">{ms.w}</span>
                      <span className="ms-lbl">Week</span>
                    </div>
                    <div className="ms-info">
                      <h4>{ms.title}</h4>
                      <p>{ms.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal">
              <div className="phone">
                <div className="phone-scr">
                  <div className="phone-hdr">
                    <div className="phone-hdr-top">
                      <div className="phone-hdr-logo">J</div>
                      <div>
                        <h4>Jijau Hospital</h4>
                        <p>Pregnancy Tracker</p>
                      </div>
                    </div>
                  </div>
                  <div className="phone-body">
                    <div className="phone-ring">
                      <div className="phone-ring-inner">
                        <span className="n">24</span>
                        <span className="t">Weeks</span>
                      </div>
                    </div>
                    {[
                      ['Patient', 'Anita Patil'],
                      ['MR Number', 'JH-0247'],
                      ['LMP Date', '12 Sep 2025'],
                      ['Expected Delivery', '19 Jun 2026'],
                      ['Blood Group', 'B+'],
                      ['Next Visit', '28 Mar 2026'],
                    ].map(([l, v]) => (
                      <div className="phone-row" key={l}>
                        <span className="l">{l}</span>
                        <span className="v">{v}</span>
                      </div>
                    ))}
                    <div className="phone-alert">🔔 Upcoming: Week 28 Glucose Test — 6 Apr 2026</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section test-section" id="testimonials">
        <div className="container">
          <div className="section-header center">
            <div className="section-tag">Patient Reviews</div>
            <h2>Trusted by Thousands of Mothers</h2>
            <p>Real stories from real patients who experienced our care.</p>
          </div>
          <div className="test-grid">
            {[
              { initial: 'A', name: 'Anita P.', detail: 'Normal Delivery, 2025', text: 'The pregnancy tracking was incredible. I got WhatsApp reminders for every scan and check-up. The weekly health tips in Marathi were so helpful — I never felt lost during my entire pregnancy.' },
              { initial: 'K', name: 'Kavita R.', detail: 'IVF Success, 2025', text: 'After two failed IVF attempts elsewhere, Jijau Hospital gave us hope. Dr. Monica tracked every follicle scan, every hormone level. The day we got our positive result — we couldn\'t stop crying.' },
              { initial: 'S', name: 'Sunita D.', detail: 'Gynecology Patient', text: 'I love that my test reports come directly on WhatsApp. No more visiting just for reports. The digital prescription is super convenient — I just show my phone to the pharmacist.' },
            ].map((t) => (
              <div className="tcard reveal" key={t.name}>
                <div className="tcard-stars">★★★★★</div>
                <p className="tcard-text">{t.text}</p>
                <div className="tcard-author">
                  <div className="tcard-avatar">{t.initial}</div>
                  <div>
                    <div className="tcard-name">{t.name}</div>
                    <div className="tcard-detail">{t.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="contact">
        <div className="container">
          <div className="cta-card reveal">
            <h2>Ready to Experience Better Healthcare?</h2>
            <p>Book an appointment today and see how Jijau Hospital combines expert medical care with smart technology.</p>
            <div className="cta-btns">
              <a href="tel:+919876543210" className="btn-w">📞 Call Now</a>
              <a href="https://wa.me/919876543210" className="btn-g">💬 WhatsApp Us</a>
            </div>
            <div className="cta-details">
              <div className="cta-d">
                <div className="cta-d-icon">📍</div>
                <div className="cta-d-val">Latur, Maharashtra</div>
                <div className="cta-d-lbl">Main Hospital</div>
              </div>
              <div className="cta-d">
                <div className="cta-d-icon">🕐</div>
                <div className="cta-d-val">Mon – Sat, 9 AM – 8 PM</div>
                <div className="cta-d-lbl">OPD Timings</div>
              </div>
              <div className="cta-d">
                <div className="cta-d-icon">🚑</div>
                <div className="cta-d-val">24/7 Emergency</div>
                <div className="cta-d-lbl">Always Available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="ft-top">
            <div className="ft-brand">
              <div className="ft-logo">
                <div className="ft-logo-mark">J</div>
                <div className="ft-logo-text">Jijau Hospital</div>
              </div>
              <p>Specialized gynecology and maternity hospital providing compassionate, technology-powered women's healthcare in Latur, Maharashtra.</p>
              <div className="ft-socials">
                <a href="#">📘</a>
                <a href="#">📸</a>
                <a href="#">▶️</a>
                <a href="#">💬</a>
              </div>
            </div>
            <div className="ft-col">
              <h4>Services</h4>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>Pregnancy Care</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>IVF &amp; Infertility</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>Gynecology</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>Surgeries</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>High-Risk Pregnancy</a>
              <a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>Delivery Services</a>
            </div>
            <div className="ft-col">
              <h4>For Patients</h4>
              <a href="#journey" onClick={(e) => { e.preventDefault(); scrollTo('#journey') }}>How It Works</a>
              <a href="#pregnancy" onClick={(e) => { e.preventDefault(); scrollTo('#pregnancy') }}>Pregnancy Tracker</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features') }}>WhatsApp Updates</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features') }}>Digital Prescriptions</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features') }}>Test Reports</a>
              <a href="/crm/login" onClick={goToLogin}>Book Appointment</a>
            </div>
            <div className="ft-col">
              <h4>Contact Us</h4>
              <a href="tel:+919876543210">📞 +91 98765 43210</a>
              <a href="mailto:care@jijauhospital.com">✉️ care@jijauhospital.com</a>
              <a href="#">📍 Latur, Maharashtra</a>
              <a href="#">🕐 Mon–Sat, 9 AM – 8 PM</a>
            </div>
          </div>
          <div className="ft-bottom">
            <span>© 2026 Jijau Hospital. All rights reserved.</span>
            <span>Women's Health &amp; Maternity Excellence Centre</span>
          </div>
        </div>
      </footer>
    </>
  )
}
