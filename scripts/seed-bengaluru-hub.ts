import { Hub } from '../services/booking-service/src/models/hub.model'
import { Service } from '../services/booking-service/src/models/service.model'
import { HubService } from '../services/booking-service/src/models/hubService.model'
import mongoose from 'mongoose'
import { IHub, IService } from '@zf/types';


// Bengaluru service area polygon (approximate boundary)
// This covers major areas like Whitefield, Electronic City, Marathahalli, etc.
const bengaluruServiceArea = {
  type: 'Polygon' as const,
  coordinates: [[
    // Starting from North-West and going clockwise
    [77.4500, 13.1500], // North-West (Devanahalli area - Airport)
    [77.7500, 13.1500], // North-East (Extended Whitefield/Varthur)
    [77.8000, 13.0500], // East-North (Whitefield/Brookefield)
    [77.8200, 12.9500], // East-Central (Marathahalli/Bellandur)
    [77.8000, 12.8500], // East-South (Sarjapur Road)
    [77.7500, 12.7500], // South-East (Electronic City Phase 2)
    [77.6500, 12.7000], // South-Central (Bommanahalli/Begur)
    [77.5500, 12.7000], // South-West (Bannerghatta Road)
    [77.4500, 12.7500], // West-South (Kanakapura Road)
    [77.4000, 12.8500], // West-Central (Mysore Road)
    [77.4200, 12.9500], // West-North (Rajajinagar/Vijayanagar)
    [77.4500, 13.0500], // North-West (Hebbal/Yelahanka)
    [77.4500, 13.1500]  // Back to start
  ]]
};

const bengaluruHub: Partial<IHub> = {
  name: 'Bengaluru Central Hub',
  address: {
    street: 'Hub Center, Brigade Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    coordinates: {
      lat: 12.9716,
      lng: 77.5946
    }
  },
  serviceArea: bengaluruServiceArea,
  managers: [
    {
      name: 'Manoj Mohite',
      phone: '7829777650',
      email: 'manoj@thezefy.com'
    },
    {
      name: 'Sunil Pathloth',
      phone: '9593967754',
      email: 'sunilpathloth17@gmail.com'
    },
    {
      name: 'Ajay Naik',
      phone: '8595085382',
      email: 'ajayramavath03@gmail.com'
    }
  ],
  isActive: true
};

async function seedBengaluruHub(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zefy_bookings');

    const hub = await Hub.create(bengaluruHub);
    console.log('✅ Bengaluru hub created:', hub.hubId);

    // Get all services
    const services: IService[] = await Service.find({});

    if (services.length === 0) {
      console.log('⚠️  No services found. Please run seed-services.js first');
      return;
    }

    const hubServices = services.map(service => ({
      hubId: hub.hubId,
      serviceId: service.serviceId,
      isActive: true
    }));

    const createdHubServices = await HubService.insertMany(hubServices);

    console.log('✅ Hub services created:');
    createdHubServices.forEach(hs => {
      const service = services.find(s => s.serviceId === hs.serviceId);
      console.log(`   - ${service?.name} (${hs.hubServiceId})`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Hub ID: ${hub.hubId}`);
    console.log(`   Services: ${createdHubServices.length}`);

  } catch (error) {
    console.error('❌ Error seeding Bengaluru hub:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
seedBengaluruHub();