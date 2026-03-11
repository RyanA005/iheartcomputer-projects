#include <string.h>

#include "collision_internal.h"
#include "rigidbody_internal.h"

rigidbody_manager_t g_rigidbodyManager = {0};

rigidbody_t *rigidbody_create(void) {
    size_t index;
    if (g_rigidbodyManager.freeCount == 0) {
        return NULL; // No free slots available
    }

    // Get a free index
    index = g_rigidbodyManager.freeIndices[--g_rigidbodyManager.freeCount];
    g_rigidbodyManager.activeIndices[g_rigidbodyManager.activeCount++] = index;
    g_rigidbodyManager.count++;
    return &g_rigidbodyManager.rigidbodies[index];
}

rigidbody_t *rigidbody_init(rigidbody_t *rb, vec3 position, const float mass, const vec3 size, const uint8_t flags) {
    if (rb == NULL) {
        return NULL; // Invalid pointer
    }

    memset(rb, 0, sizeof(rigidbody_t));
    glm_vec3_copy(position, rb->position);
    rb->mass = mass;
    rb->invMass = mass > 0.0f ? 1.0f / mass : 0.0f;
    rb->flags = flags;
    rb->localBounding[1][0] = size[0] * 0.5f;
    rb->localBounding[1][1] = size[1] * 0.5f;
    rb->localBounding[1][2] = size[2] * 0.5f;
    memcpy(rb->worldBounding, rb->localBounding, sizeof(shape_aabb_t));
    glm_vec3_add(rb->position, rb->localBounding[0], rb->worldBounding[0]);
    memcpy(rb->collisionShape, rb->localBounding, sizeof(shape_aabb_t));

    return rb;
}

void rigidbody_destroy(rigidbody_t *rb) {
    size_t index = rb - g_rigidbodyManager.rigidbodies; // Calculate index from pointer
    if (index >= g_rigidbodyManager.capacity) {
        return; // Invalid pointer
    }

    // Add index back to free list
    g_rigidbodyManager.freeIndices[g_rigidbodyManager.freeCount++] = index;
    g_rigidbodyManager.activeIndices[index] = g_rigidbodyManager.activeIndices[--g_rigidbodyManager.activeCount];
    g_rigidbodyManager.count--;

    memset(rb, 0, sizeof(rigidbody_t));
}

void rigidbody_set_mass(rigidbody_t *rb, float mass) {
    if (rb == NULL) {
        return; // Invalid pointer
    }

    rb->mass = mass;
    rb->invMass = mass > 0.0f ? 1.0f / mass : 0.0f;
}

void rigidbody_set_size(rigidbody_t *rb, const vec3 size) {
    if (rb == NULL) {
        return; // Invalid pointer
    }

    rb->localBounding[0][0] = -size[0] * 0.5f;
    rb->localBounding[0][1] = -size[1] * 0.5f;
    rb->localBounding[0][2] = -size[2] * 0.5f;
    rb->localBounding[1][0] = size[0] * 0.5f;
    rb->localBounding[1][1] = size[1] * 0.5f;
    rb->localBounding[1][2] = size[2] * 0.5f;
}

void rigidbody_add_force(rigidbody_t *rb, vec3 force) {
    glm_vec3_add(rb->forceAccumulator, force, rb->forceAccumulator);
}

void rigidbody_add_impulse(rigidbody_t *rb, vec3 impulse) {
    vec3 deltaVelocity;
    glm_vec3_scale(impulse, rb->invMass, deltaVelocity);
    glm_vec3_add(rb->velocity, deltaVelocity, rb->velocity);
}

void rigidbody_manager_init(const size_t initialCapacity) {
    g_rigidbodyManager.rigidbodies = (rigidbody_t *)calloc(initialCapacity ,sizeof(rigidbody_t));
    g_rigidbodyManager.freeIndices = (size_t *)malloc(sizeof(size_t) * initialCapacity);
    g_rigidbodyManager.activeIndices = (size_t *)malloc(sizeof(size_t) * initialCapacity);
    g_rigidbodyManager.capacity = initialCapacity;
    g_rigidbodyManager.count = 0;
    g_rigidbodyManager.freeCount = initialCapacity;
    g_rigidbodyManager.activeCount = 0;

    // Initialize free indices
    for (size_t i = 0; i < initialCapacity; i++) {
        g_rigidbodyManager.freeIndices[i] = initialCapacity - i - 1;
    }

    collision_init(initialCapacity);
}

void rigidbody_manager_deinit(rigidbody_manager_t *manager) {
    free(manager->rigidbodies);
    free(manager->freeIndices);
    memset(manager, 0, sizeof(rigidbody_manager_t));
    collision_deinit();
}

void rigidbody_manager_integrate_velocity(const rigidbody_manager_t *manager, const float deltaTime) {
    size_t i, index;
    rigidbody_t *rb;
    vec3 vel;
    if (manager == NULL) {
        return;
    }

    for (i = 0; i < manager->activeCount; i++) {
        index = manager->activeIndices[i];
        rb = &manager->rigidbodies[index];

        // Integrate velocity
        glm_vec3_scale(rb->velocity, deltaTime, vel);
        glm_vec3_add(rb->position, vel, rb->position);
    }
}

void rigidbody_manager_integrate_force(const rigidbody_manager_t *manager, const float deltaTime) {
    size_t i, index;
    rigidbody_t *rb;
    vec3 acceleration;
    if (manager == NULL) {
        return;
    }

    for (i = 0; i < manager->activeCount; i++) {
        index = manager->activeIndices[i];
        rb = &manager->rigidbodies[index];

        // Integrate force
        glm_vec3_scale(rb->forceAccumulator, rb->invMass, acceleration);
        glm_vec3_scale(acceleration, deltaTime, acceleration);
        glm_vec3_add(rb->velocity, acceleration, rb->velocity);

        // Clear force accumulator
        glm_vec3_zero(rb->forceAccumulator);
    }
}

void rigidbody_manager_update_bounding_shapes(const rigidbody_manager_t *manager) {
    size_t i, index;
    rigidbody_t *rb;
    vec3 *localBounding;
    if (manager == NULL) {
        return;
    }

    for (i = 0; i < manager->activeCount; i++) {
        index = manager->activeIndices[i];
        rb = &manager->rigidbodies[index];

        localBounding = manager->rigidbodies[manager->activeIndices[i]].localBounding;
        glm_vec3_add(localBounding[0], rb->position, rb->worldBounding[0]);
    }
}
