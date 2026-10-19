import 'dart:math';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  String _packageType = 'resident'; // 'resident' or 'outsider'
  final _villaController = TextEditingController();

  DateTime? _selectedDate;
  String? _selectedSlot;

  final _nameController = TextEditingController();
  final _cnicController = TextEditingController();
  final _phoneController = TextEditingController(text: '+92 ');
  final _emailController = TextEditingController();

  int _numberOfPlayers = 2;
  int _rackets = 0;
  int _balls = 0;

  bool _isLoading = false;
  bool _isDateFetching = false;
  String? _errorMessage;

  List<String> _bookedSlots = [];

  final List<String> _allSlots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
    '09:00 PM', '10:00 PM'
  ];

  @override
  void dispose() {
    _villaController.dispose();
    _nameController.dispose();
    _cnicController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _fetchBookedSlots(DateTime date) async {
    setState(() {
      _isDateFetching = true;
      _selectedSlot = null;
    });

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(date);
      final querySnapshot = await FirebaseFirestore.instance
          .collection('bookings')
          .where('bookingDate', isEqualTo: dateStr)
          .get();

      List<String> booked = [];
      for (var doc in querySnapshot.docs) {
        final data = doc.data();
        if (data['status'] != 'utilized') {
          booked.add(data['timeSlot']);
        }
      }

      setState(() {
        _bookedSlots = booked;
      });
    } catch (e) {
      debugPrint("Error fetching slots: $e");
    } finally {
      setState(() {
        _isDateFetching = false;
      });
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime today = DateTime.now();
    final int maxDays = _packageType == 'resident' ? 7 : 3;
    final DateTime lastDate = today.add(Duration(days: maxDays));

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? today,
      firstDate: today,
      lastDate: lastDate,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF0f4c3a), // header background color
              onPrimary: Colors.white, // header text color
              onSurface: Colors.black, // body text color
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF0f4c3a), // button text color
              ),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _fetchBookedSlots(picked);
    }
  }

  Future<void> _confirmBooking() async {
    setState(() {
      _errorMessage = null;
    });

    if (_packageType == 'resident' && _villaController.text.trim().isEmpty) {
      setState(() => _errorMessage = "Please enter your Villa / Apartment Number.");
      return;
    }
    if (_selectedDate == null) {
      setState(() => _errorMessage = "Please select a booking date.");
      return;
    }
    if (_selectedSlot == null) {
      setState(() => _errorMessage = "Please select an available time slot.");
      return;
    }
    if (_nameController.text.trim().isEmpty) {
      setState(() => _errorMessage = "Please enter your full name.");
      return;
    }
    if (_cnicController.text.trim().isEmpty) {
      setState(() => _errorMessage = "Please enter your CNIC / Resident ID.");
      return;
    }
    if (_phoneController.text.trim().length < 8) {
      setState(() => _errorMessage = "Please enter a valid WhatsApp number.");
      return;
    }

    setState(() => _isLoading = true);

    try {
      final db = FirebaseFirestore.instance;

      final int courtFee = _packageType == 'resident' ? 1200 : 2000;
      final int addonsFee = (_rackets * 200) + (_balls * 500);
      final int totalAmount = courtFee + addonsFee;

      final String refNumber = (10000 + Random().nextInt(90000)).toString();
      final String bookingRef = 'PV-$refNumber';

      final String nic = _cnicController.text.trim();
      final String name = _nameController.text.trim();
      final String phone = _phoneController.text.trim();
      final String email = _emailController.text.trim();
      final String dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate!);

      // Save user
      await db.collection('users').doc(nic).set({
        'name': name,
        'nic': nic,
        'whatsappNumber': phone,
        'email': email,
        'villaNumber': _packageType == 'resident' ? _villaController.text.trim() : 'N/A',
        'type': _packageType,
        'lastUpdated': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // Save booking
      await db.collection('bookings').add({
        'bookingReference': bookingRef,
        'packageType': _packageType,
        'bookingDate': dateStr,
        'timeSlot': _selectedSlot,
        'numberOfPlayers': _numberOfPlayers,
        'addons': {
          'rackets': _rackets,
          'balls': _balls
        },
        'financials': {
          'courtFee': courtFee,
          'addonsFee': addonsFee,
          'totalPaid': totalAmount,
        },
        'sessionDurationMinutes': 60,
        'userId': nic,
        'customerName': name,
        'createdAt': FieldValue.serverTimestamp(),
        'status': 'confirmed'
      });

      _showConfirmationDialog(bookingRef, dateStr, _selectedSlot!, totalAmount, name, phone);

    } catch (e) {
      setState(() {
        _errorMessage = "Failed to save booking. Please try again. $e";
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showConfirmationDialog(String bookingRef, String date, String slot, int totalAmount, String name, String phone) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text("Booking Confirmed!"),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Your booking reference is $bookingRef."),
              const SizedBox(height: 16),
              const Text("Tap the button below to receive your digital pass via WhatsApp.", style: TextStyle(fontSize: 14)),
            ],
          ),
          actions: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF25D366), // WhatsApp Green
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                _launchWhatsApp(bookingRef, date, slot, totalAmount, name, phone);
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              icon: const Icon(Icons.message),
              label: const Text("Get QR Pass on WhatsApp"),
            )
          ],
        );
      }
    );
  }

  Future<void> _launchWhatsApp(String bookingRef, String date, String slot, int totalAmount, String name, String phone) async {
    final typeDisplay = _packageType == 'resident' ? 'Palm Resident' : 'Guest / Outsider';
    final qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=$bookingRef';

    final msg = '''🎾 *THE PALM VILLAGE - PADEL CLUB RESERVATION*

Assalam-o-Alaikum / Hello $name,
Your padel court reservation has been confirmed!

📅 *Date:* $date
⏰ *Slot:* $slot (1 Hour)
🏷️ *Package:* $typeDisplay
💰 *Total Amount:* Rs. $totalAmount
📍 *Venue:* Court 1, Palm Village Sports Facility
🔖 *Booking Reference:* #$bookingRef

📱 *DIGITAL PASS & CHECK-IN QR CODE:*
Present this QR pass to the reception upon arrival to activate your 60-minute court timer:
$qrCodeUrl

*Walk-in Policy:* If the QR pass is not scanned within 15 minutes of slot time, the court may be reassigned.
For instant queries, contact Reception.''';

    final encodedMsg = Uri.encodeComponent(msg);
    final cleanPhone = phone.replaceAll(RegExp(r'[^\d+]'), '');
    final Uri url = Uri.parse('https://wa.me/$cleanPhone?text=$encodedMsg');

    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      debugPrint("Could not launch WhatsApp");
    }
  }

  Widget _buildSectionHeader(String number, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFF0f4c3a),
              borderRadius: BorderRadius.circular(8)
            ),
            alignment: Alignment.center,
            child: Text(number, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Court Reservation", style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF0f4c3a)))
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200)
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Colors.red))),
                      ],
                    )
                  ),

                // 1. Package
                _buildSectionHeader("1", "Select Package"),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _packageType = 'resident';
                            _selectedDate = null;
                            _selectedSlot = null;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _packageType == 'resident' ? Colors.green.shade50 : Colors.white,
                            border: Border.all(color: _packageType == 'resident' ? const Color(0xFF0f4c3a) : Colors.grey.shade300, width: 2),
                            borderRadius: BorderRadius.circular(12)
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("Palm Resident", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const Text("Rs. 1,200 / hr", style: TextStyle(color: Colors.grey)),
                              const SizedBox(height: 8),
                              const Text("7 Days Advance", style: TextStyle(color: Color(0xFFd4af37), fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _packageType = 'outsider';
                            _selectedDate = null;
                            _selectedSlot = null;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _packageType == 'outsider' ? Colors.green.shade50 : Colors.white,
                            border: Border.all(color: _packageType == 'outsider' ? const Color(0xFF0f4c3a) : Colors.grey.shade300, width: 2),
                            borderRadius: BorderRadius.circular(12)
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("Guest / Outsider", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const Text("Rs. 2,000 / hr", style: TextStyle(color: Colors.grey)),
                              const SizedBox(height: 8),
                              const Text("3 Days Advance", style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (_packageType == 'resident')
                  Padding(
                    padding: const EdgeInsets.only(top: 16.0),
                    child: TextField(
                      controller: _villaController,
                      decoration: InputDecoration(
                        labelText: "Villa / Apartment Number *",
                        hintText: "e.g. Villa 42, Block B",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),

                const SizedBox(height: 16),

                // 2. Date & Time
                _buildSectionHeader("2", "Date & Time"),
                InkWell(
                  onTap: () => _selectDate(context),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade400),
                      borderRadius: BorderRadius.circular(12)
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_selectedDate == null ? "Select Date" : DateFormat('EEEE, MMM d, yyyy').format(_selectedDate!), style: TextStyle(fontSize: 16, color: _selectedDate == null ? Colors.grey : Colors.black87)),
                        const Icon(Icons.calendar_month, color: Color(0xFF0f4c3a)),
                      ],
                    ),
                  ),
                ),
                if (_selectedDate != null) ...[
                  const SizedBox(height: 16),
                  const Text("Available Slots (1-Hour)", style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_isDateFetching)
                    const Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator()))
                  else
                    Wrap(
                      spacing: 8.0,
                      runSpacing: 8.0,
                      children: _allSlots.map((slot) {
                        final isBooked = _bookedSlots.contains(slot);
                        final isSelected = _selectedSlot == slot;
                        return ChoiceChip(
                          label: Text(slot),
                          selected: isSelected,
                          onSelected: isBooked ? null : (selected) {
                            if (selected) {
                              setState(() => _selectedSlot = slot);
                            }
                          },
                          selectedColor: const Color(0xFF0f4c3a),
                          labelStyle: TextStyle(color: isSelected ? Colors.white : (isBooked ? Colors.grey : Colors.black87)),
                          backgroundColor: isBooked ? Colors.grey.shade200 : Colors.white,
                        );
                      }).toList(),
                    ),
                ],

                const SizedBox(height: 16),

                // 3. Player Details
                _buildSectionHeader("3", "Player Details & Add-ons"),
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(labelText: "Full Name *", border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _cnicController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: "CNIC / Resident ID *", border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(labelText: "WhatsApp Number *", border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(labelText: "Email Address (Optional)", border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                ),
                const SizedBox(height: 16),

                const Text("Number of Players", style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                InputDecorator(
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: _numberOfPlayers,
                      isExpanded: true,
                      items: const [
                        DropdownMenuItem(value: 2, child: Text("2 Players (Singles)")),
                        DropdownMenuItem(value: 3, child: Text("3 Players")),
                        DropdownMenuItem(value: 4, child: Text("4 Players (Doubles)")),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _numberOfPlayers = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Add-ons
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Optional Equipment Rental", style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Carbon Padel Racket (Rs. 200/ea)"),
                          Row(
                            children: [
                              IconButton(onPressed: () { if (_rackets > 0) setState(() => _rackets--); }, icon: const Icon(Icons.remove_circle_outline)),
                              Text("$_rackets", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(onPressed: () { if (_rackets < 4) setState(() => _rackets++); }, icon: const Icon(Icons.add_circle_outline)),
                            ],
                          )
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Dunlop Pro Balls Can (Rs. 500/ea)"),
                          Row(
                            children: [
                              IconButton(onPressed: () { if (_balls > 0) setState(() => _balls--); }, icon: const Icon(Icons.remove_circle_outline)),
                              Text("$_balls", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(onPressed: () { if (_balls < 2) setState(() => _balls++); }, icon: const Icon(Icons.add_circle_outline)),
                            ],
                          )
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Submit Button
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0f4c3a),
                    foregroundColor: const Color(0xFFd4af37),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _confirmBooking,
                  child: const Text('Confirm & Book Court', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
    );
  }
}