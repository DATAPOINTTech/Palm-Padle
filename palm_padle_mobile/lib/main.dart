import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'firebase_options.dart';
import 'screens/booking_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const PalmVillageApp());
}

class PalmVillageApp extends StatelessWidget {
  const PalmVillageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'The Palm Village',
      theme: ThemeData(
        primaryColor: const Color(0xFF0f4c3a),
        scaffoldBackgroundColor: const Color(0xFFf8fafc),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0f4c3a),
          foregroundColor: Colors.white,
        ),
      ),
      home: const LandingScreen(),
    );
  }
}

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  void _openAdminScanner(BuildContext context) {
    // Simple password check for demo purposes
    showDialog(
      context: context,
      builder: (context) {
        final pwdController = TextEditingController();
        return AlertDialog(
          title: const Text("Admin Access"),
          content: TextField(
            controller: pwdController,
            obscureText: true,
            decoration: const InputDecoration(hintText: "Enter Admin Password"),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () {
                if (pwdController.text == "admin123") {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AdminScannerScreen()),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Incorrect password")),
                  );
                }
              },
              child: const Text("Login"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('THE PALM VILLAGE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFd4af37))),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: "Admin Scanner",
            onPressed: () => _openAdminScanner(context),
          )
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(24.0),
              color: Colors.white,
              child: const Column(
                children: [
                  Text(
                    'Welcome to The Palm Village',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0f4c3a),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'A distinguished name in the Pakistani real estate landscape, synonymous with trust, vision, and uncompromising excellence.',
                    style: TextStyle(fontSize: 16, color: Colors.black87, height: 1.5),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0f4c3a),
                  foregroundColor: const Color(0xFFd4af37),
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const BookingScreen()),
                  );
                },
                icon: const Icon(Icons.sports_tennis, size: 28),
                label: const Text(
                  'Book Padel Court Now',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ----------------------------------------------------
// ADMIN SCANNER SCREEN
// ----------------------------------------------------
class AdminScannerScreen extends StatefulWidget {
  const AdminScannerScreen({super.key});

  @override
  State<AdminScannerScreen> createState() => _AdminScannerScreenState();
}

class _AdminScannerScreenState extends State<AdminScannerScreen> {
  bool _isProcessing = false;

  Future<void> _handleBarcode(String barcodeValue) async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final db = FirebaseFirestore.instance;
      // The QR code contains the bookingReference (e.g. PV-12345)

      final querySnapshot = await db
          .collection('bookings')
          .where('bookingReference', isEqualTo: barcodeValue)
          .get();

      if (querySnapshot.docs.isEmpty) {
        _showResultDialog("Invalid Booking", "No booking found with reference: $barcodeValue");
        return;
      }

      final doc = querySnapshot.docs.first;
      final data = doc.data();

      if (data['status'] == 'utilized') {
        _showResultDialog("Already Utilized", "This booking ($barcodeValue) has already been scanned and utilized.");
      } else {
        // Mark as utilized
        await doc.reference.update({'status': 'utilized'});
        _showResultDialog("Success", "Booking $barcodeValue verified and marked as utilized!\n\nCustomer: ${data['customerName']}\nSlot: ${data['timeSlot']}");
      }
    } catch (e) {
      _showResultDialog("Error", "Failed to process scan: $e");
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  void _showResultDialog(String title, String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
            },
            child: const Text("Scan Next"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR E-Pass')),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _handleBarcode(barcode.rawValue!);
                  break; // Process one at a time
                }
              }
            },
          ),
          if (_isProcessing)
            const Center(
              child: CircularProgressIndicator(color: Color(0xFFd4af37)),
            ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                color: Colors.black54,
                child: const Text(
                  "Point camera at customer's WhatsApp QR Code",
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}

