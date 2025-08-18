import mongoose from 'mongoose';
import { Hub } from '../services/booking-service/src/models/hub.model';
import { Service } from '../services/booking-service/src/models/service.model';
import { HubService } from '../services/booking-service/src/models/hubService.model';

async function debugServicesData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zefy_bookings');

    console.log('🔍 Debugging Services and Hub Services...\n');

    // Check Services
    console.log('📋 Services in database:');
    const services = await Service.find({});
    console.log(`   Total services: ${services.length}`);

    services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} (ID: ${service.serviceId}) - ${service._id}`);
    });

    // Check Hubs
    console.log('\n🏢 Hubs in database:');
    const hubs = await Hub.find({});
    console.log(`   Total hubs: ${hubs.length}`);

    hubs.forEach((hub, index) => {
      console.log(`   ${index + 1}. ${hub.name} (ID: ${hub.hubId})`);
    });

    // Check Hub Services
    console.log('\n🔗 Hub Services relationships:');
    const hubServices = await HubService.find({});
    console.log(`   Total hub services: ${hubServices.length}`);

    hubServices.forEach((hs, index) => {
      console.log(`   ${index + 1}. Hub: ${hs.hubId} -> Service: ${hs.serviceId} (Active: ${hs.isActive})`);
    });

    // Check for orphaned hub services
    console.log('\n🚨 Checking for issues:');

    const hubIds = hubs.map(h => h.hubId);
    const serviceIds = services.map(s => s.serviceId);

    const orphanedHubServices = hubServices.filter(hs =>
      !hubIds.includes(hs.hubId) || !serviceIds.includes(hs.serviceId)
    );

    if (orphanedHubServices.length > 0) {
      console.log(`   ❌ Found ${orphanedHubServices.length} orphaned hub services:`);
      orphanedHubServices.forEach(hs => {
        const missingHub = !hubIds.includes(hs.hubId);
        const missingService = !serviceIds.includes(hs.serviceId);
        console.log(`      - ${hs.hubServiceId}: Missing ${missingHub ? 'Hub' : ''}${missingHub && missingService ? ' and ' : ''}${missingService ? 'Service' : ''}`);
      });
    } else {
      console.log('   ✅ All hub services have valid references');
    }

    // Test the problematic query
    console.log('\n🧪 Testing hub assignment query:');

    const testCoordinates = { lat: 12.9698, lng: 77.7500 }; // Whitefield

    try {
      const hub = await Hub.findOne({
        serviceArea: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [testCoordinates.lng, testCoordinates.lat]
            }
          }
        }
      });

      if (hub) {
        console.log(`   ✅ Hub found: ${hub.name} (${hub.hubId})`);

        // Test the problematic hub services query
        const hubServicesSimple = await HubService.find({
          hubId: hub.hubId,
          isActive: true
        });

        console.log(`   ✅ Hub services found: ${hubServicesSimple.length}`);

        // Get services manually
        const serviceIds = hubServicesSimple.map(hs => hs.serviceId);
        const relatedServices = await Service.find({
          serviceId: { $in: serviceIds }
        });

        console.log(`   ✅ Related services found: ${relatedServices.length}`);

        relatedServices.forEach(service => {
          console.log(`      - ${service.name} (${service.serviceId})`);
        });

      } else {
        console.log('   ❌ No hub found for test coordinates');
      }

    } catch (error: any) {
      console.log(`   ❌ Query failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Clean up orphaned hub services
async function cleanupHubServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zefy_bookings');

    console.log('🧹 Cleaning up hub services...');

    const services = await Service.find({});
    const hubs = await Hub.find({});

    const validServiceIds = services.map(s => s.serviceId);
    const validHubIds = hubs.map(h => h.hubId);

    // Remove hub services with invalid references
    const deleteResult = await HubService.deleteMany({
      $or: [
        { serviceId: { $nin: validServiceIds } },
        { hubId: { $nin: validHubIds } }
      ]
    });

    console.log(`   ✅ Deleted ${deleteResult.deletedCount} orphaned hub services`);

    // Recreate hub services for all valid combinations
    for (const hub of hubs) {
      const existingHubServices = await HubService.find({ hubId: hub.hubId });
      const existingServiceIds = existingHubServices.map(hs => hs.serviceId);

      const missingServices = services.filter(s => !existingServiceIds.includes(s.serviceId));

      if (missingServices.length > 0) {
        const newHubServices = missingServices.map(service => ({
          hubId: hub.hubId,
          serviceId: service.serviceId,
          isActive: true
        }));

        await HubService.insertMany(newHubServices);
        console.log(`   ✅ Created ${newHubServices.length} hub services for ${hub.name}`);
      }
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run debug
debugServicesData();

// Uncomment to run cleanup
// cleanupHubServices();