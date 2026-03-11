#include "box_physics/physics.h"

#include "collision_internal.h"
#include "rigidbody_internal.h"

void physics_init(const size_t numBodies) {
    rigidbody_manager_init(numBodies);
}

void physics_deinit(void) {
    rigidbody_manager_deinit(&g_rigidbodyManager);
}

void physics_update(const float deltaTime) {
    rigidbody_manager_integrate_force(&g_rigidbodyManager, deltaTime);
    rigidbody_manager_integrate_velocity(&g_rigidbodyManager, deltaTime);
    rigidbody_manager_update_bounding_shapes(&g_rigidbodyManager);
    collision_broad_phase(&g_rigidbodyManager);
    collision_narrow_phase();
    collision_contact_solver(&g_rigidbodyManager);
}
