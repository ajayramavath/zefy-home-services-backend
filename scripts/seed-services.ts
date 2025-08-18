import { Service } from '../services/booking-service/src/models/service.model'
import mongoose from 'mongoose'
import { IService } from '@zf/types';

const services: Partial<IService>[] = [
  {
    serviceId: 'SVC_SWEEPING_MOPPING',
    name: 'Sweep & Mopping',
    description: 'Complete floor cleaning with sweeping and mopping',
    icon: 'assets/services/sweep_mopping_3d.png',
    isPackage: false,
    basePrice: 60,
    ratePerMinute: 3,
    estimatedDuration: 20,
    type: 'SWEEPING_MOPPING',
    tasksIncluded: [
      'Dry dusting',
      'Wet wiping furniture & fixtures',
      'Changing bedsheets',
      'Disposing wet/dry waste'
    ],
    tasksExcluded: [
      'Cleaning high/inaccessible areas, outside windows',
      'Shifting heavy furniture',
    ]
  },
  {
    serviceId: 'SVC_KITCHEN_UTENSILS',
    name: 'Kitchen & Utensils',
    description: 'Complete kitchen cleaning including utensils wash',
    icon: 'assets/services/kitchen_utensils_3d.png',
    isPackage: false,
    basePrice: 60,
    ratePerMinute: 3,
    type: 'KITCHEN_UTENSILS',
    estimatedDuration: 20,
    tasksIncluded: [
      'Washing all utensils',
      'Wiping stove & sink',
      'cleaning counters & floor tiles',
    ],
    tasksExcluded: [
      'Prepping food',
      'Cleaning kitchen cabinets',
      'Removing tough stains'
    ]
  },
  {
    serviceId: 'SVC_BATHROOM',
    name: 'Bathroom',
    description: 'Deep bathroom cleaning and sanitization',
    icon: 'assets/services/bathroom_3d.png',
    isPackage: false,
    type: 'BATHROOM',
    basePrice: 60,
    ratePerMinute: 3,
    estimatedDuration: 20,
    tasksIncluded: [
      'Cleaning commode, basin, tiles, and fixtures with wet wipe'
    ],
    tasksExcluded: [
      'Stain removal',
      'Ceiling cleaning',
      'Unclogging drains'
    ]
  },
  {
    serviceId: 'SVC_LAUNDRY',
    name: 'Laundry',
    description: 'Washing, drying and folding clothes',
    icon: 'assets/services/laundry_3d.png',
    isPackage: false,
    basePrice: 60,
    ratePerMinute: 2,
    type: 'LAUNDRY',
    estimatedDuration: 20,
    tasksIncluded: [
      'Ironing (basic clothes)',
      'Folding dried clothes',
      'Washing clothes using machine'
    ],
    tasksExcluded: [
      'Delicate/embroidered fabric, biohazard items, or washing machine cleaning'
    ]
  },
  {
    serviceId: 'SVC_KITCHEN_PREP',
    name: 'Kitchen Preparation',
    description: 'Kitchen deep cleaning and organization',
    icon: 'assets/services/kitchen_prep_3d.png',
    isPackage: false,
    basePrice: 60,
    type: 'KITCHEN_PREP',
    ratePerMinute: 3,
    estimatedDuration: 20,
    tasksIncluded: [
      'Cutting veggies, leafy greens, sorting fruits, kneading dough.'
    ],
    tasksExcluded: [
      'Cooking, baking, or handling meat/seafood or flame-related tasks'
    ]
  },
  {
    serviceId: 'SVC_CAR_WASHING',
    name: 'Car Washing',
    description: 'Complete car exterior and interior cleaning',
    icon: 'assets/services/car_washing_3d.png',
    isPackage: false,
    basePrice: 60,
    ratePerMinute: 4,
    type: 'CAR_CLEANING',
    estimatedDuration: 20,
    tasksIncluded: [
      'Exterior foam wash',
      'Dry vacuuming',
      'Dashboard & boot cleaning',
      'Window cleaning'
    ],
    tasksExcluded: [
      'Engine wash',
      'Paint jobs',
      'Seat deep cleaning',
      'Mechanical repairs'
    ]
  },
  {
    serviceId: 'SVC_DAILY_ESSENTIALS',
    name: 'Daily Essential Cleaning',
    description: 'Complete daily home cleaning package',
    icon: 'assets/services/daily_cleaning_bundle_3d.png',
    isPackage: true,
    basePrice: 60,
    ratePerMinute: 3,
    type: 'DAILY_ESSENTIALS',
    estimatedDuration: 20,
    tasksIncluded: [
      'Sweeping and mopping all rooms',
      'Kitchen platform cleaning',
      'Utensils washing',
      'Bathroom basic cleaning',
      'Organizing living areas'
    ],
    tasksExcluded: [
      'Deep cleaning',
      'Laundry',
      'Car washing'
    ]
  }
];

async function seedServices(): Promise<void> {
  try {

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zefy_bookings');

    await Service.deleteMany({});

    const createdServices = await Service.insertMany(services);
    console.log('✅ Services seeded successfully:');
    createdServices.forEach(service => {
      console.log(`   - ${service.name} (${service.serviceId})`);
    });

    console.log(`\n📊 Total services created: ${createdServices.length}`);

  } catch (error) {
    console.error('❌ Error seeding services:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedServices();