import { PrismaClient, UserRole, CuisineType, PriceRange, DayOfWeek, BuffetSessionName } from "@prisma/client";

const prisma = new PrismaClient({ log: ["query", "info", "warn", "error"] });

async function main() {
  console.log("🌱  Starting DineSpot seed...\n");

  // ─────────────────────────────────────────
  // 1. USERS
  // ─────────────────────────────────────────
  const owner1 = await prisma.user.upsert({
    where: { email: "rahul.sharma@dinespot.app" },
    update: {},
    create: {
      name: "Rahul Sharma",
      email: "rahul.sharma@dinespot.app",
      phone: "+919876543210",
      role: UserRole.RESTAURANT_OWNER,
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=rahul",
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: "priya.mehta@dinespot.app" },
    update: {},
    create: {
      name: "Priya Mehta",
      email: "priya.mehta@dinespot.app",
      phone: "+919876543211",
      role: UserRole.RESTAURANT_OWNER,
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=priya",
    },
  });

  const owner3 = await prisma.user.upsert({
    where: { email: "arjun.nair@dinespot.app" },
    update: {},
    create: {
      name: "Arjun Nair",
      email: "arjun.nair@dinespot.app",
      phone: "+919876543212",
      role: UserRole.RESTAURANT_OWNER,
      avatar: "https://api.dicebear.com/8.x/avataaars/svg?seed=arjun",
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "demo.user@dinespot.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo.user@dinespot.app",
      phone: "+919876500000",
      role: UserRole.USER,
    },
  });

  console.log("✅  Users created");

  // ─────────────────────────────────────────
  // 2. RESTAURANTS
  // ─────────────────────────────────────────

  // Helper: build operating hours (Mon–Sun, closed on Monday)
  const weeklyHours = (
    open: string,
    close: string,
    closedDays: DayOfWeek[] = []
  ) =>
    Object.values(DayOfWeek).map((day) => ({
      dayOfWeek: day as DayOfWeek,
      openTime: open,
      closeTime: close,
      isClosed: closedDays.includes(day as DayOfWeek),
    }));

  // ── Restaurant 1: Spice Garden ────────────
  const spiceGarden = await prisma.restaurant.upsert({
    where: { slug: "spice-garden-mumbai" },
    update: {},
    create: {
      name: "Spice Garden",
      slug: "spice-garden-mumbai",
      description:
        "An authentic North Indian dining experience in the heart of Bandra. Famous for its live tandoor, signature dal makhani, and the legendary weekend buffet spread.",
      address: "14, Linking Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      latitude: 19.0596,
      longitude: 72.8295,
      cuisineType: CuisineType.INDIAN,
      priceRange: PriceRange.MODERATE,
      rating: 4.5,
      totalReviews: 328,
      isVerified: true,
      isActive: true,
      phone: "+912226431200",
      email: "hello@spicegarden.in",
      website: "https://spicegarden.in",
      coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
      images: [
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800",
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800",
      ],
      ownerId: owner1.id,
      operatingHours: {
        create: weeklyHours("11:00", "23:30", [DayOfWeek.MONDAY]),
      },
      tables: {
        create: [
          { tableNumber: "T-01", section: "Indoor", capacity: 2, minCapacity: 1 },
          { tableNumber: "T-02", section: "Indoor", capacity: 2, minCapacity: 1 },
          { tableNumber: "T-03", section: "Indoor", capacity: 4, minCapacity: 2 },
          { tableNumber: "T-04", section: "Indoor", capacity: 4, minCapacity: 2 },
          { tableNumber: "T-05", section: "Indoor", capacity: 6, minCapacity: 3 },
          { tableNumber: "T-06", section: "Outdoor", capacity: 4, minCapacity: 2 },
          { tableNumber: "T-07", section: "Outdoor", capacity: 6, minCapacity: 3 },
          { tableNumber: "VIP-01", section: "Private", capacity: 8, minCapacity: 4 },
          { tableNumber: "VIP-02", section: "Private", capacity: 10, minCapacity: 6 },
        ],
      },
      buffetSessions: {
        create: [
          {
            name: BuffetSessionName.LUNCH,
            description: "Unlimited North Indian lunch with live counters",
            startTime: "12:00",
            endTime: "15:30",
            pricePerHead: 799,
            childPrice: 499,
            maxCapacity: 120,
            isVeg: false,
            highlights: ["Live Tandoor", "Dal Makhani Counter", "Dessert Station", "Chaat Corner"],
            images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"],
          },
          {
            name: BuffetSessionName.DINNER,
            description: "Premium dinner buffet with 60+ dishes",
            startTime: "19:00",
            endTime: "23:00",
            pricePerHead: 1199,
            childPrice: 699,
            maxCapacity: 100,
            isVeg: false,
            highlights: ["Biryani Live Counter", "Kebab Station", "Imported Cheese Board", "Gulab Jamun Bar"],
            images: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"],
          },
        ],
      },
      eventHalls: {
        create: [
          {
            name: "The Grand Pavilion",
            description: "Our flagship banquet hall perfect for weddings, receptions, and large corporate events.",
            capacity: 300,
            areaSqFt: 4500,
            pricePerDay: 150000,
            depositAmount: 50000,
            amenities: ["Stage", "LED Wall", "Sound System", "AC", "Valet Parking", "Bridal Suite", "Green Room"],
            images: [
              "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
              "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
            ],
            alcoholAllowed: true,
            cateringIncluded: true,
          },
        ],
      },
    },
  });

  // ── Restaurant 2: The Sushi Loft ────────────
  const sushiLoft = await prisma.restaurant.upsert({
    where: { slug: "the-sushi-loft-bangalore" },
    update: {},
    create: {
      name: "The Sushi Loft",
      slug: "the-sushi-loft-bangalore",
      description:
        "Bangalore's premier Japanese dining destination. Authentic Edomae sushi, teppanyaki, and an 18-seat omakase counter. Curated sake and whisky list.",
      address: "3rd Floor, UB City Mall, Vittal Mallya Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      latitude: 12.9716,
      longitude: 77.5946,
      cuisineType: CuisineType.JAPANESE,
      priceRange: PriceRange.LUXURY,
      rating: 4.8,
      totalReviews: 214,
      isVerified: true,
      isActive: true,
      phone: "+918022341234",
      email: "reservations@sushiloft.in",
      website: "https://sushiloft.in",
      coverImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200",
      images: [
        "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800",
        "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800",
      ],
      ownerId: owner2.id,
      operatingHours: {
        create: weeklyHours("12:00", "23:00", [DayOfWeek.TUESDAY]),
      },
      tables: {
        create: [
          { tableNumber: "S-01", section: "Sushi Counter", capacity: 2, minCapacity: 1 },
          { tableNumber: "S-02", section: "Sushi Counter", capacity: 2, minCapacity: 1 },
          { tableNumber: "T-01", section: "Main Floor", capacity: 4, minCapacity: 2 },
          { tableNumber: "T-02", section: "Main Floor", capacity: 4, minCapacity: 2 },
          { tableNumber: "T-03", section: "Main Floor", capacity: 6, minCapacity: 3 },
          { tableNumber: "OM-01", section: "Omakase", capacity: 2, minCapacity: 2 },
          { tableNumber: "OM-02", section: "Omakase", capacity: 2, minCapacity: 2 },
          { tableNumber: "PVT-01", section: "Private Dining", capacity: 8, minCapacity: 4 },
        ],
      },
      buffetSessions: {
        create: [
          {
            name: BuffetSessionName.LUNCH,
            description: "Weekday sushi & bento lunch set — 30+ pieces rotating selection",
            startTime: "12:00",
            endTime: "15:00",
            pricePerHead: 1899,
            maxCapacity: 60,
            isVeg: false,
            highlights: ["Nigiri Selection", "Maki Rolls", "Miso Soup", "Edamame", "Green Tea Ice Cream"],
            images: ["https://images.unsplash.com/photo-1553621042-f6e147245754?w=800"],
          },
        ],
      },
      eventHalls: {
        create: [
          {
            name: "Sakura Private Lounge",
            description: "An intimate 40-person private dining lounge with floor-to-ceiling city views. Perfect for corporate dinners and exclusive celebrations.",
            capacity: 40,
            areaSqFt: 800,
            pricePerDay: 80000,
            depositAmount: 25000,
            amenities: ["Projector", "Surround Sound", "Bar Setup", "AC", "City View", "Dedicated Chef"],
            images: ["https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800"],
            alcoholAllowed: true,
            cateringIncluded: true,
            externalCateringAllowed: false,
          },
        ],
      },
    },
  });

  // ── Restaurant 3: Terra Verde ────────────
  const terraVerde = await prisma.restaurant.upsert({
    where: { slug: "terra-verde-delhi" },
    update: {},
    create: {
      name: "Terra Verde",
      slug: "terra-verde-delhi",
      description:
        "Farm-to-fork vegetarian and vegan fine dining in Hauz Khas Village. Seasonal menus, zero-waste kitchen, and an award-winning plant-based tasting menu.",
      address: "A-12, Hauz Khas Village",
      city: "Delhi",
      state: "Delhi",
      pincode: "110016",
      latitude: 28.5535,
      longitude: 77.2031,
      cuisineType: CuisineType.CONTINENTAL,
      priceRange: PriceRange.EXPENSIVE,
      rating: 4.6,
      totalReviews: 189,
      isVerified: true,
      isActive: true,
      phone: "+911146202020",
      email: "eat@terraverde.in",
      website: "https://terraverde.in",
      coverImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200",
      images: [
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
      ],
      ownerId: owner3.id,
      operatingHours: {
        create: weeklyHours("11:30", "22:30", [DayOfWeek.WEDNESDAY]),
      },
      tables: {
        create: [
          { tableNumber: "G-01", section: "Garden", capacity: 2, minCapacity: 1 },
          { tableNumber: "G-02", section: "Garden", capacity: 2, minCapacity: 1 },
          { tableNumber: "G-03", section: "Garden", capacity: 4, minCapacity: 2 },
          { tableNumber: "G-04", section: "Garden", capacity: 4, minCapacity: 2 },
          { tableNumber: "I-01", section: "Indoor", capacity: 4, minCapacity: 2 },
          { tableNumber: "I-02", section: "Indoor", capacity: 6, minCapacity: 3 },
          { tableNumber: "I-03", section: "Indoor", capacity: 8, minCapacity: 4 },
          { tableNumber: "RFT-01", section: "Rooftop", capacity: 4, minCapacity: 2 },
          { tableNumber: "RFT-02", section: "Rooftop", capacity: 6, minCapacity: 2 },
        ],
      },
      buffetSessions: {
        create: [
          {
            name: BuffetSessionName.BRUNCH,
            description: "Weekend organic plant-based brunch — 45+ cold and hot items",
            startTime: "10:30",
            endTime: "14:30",
            pricePerHead: 1299,
            childPrice: 649,
            maxCapacity: 80,
            isVeg: true,
            highlights: ["Cold Press Juice Bar", "Artisan Bread Station", "Rooftop Seating", "Vegan Desserts"],
            images: ["https://images.unsplash.com/photo-1543353071-087092ec393a?w=800"],
          },
          {
            name: BuffetSessionName.DINNER,
            description: "Seasonal tasting buffet — chef-curated plant-based creations",
            startTime: "19:00",
            endTime: "22:30",
            pricePerHead: 1799,
            maxCapacity: 60,
            isVeg: true,
            highlights: ["Live Pasta Station", "Mezze Spread", "Cheese Fondue", "Chocolate Fountain"],
            images: ["https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800"],
          },
        ],
      },
      eventHalls: {
        create: [
          {
            name: "The Greenhouse Terrace",
            description: "A stunning 120-person open-air rooftop terrace surrounded by curated plants. Ideal for intimate weddings, birthday soirées, and product launches.",
            capacity: 120,
            areaSqFt: 2200,
            pricePerDay: 95000,
            depositAmount: 30000,
            amenities: ["String Lights", "Bluetooth Sound", "Projector Screen", "Plant Decor", "Bar Counter", "Fire Pit"],
            images: [
              "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
              "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
            ],
            alcoholAllowed: true,
            cateringIncluded: true,
            externalCateringAllowed: false,
          },
        ],
      },
    },
  });

  console.log("✅  Restaurants created:", spiceGarden.name, "|", sushiLoft.name, "|", terraVerde.name);

  // ─────────────────────────────────────────
  // 3. SAMPLE BOOKINGS
  // ─────────────────────────────────────────

  const sg = await prisma.restaurant.findUnique({
    where: { slug: "spice-garden-mumbai" },
    include: { tables: true, buffetSessions: true, eventHalls: true },
  });

  if (sg) {
    const tableBooking = await prisma.booking.create({
      data: {
        referenceCode: "DS-20240501-T001",
        userId: customerUser.id,
        restaurantId: sg.id,
        bookingType: "TABLE",
        tableId: sg.tables[2]?.id,
        date: new Date("2025-06-15"),
        startTime: "19:30",
        endTime: "21:30",
        partySize: 4,
        totalAmount: 0,
        paymentStatus: "UNPAID",
        status: "CONFIRMED",
        specialRequests: "Window seat preferred. Anniversary dinner — please arrange a small cake.",
      },
    });

    const buffetBooking = await prisma.booking.create({
      data: {
        referenceCode: "DS-20240501-B001",
        userId: customerUser.id,
        restaurantId: sg.id,
        bookingType: "BUFFET",
        buffetSessionId: sg.buffetSessions[0]?.id,
        date: new Date("2025-06-20"),
        startTime: "12:00",
        endTime: "15:30",
        partySize: 6,
        adultsCount: 4,
        childrenCount: 2,
        totalAmount: 4196,
        paymentStatus: "PAID",
        paymentMethod: "ONLINE",
        status: "CONFIRMED",
      },
    });

    const hallBooking = await prisma.booking.create({
      data: {
        referenceCode: "DS-20240501-H001",
        userId: customerUser.id,
        restaurantId: sg.id,
        bookingType: "EVENT_HALL",
        eventHallId: sg.eventHalls[0]?.id,
        eventName: "Sharma Wedding Reception",
        eventType: "Wedding",
        date: new Date("2025-07-10"),
        startTime: "18:00",
        endTime: "23:59",
        partySize: 250,
        totalAmount: 150000,
        depositAmount: 50000,
        paymentStatus: "PAID",
        paymentMethod: "ONLINE",
        status: "CONFIRMED",
        specialRequests: "Need floral arch setup. Preferred caterer: Mom's Kitchen. Halal menu required.",
      },
    });

    console.log("✅  Sample bookings created:", tableBooking.referenceCode, "|", buffetBooking.referenceCode, "|", hallBooking.referenceCode);

    // ── Sample review ──
    await prisma.review.create({
      data: {
        userId: customerUser.id,
        restaurantId: sg.id,
        bookingId: tableBooking.id,
        rating: 5,
        foodRating: 5,
        serviceRating: 4,
        ambienceRating: 5,
        comment: "Absolutely divine Dal Makhani — the best I've had in Mumbai. Staff was warm and attentive. Will definitely be back!",
        isVerified: true,
      },
    });
    console.log("✅  Sample review created");

    // ── Sample notification ──
    await prisma.notification.create({
      data: {
        userId: customerUser.id,
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed! 🎉",
        message: `Your table at ${sg.name} on June 15 at 7:30 PM is confirmed. Reference: DS-20240501-T001`,
        data: { bookingId: tableBooking.id, restaurantId: sg.id },
      },
    });
    console.log("✅  Sample notification created");
  }

  console.log("\n🎉  Seed complete! Summary:");
  console.log(`   👤  Users       : 4`);
  console.log(`   🍽️   Restaurants : 3`);
  console.log(`   🪑  Tables      : 26 total`);
  console.log(`   🥘  Buffets     : 5 sessions`);
  console.log(`   🏛️   Event Halls : 3`);
  console.log(`   📅  Bookings    : 3 (table + buffet + hall)`);
  console.log(`   ⭐  Reviews     : 1`);
  console.log(`   🔔  Notifications: 1`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
