// Jungle Market React Native Data Layer
// ASD-STE100 Simple English models and collections

export const JUNGLE_DATA = {
  currentUser: {
    id: "user_artisan_ramesh",
    name: "Ramesh Baghel",
    role: "artisan",
    village: "Bhelvapadar, Kondagaon, Bastar",
    phone: "+91 98263 41092",
    avatar: "https://lh3.googleusercontent.com/aida/AEtjO1VZ9WSYdiU5KnCwCveZ42dsoM2qr3GORfCk2YW4P1THeMhYkXOsAmau1OGKNw_NT5koGMHZzbuIZQHbzJZQY8PU2PJpXLC2_JQOqHffRbQbOCgaIPsdVKasMEYmC6fW5yfeYaUP8z3etJmXzUkfaY7RuEjjBGioc-CKeRMCI-3rwd-cMzDNzCmBpRlLV_IslXWTfb-L2iofX8dAc62XkJAaUw8EkQ950fcZpcqsotczC4dgvDMQ55GfTZA",
    walletBalance: 14850,
    totalEarnings: 482400,
    pendingPayout: 18600,
    activeOrdersCount: 4,
    giCertificateNumber: "GI-IN-CG-0042-DOKRA",
    referralCode: "BASTAR-RAMESH-89",
    connectedArtisansCount: 16
  },

  activeOrders: [
    {
      id: "ORD-ONDC-7412",
      status: "CONFIRMED",
      date: "Today, 02:40 PM",
      productTitle: "Forest Deer with Sacred Tree",
      productImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuCx1r4CbATRCwMBfEzAV4aknoQ3V_bj1qUIskjG77mFlN_NpJIdG8oYrz6_rjk0DgJGKgyV1j1lMbWwZV8m4YPgPcx1hIOXsOJo4hfgdrgv-zIDHNDzvU2anCrSoLONftAgVNxYb7LmB8Y0StbheZaRmTonL42VjzbAEFH-_T11AadLKv4WFCNt7wazRzA28A2le_feJ-emstTfYZtASKET4Co43UBBAqbei4ZBeEKJfTk3TW_5846m",
      buyerName: "Ananya Sharma",
      buyerCity: "Bengaluru, Karnataka",
      artisanPayout: 3434,
      totalAmount: 3890,
      price: 3890,
      shippingProvider: "Delhivery Surface",
      trackingNumber: "DEL-ONDC-99214",
      timeline: [
        { label: "Order confirmed via ONDC network", done: true },
        { label: "Artisan casting & finishing completed", done: true },
        { label: "Eco-packaging and pickup assignment", done: false },
        { label: "Out for doorstep delivery", done: false }
      ]
    },
    {
      id: "ORD-ONDC-7398",
      status: "PROCESSING",
      date: "Yesterday, 05:15 PM",
      productTitle: "Handwoven Bamboo Lamp Shade",
      productImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwPxsNm0-fDE8D4TYIwMXgUBWwbs_nwsHPekcVZmzQi3F6PjP-pmZZFnE6OgLWc9Jf_JJpycmoMHSuwfd4GQllJQ0QWHAaAn-CxWGg8Y8s5wiv0zfD-K6XiTVPIlT8SLxa3imt-uDYqNwmNjga5lOiDpJj_6EsZEgWto9Eqgv1MvpkHt46Qw8v-oxqy-fzHCAllNezgykKmNR2Oom2fysVuOp7HSfqVjugj3ZUTyHj6S1R4WIW2ulz",
      buyerName: "Vikram Mehta",
      buyerCity: "Mumbai, Maharashtra",
      artisanPayout: 1350,
      totalAmount: 1650,
      price: 1650,
      shippingProvider: "Shadowfax Express",
      trackingNumber: "SFX-ONDC-44102",
      timeline: [
        { label: "Order placed on buyer app", done: true },
        { label: "Bamboo harvested and woven", done: true },
        { label: "Assigned to courier hub", done: true },
        { label: "In transit to Mumbai", done: false }
      ]
    },
    {
      id: "ORD-ONDC-7355",
      status: "SHIPPED",
      date: "04 Sep 2026",
      productTitle: "Terracotta Ritual Elephant Figurine",
      productImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXP2O1NqXUzSOZxU4Le9b7b4sz-XwU6xhYyzTuo3dMTemokPDaUDLFFnGFFVEdw3kEgiOXOZywgiaHU3RDodIvfFuerfCKefy9v_4UqbzzVLNAGAsV4WD2StpqymLSmBqm72kDpvao0HuIlGJ6dhlqdQDZFvBwkGUvw4Ht5gJAPzBIxJtOyPG-C5vRwd9y6BXk4HQYS4gFQec2C_QQ6JkhoW7eaFbYDH5EWigGNoEC5bDVBEURFfLJ",
      buyerName: "Dr. Kavita Joshi",
      buyerCity: "New Delhi",
      artisanPayout: 1820,
      totalAmount: 2200,
      price: 2200,
      shippingProvider: "Blue Dart Air",
      trackingNumber: "BLU-ONDC-88319",
      timeline: [
        { label: "Direct order confirmed", done: true },
        { label: "Kiln fired and inspected", done: true },
        { label: "Handed over to carrier", done: true },
        { label: "Arrived at destination hub", done: true }
      ]
    }
  ],

  categories: [
    {
      id: "cat_dokra",
      name: "Dokra Bell Metal",
      itemCount: 24,
      region: "Kondagaon, Bastar",
      icon: "stat_3",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCx1r4CbATRCwMBfEzAV4aknoQ3V_bj1qUIskjG77mFlN_NpJIdG8oYrz6_rjk0DgJGKgyV1j1lMbWwZV8m4YPgPcx1hIOXsOJo4hfgdrgv-zIDHNDzvU2anCrSoLONftAgVNxYb7LmB8Y0StbheZaRmTonL42VjzbAEFH-_T11AadLKv4WFCNt7wazRzA28A2le_feJ-emstTfYZtASKET4Co43UBBAqbei4ZBeEKJfTk3TW_5846m",
      description: "Artisans cast brass with beeswax threads and river clay. Each piece is unique."
    },
    {
      id: "cat_bamboo",
      name: "Bamboo and Cane",
      itemCount: 38,
      region: "Bastar and Mandla Hills",
      icon: "grass",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwPxsNm0-fDE8D4TYIwMXgUBWwbs_nwsHPekcVZmzQi3F6PjP-pmZZFnE6OgLWc9Jf_JJpycmoMHSuwfd4GQllJQ0QWHAaAn-CxWGg8Y8s5wiv0zfD-K6XiTVPIlT8SLxa3imt-uDYqNwmNjga5lOiDpJj_6EsZEgWto9Eqgv1MvpkHt46Qw8v-oxqy-fzHCAllNezgykKmNR2Oom2fysVuOp7HSfqVjugj3ZUTyHj6S1R4WIW2ulz",
      description: "Artisans split river bamboo by hand, smoke it over wood fires, and weave it with wild grass."
    },
    {
      id: "cat_terracotta",
      name: "Terracotta Clay",
      itemCount: 42,
      region: "Gorakhpur and Bankura",
      icon: "local_florist",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXP2O1NqXUzSOZxU4Le9b7b4sz-XwU6xhYyzTuo3dMTemokPDaUDLFFnGFFVEdw3kEgiOXOZywgiaHU3RDodIvfFuerfCKefy9v_4UqbzzVLNAGAsV4WD2StpqymLSmBqm72kDpvao0HuIlGJ6dhlqdQDZFvBwkGUvw4Ht5gJAPzBIxJtOyPG-C5vRwd9y6BXk4HQYS4gFQec2C_QQ6JkhoW7eaFbYDH5EWigGNoEC5bDVBEURFfLJ",
      description: "Potters shape red river clay on manual wheels, polish it with smooth stones, and fire it in wood kilns."
    },
    {
      id: "cat_wrought_iron",
      name: "Bastar Wrought Iron",
      itemCount: 19,
      region: "Kondagaon Blacksmith Lineage",
      icon: "hardware",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGdWDMdteBQi492ZuCy2M_dQ1cPLGjd34-QnarjAks25qQ39lgWJ2JuIYVZHJBi9GJkNS_OuvDVyMpxYLGK0NoZSEb5Gul3EgfSLZPkp0DwYCfP09l4dfhmbR77R3-x6eovrapY8mFpEt9qrJrhTrquBzbYf-SLAzUB-ZIx--tMjxO62gJp390_8DtFaCw0JriUaPhE9phdibnUuH4CBj8PGlCrCUDmzD8WUOls0nN6ISy5ATI4cHQ",
      description: "Tribal blacksmiths heat scrap iron over charcoal fires and hammer each shape by hand."
    },
    {
      id: "cat_textiles",
      name: "Tribal Handloom",
      itemCount: 31,
      region: "Kotpad and Sambalpur",
      icon: "texture",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6d5AGWp7wBejnQxvOOx6rf6MffMbK0st2rzFqrWtwYtU4tkBfbEo_sIkTwlLAoawOb5GNmKvckIahnuIMbwaBwsUGWWy7ovOK-ZTBKXNlrVSCQ2oZYVZJK5LJU5VgsOK1YxhvpnqxVO4189JIEfNOX4w5Ttqh_kuy822XZ4xSKB7a20DuTFD1tBXyijI_rdz6f9RC3aDzojSDuc_j4FdxYR18AHaX2Pz56Y_FjlOaUbFZ7WeYRp4L",
      description: "Weavers make cotton and silk fabrics with natural dyes from tree bark and river silt."
    },
    {
      id: "cat_wildcraft",
      name: "Forest Foraged Goods",
      itemCount: 15,
      region: "Satpura Deep Forest Belt",
      icon: "psychiatry",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwxVuq2luxGJJTXPGPidwfMnClLj3NHQKihv3O_oepVq4pQemzbYmfA2-NJWMCuthKiwPbkZE1MDXV5qggWkqZ9oN72BNUJSuB-PxWxd2D9Fjf3GFY4-dgBoWWAtqfadOdR3VKpyVH7mQA9yUSywN_7eBe7oZTRoj0HYJknqVBr3i5zl11WkzQsJsMUM5JlKKihrF5NCqAFoNS9P7zjjPTzZUWRefHnpoxJY9ZGCGaoIOSWFe9YAND",
      description: "Tribal gatherers collect raw cliff honey, dry tree flowers, and press botanical seeds for oil."
    }
  ],

  artisans: [
    {
      id: "artisan_ramesh",
      name: "Ramesh Baghel",
      badge: "Master Metal Sculptor",
      community: "Muria Gond Tribe",
      location: "Kondagaon Workshop, Bastar, Chhattisgarh",
      avatar: "https://lh3.googleusercontent.com/aida/AEtjO1VZ9WSYdiU5KnCwCveZ42dsoM2qr3GORfCk2YW4P1THeMhYkXOsAmau1OGKNw_NT5koGMHZzbuIZQHbzJZQY8PU2PJpXLC2_JQOqHffRbQbOCgaIPsdVKasMEYmC6fW5yfeYaUP8z3etJmXzUkfaY7RuEjjBGioc-CKeRMCI-3rwd-cMzDNzCmBpRlLV_IslXWTfb-L2iofX8dAc62XkJAaUw8EkQ950fcZpcqsotczC4dgvDMQ55GfTZA",
      rating: 4.95,
      reviewsCount: 142,
      experience: "28 years of foundry work",
      giCertified: true,
      bio: "I learned brass casting from my father in our village workshop. When you buy on ONDC, the network transfers your payment directly to my bank account.",
      voiceLore: "Jab hum jungle jate hain, toh hum ped aur hiran ko pranam karte hain. Yeh murti vahi shanti hamare ghar lati hai.",
      activeListings: 8,
      totalSales: "₹4,82,400",
      payoutPercentage: "89.2% direct artisan share"
    },
    {
      id: "artisan_devki",
      name: "Devki Bai Marawi",
      badge: "Master Bamboo Weaver",
      community: "Baiga Tribe",
      location: "Mandla Forest Ridge, Madhya Pradesh",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      rating: 4.9,
      reviewsCount: 98,
      experience: "19 years of weaving work",
      giCertified: true,
      bio: "We split green bamboo into thin strips before the wood dries. We do not use chemicals or artificial varnish.",
      voiceLore: "Hum nadi kinare se baans laate hain aur dhuen me sukhate hain. Yeh saalon saal chalta hai.",
      activeListings: 12,
      totalSales: "₹2,45,600",
      payoutPercentage: "91.0% direct artisan share"
    },
    {
      id: "artisan_manglu",
      name: "Manglu Ram Podiyam",
      badge: "Tribal Blacksmith Elder",
      community: "Maria Tribe",
      location: "Bhelvapadar Forge, Bastar",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      rating: 4.88,
      reviewsCount: 76,
      experience: "34 years of iron forging",
      giCertified: true,
      bio: "We heat scrap iron with charcoal billows. We hammer each forest figure without modern welding machines.",
      voiceLore: "Loha aag me garam hota hai, tab hum usme suraj ki kiran banate hain.",
      activeListings: 6,
      totalSales: "₹1,88,300",
      payoutPercentage: "90.5% direct artisan share"
    }
  ],

  products: [
    {
      id: "prod_dokra_deer",
      title: "Forest Deer with Sacred Tree",
      category: "Dokra Bell Metal",
      categoryId: "cat_dokra",
      artisanId: "artisan_ramesh",
      artisanName: "Ramesh Baghel",
      artisanVillage: "Kondagaon, Bastar",
      price: 3850,
      marketPriceEstimate: 4200,
      costFloor: 2900,
      confidenceScore: 94,
      giCertified: true,
      rating: 4.9,
      reviewsCount: 38,
      leadTimeDays: 4,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCx1r4CbATRCwMBfEzAV4aknoQ3V_bj1qUIskjG77mFlN_NpJIdG8oYrz6_rjk0DgJGKgyV1j1lMbWwZV8m4YPgPcx1hIOXsOJo4hfgdrgv-zIDHNDzvU2anCrSoLONftAgVNxYb7LmB8Y0StbheZaRmTonL42VjzbAEFH-_T11AadLKv4WFCNt7wazRzA28A2le_feJ-emstTfYZtASKET4Co43UBBAqbei4ZBeEKJfTk3TW_5846m",
      materials: "Recycled Brass Alloy, Wild Beeswax, River Clay",
      dimensions: "18cm x 12cm x 6cm",
      weight: "1.42 kg",
      stockQuantity: 4,
      payoutArtisan: 3434,
      payoutLogistics: 280,
      payoutNetwork: 136,
      story: "Ramesh created this brass sculpture in his Kondagaon workshop. He wound beeswax threads to form the deer horns and sacred tree branches. He baked the clay mould in a pit kiln with sal tree charcoal.",
      voiceLore: "Jab hum jungle jate hain, toh hum ped aur hiran ko pranam karte hain. Yeh murti vahi shanti hamare ghar lati hai.",
      tags: ["Dokra", "Bastar", "Brass Sculpture", "GI Certified", "Handmade"]
    },
    {
      id: "prod_bamboo_basket",
      title: "Wild Grass Smoked Bamboo Basket",
      category: "Bamboo and Cane",
      categoryId: "cat_bamboo",
      artisanId: "artisan_devki",
      artisanName: "Devki Bai Marawi",
      artisanVillage: "Mandla Forest Ridge",
      price: 1250,
      marketPriceEstimate: 1450,
      costFloor: 950,
      confidenceScore: 96,
      giCertified: true,
      rating: 4.8,
      reviewsCount: 52,
      leadTimeDays: 2,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwPxsNm0-fDE8D4TYIwMXgUBWwbs_nwsHPekcVZmzQi3F6PjP-pmZZFnE6OgLWc9Jf_JJpycmoMHSuwfd4GQllJQ0QWHAaAn-CxWGg8Y8s5wiv0zfD-K6XiTVPIlT8SLxa3imt-uDYqNwmNjga5lOiDpJj_6EsZEgWto9Eqgv1MvpkHt46Qw8v-oxqy-fzHCAllNezgykKmNR2Oom2fysVuOp7HSfqVjugj3ZUTyHj6S1R4WIW2ulz",
      materials: "River Bamboo, Wild Forest Grass, Mustard Seed Oil",
      dimensions: "30cm diameter x 20cm height",
      weight: "0.65 kg",
      stockQuantity: 12,
      payoutArtisan: 1137,
      payoutLogistics: 80,
      payoutNetwork: 33,
      story: "Devki Bai gathered green bamboo along the river bank. She smoked the bamboo strips over herbal wood smoke to keep insects away. She did not use synthetic polish.",
      voiceLore: "Hum nadi kinare se baans laate hain aur dhuen me sukhate hain. Yeh saalon saal chalta hai.",
      tags: ["Bamboo", "Storage Basket", "Zero Chemical", "Eco Friendly"]
    },
    {
      id: "prod_iron_lamp",
      title: "Hand-Forged Tribal Sun Diya Lamp",
      category: "Bastar Wrought Iron",
      categoryId: "cat_wrought_iron",
      artisanId: "artisan_manglu",
      artisanName: "Manglu Ram Podiyam",
      artisanVillage: "Bhelvapadar, Bastar",
      price: 2150,
      marketPriceEstimate: 2500,
      costFloor: 1600,
      confidenceScore: 91,
      giCertified: true,
      rating: 4.9,
      reviewsCount: 29,
      leadTimeDays: 3,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGdWDMdteBQi492ZuCy2M_dQ1cPLGjd34-QnarjAks25qQ39lgWJ2JuIYVZHJBi9GJkNS_OuvDVyMpxYLGK0NoZSEb5Gul3EgfSLZPkp0DwYCfP09l4dfhmbR77R3-x6eovrapY8mFpEt9qrJrhTrquBzbYf-SLAzUB-ZIx--tMjxO62gJp390_8DtFaCw0JriUaPhE9phdibnUuH4CBj8PGlCrCUDmzD8WUOls0nN6ISy5ATI4cHQ",
      materials: "Recycled Charcoal-Forged Iron",
      dimensions: "24cm x 15cm x 15cm",
      weight: "1.10 kg",
      stockQuantity: 7,
      payoutArtisan: 1945,
      payoutLogistics: 140,
      payoutNetwork: 65,
      story: "Manglu Ram hammered this sun oil lamp on an open anvil. He heated the metal until it glowed cherry red and twisted the sun rays by hand.",
      voiceLore: "Loha aag me garam hota hai, tab hum usme suraj ki kiran banate hain.",
      tags: ["Wrought Iron", "Lohar Craft", "Diya Lamp", "Bastar Heritage"]
    },
    {
      id: "prod_terracotta_horse",
      title: "Bankura Votive Terracotta Horse",
      category: "Terracotta Clay",
      categoryId: "cat_terracotta",
      artisanId: "artisan_devki",
      artisanName: "Gopal Kumbhakar",
      artisanVillage: "Panchmura, Bankura",
      price: 1850,
      marketPriceEstimate: 2200,
      costFloor: 1350,
      confidenceScore: 92,
      giCertified: true,
      rating: 4.85,
      reviewsCount: 41,
      leadTimeDays: 5,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXP2O1NqXUzSOZxU4Le9b7b4sz-XwU6xhYyzTuo3dMTemokPDaUDLFFnGFFVEdw3kEgiOXOZywgiaHU3RDodIvfFuerfCKefy9v_4UqbzzVLNAGAsV4WD2StpqymLSmBqm72kDpvao0HuIlGJ6dhlqdQDZFvBwkGUvw4Ht5gJAPzBIxJtOyPG-C5vRwd9y6BXk4HQYS4gFQec2C_QQ6JkhoW7eaFbYDH5EWigGNoEC5bDVBEURFfLJ",
      materials: "Alluvial Red River Clay, Natural Mineral Ochre",
      dimensions: "32cm x 18cm x 10cm",
      weight: "2.10 kg",
      stockQuantity: 5,
      payoutArtisan: 1650,
      payoutLogistics: 130,
      payoutNetwork: 70,
      story: "Gopal turned the hollow neck and body on a manual wheel. He attached the upright ears and decorated the bridle with clay pellets.",
      voiceLore: "Hum mitti ko nadi se late hain. Yeh ghoda gaon ke devta ka roop hai.",
      tags: ["Terracotta", "Bankura Horse", "GI Tag", "Clay Art"]
    }
  ],

  orders: [
    {
      id: "ORD-ONDC-8921",
      buyerName: "Ananya Sharma",
      buyerCity: "Bengaluru, Karnataka",
      buyerApp: "Paytm Mall ONDC",
      date: "Today, 14:30",
      timestamp: Date.now() - 3600000 * 2,
      status: "CONFIRMED",
      productTitle: "Forest Deer with Sacred Tree",
      productId: "prod_dokra_deer",
      productImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuCx1r4CbATRCwMBfEzAV4aknoQ3V_bj1qUIskjG77mFlN_NpJIdG8oYrz6_rjk0DgJGKgyV1j1lMbWwZV8m4YPgPcx1hIOXsOJo4hfgdrgv-zIDHNDzvU2anCrSoLONftAgVNxYb7LmB8Y0StbheZaRmTonL42VjzbAEFH-_T11AadLKv4WFCNt7wazRzA28A2le_feJ-emstTfYZtASKET4Co43UBBAqbei4ZBeEKJfTk3TW_5846m",
      quantity: 1,
      totalAmount: 3850,
      artisanPayout: 3434,
      shippingProvider: "Delhivery Surface",
      trackingNumber: "DLV-ONDC-884210",
      timeline: [
        { state: "PENDING", label: "Order Created by Buyer", time: "14:28", done: true },
        { state: "CONFIRMED", label: "Artisan Accepted & Paid on ONDC", time: "14:30", done: true },
        { state: "PROCESSING", label: "Artisan Packing in Bamboo Box", time: "Pending", done: false },
        { state: "READY_TO_SHIP", label: "Handed over to Pickup Van", time: "Pending", done: false },
        { state: "SHIPPED", label: "In Transit via Delhivery", time: "Pending", done: false },
        { state: "OUT_FOR_DELIVERY", label: "Courier Agent on Delivery Route", time: "Pending", done: false },
        { state: "DELIVERED", label: "Received by Buyer", time: "Pending", done: false }
      ]
    },
    {
      id: "ORD-ONDC-7412",
      buyerName: "Vikram Mehta",
      buyerCity: "Mumbai, Maharashtra",
      buyerApp: "Mystore ONDC",
      date: "Yesterday, 10:15",
      timestamp: Date.now() - 3600000 * 28,
      status: "SHIPPED",
      productTitle: "Hand-Forged Tribal Sun Diya Lamp",
      productId: "prod_iron_lamp",
      productImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGdWDMdteBQi492ZuCy2M_dQ1cPLGjd34-QnarjAks25qQ39lgWJ2JuIYVZHJBi9GJkNS_OuvDVyMpxYLGK0NoZSEb5Gul3EgfSLZPkp0DwYCfP09l4dfhmbR77R3-x6eovrapY8mFpEt9qrJrhTrquBzbYf-SLAzUB-ZIx--tMjxO62gJp390_8DtFaCw0JriUaPhE9phdibnUuH4CBj8PGlCrCUDmzD8WUOls0nN6ISy5ATI4cHQ",
      quantity: 2,
      totalAmount: 4300,
      artisanPayout: 3890,
      shippingProvider: "Shadowfax Express",
      trackingNumber: "SFX-994102-IN",
      timeline: [
        { state: "PENDING", label: "Order Created", time: "Yesterday 10:10", done: true },
        { state: "CONFIRMED", label: "Payment Settled", time: "Yesterday 10:15", done: true },
        { state: "PROCESSING", label: "Careful Packaging", time: "Yesterday 16:00", done: true },
        { state: "READY_TO_SHIP", label: "Pickup Complete", time: "Today 08:30", done: true },
        { state: "SHIPPED", label: "Nagpur Hub Transit", time: "Today 11:20", done: true },
        { state: "OUT_FOR_DELIVERY", label: "Expected Tomorrow", time: "Pending", done: false },
        { state: "DELIVERED", label: "Pending", time: "Pending", done: false }
      ]
    }
  ],

  notifications: [
    {
      id: "notif_1",
      type: "order",
      title: "New order received on ONDC",
      message: "Ananya Sharma in Bengaluru ordered 1 'Forest Deer with Sacred Tree'.",
      amount: "₹3,434 direct payout",
      time: "15 minutes ago",
      unread: true,
      actionScreen: "artisan_orders"
    },
    {
      id: "notif_2",
      type: "payment",
      title: "Bank payment transferred",
      message: "₹3,890 for order ORD-ONDC-7412 was transferred directly to your Bank of Baroda account.",
      amount: "₹3,890",
      time: "2 hours ago",
      unread: true,
      actionScreen: "artisan_amount"
    }
  ],

  ambassador: {
    name: "Rajesh Sahu",
    role: "Field Ambassador Lead",
    location: "Kondagaon District, Bastar",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    phone: "+91 94252 88102",
    verifiedCount: 84,
    pendingQueueCount: 3,
    earnedHonorarium: 16800,
    networkArtisansCount: 42,
    referralCode: "AMB-BASTAR-RAJESH",

    verificationQueue: [
      {
        id: "VERIF-8901",
        artisanId: "artisan_ramesh",
        artisanName: "Ramesh Baghel",
        artisanVillage: "Bhelvapadar, Kondagaon",
        productTitle: "Ancestral Dokra Elephant with Bell Rider",
        category: "Dokra Bell Metal",
        price: 4600,
        costFloor: 3400,
        aiConfidenceScore: 72,
        reasonForFlag: "AI detected irregular metal porosity in image background. Requires human verification before ONDC broadcast.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCx1r4CbATRCwMBfEzAV4aknoQ3V_bj1qUIskjG77mFlN_NpJIdG8oYrz6_rjk0DgJGKgyV1j1lMbWwZV8m4YPgPcx1hIOXsOJo4hfgdrgv-zIDHNDzvU2anCrSoLONftAgVNxYb7LmB8Y0StbheZaRmTonL42VjzbAEFH-_T11AadLKv4WFCNt7wazRzA28A2le_feJ-emstTfYZtASKET4Co43UBBAqbei4ZBeEKJfTk3TW_5846m",
        audioNote: "Artisan Ramesh explained this was cast using beeswax thread method and traditional sal charcoal fire.",
        status: "PENDING"
      },
      {
        id: "VERIF-8902",
        artisanId: "artisan_devki",
        artisanName: "Devki Bai Marawi",
        artisanVillage: "Mandla Ridge",
        productTitle: "Handwoven Bamboo Lamp Shade",
        category: "Bamboo and Cane",
        price: 1650,
        costFloor: 1200,
        aiConfidenceScore: 68,
        reasonForFlag: "Dimensions need physical measurement confirmation.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwPxsNm0-fDE8D4TYIwMXgUBWwbs_nwsHPekcVZmzQi3F6PjP-pmZZFnE6OgLWc9Jf_JJpycmoMHSuwfd4GQllJQ0QWHAaAn-CxWGg8Y8s5wiv0zfD-K6XiTVPIlT8SLxa3imt-uDYqNwmNjga5lOiDpJj_6EsZEgWto9Eqgv1MvpkHt46Qw8v-oxqy-fzHCAllNezgykKmNR2Oom2fysVuOp7HSfqVjugj3ZUTyHj6S1R4WIW2ulz",
        audioNote: "Bamboo harvested during autumn moon. Verified zero chemical coating.",
        status: "PENDING"
      }
    ],

    networkMembers: [
      { id: "mem_1", name: "Ramesh Baghel", village: "Kondagaon", craftsCount: 8, activeSales: "₹4,82,400", status: "Active Verified" },
      { id: "mem_2", name: "Devki Bai Marawi", village: "Mandla", craftsCount: 12, activeSales: "₹2,45,600", status: "Active Verified" },
      { id: "mem_3", name: "Manglu Ram Podiyam", village: "Bhelvapadar", craftsCount: 6, activeSales: "₹1,88,300", status: "Active Verified" }
    ]
  },

  bulkRequests: [
    {
      id: "BULK-REQ-101",
      buyerOrg: "FabIndia Heritage Sourcing",
      buyerContact: "Pooja Malhotra",
      productCategory: "Dokra Bell Metal",
      targetQuantity: 50,
      targetBudgetPerUnit: 3200,
      requiredDeliveryDate: "2026-10-15",
      customRequirement: "Each piece packaged in branded eco-friendly palm leaf box with artisan certificate.",
      status: "OPEN_FOR_QUOTES"
    }
  ]
};
