import type { AppData } from "../types";

export const demoData: AppData = {
  currentUser: {
    id: "00000000-0000-0000-0000-000000000001",
    displayName: "Aisha Planner",
    avatarUrl: "",
    allergies: "Peanuts",
    medications: "Antihistamine as needed"
  },
  trip: {
    id: "10000000-0000-0000-0000-000000000001",
    title: "Bali Family Trip",
    destination: "Bali, Indonesia",
    startDate: "2026-08-14",
    endDate: "2026-08-20",
    timezone: "Asia/Makassar",
    currency: "MYR",
    dateFormat: "DD MMM YYYY",
    defaultVisibility: "shared",
    hotelInfo: "Sunrise Nusa Dua Resort, two connecting rooms, check-in 3:00 PM.",
    emergencySummary: "Dial 112 for local emergency services. Keep passports and insurance copies in Documents.",
    estimatedBudget: 9800
  },
  members: [
    {
      id: "20000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000001",
      profileId: "00000000-0000-0000-0000-000000000001",
      role: "owner",
      canAddExpenses: true,
      createdAt: "2026-06-10T04:00:00Z",
      profile: { id: "00000000-0000-0000-0000-000000000001", username: "aisha", displayName: "Aisha Planner" }
    },
    {
      id: "20000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      profileId: "00000000-0000-0000-0000-000000000002",
      role: "organizer",
      canAddExpenses: true,
      invitedBy: "00000000-0000-0000-0000-000000000001",
      createdAt: "2026-06-10T04:05:00Z",
      profile: { id: "00000000-0000-0000-0000-000000000002", username: "omar", displayName: "Omar" }
    }
  ],
  itinerary: [
    {
      id: "30000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      date: "2026-08-14",
      startTime: "09:15",
      endTime: "12:20",
      title: "Flight to Denpasar",
      category: "flight",
      locationName: "Kuala Lumpur International Airport",
      address: "Sepang, Selangor",
      notes: "Arrive at airport three hours early.",
      estimatedCost: 2800,
      bookingReference: "FAM-BALI-2026",
      visibility: "shared",
      sortOrder: 1
    },
    {
      id: "30000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      date: "2026-08-15",
      startTime: "10:00",
      endTime: "14:00",
      title: "Ubud Monkey Forest and lunch",
      category: "activity",
      locationName: "Sacred Monkey Forest Sanctuary",
      address: "Ubud, Gianyar Regency",
      notes: "Keep snacks zipped away and bring water.",
      estimatedCost: 520,
      visibility: "shared",
      sortOrder: 2
    },
    {
      id: "30000000-0000-0000-0000-000000000003",
      tripId: "10000000-0000-0000-0000-000000000001",
      date: "2026-08-16",
      startTime: "16:30",
      endTime: "20:00",
      title: "Jimbaran seafood dinner",
      category: "food",
      locationName: "Jimbaran Bay",
      address: "Jimbaran Beach",
      notes: "Book a table facing the beach.",
      estimatedCost: 760,
      visibility: "shared",
      sortOrder: 3
    }
  ],
  places: [
    {
      id: "40000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Sunrise Nusa Dua Resort",
      category: "hotel",
      address: "Nusa Dua, Bali",
      notes: "Ask for baby cot and late checkout."
    },
    {
      id: "40000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "BIMC Hospital Nusa Dua",
      category: "hospital",
      address: "Kawasan ITDC Blok D, Nusa Dua",
      notes: "International clinic with 24-hour emergency service."
    },
    {
      id: "40000000-0000-0000-0000-000000000003",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Jimbaran Bay",
      category: "restaurant",
      address: "Jimbaran Beach",
      notes: "Sunset seafood dinner area."
    }
  ],
  documents: [
    {
      id: "50000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      fileName: "family-flight-tickets.pdf",
      fileType: "application/pdf",
      category: "flight_ticket",
      uploadedBy: "00000000-0000-0000-0000-000000000001",
      isPrivate: false,
      createdAt: "2026-06-10T04:00:00Z"
    },
    {
      id: "50000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      fileName: "travel-insurance.pdf",
      fileType: "application/pdf",
      category: "insurance",
      uploadedBy: "00000000-0000-0000-0000-000000000001",
      isPrivate: true,
      createdAt: "2026-06-10T04:05:00Z"
    }
  ],
  expenses: [
    {
      id: "60000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      amount: 2800,
      currency: "MYR",
      category: "Flights",
      paidBy: "00000000-0000-0000-0000-000000000001",
      splitBetween: [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000003"
      ],
      date: "2026-06-10",
      notes: "Round trip tickets."
    },
    {
      id: "60000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      amount: 1450,
      currency: "MYR",
      category: "Hotel",
      paidBy: "00000000-0000-0000-0000-000000000002",
      splitBetween: [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002"
      ],
      date: "2026-06-11",
      notes: "Deposit."
    }
  ],
  packing: [
    {
      id: "70000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Passports",
      category: "Documents",
      quantity: 3,
      isShared: true,
      checkedBy: ["00000000-0000-0000-0000-000000000001"],
      notes: "Keep originals in carry-on."
    },
    {
      id: "70000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Swimwear",
      category: "Clothing",
      quantity: 3,
      assignedTo: "00000000-0000-0000-0000-000000000002",
      isShared: false,
      checkedBy: []
    },
    {
      id: "70000000-0000-0000-0000-000000000003",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Allergy medicine",
      category: "Medical",
      quantity: 1,
      assignedTo: "00000000-0000-0000-0000-000000000001",
      isShared: false,
      checkedBy: ["00000000-0000-0000-0000-000000000001"]
    }
  ],
  votes: [
    {
      id: "80000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      itineraryItemId: "30000000-0000-0000-0000-000000000002",
      profileId: "00000000-0000-0000-0000-000000000001",
      value: "must_do"
    },
    {
      id: "80000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      itineraryItemId: "30000000-0000-0000-0000-000000000002",
      profileId: "00000000-0000-0000-0000-000000000002",
      value: "interested"
    }
  ],
  comments: [
    {
      id: "90000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      targetType: "trip",
      targetId: "10000000-0000-0000-0000-000000000001",
      profileId: "00000000-0000-0000-0000-000000000002",
      body: "Can we keep one free afternoon for the pool?",
      createdAt: "2026-06-10T05:00:00Z"
    }
  ],
  emergencyContacts: [
    {
      id: "91000000-0000-0000-0000-000000000001",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Malaysia Embassy Jakarta",
      relationship: "Embassy",
      phone: "+62 21 5224947",
      notes: "For passport or consular support."
    },
    {
      id: "91000000-0000-0000-0000-000000000002",
      tripId: "10000000-0000-0000-0000-000000000001",
      name: "Bali Driver Wayan",
      relationship: "Local driver",
      phone: "+62 812 0000 0000",
      notes: "Airport pickup and day tours."
    }
  ],
  insurance: {
    id: "92000000-0000-0000-0000-000000000001",
    tripId: "10000000-0000-0000-0000-000000000001",
    provider: "SafeTrip Insurance",
    policyNumber: "ST-BALI-2026-8891",
    emergencyPhone: "+60 3 0000 0000",
    notes: "Covers outpatient clinic, hospital admission, and trip interruption."
  }
};
