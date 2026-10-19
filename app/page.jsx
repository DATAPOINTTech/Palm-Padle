"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  Info,
  CalendarCheck2,
  Lock,
  LogOut,
  QrCode,
  Smartphone,
  X,
  Play,
  Square,
  AlertTriangle,
  Search,
  ScanLine,
  Timer,
  PlusCircle,
  Menu,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { saveBookingToFirebase, fetchDailyReportFromFirebase, markBookingUtilized, startBookingSession, verifyAdminPassword, changeAdminPassword, cancelBookingInFirebase } from '../lib/firebase';

export default function PadelBookingApp() {
  // Brand Rates & Add-on Constants
  const RATES = {
    resident: 1200,
    outsider: 2000,
  };
  const RACKET_PRICE = 200;
  const BALLS_PRICE = 500;

  const ALL_TIME_SLOTS = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
    '09:00 PM', '10:00 PM'
  ];

  const getTodayISO = () => {
      const offset = new Date().getTimezoneOffset() * 60000;
      return new Date(Date.now() - offset).toISOString().split('T')[0];
  };

  const [currentView, setCurrentView] = useState('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [type, setType] = useState('resident');
  const [verification, setVerification] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('+92 ');
  const [email, setEmail] = useState('');
  const [players, setPlayers] = useState('2');
  const [rackets, setRackets] = useState(0);
  const [balls, setBalls] = useState(0);

  const [formError, setFormError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingRef, setBookingRef] = useState('78412');

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminDate, setAdminDate] = useState(getTodayISO());
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [scannerInput, setScannerInput] = useState('');
  const [scanMessage, setScanMessage] = useState(null);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  const [adminBookings, setAdminBookings] = useState([]);
  const [adminIncome, setAdminIncome] = useState(0);

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('Walk-in Customer');
  const [walkInPhone, setWalkInPhone] = useState('+92 ');
  const [walkInSlot, setWalkInSlot] = useState('');
  const [walkInAmount, setWalkInAmount] = useState('2000');

  const [todayBookings, setTodayBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const loadAdminData = async (d) => {
    const report = await fetchDailyReportFromFirebase(d);
    setAdminBookings(report.bookings || []);
    setAdminIncome(report.totalIncome || 0);
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAdminData(adminDate);
    }
  }, [adminDate, isAdminAuthenticated]);

  // Load public availability slots
  useEffect(() => {
    const fetchToday = async () => {
      const report = await fetchDailyReportFromFirebase(getTodayISO());
      setTodayBookings(report.bookings || []);
    };
    fetchToday();
  }, [currentView, showConfirmation]);

  useEffect(() => {
    const fetchDate = async () => {
      if (!date) return;
      const report = await fetchDailyReportFromFirebase(date);
      setFilteredBookings(report.bookings || []);
    };
    fetchDate();
  }, [date, currentView, showConfirmation]);


  const minDate = useMemo(() => getTodayISO(), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    const daysToAdd = type === 'resident' ? 7 : 3;
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  }, [type]);

  const todaySlots = useMemo(() => {
      return ALL_TIME_SLOTS.map((t) => {
          const booking = todayBookings.find(b => b.timeSlot === t && b.status !== 'utilized');
          return { time: t, booked: !!booking, status: booking ? booking.status : 'available' };
      });
  }, [todayBookings]);

  const filteredSlots = useMemo(() => {
      if (!date) return [];
      return ALL_TIME_SLOTS.map((t) => {
          const booking = filteredBookings.find(b => b.timeSlot === t && b.status !== 'utilized');
          return { time: t, booked: !!booking, status: booking ? booking.status : 'available' };
      });
  }, [date, filteredBookings]);

  const adminWalkInSlots = useMemo(() => {
      return ALL_TIME_SLOTS.map((t) => {
          const booking = adminBookings.find(b => b.timeSlot === t && b.status !== 'utilized');
          return { time: t, booked: !!booking };
      });
  }, [adminBookings]);

  const courtFee = RATES[type];
  const addonsFee = (rackets * RACKET_PRICE) + (balls * BALLS_PRICE);
  const totalAmount = courtFee + addonsFee;

  const handlePackageChange = (newType) => {
    setType(newType);
    setSlot('');
    const d = new Date();
    const daysToAdd = newType === 'resident' ? 7 : 3;
    d.setDate(d.getDate() + daysToAdd);
    const maxIso = d.toISOString().split('T')[0];
    if (date > maxIso) {
      setDate(getTodayISO());
    }
  };

  const handleQuickBook = (timeSlot) => {
    setDate(getTodayISO());
    setSlot(timeSlot);
    setCurrentView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    setFormError('');
    if (type === 'resident' && !verification.trim()) {
      setFormError('Please enter your Villa / Apartment Number.');
      return;
    }
    if (!date) return setFormError('Please select a booking date.');
    if (!slot) return setFormError('Please select an available 1-hour time slot.');
    if (!nic.trim()) return setFormError('Please enter your CNIC / Resident ID number.');
    if (!name.trim() || phone.trim().length < 8) return setFormError('Please enter your full name and a valid WhatsApp phone number.');

    const newRef = Math.floor(10000 + Math.random() * 90000).toString();
    setBookingRef(newRef);

    const userPayload = {
        name, nic, whatsappNumber: phone, email: email || '',
        villaNumber: type === 'resident' ? verification : 'N/A', type
    };

    const bookingPayload = {
        bookingReference: `PV-${newRef}`,
        packageType: type,
        bookingDate: date,
        timeSlot: slot,
        numberOfPlayers: players,
        addons: { rackets, balls },
        financials: { courtFee, addonsFee, totalPaid: totalAmount },
        sessionDurationMinutes: 60
    };

    const success = await saveBookingToFirebase(bookingPayload, userPayload);
    if(success) {
        setShowConfirmation(true);
    } else {
        setFormError("Failed to save booking. Please try again.");
    }
  };

  const handleOpenWhatsApp = () => {
    const typeDisplay = type === 'resident' ? 'Palm Resident' : 'Guest / Outsider';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PV-${bookingRef}`;

    const msg =
`🎾 *THE PALM VILLAGE - PADEL CLUB RESERVATION*

Assalam-o-Alaikum / Hello ${name},
Your padel court reservation has been confirmed!

📅 *Date:* ${date}
⏰ *Slot:* ${slot} (1 Hour)
🏷️ *Package:* ${typeDisplay}
💰 *Total Amount:* Rs. ${totalAmount}
📍 *Venue:* Court 1, Palm Village Sports Facility
🔖 *Booking Reference:* #PV-${bookingRef}

📱 *DIGITAL PASS & CHECK-IN QR CODE:*
Present this QR pass to the reception upon arrival to activate your 60-minute court timer:
${qrCodeUrl}

*Walk-in Policy:* If the QR pass is not scanned within 15 minutes of slot time, the court may be reassigned.
For instant queries, contact DATAPOINT AI Reception at 03712566540.`;

    const encodedMsg = encodeURIComponent(msg);
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    setShowConfirmation(false);
    setCurrentView('landing');
  };

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    const pwd = adminPasswordInput.trim();
    const isValid = await verifyAdminPassword(pwd);
    if (isValid) {
      setIsAdminAuthenticated(true);
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
      setAdminAuthError('');
      setCurrentView('admin');
    } else {
      setAdminAuthError('Incorrect Password. Please try again.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if(!newPasswordInput.trim()) return;
    const success = await changeAdminPassword(newPasswordInput.trim());
    if (success) {
        alert("Admin Password has been successfully updated!");
        setShowPasswordModal(false);
        setNewPasswordInput('');
    } else {
        alert("Failed to update password. Please check your connection.");
    }
  };

  const handleCheckInByRef = async (refToFind) => {
    setScanMessage(null);
    const cleanRef = refToFind.trim().toUpperCase().replace('#', '');
    const targetRef = cleanRef.startsWith('PV-') ? cleanRef : `PV-${cleanRef}`;

    const foundBooking = adminBookings.find(b => b.bookingReference === targetRef);

    if (!foundBooking) {
      setScanMessage({ type: 'error', text: `No booking found for reference "${refToFind}". Please check the code.` });
      return;
    }

    if (foundBooking.status === 'active') return setScanMessage({ type: 'warning', text: `Booking is already checked in and running!` });
    if (foundBooking.status === 'utilized') return setScanMessage({ type: 'error', text: `Booking has already expired or ended.` });

    const success = await startBookingSession(foundBooking.docId);
    if(success) {
        setScanMessage({ type: 'success', text: `✅ Checked in ${foundBooking.customerName}. 60-Minute Court Timer is now ACTIVE!` });
        setScannerInput('');
        loadAdminData(adminDate);
    }
  };

  const handleEndSession = async (docId) => {
      const success = await markBookingUtilized(docId);
      if(success) loadAdminData(adminDate);
  };

  const handleCancelBooking = async (docId) => {
      if(confirm("Are you sure you want to cancel and delete this booking?")) {
          const success = await cancelBookingInFirebase(docId);
          if(success) {
              loadAdminData(adminDate);
              // Trigger a re-render for today's slots if it affects today
              if (adminDate === getTodayISO()) {
                 const report = await fetchDailyReportFromFirebase(getTodayISO());
                 setTodayBookings(report.bookings || []);
              }
          }
      }
  };

  const handleWalkInSubmit = async (e) => {
      e.preventDefault();
      if(!walkInSlot) return alert("Please select an available time slot for the Walk-in booking.");

      const newRef = Math.floor(10000 + Math.random() * 90000).toString();
      const payload = {
          bookingReference: `PV-W-${newRef}`,
          packageType: 'outsider',
          bookingDate: adminDate,
          timeSlot: walkInSlot,
          numberOfPlayers: '2',
          addons: { rackets: 0, balls: 0 },
          financials: { courtFee: parseInt(walkInAmount) || 0, addonsFee: 0, totalPaid: parseInt(walkInAmount) || 0 },
          sessionDurationMinutes: 60
      };

      const userPayload = {
          name: walkInName, nic: 'WALK-IN', whatsappNumber: walkInPhone, email: '', villaNumber: 'N/A', type: 'outsider'
      };

      const success = await saveBookingToFirebase(payload, userPayload);
      if(success) {
          setShowWalkInModal(false);
          setWalkInSlot('');
          loadAdminData(adminDate);

          if (adminDate === getTodayISO()) {
             const report = await fetchDailyReportFromFirebase(getTodayISO());
             setTodayBookings(report.bookings || []);
          }
      } else {
          alert("Failed to create Walk-in booking.");
      }
  };

  const activeSessions = useMemo(() => {
    return adminBookings.filter(b => b.status === 'active');
  }, [adminBookings]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-[#0f4c3a] selection:text-white">

      <header className="bg-white shadow-md border-b-4 border-[#0f4c3a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center relative">

          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => { setCurrentView('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-[#d4af37] bg-[#0f4c3a] flex items-center justify-center text-[#d4af37] shadow-md flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8 2 4 6 4 10c0 3 1.5 5.5 4 7l-2 5h4l1-3h2l1 3h4l-2-5c2.5-1.5 4-4 4-7 0-4-4-8-8-8z" />
                <circle cx="12" cy="9" r="1.5" fill="currentColor" />
              </svg>
            </div>

            <div className="flex flex-col ml-1 border-l-2 border-[#d4af37] pl-3">
              <h1 className="font-extrabold text-xl sm:text-2xl text-[#0f4c3a] tracking-tight leading-none uppercase">
                PALM VILLAGE
              </h1>
              <span className="font-bold text-base sm:text-lg text-[#d4af37] tracking-widest leading-none mt-1 uppercase">
                PADEL CLUB
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => { setCurrentView('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`font-bold transition text-sm ${currentView === 'landing' ? 'text-[#0f4c3a] border-b-2 border-[#0f4c3a] pb-0.5' : 'text-slate-600 hover:text-[#0f4c3a]'}`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('about-us-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-slate-600 hover:text-[#0f4c3a] font-bold transition text-sm"
            >
              About Club
            </button>
            <button
              onClick={() => {
                if (isAdminAuthenticated) setCurrentView('admin');
                else setShowAdminLoginModal(true);
              }}
              className={`font-bold transition text-sm flex items-center space-x-1.5 ${currentView === 'admin' ? 'text-[#0066FF] border-b-2 border-[#0066FF] pb-0.5' : 'text-slate-600 hover:text-[#0066FF]'}`}
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Admin & QR Scan</span>
              {activeSessions.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-black animate-pulse">
                  {activeSessions.length} Live
                </span>
              )}
            </button>
          </nav>

          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-4 pr-6 border-r border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Courts Open 06:00 AM - 11:00 PM
              </span>
            </div>

            <button
              onClick={() => { setCurrentView('booking'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="bg-[#0f4c3a] hover:bg-[#0a3629] text-white px-6 py-2.5 rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5 border border-[#0f4c3a] flex items-center space-x-2 text-sm"
            >
              <CalendarCheck2 className="w-4 h-4 text-[#d4af37]" />
              <span>Book Court</span>
            </button>
          </div>

          <div className="md:hidden flex items-center space-x-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-800 p-1 rounded-lg focus:outline-none">
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-xl px-5 py-5 space-y-4">
            <button onClick={() => { setCurrentView('landing'); setMobileMenuOpen(false); }} className="w-full text-left font-bold text-slate-800 pb-2 border-b border-slate-100">Home</button>
            <button onClick={() => {
                setMobileMenuOpen(false);
                if (isAdminAuthenticated) setCurrentView('admin'); else setShowAdminLoginModal(true);
              }} className="w-full text-left font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center"><Lock className="w-4 h-4 mr-2 text-slate-500" /> Admin / QR Check-in</span>
            </button>
            <button onClick={() => { setCurrentView('booking'); setMobileMenuOpen(false); }} className="w-full py-3 rounded-xl bg-[#0f4c3a] text-white font-bold flex items-center justify-center space-x-2 shadow-md">
              <CalendarCheck2 className="w-4 h-4 text-[#d4af37]" /><span>Book Court Now</span>
            </button>
          </div>
        )}
      </header>

      <div className="w-full flex justify-center max-w-[1400px] mx-auto relative gap-6 px-3 sm:px-6">

        <main className="flex-grow w-full max-w-4xl py-6 mb-12">

          {currentView === 'landing' && (
            <div className="space-y-8 animate-fadeIn">

              <div className="bg-gradient-to-r from-[#0f4c3a] to-[#0a3629] rounded-2xl shadow-md p-6 text-white flex flex-col sm:flex-row items-center justify-between border-l-4 border-[#d4af37]">
                <div className="flex items-center mb-4 sm:mb-0">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <CalendarIcon className="w-6 h-6 text-[#d4af37]" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl leading-tight">Advance Booking Available</h3>
                    <p className="text-sm text-green-100 mt-1">Residents book up to 7 days in advance. Guests up to 3 days.</p>
                  </div>
                </div>
                <button onClick={() => { setCurrentView('booking'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full sm:w-auto bg-[#d4af37] hover:bg-yellow-500 text-[#0a3629] font-black text-base px-8 py-3 rounded-xl shadow-md transition transform hover:-translate-y-0.5 whitespace-nowrap">
                  Book Future Date
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 relative z-10">
                  <div className="mb-3 sm:mb-0">
                    <h2 className="text-3xl font-black text-[#0f4c3a]">Today's Free Slots</h2>
                    <p className="text-slate-500 mt-1 text-sm">Select an available time to book instantly</p>
                  </div>
                  <div className="text-sm font-bold text-[#d4af37] bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                  {todaySlots.map((s) => (
                    <button
                      key={s.time}
                      disabled={s.booked}
                      onClick={() => handleQuickBook(s.time)}
                      className={`py-4 px-2 rounded-2xl border-2 font-bold transition-all duration-200 flex flex-col items-center justify-center space-y-1 ${
                        s.status === 'active'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed shadow-sm'
                          : s.booked
                          ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                          : 'bg-white border-[#0f4c3a]/25 text-[#0f4c3a] hover:bg-[#0f4c3a] hover:text-white hover:shadow-md transform hover:-translate-y-0.5'
                      }`}
                    >
                      <span className="text-base sm:text-lg font-black">{s.time}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold flex items-center ${
                        s.status === 'active' ? 'text-emerald-600' : s.booked ? 'text-slate-400 line-through' : 'text-[#d4af37]'
                      }`}>
                        {s.status === 'active' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />}
                        {s.status === 'active' ? 'Live Match' : s.booked ? 'Booked' : 'Available'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div id="about-us-section" className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 lg:p-10">
                <div className="inline-block bg-emerald-50 px-4 py-1.5 rounded-full text-[#0f4c3a] font-bold text-xs tracking-widest mb-4 w-max border border-emerald-100 uppercase">OUR STORY & PHILOSOPHY</div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 leading-tight">Redefining Sports & Premium Community Living</h3>
                <div className="space-y-4 text-slate-600 leading-relaxed text-sm sm:text-base">
                  <p>Founded in 2015 in Hyderabad, Pakistan, <strong className="text-[#0f4c3a] font-bold">The Palm Builders & Developers</strong> is synonymous with trust, vision, and uncompromising quality.</p>
                  <p>Our brand philosophy is simple: <em className="text-[#d4af37] font-semibold">"Trust is the true foundation of real estate."</em> We are committed to making top-tier living and sports facilities accessible, featuring world-class Padel courts, professional-grade turf, and automated digital check-in to elevate your sporting experience.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><div className="text-[#0f4c3a] font-black text-xl mb-1">Court 1 & 2</div><div className="text-xs text-slate-500 font-medium">Panoramic Tempered Glass & International Turf</div></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><div className="text-[#0f4c3a] font-black text-xl mb-1">Smart Gate Pass</div><div className="text-xs text-slate-500 font-medium">Instant WhatsApp QR Code & Live Court Timer</div></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><div className="text-[#0f4c3a] font-black text-xl mb-1">Pro Rentals</div><div className="text-xs text-slate-500 font-medium">Carbon Padel Rackets & Dunlop Pro Ball Cans</div></div>
                </div>
              </div>

            </div>
          )}

          {currentView === 'booking' && (
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fadeIn">

              <div className="bg-slate-50 p-6 sm:px-10 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-[#0f4c3a]">Court Reservation</h2>
                  <p className="text-slate-500 mt-1 text-sm">Select package, choose time slot, and secure your pass</p>
                </div>
                <button onClick={() => setCurrentView('landing')} className="text-slate-600 hover:text-[#0f4c3a] bg-white border border-slate-300 shadow-sm font-semibold flex items-center space-x-2 px-5 py-2.5 rounded-xl transition duration-200 hover:shadow-md text-sm">
                  <ChevronRight className="w-4 h-4 rotate-180" /><span>Back to Home</span>
                </button>
              </div>

              <div className="p-6 sm:p-10 space-y-10">

                {formError && (<div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0 text-rose-500" /><span>{formError}</span></div>)}

                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center"><span className="bg-[#0f4c3a] text-white rounded-lg w-8 h-8 flex items-center justify-center text-sm mr-3 shadow-md font-bold">1</span>Select Package</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <button type="button" onClick={() => handlePackageChange('resident')} className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group overflow-hidden ${type === 'resident' ? 'border-[#0f4c3a] bg-emerald-50/50 shadow-inner' : 'border-slate-200 bg-white hover:border-[#0f4c3a] hover:shadow-md'}`}>
                      <div className="font-black text-xl text-slate-800 group-hover:text-[#0f4c3a]">Palm Resident</div>
                      <div className="text-base text-slate-600 mt-1 font-semibold">Rs. 1,200 / hr</div>
                      <div className="text-xs text-[#d4af37] font-bold mt-3 uppercase tracking-wider flex items-center"><CalendarIcon className="w-4 h-4 mr-1 text-[#d4af37]" /> 7 Days Advance Booking</div>
                      {type === 'resident' && (<div className="absolute top-6 right-6 text-[#0f4c3a]"><CheckCircle className="w-7 h-7" /></div>)}
                    </button>
                    <button type="button" onClick={() => handlePackageChange('outsider')} className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group overflow-hidden ${type === 'outsider' ? 'border-[#0f4c3a] bg-emerald-50/50 shadow-inner' : 'border-slate-200 bg-white hover:border-[#0f4c3a] hover:shadow-md'}`}>
                      <div className="font-black text-xl text-slate-800 group-hover:text-[#0f4c3a]">Guest / Outsider</div>
                      <div className="text-base text-slate-600 mt-1 font-semibold">Rs. 2,000 / hr</div>
                      <div className="text-xs text-slate-500 font-bold mt-3 uppercase tracking-wider flex items-center"><CalendarIcon className="w-4 h-4 mr-1 text-slate-400" /> 3 Days Advance Booking</div>
                      {type === 'outsider' && (<div className="absolute top-6 right-6 text-[#0f4c3a]"><CheckCircle className="w-7 h-7" /></div>)}
                    </button>
                  </div>
                  {type === 'resident' && (
                    <div className="mt-5 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Villa / Apartment Number <span className="text-rose-500">*</span></label>
                      <input type="text" value={verification} onChange={(e) => setVerification(e.target.value)} placeholder="e.g. Villa 42, Block B" className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none transition shadow-sm text-sm" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center"><span className="bg-[#0f4c3a] text-white rounded-lg w-8 h-8 flex items-center justify-center text-sm mr-3 shadow-md font-bold">2</span>Date & Time</h3>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                    <input type="date" value={date} min={minDate} max={maxDate} onChange={(e) => { setDate(e.target.value); setSlot(''); }} className="w-full md:w-1/2 p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none transition shadow-sm font-medium text-slate-700 text-sm" />
                  </div>
                  {date && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">Available Slots (1-Hour)</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {filteredSlots.map((s) => (
                          <button
                            key={s.time}
                            disabled={s.booked}
                            onClick={() => !s.booked && setSlot(s.time)}
                            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border flex flex-col items-center justify-center space-y-1 ${
                              s.status === 'active'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed'
                                : s.booked
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                : slot === s.time
                                ? 'bg-[#0f4c3a] text-white border-[#0f4c3a] shadow-md transform scale-105'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-[#0f4c3a] hover:text-[#0f4c3a] hover:shadow-sm'
                            }`}
                          >
                            <span>{s.time}</span>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold flex items-center ${
                              s.status === 'active' ? 'text-emerald-600' : s.booked ? 'text-slate-400 line-through' : slot === s.time ? 'text-white' : 'text-[#d4af37]'
                            }`}>
                              {s.status === 'active' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse" />}
                              {s.status === 'active' ? 'Live' : s.booked ? 'Booked' : 'Available'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center"><span className="bg-[#0f4c3a] text-white rounded-lg w-8 h-8 flex items-center justify-center text-sm mr-3 shadow-md font-bold">3</span>Player Details & Add-ons</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Full Name <span className="text-rose-500">*</span></label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none shadow-sm transition text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">CNIC / Resident ID <span className="text-rose-500">*</span></label>
                      <input type="text" value={nic} onChange={(e) => setNic(e.target.value)} placeholder="41302-xxxxxxx-x" className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none shadow-sm transition text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp Number <span className="text-rose-500">*</span></label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none shadow-sm transition text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Email Address (Optional)</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none shadow-sm transition text-sm font-medium" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Number of Players</label>
                      <select value={players} onChange={(e) => setPlayers(e.target.value)} className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0f4c3a] focus:border-[#0f4c3a] outline-none shadow-sm transition text-sm font-medium">
                        <option value="2">2 Players (Singles)</option><option value="3">3 Players</option><option value="4">4 Players (Doubles)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center">Optional Equipment Rental</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div><div className="font-bold text-slate-800 text-sm sm:text-base">Racket Rental</div><div className="text-xs sm:text-sm text-slate-500 font-medium">Rs. 200 / racket</div></div>
                        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-lg p-1">
                          <button type="button" onClick={() => setRackets(Math.max(0, rackets - 1))} className="w-8 h-8 rounded-md bg-white text-slate-600 shadow-sm flex items-center justify-center font-bold hover:text-[#0f4c3a]">-</button>
                          <span className="w-5 text-center font-bold text-slate-800 text-sm">{rackets}</span>
                          <button type="button" onClick={() => setRackets(Math.min(4, rackets + 1))} className="w-8 h-8 rounded-md bg-white text-slate-600 shadow-sm flex items-center justify-center font-bold hover:text-[#0f4c3a]">+</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div><div className="font-bold text-slate-800 text-sm sm:text-base">Padel Balls Can</div><div className="text-xs sm:text-sm text-slate-500 font-medium">Rs. 500 / can of 3</div></div>
                        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-lg p-1">
                          <button type="button" onClick={() => setBalls(Math.max(0, balls - 1))} className="w-8 h-8 rounded-md bg-white text-slate-600 shadow-sm flex items-center justify-center font-bold hover:text-[#0f4c3a]">-</button>
                          <span className="w-5 text-center font-bold text-slate-800 text-sm">{balls}</span>
                          <button type="button" onClick={() => setBalls(Math.min(5, balls + 1))} className="w-8 h-8 rounded-md bg-white text-slate-600 shadow-sm flex items-center justify-center font-bold hover:text-[#0f4c3a]">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="bg-[#0f4c3a] p-6 sm:p-10 border-t border-[#0a3629]">
                <div className="max-w-xl mx-auto">
                  <h3 className="text-2xl font-black mb-6 flex items-center text-[#d4af37] justify-center">Booking Summary</h3>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 text-white">
                    <div className="space-y-4 text-sm sm:text-base font-medium">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10"><span className="text-green-50">Court Fee (1 Hour)</span><span className="font-bold text-lg font-mono">Rs. {courtFee.toLocaleString()}</span></div>
                      {rackets > 0 && (<div className="flex justify-between items-center pb-3 border-b border-white/10"><span className="text-green-50">Rackets ({rackets} × Rs. 200)</span><span className="font-bold text-lg font-mono">Rs. {(rackets * 200).toLocaleString()}</span></div>)}
                      {balls > 0 && (<div className="flex justify-between items-center pb-3 border-b border-white/10"><span className="text-green-50">Balls ({balls} × Rs. 500)</span><span className="font-bold text-lg font-mono">Rs. {(balls * 500).toLocaleString()}</span></div>)}
                      <div className="pt-2 flex justify-between items-end"><span className="text-[#d4af37] uppercase tracking-widest font-black text-sm">Total Payable</span><span className="text-4xl font-black text-white font-mono">Rs. {totalAmount.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <button type="button" onClick={handleConfirmBooking} className="w-full bg-[#d4af37] hover:bg-yellow-500 text-[#0a3629] font-black tracking-widest text-xl py-5 rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.99]">CONFIRM & GET PASS</button>
                </div>
              </div>

            </div>
          )}

          {currentView === 'admin' && isAdminAuthenticated && (
            <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">

              <div className="bg-[#0B172A] p-6 sm:px-8 border-b-2 border-[#0066FF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 bg-[#0066FF] text-white text-xs font-black rounded-lg uppercase tracking-wider">Management Portal</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">Palm Village Control Center</h2>
                  </div>
                  <p className="text-blue-200 mt-1 text-sm font-medium">QR Check-In System, Live 60-Minute Court Timers & Financial Reports</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 mt-4 sm:mt-0">
                  <button onClick={() => setShowWalkInModal(true)} className="text-white hover:text-emerald-400 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 font-bold flex items-center space-x-2 px-4 py-2.5 rounded-xl transition duration-200 text-sm">
                    <PlusCircle className="w-4 h-4" /><span>Walk-in Booking</span>
                  </button>
                  <button onClick={() => setShowPasswordModal(true)} className="text-white hover:text-[#00A3FF] bg-white/10 hover:bg-white/20 border border-white/20 font-bold flex items-center space-x-2 px-4 py-2.5 rounded-xl transition duration-200 text-sm">
                    <Lock className="w-4 h-4" /><span>Change Password</span>
                  </button>
                  <button onClick={() => {setCurrentView('landing'); setIsAdminAuthenticated(false);}} className="text-white hover:text-rose-400 bg-white/10 hover:bg-white/20 border border-white/20 font-bold flex items-center space-x-2 px-4 py-2.5 rounded-xl transition duration-200 text-sm">
                    <LogOut className="w-4 h-4" /><span>Exit Portal</span>
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8 bg-slate-50">

                <div className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center font-bold"><ScanLine className="w-6 h-6" /></div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">QR Code Scanner & Player Check-In</h3>
                        <p className="text-xs text-slate-500 font-medium">Scan client's phone QR pass or enter Reference # to start timer</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); if (scannerInput) handleCheckInByRef(scannerInput); }} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                      <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                      <input type="text" placeholder="Scan or enter Booking Reference # (e.g. PV-83104)" value={scannerInput} onChange={(e) => setScannerInput(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] text-slate-900 font-mono text-sm outline-none" />
                    </div>
                    <button type="submit" className="px-6 py-3 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center space-x-2">
                      <Play className="w-4 h-4 fill-current" /><span>Check In & Start 60m Timer</span>
                    </button>
                  </form>

                  {scanMessage && (
                    <div className={`mt-4 p-4 rounded-xl text-sm font-bold flex items-center space-x-2 ${scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : scanMessage.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                      {scanMessage.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                      <span>{scanMessage.text}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Total Bookings</span><div className="text-3xl font-black text-slate-900 font-mono">{adminBookings.length}</div></div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><span className="text-xs font-black text-emerald-600 uppercase tracking-wider block mb-1">Total Income</span><div className="text-3xl font-black text-[#0f4c3a] font-mono">Rs. {adminIncome.toLocaleString()}</div></div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1">Change Report Date</label>
                    <input type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0066FF] font-medium text-slate-800 text-sm outline-none" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center"><h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">Bookings Ledger</h4><span className="text-xs text-slate-500 font-mono">Date: {adminDate}</span></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-extrabold border-b border-slate-200">
                          <th className="p-4">Reference</th><th className="p-4">Slot</th><th className="p-4">Player</th><th className="p-4">Contact</th><th className="p-4">Paid</th><th className="p-4">Status</th><th className="p-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-100 font-medium text-slate-800">
                        {adminBookings.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-medium bg-white">No bookings found on {adminDate}.</td></tr>
                        ) : (
                          adminBookings.map((b) => (
                            <tr key={b.docId} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 font-mono font-black text-[#0B172A]">{b.bookingReference}</td>
                              <td className="p-4 font-bold text-[#0f4c3a]">{b.timeSlot}</td>
                              <td className="p-4"><div className="font-extrabold text-slate-900">{b.customerName}</div><div className="text-xs text-slate-500 capitalize">{b.packageType}</div></td>
                              <td className="p-4 font-mono text-xs text-slate-600"><div>{b.whatsappNumber}</div><div className="text-slate-400">{b.userId}</div></td>
                              <td className="p-4 font-mono font-black text-slate-900">Rs. {b.financials?.totalPaid?.toLocaleString()}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center space-x-1 ${b.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse' : b.status === 'utilized' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-[#0066FF] border border-blue-200'}`}>
                                  <span>{b.status === 'active' ? '● Live / In Court' : b.status === 'utilized' ? 'Utilized / Ended' : 'Confirmed'}</span>
                                </span>
                              </td>
                              <td className="p-4">
                                {b.status === 'confirmed' && (<button onClick={() => handleCheckInByRef(b.bookingReference)} className="text-xs bg-[#0066FF] hover:bg-blue-700 text-white font-black px-3.5 py-1.5 rounded-lg transition shadow-sm">Check In</button>)}
                                {b.status === 'active' && (<button onClick={() => handleEndSession(b.docId)} className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-black px-3.5 py-1.5 rounded-lg transition shadow-sm">End Session</button>)}
                                {b.status === 'utilized' && (<span className="text-xs text-slate-400 font-semibold italic">Completed</span>)}
                                {b.status !== 'utilized' && (<button onClick={() => handleCancelBooking(b.docId)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1.5 rounded-lg transition shadow-sm ml-2">Cancel</button>)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>

        {/* ================= RIGHT ADVERTISEMENT STICKER RAIL ================= */}
        <aside className="hidden xl:flex flex-col w-[250px] pt-6 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar shrink-0 space-y-4">

          <div className="bg-[#0B172A] border border-[#0066FF] rounded-xl overflow-hidden shadow-lg shadow-blue-900/20 flex items-center h-8 relative shrink-0">
            <div className="absolute left-0 bg-[#0066FF] z-10 px-2 h-full flex items-center text-[9px] font-bold text-white tracking-widest shadow-md">LATEST</div>
            <div className="overflow-hidden whitespace-nowrap w-full pl-16 text-[10px] font-medium text-blue-100 flex items-center h-full relative">
              <div className="animate-marquee inline-block absolute w-full font-semibold">🔥 UP TO 20% OFF ON AI CCTV & FIBER INSTALLATIONS | UPGRADE TO WIFI 6 TODAY 🔥</div>
            </div>
          </div>

          <a href="https://datapointtechnology.com" target="_blank" rel="noopener noreferrer" className="block bg-gradient-to-br from-[#0B172A] to-[#0B2040] rounded-2xl p-4 text-white shadow-md border border-[#0066FF]/40 relative overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 shrink-0">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00A3FF] rounded-full blur-xl opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div><h4 className="font-black text-lg tracking-wider leading-none"><span className="text-[#00A3FF]">DATA</span>POINT</h4><p className="text-[8px] text-blue-200 font-bold tracking-widest uppercase mt-0.5">Smart Solutions</p></div>
              <div className="w-9 h-9 bg-black/60 rounded-full border border-[#0066FF] flex items-center justify-center relative shadow-sm">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full absolute top-1.5 right-1.5 animate-pulse shadow-[0_0_5px_red]" />
                <svg className="w-5 h-5 text-[#00A3FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
            </div>
            <div className="space-y-1.5 mb-4 relative z-10">
              <div className="text-[9px] font-semibold text-slate-200 flex items-center bg-white/5 rounded p-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 shadow-[0_0_4px_#34d399]" />AI Security Systems</div>
              <div className="text-[9px] font-semibold text-slate-200 flex items-center bg-white/5 rounded p-1.5"><span className="w-1.5 h-1.5 bg-[#00A3FF] rounded-full mr-2 shadow-[0_0_4px_#00A3FF]" />Fiber Optic Comms</div>
            </div>
            <div className="w-full text-center bg-[#0066FF]/20 group-hover:bg-[#0066FF] text-white text-[10px] font-bold py-2 rounded-lg transition border border-[#0066FF]/50 relative z-10">Explore Services</div>
          </a>

          <a href="https://datapointtechnology.com/products" target="_blank" rel="noopener noreferrer" className="block bg-white rounded-2xl p-4 text-slate-800 shadow-md border border-slate-200 relative overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 shrink-0">
            <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-50 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition duration-500" />
            <div className="flex items-center mb-3 relative z-10">
              <div className="w-10 h-10 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center mr-3 shrink-0 group-hover:border-[#0066FF] transition">
                <svg className="w-5 h-5 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <div className="bg-gradient-to-r from-[#0066FF] to-[#00A3FF] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm w-max mb-0.5 uppercase tracking-widest shadow-sm">Top Rated</div>
                <h5 className="text-xs font-black leading-tight text-[#0B172A]">Smart Store</h5>
                <p className="text-[8px] text-slate-500 mt-0.5">REOQOO & EZVIZ Cams</p>
              </div>
            </div>
            <div className="w-full text-center bg-slate-50 group-hover:bg-[#0B172A] group-hover:text-white border border-slate-200 text-slate-700 text-[10px] font-bold py-2 rounded-lg transition relative z-10">Shop Products</div>
          </a>

          <div className="text-center mt-2 opacity-70 hover:opacity-100 transition cursor-default">
            <div className="inline-flex items-center justify-center space-x-1 mb-1">
              <Sparkles className="w-3 h-3 text-[#00A3FF]" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">10+ Yrs Exp | 500+ Proj</span>
            </div>
          </div>
        </aside>

      </div>

      {showWalkInModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-slate-100">
            <button onClick={() => setShowWalkInModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><PlusCircle className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Walk-in Booking</h3>
                <p className="text-xs text-slate-500 font-medium">Book a court directly from reception</p>
              </div>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <input type="text" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone / WhatsApp</label>
                <input type="tel" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Time Slot (For {adminDate})</label>
                <select value={walkInSlot} onChange={(e) => setWalkInSlot(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" required>
                  <option value="" disabled>-- Choose Available Slot --</option>
                  {adminWalkInSlots.map(s => (
                      <option key={s.time} value={s.time} disabled={s.booked}>{s.time} {s.booked ? '(Booked)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Amount (Rs.)</label>
                <input type="number" value={walkInAmount} onChange={(e) => setWalkInAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono font-bold" required />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md mt-2">Create Booking & Start Timer</button>
            </form>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-slate-100">
            <div className="bg-[#0f4c3a] p-8 text-center text-white relative">
              <button onClick={() => setShowConfirmation(false)} className="absolute top-4 right-4 text-white/70 hover:text-white transition"><X className="w-6 h-6" /></button>
              <div className="w-20 h-20 bg-[#d4af37] text-[#0f4c3a] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><Check className="w-10 h-10 stroke-[3]" /></div>
              <h3 className="text-3xl font-black mb-1">Pass Confirmed!</h3>
              <p className="text-[#d4af37] text-sm font-bold tracking-widest font-mono">REF: #PV-{bookingRef}</p>
            </div>
            <div className="p-8">
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-md border-2 border-slate-200 mb-3"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=PV-${bookingRef}`} alt="Booking QR Pass" className="w-40 h-40 object-contain" /></div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-bold bg-slate-100 px-4 py-1.5 rounded-full"><QrCode className="w-4 h-4 text-[#0f4c3a]" /><span>Scan at Reception for Court Access</span></div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-200 text-sm space-y-3 text-slate-600 font-medium">
                <div className="flex justify-between"><span className="text-slate-400">Player</span><span className="text-slate-800 font-bold">{name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="text-slate-800 font-bold">{date}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Time Slot</span><span className="text-slate-800 font-bold">{slot} (1 Hour)</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Package</span><span className="text-slate-800 font-bold">{type === 'resident' ? 'Palm Resident' : 'Outsider'}</span></div>
                <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center"><span className="text-slate-800 font-bold">Total Paid</span><span className="text-[#0f4c3a] font-black text-xl font-mono">Rs. {totalAmount.toLocaleString()}</span></div>
              </div>
              <button onClick={handleOpenWhatsApp} className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-lg py-4 rounded-xl flex justify-center items-center space-x-2 shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:scale-[0.99]"><svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg><span>Receive Gate Pass on WhatsApp</span></button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative border border-slate-100">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-100"><Lock className="w-6 h-6" /></div>
            <h3 className="text-xl font-black text-center text-slate-900 mb-1">Change Password</h3>
            <p className="text-xs text-center text-slate-500 mb-4 font-medium">Update the admin control panel password</p>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <input type="password" placeholder="New Password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-center font-mono" autoFocus required minLength={5} />
              </div>
              <button type="submit" className="w-full bg-[#0f4c3a] hover:bg-[#0a3629] text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md">Update Password</button>
            </form>
          </div>
        </div>
      )}

      {showAdminLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative border border-slate-100">
            <button onClick={() => setShowAdminLoginModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 bg-blue-50 text-[#0066FF] rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100"><Lock className="w-6 h-6" /></div>
            <h3 className="text-xl font-black text-center text-slate-900 mb-1">Admin Access</h3>
            <p className="text-xs text-center text-slate-500 mb-4 font-medium">Enter password to access court controls</p>
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <input type="password" placeholder="Password (demo: admin123)" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0066FF] outline-none text-sm text-center font-mono" autoFocus />
                {adminAuthError && (<p className="text-xs text-rose-500 font-bold mt-1.5 text-center">{adminAuthError}</p>)}
              </div>
              <button type="submit" className="w-full bg-[#0B172A] hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md">Sign In to Dashboard</button>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-auto bg-slate-950 text-white border-t border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-between">

            <div className="lg:col-span-4 text-center lg:text-left space-y-2">
              <div className="text-[#d4af37] text-xl font-black tracking-widest uppercase">THE PALM VILLAGE</div>
              <p className="text-sm text-slate-300 font-medium">Hyderabad's Premier Padel Club & Sports Facility</p>
              <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} The Palm Builders. All rights reserved.</p>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <a href="https://datapoint.com.pk" target="_blank" className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-full max-w-md transition-all duration-300 hover:shadow-blue-500/20 block cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                      <defs>
                        <linearGradient id="dpBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00A3FF" /><stop offset="100%" stopColor="#0066FF" /></linearGradient>
                        <linearGradient id="dpNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1A3B6B" /><stop offset="100%" stopColor="#0B1E3F" /></linearGradient>
                      </defs>
                      <rect x="18" y="14" width="7" height="7" fill="#00A3FF" rx="1.5" />
                      <rect x="28" y="14" width="7" height="7" fill="#0070F3" rx="1.5" />
                      <rect x="20" y="24" width="7" height="7" fill="#0070F3" rx="1.5" />
                      <rect x="30" y="24" width="7" height="7" fill="#00A3FF" rx="1.5" />
                      <rect x="24" y="34" width="7" height="7" fill="#0B1E3F" rx="1.5" />
                      <path d="M44 14 H68 C80 14 86 21 86 32 C86 43 80 50 68 50 H54 V78 H44 V14 Z" fill="url(#dpBlueGrad)" />
                      <path d="M54 26 H66 C72 26 74 28 74 32 C74 36 72 38 66 38 H54 V26 Z" fill="#FFFFFF" />
                      <path d="M36 40 H50 V78 H36 Z" fill="url(#dpNavyGrad)" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] uppercase tracking-[0.25em] font-extrabold text-slate-400 block mb-0.5">Powered By</span>
                    <div className="text-2xl sm:text-3xl font-black tracking-wider leading-none flex items-center"><span className="text-[#0B1E3F] mr-[1px]">DATA</span><span className="text-[#0070F3]">POINT</span></div>
                    <div className="flex items-center space-x-2 mt-1.5"><span className="h-0.5 w-6 bg-[#0070F3]" /><span className="text-[9px] sm:text-[10px] font-black tracking-[0.22em] text-[#0B1E3F]">TECHNOLOGIES</span><span className="h-0.5 w-6 bg-[#0070F3]" /></div>
                    <div className="text-[8px] sm:text-[8.5px] font-black tracking-[0.06em] mt-1"><span className="text-[#0B1E3F]">SMART SOLUTIONS. </span><span className="text-[#0070F3]">INTELLIGENT FUTURE.</span></div>
                  </div>
                </div>
              </a>
            </div>

            <div className="lg:col-span-3 flex flex-col items-center lg:items-end space-y-2">
              <span className="text-slate-400 tracking-wider text-[11px] uppercase font-bold">Automated Court Helpline</span>
              <div className="bg-slate-900 border border-slate-700/80 px-4 py-3 rounded-2xl flex flex-col items-center lg:items-end space-y-1 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A3FF] opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00A3FF]" /></div>
                  <span className="text-xs text-blue-200 font-bold uppercase tracking-wider">Ai Reception: 03712566540</span>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <a href="tel:03712566540" className="text-white hover:text-[#00A3FF] font-mono font-black text-lg transition tracking-wider">03712566540</a>
                  <a href="https://wa.me/923712566540?text=Hello%20DATAPOINT%20Ai%20Reception%2C%20I%20have%20an%20inquiry%20regarding%20Palm%20Village%20Padel%20Club" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg transition" title="WhatsApp AI Reception"><Smartphone className="w-3.5 h-3.5" /></a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
